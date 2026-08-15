from pydantic import BaseModel, EmailStr
from typing import Optional, List, Dict, Any
from datetime import datetime


class UserCreate(BaseModel):
    email: EmailStr
    password: str
    full_name: Optional[str] = None


class UserResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str]
    is_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


class DocumentCreate(BaseModel):
    language_hint: Optional[str] = "auto"


class DocumentResponse(BaseModel):
    id: str
    filename: str
    original_filename: str
    mime_type: str
    file_size: int
    status: str
    language_hint: str
    created_at: datetime

    class Config:
        from_attributes = True


class TranscriptionResponse(BaseModel):
    id: str
    document_id: str
    mode: str
    raw_text: str
    corrected_text: Optional[str]
    confidence: float
    processing_time_ms: Optional[int]
    result_metadata: Optional[Dict[str, Any]] = None
    created_at: datetime

    class Config:
        from_attributes = True


class SuggestionRequest(BaseModel):
    word: str
    context: str
    language_hint: Optional[str] = "auto"
    top_k: Optional[int] = 5


class SuggestionResponse(BaseModel):
    suggestions: List[str]


class CorrectionCreate(BaseModel):
    original_value: str
    corrected_value: str
    word_position: Optional[int] = None


class CorrectionResponse(BaseModel):
    id: str
    transcription_id: str
    original_value: str
    corrected_value: str
    word_position: Optional[int]
    is_validated_by_admin: bool
    is_rejected_by_admin: bool
    created_at: datetime

    class Config:
        from_attributes = True


class OCRRequest(BaseModel):
    mode: Optional[str] = "machine"
    language_hint: Optional[str] = "auto"


class ExportRequest(BaseModel):
    format: str = "txt"
    transcription_id: Optional[str] = None


class PlanResponse(BaseModel):
    id: str
    slug: str
    name_fr: str
    name_ar: str
    description_fr: Optional[str]
    description_ar: Optional[str]
    price_da: Optional[int]
    price_usd: Optional[float]
    billing_interval: Optional[str]
    pages_per_month: int
    features: List[str]

    class Config:
        from_attributes = True


class SubscriptionResponse(BaseModel):
    id: str
    plan_id: str
    status: str
    started_at: datetime
    expires_at: Optional[datetime]
    payment_provider: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class BillingInfoResponse(BaseModel):
    user: UserResponse
    subscription: Optional[SubscriptionResponse]
    plan: Optional[PlanResponse]
    pages_used_this_month: int
    pages_limit: int
    remaining_pages: int


class CheckoutRequest(BaseModel):
    plan_slug: str
    provider: str
    success_url: Optional[str] = None
    cancel_url: Optional[str] = None


class CheckoutResponse(BaseModel):
    checkout_url: Optional[str] = None
    order_id: Optional[str] = None
    message: Optional[str] = None


class ManualPaymentRequest(BaseModel):
    plan_slug: str
    reference: str
    amount: float
    currency: str
    notes: Optional[str] = None


class ManualPaymentResponse(BaseModel):
    id: str
    status: str
    message: str
