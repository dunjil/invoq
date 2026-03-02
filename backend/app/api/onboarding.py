
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from typing import List, Optional
from pydantic import BaseModel
import uuid

from app.db.session import get_session
from app.db.models import User, Document, DocumentBundle, BundleItem
from app.api.deps import get_current_user
from app.services.relationship_service import RelationshipService
from app.services.document_service import DocumentService
from app.services.email_service import EmailService

# Schemas
from app.schemas.generic import BundleCreateRequest, BundleInvokeRequest


router = APIRouter(prefix="/api/onboarding", tags=["onboarding"])

@router.get("/templates")
async def list_templates(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """List all document templates for the current user."""
    result = await session.execute(
        select(Document).where(
            Document.user_id == user.id,
            Document.is_template == True
        )
    )
    templates = result.scalars().all()
    return {"success": True, "templates": templates}

@router.post("/templates/{document_id}/save-as-template")
async def save_as_template(
    document_id: str,
    template_name: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Mark an existing document as a template."""
    result = await session.execute(
        select(Document).where(Document.id == document_id, Document.user_id == user.id)
    )
    doc = result.scalars().first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    
    doc.is_template = True
    doc.template_name = template_name
    await session.commit()
    return {"success": True, "template_id": doc.id}

@router.post("/bundles")
async def create_bundle(
    data: BundleCreateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Create a new onboarding bundle (Pro only)."""
    if user.subscription_status != "pro":
        raise HTTPException(
            status_code=403, 
            detail="Document bundles are a Pro feature. Please upgrade to manage staff onboarding."
        )

    bundle = DocumentBundle(
        user_id=user.id,
        name=data.name,
        description=data.description
    )
    session.add(bundle)
    await session.flush() # Get bundle ID

    for idx, template_id in enumerate(data.template_ids):
        # V8 FIX: Ensure template belongs to the user
        res = await session.execute(
            select(Document).where(Document.id == template_id, Document.user_id == user.id, Document.is_template == True)
        )
        if not res.scalars().first():
             raise HTTPException(status_code=403, detail=f"Invalid template ID or no permission: {template_id}")

        item = BundleItem(
            bundle_id=bundle.id,
            template_id=template_id,
            order_index=idx
        )
        session.add(item)
    
    await session.commit()
    return {"success": True, "bundle_id": bundle.id}

@router.get("/bundles")
async def list_bundles(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """List all onboarding bundles for the current user."""
    result = await session.execute(
        select(DocumentBundle).where(DocumentBundle.user_id == user.id)
    )
    bundles = result.scalars().all()
    return {"success": True, "bundles": bundles}

@router.post("/bundles/{bundle_id}/invoke")
async def invoke_bundle(
    bundle_id: str,
    data: BundleInvokeRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Create and send documents from a bundle to a new recipient (Pro only)."""
    if user.subscription_status != "pro":
        raise HTTPException(
            status_code=403, 
            detail="Document bundles are a Pro feature. Please upgrade to manage staff onboarding."
        )

    # 1. Fetch Bundle and Items
    result = await session.execute(
        select(DocumentBundle).where(DocumentBundle.id == bundle_id, DocumentBundle.user_id == user.id)
    )
    bundle = result.scalars().first()
    if not bundle:
        raise HTTPException(status_code=404, detail="Bundle not found")

    result = await session.execute(
        select(BundleItem).where(BundleItem.bundle_id == bundle_id).order_by(BundleItem.order_index)
    )
    items = result.scalars().all()
    if not items:
        raise HTTPException(status_code=400, detail="Bundle has no documents")

    # 2. Relationship
    rel = await RelationshipService.get_or_create_relationship(
        session, user.id, data.recipient_email, "company_contractor"
    )

    # 3. Process each template
    invoked_docs = []
    variables = {
        "recipient_name": data.recipient_name,
        "effective_date": data.effective_date,
        "sender_name": data.sender_name or user.name or "Company",
    }

    for item in items:
        # Fetch template details - V8 FIX: Ensure ownership
        res = await session.execute(select(Document).where(Document.id == item.template_id, Document.user_id == user.id))
        template = res.scalars().first()
        if not template:
            # If a template in the bundle is no longer accessible or owned by the user, we abort
            raise HTTPException(status_code=403, detail=f"Permission denied or missing template in bundle: {item.template_id}")
        
        # Prepare content
        new_body = DocumentService.apply_template_variables(template.body_text, variables)
        new_title = DocumentService.apply_template_variables(template.title, variables)
        
        # Create new document instance
        doc_dict = {
            "type": template.type,
            "title": new_title,
            "body_text": new_body,
            "effective_date": data.effective_date,
            "from_name": variables["sender_name"],
            "to_name": data.recipient_name,
            "recipient_email": data.recipient_email,
            "logo_base64": template.logo_base64 or user.logo_base64,
            "primary_color": template.primary_color or user.primary_color,
            "include_issuer_signature": template.include_issuer_signature,
            "include_recipient_signature": template.include_recipient_signature,
            "is_template": False
        }

        new_doc = await DocumentService.create_document(
            session, user.id, doc_dict, rel.id
        )
        invoked_docs.append(new_doc)

        # Send email for each document (V8 default behavior)
        await EmailService.send_invocation_email(
            sender_name=variables["sender_name"],
            recipient_email=data.recipient_email,
            document_type=new_doc.type,
            token=new_doc.tracked_link_token
        )

    return {
        "success": True, 
        "documents": [
            {"id": d.id, "type": d.type, "token": d.tracked_link_token} for d in invoked_docs
        ]
    }
