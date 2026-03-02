from typing import Optional, List
from pydantic import BaseModel, Field

class ExtractionRequest(BaseModel):
    text: str = Field(..., max_length=5000, description="Natural language description or document text")

class ExtractedItem(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float = 0
    tax_rate: float = 0

class ExtractedInvoice(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    items: List[ExtractedItem] = []
    due_date: Optional[str] = None
    currency: str = "USD"
    currency_symbol: str = "$"
    notes: Optional[str] = None

class ExtractedLegal(BaseModel):
    title: str = "Agreement"
    type: str = "contract"  # contract, nda, msa, sow
    from_name: Optional[str] = None
    to_name: Optional[str] = None
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    body_text: str = ""
    summary: Optional[str] = None

class ExtractionResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None
