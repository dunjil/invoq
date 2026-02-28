"""SQLModel database models (V8 Relationship Architecture)."""

import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, Text

class User(SQLModel, table=True):
    """Registered user.
    Types: company_admin, contractor, individual.
    """
    __tablename__ = "users"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    full_name: str = ""
    name: str = "" # Alias for full_name
    hashed_password: str
    role: str = Field(default="contractor") # company_admin, contractor, individual

    stripe_customer_id: Optional[str] = None
    plan: str = Field(default="free") # free | pro
    subscription_status: str = Field(default="free") # Legacy alias for plan
    
    invoices_this_month: int = 0
    login_count: int = 0
    last_login_at: Optional[datetime] = None

    logo_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    tax_region: Optional[str] = None
    email_verified: bool = False

    created_at: datetime = Field(default_factory=datetime.utcnow)

class BusinessProfile(SQLModel, table=True):
    """Saved business profile for quick invoice creation."""
    __tablename__ = "business_profiles"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)

    label: str = "Default"
    is_default: bool = Field(default=False)

    name: str
    address: Optional[str] = Field(default=None, sa_column=Column(Text))
    email: Optional[str] = None
    phone: Optional[str] = None

    logo_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    primary_color: str = "#D4A017"

    default_currency: str = "USD"
    default_currency_symbol: str = "$"
    default_notes: Optional[str] = Field(default=None, sa_column=Column(Text))

    watermark_enabled: bool = False
    watermark_type: str = "text"
    watermark_text: str = "CONFIDENTIAL"
    watermark_image: Optional[str] = Field(default=None, sa_column=Column(Text))
    watermark_color: str = "#6B6B63"
    watermark_opacity: float = 0.15
    watermark_rotation: float = -45
    watermark_font_size: int = 60

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Company(SQLModel, table=True):
    """Company profile linked to an admin user."""
    __tablename__ = "companies"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    admin_user_id: str = Field(foreign_key="users.id", index=True)

    name: str
    address: Optional[str] = Field(default=None, sa_column=Column(Text))
    registration_number: Optional[str] = None
    logo_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    industry: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

class Relationship(SQLModel, table=True):
    """The core parent object connecting two parties."""
    __tablename__ = "relationships"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    initiator_id: str = Field(foreign_key="users.id", index=True)
    recipient_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True, nullable=True)
    recipient_email: Optional[str] = Field(default=None, index=True)

    # company_contractor | freelancer_individual | freelancer_company
    type: str = Field(default="company_contractor") 
    status: str = Field(default="active") # active, inactive, paused, ended
    
    start_date: Optional[str] = None
    billing_rate: Optional[str] = None
    billing_cycle: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

class Document(SQLModel, table=True):
    """Generated document record (Contract, NDA, MSA, SOW)."""
    __tablename__ = "documents"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    relationship_id: Optional[str] = Field(default=None, foreign_key="relationships.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True) # The creator
    recipient_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    recipient_email: Optional[str] = Field(default=None, index=True)

    type: str = Field(default="contract") # contract, nda, msa, sow
    status: str = Field(default="draft") # draft, sent, viewed, needs_revision, approved, signed, bounced
    version: int = Field(default=1)

    tracked_link_token: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)

    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None

    # Render fields
    contract_number: Optional[str] = None
    document_number: Optional[str] = None # V8 alias
    title: str = "Agreement"
    
    from_name: Optional[str] = None
    to_name: Optional[str] = None
    
    body_text: str = Field(default="", sa_column=Column(Text))
    notes: Optional[str] = None

    # Signatures
    issuer_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    recipient_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    signature_data: Optional[str] = None # Legacy compat
    client_signature_data: Optional[str] = None # Legacy compat
    
    # Audit fields for signatures
    signer_ip_address: Optional[str] = None
    signer_user_agent: Optional[str] = None

    metadata_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    editable_fields_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DocumentVersion(SQLModel, table=True):
    """Version history for contracts and NDAs."""
    __tablename__ = "document_versions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    document_id: str = Field(foreign_key="documents.id", index=True)
    version_number: int = Field(default=1)
    
    metadata_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    changed_by_id: str = Field(foreign_key="users.id")
    change_summary: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Signatory(SQLModel, table=True):
    """Signatories for a document."""
    __tablename__ = "signatories"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    document_id: str = Field(foreign_key="documents.id", index=True)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True, nullable=True)
    
    email: str = Field(index=True)
    role: str = "signatory" # or witness
    order_index: int = 0
    status: str = "pending" # pending, viewed, signed
    
    viewed_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    ip_address: Optional[str] = None
    tracked_token: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)

class DocumentComment(SQLModel, table=True):
    """Comments or revision requests left on a document."""
    __tablename__ = "document_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    document_id: str = Field(foreign_key="documents.id", index=True)
    author_id: str = Field(index=True)
    author_name: str = Field(default="Anonymous")
    author_role: str # "freelancer" or "client"
    body: str = Field(sa_column=Column(Text))
    
    element_reference: Optional[str] = None # Clause identifier
    comment_type: str = "Question" # Question, Change Request, Clarification
    is_resolved: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Legacy Aliases
Contract = Document
ContractComment = DocumentComment

class SavedClient(SQLModel, table=True):
    """Legacy client record for quick picking."""
    __tablename__ = "saved_clients"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Quote(SQLModel, table=True):
    """Project-specific scope agreements."""
    __tablename__ = "quotes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    relationship_id: Optional[str] = Field(default=None, foreign_key="relationships.id", index=True)
    issuer_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    recipient_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    recipient_email: Optional[str] = Field(default=None, index=True)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True) # Legacy alias for issuer_id

    quote_number: Optional[str] = None
    quote_date: Optional[str] = None
    currency: str = "USD"
    currency_symbol: str = "$"
    notes: Optional[str] = None

    # Legacy fields for PDF rendering
    from_name: Optional[str] = None
    from_details: Optional[str] = Field(default=None, sa_column=Column(Text))
    to_name: Optional[str] = None
    to_details: Optional[str] = Field(default=None, sa_column=Column(Text))

    line_items_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    subtotal: float = 0.0
    tax_total: float = 0.0
    total: float = 0.0
    tax_rate: float = 0.0
    
    timeline: Optional[str] = None
    rejection_reason: Optional[str] = None
    rejection_category: Optional[str] = None
    editable_fields_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    # Style/Signature
    primary_color: str = "#3498db"
    issuer_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    recipient_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    pdf_filename: Optional[str] = None

    status: str = Field(default="draft")
    version: int = Field(default=1)
    tracked_token: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)
    tracked_link_token: Optional[str] = None # Alias for tracked_token for legacy code
    extracted_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
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
    """Comments left on a quote."""
    __tablename__ = "quote_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    quote_id: str = Field(foreign_key="quotes.id", index=True)
    author_id: str = Field(index=True)
    author_name: str = Field(default="Anonymous")
    author_role: str # "freelancer" or "client"
    body: str = Field(sa_column=Column(Text))
    
    element_reference: Optional[str] = None # Line item identifier
    comment_type: str = "Question"
    is_resolved: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Invoice(SQLModel, table=True):
    """Billing record linked to relationship."""
    __tablename__ = "invoices"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    relationship_id: Optional[str] = Field(default=None, foreign_key="relationships.id", index=True)
    issuer_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    recipient_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    recipient_email: Optional[str] = Field(default=None, index=True)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True) # Legacy alias for issuer_id
    
    quote_id: Optional[str] = Field(default=None, foreign_key="quotes.id", index=True, nullable=True)

    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    currency: str = "USD"
    currency_symbol: str = "$"
    notes: Optional[str] = None

    # Legacy fields for PDF rendering
    from_name: Optional[str] = None
    from_details: Optional[str] = Field(default=None, sa_column=Column(Text))
    to_name: Optional[str] = None
    to_details: Optional[str] = Field(default=None, sa_column=Column(Text))

    line_items_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    subtotal: float = 0.0
    tax_total: float = 0.0
    total: float = 0.0
    tax_amount: float = 0.0
    due_date: Optional[str] = None
    rejection_reason: Optional[str] = None
    rejection_category: Optional[str] = None

    # Style/Signature
    primary_color: str = "#3498db"
    issuer_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    recipient_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    pdf_filename: Optional[str] = None

    status: str = Field(default="draft")
    tracked_token: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)

    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    accessed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
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
    """Comments left on an active invoice."""
    __tablename__ = "invoice_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    invoice_id: str = Field(foreign_key="invoices.id", index=True)
    author_id: str = Field(index=True)
    author_name: str = Field(default="Anonymous")
    author_role: str # "freelancer" or "client"
    body: str = Field(sa_column=Column(Text))
    
    element_reference: Optional[str] = None
    comment_type: str = "Question"
    is_resolved: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentRecord(SQLModel, table=True):
    """Confirmed payment event."""
    __tablename__ = "payment_records"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    invoice_id: str = Field(foreign_key="invoices.id", index=True)
    relationship_id: str = Field(foreign_key="relationships.id", index=True)
    
    amount: float = 0.0
    currency: str = "USD"
    paid_at: datetime = Field(default_factory=datetime.utcnow)
    
    confirmed_by_id: str = Field(foreign_key="users.id")
    method_note: Optional[str] = None

class ActivityLog(SQLModel, table=True):
    """Tracks user activity."""
    __tablename__ = "activity_logs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True)
    action: str = Field(index=True)
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

class ExtractionLog(SQLModel, table=True):
    """Tracks AI extraction usage."""
    __tablename__ = "extraction_logs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True)
    input_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    success: bool = True
    error_message: Optional[str] = None
    model: str = "claude-3-5-haiku-latest"
    items_extracted: int = 0
    response_time_ms: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

class TaxLedger(SQLModel, table=True):
    """Tax position tracking."""
    __tablename__ = "tax_ledgers"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    
    tax_year: str # e.g. "2026-2027"
    total_earned: float = 0.0
    total_tax_collected: float = 0.0

    q1_q4_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    per_relationship_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

class TrustProfile(SQLModel, table=True):
    """Verified badge dimensions and metrics."""
    __tablename__ = "trust_profiles"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True, unique=True)
    client_user_id: Optional[str] = None # Legacy alias for user_id
    
    invoice_accuracy: float = 0.0
    on_time_rate: float = 0.0
    avg_response_hours: float = 0.0
    dispute_rate: float = 0.0
    avg_relationship_days: float = 0.0
    total_engagements: int = 0
    
    last_updated: datetime = Field(default_factory=datetime.utcnow)

# Alias for V8 logic
ClientProfile = TrustProfile
