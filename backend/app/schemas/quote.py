from typing import Optional, List
from pydantic import BaseModel, Field

class QuoteCreateRequest(BaseModel):
    title: str = "QUOTE"
    quote_number: str
    quote_date: str
    due_date: Optional[str] = None
    from_name: str
    from_details: Optional[str] = None
    to_name: str
    to_details: Optional[str] = None
    currency: str = "USD"
    currency_symbol: str = "$"
    subtotal: float = 0
    tax_total: float = 0
    total: float = 0
    notes: Optional[str] = None
    items: List[dict] = []
    extracted_json: Optional[dict] = None
    relationship_id: Optional[str] = None
    contract_id: Optional[str] = None
    recipient_email: Optional[str] = None

class QuoteApproveRequest(BaseModel):
    signature_data: Optional[str] = None

class QuoteRejectionRequest(BaseModel):
    reason_code: str # "pricing", "timeline", "scope", "typo", "other"
    details: str
    author_name: str

class CommentRequest(BaseModel):
    author_name: str
    body: str
    author_role: str = "client"
    element_reference: Optional[str] = None # Line item/Clause link
    comment_type: str = "Question" # Question, Change Request, Clarification

class QuoteRejectRequest(BaseModel):
    category: str = Field(..., description="Amount incorrect, Timeline wrong, Scope unclear, etc.")
    reason: str
    notes: Optional[str] = None
    context_block: Optional[dict] = None
