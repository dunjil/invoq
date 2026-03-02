import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON, Text

class Document(SQLModel, table=True):
    """Generated document record (Contract, NDA, MSA, SOW)."""
    __tablename__ = "contracts"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    relationship_id: Optional[str] = Field(default=None, foreign_key="relationships.id", index=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    recipient_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    recipient_email: Optional[str] = Field(default=None, index=True)
    contract_id: Optional[str] = Field(default=None, foreign_key="contracts.id", index=True)

    type: str = Field(default="contract")
    status: str = Field(default="draft")
    version: int = Field(default=1)
    
    is_template: bool = Field(default=False, index=True)
    template_name: Optional[str] = None

    tracked_link_token: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)

    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None

    contract_number: Optional[str] = None
    document_number: Optional[str] = None
    title: str = "Agreement"
    
    from_name: Optional[str] = None
    to_name: Optional[str] = None
    
    body_text: str = Field(default="", sa_column=Column(Text))
    notes: Optional[str] = None
    
    logo_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    primary_color: Optional[str] = Field(default="#D4A017")
    include_issuer_signature: bool = Field(default=True)
    include_recipient_signature: bool = Field(default=True)
    watermark_enabled: bool = Field(default=False)
    watermark_text: Optional[str] = Field(default="CONFIDENTIAL")
    watermark_opacity: float = Field(default=0.1)

    issuer_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    recipient_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    signature_data: Optional[str] = None
    client_signature_data: Optional[str] = None
    
    signer_ip_address: Optional[str] = None
    signer_user_agent: Optional[str] = None

    metadata_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    editable_fields_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class DocumentVersion(SQLModel, table=True):
    __tablename__ = "document_versions"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    document_id: str = Field(foreign_key="contracts.id", index=True)
    version_number: int = Field(default=1)
    
    metadata_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    changed_by_id: str = Field(foreign_key="users.id")
    change_summary: Optional[str] = None
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Signatory(SQLModel, table=True):
    __tablename__ = "signatories"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    document_id: str = Field(foreign_key="contracts.id", index=True)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True, nullable=True)
    
    email: str = Field(index=True)
    role: str = "signatory"
    order_index: int = 0
    status: str = "pending"
    
    viewed_at: Optional[datetime] = None
    signed_at: Optional[datetime] = None
    signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    ip_address: Optional[str] = None
    tracked_token: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)

class DocumentComment(SQLModel, table=True):
    __tablename__ = "contract_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    document_id: str = Field(foreign_key="contracts.id", index=True)
    author_id: str = Field(index=True)
    author_name: str = Field(default="Anonymous")
    author_role: str
    body: str = Field(sa_column=Column(Text))
    
    element_reference: Optional[str] = None
    comment_type: str = "Question"
    is_resolved: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

# Legacy Aliases
Contract = Document
ContractComment = DocumentComment

class Quote(SQLModel, table=True):
    __tablename__ = "quotes"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    relationship_id: Optional[str] = Field(default=None, foreign_key="relationships.id", index=True)
    contract_id: Optional[str] = Field(default=None, foreign_key="contracts.id", index=True)
    issuer_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    recipient_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    recipient_email: Optional[str] = Field(default=None, index=True)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)

    quote_number: Optional[str] = None
    quote_date: Optional[str] = None
    currency: str = "USD"
    currency_symbol: str = "$"
    notes: Optional[str] = None

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

    primary_color: str = "#3498db"
    issuer_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    recipient_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    pdf_filename: Optional[str] = None

    status: str = Field(default="draft")
    version: int = Field(default=1)
    tracked_token: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)
    tracked_link_token: str = Field(default_factory=lambda: str(uuid.uuid4()), index=True)
    extracted_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    approved_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class QuoteLineItem(SQLModel, table=True):
    __tablename__ = "quote_line_items"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    quote_id: str = Field(foreign_key="quotes.id", index=True)
    
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    tax_rate: float = 0.0
    total: float = 0.0

class QuoteComment(SQLModel, table=True):
    __tablename__ = "quote_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    quote_id: str = Field(foreign_key="quotes.id", index=True)
    author_id: str = Field(index=True)
    author_name: str = Field(default="Anonymous")
    author_role: str
    body: str = Field(sa_column=Column(Text))
    
    element_reference: Optional[str] = None
    comment_type: str = "Question"
    is_resolved: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class Invoice(SQLModel, table=True):
    __tablename__ = "invoices"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    relationship_id: Optional[str] = Field(default=None, foreign_key="relationships.id", index=True)
    contract_id: Optional[str] = Field(default=None, foreign_key="contracts.id", index=True)
    issuer_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    recipient_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    recipient_email: Optional[str] = Field(default=None, index=True)
    user_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True)
    
    quote_id: Optional[str] = Field(default=None, foreign_key="quotes.id", index=True, nullable=True)

    invoice_number: Optional[str] = None
    invoice_date: Optional[str] = None
    currency: str = "USD"
    currency_symbol: str = "$"
    notes: Optional[str] = None

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

    primary_color: str = "#3498db"
    issuer_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    recipient_signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    pdf_filename: Optional[str] = None
    editable_fields_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))

    status: str = Field(default="draft")
    tracked_token: str = Field(default_factory=lambda: str(uuid.uuid4()), unique=True, index=True)
    tracked_link_token: str = Field(default_factory=lambda: str(uuid.uuid4()), index=True)

    sent_at: Optional[datetime] = None
    viewed_at: Optional[datetime] = None
    accessed_at: Optional[datetime] = None
    paid_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class InvoiceLineItem(SQLModel, table=True):
    __tablename__ = "invoice_line_items"
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    invoice_id: str = Field(foreign_key="invoices.id", index=True)
    
    description: str
    quantity: float = 1.0
    unit_price: float = 0.0
    tax_rate: float = 0.0
    total: float = 0.0

class InvoiceComment(SQLModel, table=True):
    __tablename__ = "invoice_comments"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    invoice_id: str = Field(foreign_key="invoices.id", index=True)
    author_id: str = Field(index=True)
    author_name: str = Field(default="Anonymous")
    author_role: str
    body: str = Field(sa_column=Column(Text))
    
    element_reference: Optional[str] = None
    comment_type: str = "Question"
    is_resolved: bool = False
    
    created_at: datetime = Field(default_factory=datetime.utcnow)

class PaymentRecord(SQLModel, table=True):
    __tablename__ = "payment_records"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    invoice_id: str = Field(foreign_key="invoices.id", index=True)
    relationship_id: str = Field(foreign_key="relationships.id", index=True)
    
    amount: float = 0.0
    currency: str = "USD"
    paid_at: datetime = Field(default_factory=datetime.utcnow)
    
    confirmed_by_id: str = Field(foreign_key="users.id")
    method_note: Optional[str] = None
