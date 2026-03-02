from typing import Optional
from pydantic import BaseModel, ConfigDict

class DocumentCreateRequest(BaseModel):
    title: str = "Agreement"
    type: str = "contract" # contract, nda, msa, sow
    document_number: str = ""
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    
    from_name: str = ""
    to_name: str = ""
    
    body_text: str = ""
    notes: Optional[str] = None
    recipient_email: Optional[str] = None
    relationship_id: Optional[str] = None
    contract_id: Optional[str] = None
    editable_fields_json: Optional[dict] = None # { "clause_1": { "label": "Start Date", "value": "" } }

    # Formatting & Style
    logo_base64: Optional[str] = None
    primary_color: str = "#D4A017"
    
    # Signatures configuration
    include_issuer_signature: bool = True
    include_recipient_signature: bool = True
    issuer_signature_base64: Optional[str] = None # For pre-signed docs
    recipient_signature_base64: Optional[str] = None
    signed_at: Optional[str] = None
    
    # Watermark
    watermark_enabled: bool = False
    watermark_text: str = "CONFIDENTIAL"
    watermark_opacity: float = 0.1

    # Templates
    is_template: bool = False
    template_name: Optional[str] = None

    # V8 Compat
    contract_number: Optional[str] = None
    relationship_id: Optional[str] = None
    recipient_email: Optional[str] = None

    model_config = ConfigDict(extra='ignore')

class DocumentApproveRequest(BaseModel):
    signature_data: Optional[str] = None # Base64
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None

class DocumentCommentRequest(BaseModel):
    author_name: str
    author_role: str # client, contractor
    body: str
    element_reference: Optional[str] = None
    comment_type: str = "correction" # comment, correction, etc.

class DocumentFieldsPatchRequest(BaseModel):
    fields: dict # { "field_id": "value" }

class DocumentRejectRequest(BaseModel):
    category: str
    reason: str
    notes: Optional[str] = None
    context_block: Optional[str] = None

