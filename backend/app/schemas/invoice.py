from typing import Optional, List
from pydantic import BaseModel, Field

class InvoiceItem(BaseModel):
    description: str = Field(..., max_length=200)
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    tax_rate: float = Field(default=0, ge=0, le=100)

class InvoiceAddress(BaseModel):
    name: str = Field(..., max_length=100)
    address_line1: str = Field(default="", max_length=200)
    address_line2: Optional[str] = Field(default=None, max_length=200)
    city: str = Field(default="", max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    postal_code: str = Field(default="", max_length=20)
    country: str = Field(default="", max_length=100)
    email: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)

class WatermarkConfig(BaseModel):
    enabled: bool = False
    content: Optional[str] = None
    content_type: str = "text"
    color: str = "#6b7280"
    opacity: float = Field(default=0.15, ge=0.05, le=1.0)
    rotation: int = Field(default=-45, ge=-90, le=90)
    font_size: int = Field(default=60, ge=20, le=200)

class InvoiceRequest(BaseModel):
    title: str = Field(default="INVOICE", max_length=50)
    invoice_number: Optional[str] = Field(default=None, max_length=50)
    quote_number: Optional[str] = Field(default=None, max_length=50)
    invoice_date: str
    due_date: Optional[str] = None

    from_address: InvoiceAddress
    to_address: InvoiceAddress
    items: List[InvoiceItem] = Field(..., min_length=1, max_length=50)

    currency: str = Field(default="USD", max_length=5)
    currency_symbol: str = Field(default="$", max_length=5)
    notes: Optional[str] = Field(default=None, max_length=5000)
    terms: Optional[str] = Field(default=None, max_length=1000)
    amount_in_words: Optional[str] = Field(default=None, max_length=200)
    logo_url: Optional[str] = None
    signature_data: Optional[str] = None # V8: issuer_signature_base64
    client_signature_data: Optional[str] = None # V8: recipient_signature_base64

    primary_color: str = "#3498db"
    template: str = "modern"
    show_tax: bool = True
    show_signature_section: bool = True

    watermark: Optional[WatermarkConfig] = None
    relationship_id: Optional[str] = None
    contract_id: Optional[str] = None
    recipient_email: Optional[str] = None

class InvoiceResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    error: Optional[str] = None
    invoice_number: Optional[str] = None
    total: Optional[float] = None
    subtotal: Optional[float] = None
    tax_total: Optional[float] = None
    tracked_link_token: Optional[str] = None
    invoice_id: Optional[str] = None

class InvoiceDisputeRequest(BaseModel):
    reason_code: str # "pricing", "items", "details", "other"
    details: str
    author_name: str

class InvoiceAcknowledgeRequest(BaseModel):
    payment_method: Optional[str] = None

class InvoiceCommentRequest(BaseModel):
    author_name: str
    body: str
    author_role: str = "client"
    element_reference: Optional[str] = None # Clause/Item link
    comment_type: str = "Question" # Question, Change Request, Clarification

class InvoiceRejectRequest(BaseModel):
    category: str = Field(..., description="Amount incorrect, Date range wrong, Missing information, etc.")
    reason: str
    notes: Optional[str] = None
    context_block: Optional[dict] = None # { "field": "Amount", "current": "$2000", "requested": "$1500" }

class InvoicePaidRequest(BaseModel):
    confirmed_by_id: Optional[str] = None
    method_note: Optional[str] = None
