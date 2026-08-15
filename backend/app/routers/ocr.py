from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_user
from app.models import Document, Transcription, Correction, User
from app.schemas import (
    OCRRequest,
    TranscriptionResponse,
    CorrectionCreate,
    CorrectionResponse,
    SuggestionRequest,
    SuggestionResponse,
)
from app.services.storage_service import storage_service
from app.services.ocr_service import ocr_service
from app.services.language_service import language_service
from app.services.billing_service import BillingService

router = APIRouter()


@router.post("/{document_id}", response_model=TranscriptionResponse)
def process_ocr(
    document_id: str,
    request: OCRRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id,
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    billing = BillingService(db)
    billing.seed_plans()
    can_process, used, limit = billing.can_process_ocr(current_user.id)
    if not can_process:
        raise HTTPException(
            status_code=403,
            detail=f"Quota exceeded: {used}/{limit} pages used this month. Please upgrade your plan.",
        )

    try:
        image_bytes = storage_service.get_file(document.storage_path)
        result = ocr_service.transcribe(
            image_bytes,
            mode=request.mode,
            language_hint=request.language_hint,
        )
    except Exception as e:
        document.status = "failed"
        db.commit()
        raise HTTPException(status_code=500, detail=f"OCR processing failed: {str(e)}")

    transcription = Transcription(
        document_id=document.id,
        mode=result["mode"],
        raw_text=result["raw_text"],
        confidence=result["confidence"],
        processing_time_ms=result["processing_time_ms"],
        result_metadata={
            "lines": result.get("lines", []),
            "words": result.get("words", []),
            "characters": result.get("characters", []),
        },
    )
    db.add(transcription)

    document.status = "processed"
    db.commit()
    db.refresh(transcription)

    billing.log_ocr_usage(current_user.id, document.id)

    return transcription


@router.get("/{document_id}/transcriptions", response_model=list[TranscriptionResponse])
def list_transcriptions(
    document_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = db.query(Document).filter(
        Document.id == document_id,
        Document.owner_id == current_user.id,
    ).first()
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")

    return document.transcriptions


@router.post("/transcriptions/{transcription_id}/correct", response_model=TranscriptionResponse)
def correct_transcription(
    transcription_id: str,
    payload: CorrectionCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transcription = (
        db.query(Transcription)
        .join(Document)
        .filter(
            Transcription.id == transcription_id,
            Document.owner_id == current_user.id,
        )
        .first()
    )
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    correction = Correction(
        transcription_id=transcription.id,
        original_value=payload.original_value,
        corrected_value=payload.corrected_value,
        word_position=payload.word_position,
        submitted_by_user_id=current_user.id,
    )
    db.add(correction)

    transcription.corrected_text = payload.corrected_value
    db.commit()
    db.refresh(transcription)

    return transcription


@router.get("/transcriptions/{transcription_id}/corrections", response_model=list[CorrectionResponse])
def list_corrections(
    transcription_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    transcription = (
        db.query(Transcription)
        .join(Document)
        .filter(
            Transcription.id == transcription_id,
            Document.owner_id == current_user.id,
        )
        .first()
    )
    if not transcription:
        raise HTTPException(status_code=404, detail="Transcription not found")

    return transcription.corrections


@router.post("/suggest", response_model=SuggestionResponse)
def suggest_word(
    request: SuggestionRequest,
    current_user: User = Depends(get_current_user),
):
    suggestions = language_service.suggest_words(
        word=request.word,
        context=request.context,
        top_k=request.top_k or 5,
    )
    return {"suggestions": suggestions}
