"""Contract and NDA generation and tracking endpoints."""

import os
import uuid
import json
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Response
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from app.db.session import get_session
from app.db.models import User, Document, DocumentComment, Quote, Invoice, Relationship
from app.api.deps import get_optional_user, get_current_user
from app.services.email_service import EmailService
from app.services.relationship_service import RelationshipService
from app.services.document_service import DocumentService

# Note: PDF generation template imports will be added later
# from app.api.invoice import generate_invoice_html, InvoiceRequest...
# from weasyprint import HTML

router = APIRouter(prefix="/api/documents", tags=["documents"])


class DocumentCreateRequest(BaseModel):
    title: str = "Agreement"
    type: str = "contract" # contract, nda, msa, sow
    document_number: str
    effective_date: Optional[str] = None
    expiry_date: Optional[str] = None
    
    from_name: str
    to_name: str
    
    body_text: str = ""
    notes: Optional[str] = None
    recipient_email: Optional[str] = None
    relationship_id: Optional[str] = None
    editable_fields_json: Optional[dict] = None # { "clause_1": { "label": "Start Date", "value": "" } }


@router.post("")
async def create_document(
    data: DocumentCreateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Save a new contract/NDA and generate a tracking token."""
    # V8: Orchestrate via services
    rel = await RelationshipService.get_or_create_relationship(
        session, user.id, data.recipient_email, "company_contractor"
    )

    doc_data = data.model_dump(exclude={"relationship_id", "recipient_email"})
    new_document = await DocumentService.create_document(
        session, user.id, doc_data, rel.id
    )

    # V8: Launch Invocation Email
    if data.recipient_email:
        await EmailService.send_invocation_email(
            sender_name=data.from_name or user.name or "A company",
            recipient_email=data.recipient_email,
            document_type=data.type,
            token=new_document.tracked_link_token
        )

    return {
        "success": True,
        "document_id": new_document.id,
        "tracked_link_token": new_document.tracked_link_token
    }


@router.get("/track/{token}")
async def get_document_by_token(
    token: str,
    session: AsyncSession = Depends(get_session),
):
    """Public endpoint for clients to view a document by its tracked URL loop."""
    result = await session.execute(select(Document).where(Document.tracked_link_token == token))
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Mark as viewed if first time
    if not document.viewed_at:
        document.viewed_at = datetime.utcnow()
        document.status = "viewed"
        await session.commit()

    return {
        "success": True,
        "document": document,
    }

@router.put("/{token}")
async def update_document(
    token: str,
    data: DocumentCreateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Issue a new version of the document (Creator only)."""
    result = await session.execute(select(Document).where(Document.tracked_link_token == token))
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    updates = data.model_dump(exclude={"relationship_id", "recipient_email"})
    
    try:
        updated_doc = await DocumentService.issue_new_version(
            session, document.id, user.id, updates, summary="Document fields updated"
        )
        return {"success": True, "message": f"Document updated to version {updated_doc.version}", "version": updated_doc.version}
    except PermissionError as e:
        raise HTTPException(status_code=403, detail=str(e))


class DocumentApproveRequest(BaseModel):
    signature_data: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None


class DocumentRejectRequest(BaseModel):
    category: str = Field(..., description="Amount incorrect, Timeline wrong, Scope unclear, etc.")
    reason: str
    notes: Optional[str] = None
    context_block: Optional[dict] = None


@router.post("/{token}/approve")
async def approve_document(
    token: str,
    data: DocumentApproveRequest,
    session: AsyncSession = Depends(get_session),
):
    """Client approves and signs the document."""
    result = await session.execute(select(Document).where(Document.tracked_link_token == token))
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if document.status in ["approved", "signed"]:
        return {"success": False, "error": "Document already approved"}

    document.status = "signed"
    document.approved_at = datetime.utcnow()
    
    if data.signature_data:
        document.signed_at = datetime.utcnow()
        document.recipient_signature_base64 = data.signature_data
        document.signer_ip_address = data.ip_address
        document.signer_user_agent = data.user_agent
    
    await session.commit()

    return {
        "success": True,
        "message": "Document signed and approved securely.",
        "document_id": document.id
    }

class DocumentCommentRequest(BaseModel):
    author_name: str
    body: str
    author_role: str = "client"
    element_reference: Optional[str] = None # Clause identifier
    comment_type: str = "Question" # Question, Change Request, Clarification

@router.post("/{token}/comments")
async def add_document_comment(
    token: str,
    data: DocumentCommentRequest,
    session: AsyncSession = Depends(get_session),
):
    """Add a comment/correction request to the document."""
    result = await session.execute(select(Document).where(Document.tracked_link_token == token))
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    comment = DocumentComment(
        document_id=document.id,
        author_id="anonymous_client" if data.author_role == "client" else document.user_id,
        author_name=data.author_name,
        author_role=data.author_role,
        body=data.body,
        element_reference=data.element_reference,
        comment_type=data.comment_type
    )
    session.add(comment)
    
    if data.author_role == "client":
        document.status = "needs_revision"
        
    await session.commit()
    return {"success": True, "message": "Comment added successfully."}


class DocumentFieldsPatchRequest(BaseModel):
    fields: dict # { "field_key": "new_value" }

@router.patch("/{token}/fields")
async def patch_document_fields(
    token: str,
    data: DocumentFieldsPatchRequest,
    session: AsyncSession = Depends(get_session),
):
    """Allow recipient to fill in designated editable fields."""
    result = await session.execute(select(Document).where(Document.tracked_link_token == token))
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    if document.status == "signed":
        return {"success": False, "error": "Cannot edit a signed document."}

    # Merge updates into editable_fields_json
    current_fields = document.editable_fields_json or {}
    for key, value in data.fields.items():
        if key in current_fields:
            if isinstance(current_fields[key], dict):
                current_fields[key]["value"] = value
            else:
                current_fields[key] = value
                
    document.editable_fields_json = current_fields
    await session.commit()
    
    return {"success": True, "message": "Fields updated successfully.", "fields": current_fields}


@router.post("/{token}/reject")
async def reject_document(
    token: str,
    data: DocumentRejectRequest,
    session: AsyncSession = Depends(get_session),
):
    """Structured rejection of a document."""
    result = await session.execute(select(Document).where(Document.tracked_link_token == token))
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    await DocumentService.handle_rejection(
        session, document.id, data.category, data.reason, data.notes, data.context_block
    )
    
    return {"success": True, "message": "Document rejected and creator notified."}

