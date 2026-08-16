import csv
import io
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from app.database import get_db
from app.dependencies import get_current_admin
from app.models import Correction, Transcription, Document, User, Payment
from app.schemas import CorrectionResponse
from app.services.billing_service import BillingService

router = APIRouter()


@router.get("/corrections", response_model=List[CorrectionResponse])
def list_pending_corrections(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    return (
        db.query(Correction)
        .filter(
            Correction.is_validated_by_admin == False,
            Correction.is_rejected_by_admin == False,
        )
        .order_by(Correction.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )


@router.post("/corrections/{correction_id}/validate", response_model=CorrectionResponse)
def validate_correction(
    correction_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    correction = db.query(Correction).filter(Correction.id == correction_id).first()
    if not correction:
        raise HTTPException(status_code=404, detail="Correction not found")

    correction.is_validated_by_admin = True
    correction.is_rejected_by_admin = False
    db.commit()
    db.refresh(correction)
    return correction


@router.post("/corrections/{correction_id}/reject", response_model=CorrectionResponse)
def reject_correction(
    correction_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    correction = db.query(Correction).filter(Correction.id == correction_id).first()
    if not correction:
        raise HTTPException(status_code=404, detail="Correction not found")

    correction.is_validated_by_admin = False
    correction.is_rejected_by_admin = True
    db.commit()
    db.refresh(correction)
    return correction


@router.get("/corrections/export")
def export_validated_corrections(
    format: str = "json",
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    corrections = (
        db.query(Correction)
        .filter(Correction.is_validated_by_admin == True)
        .order_by(Correction.created_at.desc())
        .all()
    )

    data = []
    for c in corrections:
        transcription = db.query(Transcription).filter(Transcription.id == c.transcription_id).first()
        document = db.query(Document).filter(Document.id == transcription.document_id).first() if transcription else None
        data.append({
            "id": c.id,
            "original_value": c.original_value,
            "corrected_value": c.corrected_value,
            "word_position": c.word_position,
            "document_id": document.id if document else None,
            "document_filename": document.original_filename if document else None,
            "transcription_id": c.transcription_id,
            "created_at": c.created_at.isoformat(),
        })

    if format == "csv":
        output = io.StringIO()
        writer = csv.DictWriter(output, fieldnames=data[0].keys() if data else [])
        writer.writeheader()
        writer.writerows(data)
        return StreamingResponse(
            io.BytesIO(output.getvalue().encode()),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=corrections.csv"},
        )

    return data


@router.get("/payments")
def list_pending_payments(
    skip: int = 0,
    limit: int = 50,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    payments = (
        db.query(Payment)
        .filter(Payment.status == "pending")
        .order_by(Payment.created_at.desc())
        .offset(skip)
        .limit(limit)
        .all()
    )

    result = []
    for payment in payments:
        user = db.query(User).filter(User.id == payment.user_id).first()
        result.append({
            "id": payment.id,
            "user_email": user.email if user else None,
            "amount": payment.amount,
            "currency": payment.currency,
            "provider": payment.provider,
            "payment_metadata": payment.payment_metadata,
            "created_at": payment.created_at.isoformat(),
        })

    return result


@router.post("/payments/{payment_id}/validate")
def validate_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment.status = "completed"
    db.commit()

    billing = BillingService(db)
    duration_months = 12 if payment.currency == "USD" and payment.amount >= 100 else 1
    billing.activate_subscription(
        user_id=payment.user_id,
        plan_id=payment.plan_id,
        provider=payment.provider,
        duration_months=duration_months,
    )

    db.refresh(payment)
    return {"status": "ok", "payment_id": payment.id}


@router.post("/payments/{payment_id}/reject")
def reject_payment(
    payment_id: str,
    db: Session = Depends(get_db),
    admin: User = Depends(get_current_admin),
):
    payment = db.query(Payment).filter(Payment.id == payment_id).first()
    if not payment:
        raise HTTPException(status_code=404, detail="Payment not found")

    payment.status = "rejected"
    db.commit()
    db.refresh(payment)
    return {"status": "ok", "payment_id": payment.id}
