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
    role: str = Field(default="freelancer")  # "freelancer" | "client"

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
    """Saved business profile for quick invoice creation."""

    __tablename__ = "business_profiles"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(index=True)

    # Identity
    label: str = "Default"  # e.g. "Freelance", "Agency", "Personal"
    is_default: bool = Field(default=False)

    # Business info
    business_name: Optional[str] = None
    name: str
    address: Optional[str] = None
    email: Optional[str] = None
    phone: Optional[str] = None

    # V5 fields
    payment_terms: Optional[str] = None
    tax_region: Optional[str] = None
    vat_registered: bool = False

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


class Quote(SQLModel, table=True):
    """Generated quote record."""
    __tablename__ = "quotes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(index=True)

    raw_input: Optional[str] = Field(default=None, sa_column=Column(Text))
    extracted_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    
    status: str = Field(default="draft") # draft, sent, viewed, needs_revision, approved, converted, bounced
    version: int = Field(default=1)
    
    tracked_link_token: str = Field(default_factory=lambda: str(uuid.uuid4()))
    
    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    due_date: Optional[str] = None
    
    # Render fields
    quote_number: Optional[str] = None
    quote_date: Optional[str] = None
    from_name: Optional[str] = None
    to_name: Optional[str] = None
    currency: str = "USD"
    currency_symbol: str = "$"
    subtotal: float = 0
    tax_total: float = 0
    total: float = 0
    notes: Optional[str] = None
    
    signature_data: Optional[str] = Field(default=None, sa_column=Column(Text))
    client_signature_data: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class QuoteLineItem(SQLModel, table=True):
    """Line item for a Quote."""
    __tablename__ = "quote_line_items"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    quote_id: str = Field(foreign_key="quotes.id", index=True)
    
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    tax_rate: float = 0.0
    total: float = 0.0

class QuoteComment(SQLModel, table=True):
    """Comments left on a quote by a client or freelancer."""
    __tablename__ = "quote_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    quote_id: str = Field(foreign_key="quotes.id", index=True)
    author_id: str = Field(index=True)
    author_name: str = Field(default="Anonymous")
    author_role: str # "freelancer" or "client"
    body: str = Field(sa_column=Column(Text))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Invoice(SQLModel, table=True):
    """Generated invoice record."""

    __tablename__ = "invoices"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True)
    quote_id: Optional[str] = Field(default=None, foreign_key="quotes.id", index=True, nullable=True)

    extracted_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    status: str = Field(default="draft") # draft, sent, viewed, acknowledged, paid, overdue
    tracked_link_token: str = Field(default_factory=lambda: str(uuid.uuid4()))

    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None

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

    signature_data: Optional[str] = Field(default=None, sa_column=Column(Text))
    client_signature_data: Optional[str] = Field(default=None, sa_column=Column(Text))

    pdf_filename: Optional[str] = None
    original_prompt: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

class InvoiceLineItem(SQLModel, table=True):
    """Line item for an Invoice."""
    __tablename__ = "invoice_line_items"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    invoice_id: str = Field(foreign_key="invoices.id", index=True)
    
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    tax_rate: float = 0.0
    total: float = 0.0

class InvoiceComment(SQLModel, table=True):
    """Comments left on an active invoice by a client or freelancer."""
    __tablename__ = "invoice_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    invoice_id: str = Field(foreign_key="invoices.id", index=True)
    author_id: str = Field(index=True)
    author_name: str = Field(default="Anonymous")
    author_role: str # "freelancer" or "client"
    body: str = Field(sa_column=Column(Text))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class TaxLedger(SQLModel, table=True):
    """Tax tracking layer."""
    __tablename__ = "tax_ledgers"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(index=True)
    
    tax_year: str # e.g. "2026"
    total_earned: float = 0.0
    total_tax_collected: float = 0.0

    # Quarterly breakdown
    q1_earned: float = 0.0
    q1_tax: float = 0.0
    q2_earned: float = 0.0
    q2_tax: float = 0.0
    q3_earned: float = 0.0
    q3_tax: float = 0.0
    q4_earned: float = 0.0
    q4_tax: float = 0.0

class ClientProfile(SQLModel, table=True):
    """Client payment and approval profiling for the Trust Network."""
    __tablename__ = "client_profiles"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    client_user_id: str = Field(index=True, unique=True)
    
    avg_days_to_approve: float = 0.0
    avg_revision_rounds: float = 0.0
    avg_days_to_pay: float = 0.0
    on_time_rate: float = 0.0 # Percentage 0-100
    total_docs_received: int = 0
    
    last_updated: datetime = Field(default_factory=datetime.utcnow)


class SavedClient(SQLModel, table=True):
    """Client address book entry saved by a user for auto-filling quotes/invoices."""
    __tablename__ = "saved_clients"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(index=True)  # The freelancer who saved this client

    name: str  # e.g., "Acme Corp" or "Jane Doe"
    email: Optional[str] = None
    address: Optional[str] = Field(default=None, sa_column=Column(Text))
    phone: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)


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
