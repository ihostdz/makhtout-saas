from typing import List
from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Document, Transcription, User
from app.schemas import DocumentResponse, DocumentCreate, ExportRequest
from app.services.storage_service import storage_service
from app.services.export_service import export_service
import io
import magic
import os

router = APIRouter()

ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/tiff", "application/pdf"}
MAX_FILE_SIZE = 20 * 1024 * 1024  # 20 MB


@router.get("/", response_model=List[DocumentResponse])
def list_documents(
    skip: int = 0,
    limit: int = 20,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Document)
        .filter(Document.owner_id == current_user.id)
        .order_by(Document.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/upload", response_model=DocumentResponse)
def upload_document(
    file: UploadFile = File(...),
    language_hint: str = Form("auto"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    content = file.file.read()

    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(status_code=413, detail="File too large")

    mime = magic.from_buffer(content, mime=True)
    if mime not in ALLOWED_MIME_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported file type")

    extension = os.path.splitext(file.filename)[1] or ".bin"
    object_name = f"{current_user.id}/{Document.id}-{file.filename}"

    # Create placeholder to get ID, then update path
    db_document = Document(
        owner_id=current_user.id,
        filename=object_name,
        original_filename=file.filename,
        mime_type=mime,
        file_size=len(content),
        storage_path=object_name,
        language_hint=language_hint,
        status="uploaded",
    )
    db.add(db_document)
    db.commit()
    db.refresh(db_document)

    object_name = f"{current_user.id}/{db_document.id}{extension}"
    storage_service.upload_file(object_name, content, mime)

    db_document.filename = object_name
    db_document.storage_path = object_name
    db.commit()
    db.refresh(db_document)

    return db_document


@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    return doc


@router.get("/{document_id}/image")
def get_document_image(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    try:
        content = storage_service.get_file(doc.storage_path)
        return StreamingResponse(io.BytesIO(content), media_type=doc.mime_type)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Could not retrieve image: {str(e)}")


@router.post("/{document_id}/export")
def export_document(
    document_id: str,
    payload: ExportRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    doc = db.query(Document).filter(Document.id == document_id, Document.owner_id == current_user.id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")

    query = db.query(Transcription).filter(Transcription.document_id == document_id)
    if payload.transcription_id:
        query = query.filter(Transcription.id == payload.transcription_id)
    transcription = query.order_by(Transcription.created_at.desc()).first()

    if not transcription:
        raise HTTPException(status_code=404, detail="No transcription found")

    text = transcription.corrected_text or transcription.raw_text
    filename_base = os.path.splitext(doc.original_filename)[0]

    if payload.format == "txt":
        content = export_service.export_text(text)
        media_type = "text/plain"
        extension = "txt"
    elif payload.format == "docx":
        content = export_service.export_docx(text, filename_base)
        media_type = "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        extension = "docx"
    elif payload.format == "pdf":
        content = export_service.export_pdf(text, filename_base)
        media_type = "application/pdf"
        extension = "pdf"
    else:
        raise HTTPException(status_code=400, detail="Unsupported export format")

    return StreamingResponse(
        io.BytesIO(content),
        media_type=media_type,
        headers={"Content-Disposition": f"attachment; filename={filename_base}_transcription.{extension}"},
    )
