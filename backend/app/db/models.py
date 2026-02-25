"""SQLModel database models."""

import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, Text


class User(SQLModel, table=True):
    """Registered user."""

    __tablename__ = "users"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    hashed_password: str
    name: str = ""

    # Stripe
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    subscription_status: str = "free"  # "free" | "pro" | "cancelled"
    subscription_end: Optional[datetime] = None

    # Usage
    invoices_this_month: int = 0
    usage_reset_date: Optional[datetime] = None

    # Activity tracking
    last_login_at: Optional[datetime] = None
    login_count: int = 0
    total_extractions: int = 0
    total_voice_inputs: int = 0

    created_at: datetime = Field(default_factory=datetime.utcnow)


class BusinessProfile(SQLModel, table=True):
    """Saved business profile for quick invoice creation.

    Users can have multiple profiles (e.g. "Freelance", "Agency").
    One profile can be marked as default.
    Logo, signature, and watermark are stored as base64 strings.
    """

    __tablename__ = "business_profiles"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(index=True)

    # Identity
    label: str = "Default"  # e.g. "Freelance", "Agency", "Personal"
    is_default: bool = Field(default=False)

    # Business info
    name: str
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

    # Branding
    logo_url: Optional[str] = Field(default=None, sa_column=Column(Text))  # base64
    primary_color: str = "#D4A017"
    signature_data: Optional[str] = Field(default=None, sa_column=Column(Text))  # base64

    # Defaults
    default_currency: str = "USD"
    default_currency_symbol: str = "$"
    default_notes: Optional[str] = None

    # Watermark defaults
    watermark_enabled: bool = False
    watermark_type: str = "text"  # "text" | "image"
    watermark_text: str = "CONFIDENTIAL"
    watermark_image: Optional[str] = Field(default=None, sa_column=Column(Text))  # base64
    watermark_color: str = "#6B6B63"
    watermark_opacity: float = 0.15
    watermark_rotation: float = -45
    watermark_font_size: int = 60

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


class Invoice(SQLModel, table=True):
    """Generated invoice record."""

    __tablename__ = "invoices"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True)

    invoice_number: str
    invoice_date: str
    due_date: Optional[str] = None

    from_name: str
    from_details: Optional[str] = None
    to_name: str
    to_details: Optional[str] = None

    items: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    currency: str = "USD"
    currency_symbol: str = "$"

    subtotal: float = 0
    tax_total: float = 0
    total: float = 0

    notes: Optional[str] = None
    primary_color: str = "#06b6d4"

    pdf_filename: Optional[str] = None
    original_prompt: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)


class ActivityLog(SQLModel, table=True):
    """Tracks user activity for admin analytics.

    Actions: login, register, create_invoice, extract, voice_input,
             upgrade, downgrade, profile_create, profile_update
    """

    __tablename__ = "activity_logs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True)
    action: str = Field(index=True)  # e.g. "login", "create_invoice", "extract"
    details: Optional[str] = None  # JSON or text with extra info
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)


class ExtractionLog(SQLModel, table=True):
    """Tracks AI extraction usage for monitoring and billing."""

    __tablename__ = "extraction_logs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True)
    input_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    success: bool = True
    error_message: Optional[str] = None
    model: str = "claude-3-5-haiku-latest"
    items_extracted: int = 0
    response_time_ms: int = 0  # how long the API call took
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
