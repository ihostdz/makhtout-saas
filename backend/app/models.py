import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime, Text, Integer, ForeignKey, Boolean, Float, Index
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from app.database import Base


def generate_uuid():
    return str(uuid.uuid4())


class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    documents = relationship("Document", back_populates="owner")
    subscription = relationship("Subscription", back_populates="user", uselist=False)


class Document(Base):
    __tablename__ = "documents"

    __table_args__ = (
        Index('idx_documents_owner_id', 'owner_id'),
        Index('idx_documents_status', 'status'),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    owner_id = Column(String, ForeignKey("users.id"), nullable=False)
    filename = Column(String, nullable=False)
    original_filename = Column(String, nullable=False)
    mime_type = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    storage_path = Column(String, nullable=False)
    language_hint = Column(String, default="auto")
    status = Column(String, default="pending")
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="documents")
    transcriptions = relationship("Transcription", back_populates="document", cascade="all, delete-orphan")


class Transcription(Base):
    __tablename__ = "transcriptions"

    __table_args__ = (
        Index('idx_transcriptions_document_id', 'document_id'),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    mode = Column(String, default="machine")
    raw_text = Column(Text, nullable=False)
    corrected_text = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    processing_time_ms = Column(Integer, nullable=True)
    result_metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    document = relationship("Document", back_populates="transcriptions")
    corrections = relationship("Correction", back_populates="transcription", cascade="all, delete-orphan")


class Correction(Base):
    __tablename__ = "corrections"

    __table_args__ = (
        Index('idx_corrections_transcription_id', 'transcription_id'),
        Index('idx_corrections_status', 'is_validated_by_admin', 'is_rejected_by_admin'),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    transcription_id = Column(String, ForeignKey("transcriptions.id"), nullable=False)
    original_value = Column(Text, nullable=False)
    corrected_value = Column(Text, nullable=False)
    word_position = Column(Integer, nullable=True)
    is_validated_by_admin = Column(Boolean, default=False)
    is_rejected_by_admin = Column(Boolean, default=False)
    submitted_by_user_id = Column(String, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    transcription = relationship("Transcription", back_populates="corrections")


class Plan(Base):
    __tablename__ = "plans"

    id = Column(String, primary_key=True, default=generate_uuid)
    slug = Column(String, unique=True, nullable=False)
    name_fr = Column(String, nullable=False)
    name_ar = Column(String, nullable=False)
    description_fr = Column(String, nullable=True)
    description_ar = Column(String, nullable=True)
    price_da = Column(Integer, nullable=True)
    price_usd = Column(Float, nullable=True)
    billing_interval = Column(String, nullable=True)
    pages_per_month = Column(Integer, default=10)
    features = Column(JSONB, default=list)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class Subscription(Base):
    __tablename__ = "subscriptions"

    __table_args__ = (
        Index('idx_subscriptions_user_id', 'user_id'),
        Index('idx_subscriptions_provider', 'provider_subscription_id'),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False, unique=True)
    plan_id = Column(String, ForeignKey("plans.id"), nullable=False)
    status = Column(String, default="active")
    started_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)
    payment_provider = Column(String, nullable=True)
    provider_subscription_id = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    user = relationship("User", back_populates="subscription")
    plan = relationship("Plan")


class Payment(Base):
    __tablename__ = "payments"

    __table_args__ = (
        Index('idx_payments_user_id', 'user_id'),
        Index('idx_payments_status', 'status'),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    subscription_id = Column(String, ForeignKey("subscriptions.id"), nullable=True)
    plan_id = Column(String, ForeignKey("plans.id"), nullable=False)
    amount = Column(Float, nullable=False)
    currency = Column(String, nullable=False)
    status = Column(String, default="pending")
    provider = Column(String, nullable=False)
    provider_payment_id = Column(String, nullable=True)
    metadata = Column(JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class UsageLog(Base):
    __tablename__ = "usage_logs"

    __table_args__ = (
        Index('idx_usage_logs_user_action_date', 'user_id', 'action', 'created_at'),
    )

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    document_id = Column(String, ForeignKey("documents.id"), nullable=True)
    action = Column(String, nullable=False)
    pages_count = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)
