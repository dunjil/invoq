from typing import Optional, List
from pydantic import BaseModel

class BundleCreateRequest(BaseModel):
    name: str
    description: Optional[str] = None
    template_ids: List[str]

class BundleInvokeRequest(BaseModel):
    recipient_email: str
    recipient_name: str
    effective_date: str
    sender_name: Optional[str] = None

class CheckoutResponse(BaseModel):
    url: Optional[str] = None
    error: Optional[str] = None

class SubscriptionStatus(BaseModel):
    status: str  # "free" | "pro" | "cancelled"
    invoices_this_month: int
    monthly_limit: int
    can_generate: bool

class DocumentSummary(BaseModel):
    id: str
    token: Optional[str] = None
    type: str # "QUOTE" or "INVOICE"
    document_number: str
    document_date: str
    to_name: str
    total: float
    currency_symbol: str
    status: str
    created_at: str
    comment_count: int = 0
