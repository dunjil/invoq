"""Contract and NDA generation and tracking endpoints."""

import os
import uuid
import json
import markdown
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Response
from fastapi.responses import HTMLResponse, FileResponse
from pydantic import BaseModel, Field, ConfigDict
from weasyprint import HTML
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import delete

from app.config import settings
from app.db.session import get_session
from app.db.models import User, Document, DocumentComment, Quote, Invoice, Relationship
from app.api.deps import get_optional_user, get_current_user
from app.services.email_service import EmailService
from app.services.relationship_service import RelationshipService
from app.services.document_service import DocumentService
from app.services.usage import check_usage, record_usage, should_watermark
from app.services.docx_service import DOCXService

# Schemas
from app.schemas.document import DocumentCreateRequest, DocumentApproveRequest, DocumentRejectRequest, DocumentCommentRequest, DocumentFieldsPatchRequest
from app.schemas.invoice import InvoiceRequest


# Note: PDF generation template imports will be added later
# from app.api.invoice import generate_invoice_html, InvoiceRequest...
# from weasyprint import HTML

def generate_document_html(data: DocumentCreateRequest) -> str:
    """Generate a clean HTML representation of the document."""
    effective_date_str = data.effective_date or "Upon Signature"
    accent_color = data.primary_color or "#D4A017"
    
    # Parse Markdown for rich text (tables, lists, bold, etc.)
    body_text_source = data.body_text or ""
    # Parse Markdown for rich text
    body_text_source = data.body_text or ""
    # V8: Clause Wrapping Logic
    # We split by paragraphs and headers to make them clickable clauses
    import re
    paragraphs = re.split(r'(\n{2,})', body_text_source)
    processed_paragraphs = []
    clause_idx = 0
    
    for p in paragraphs:
        if p.strip() and not p.isspace():
            p_html = markdown.markdown(p, extensions=['tables', 'nl2br', 'sane_lists'])
            processed_paragraphs.append(f'<div class="clause" data-clause-id="{clause_idx}">{p_html}</div>')
            clause_idx += 1
        else:
            processed_paragraphs.append(p) # Keep whitespace
            
    body_html = "".join(processed_paragraphs)
    
    logo_html = ""
    if data.logo_base64:
        logo_html = f'<img src="{data.logo_base64}" style="max-height: 60px; max-width: 200px; margin-bottom: 20px;">'
    
    watermark_html = ""
    if data.watermark_enabled:
        watermark_html = f"""
        <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate(-45deg); 
                    font-size: 80px; color: rgba(0,0,0,{data.watermark_opacity}); pointer-events: none; z-index: -1; 
                    white-space: nowrap; font-weight: bold; font-family: sans-serif;">
            {data.watermark_text}
        </div>
        """
    
    # Pre-calculate signature sections to avoid nested f-strings
    issuer_sig_html = ""
    if data.include_issuer_signature:
        sig_img = f'<img src="{data.issuer_signature_base64}" class="sig-image">' if data.issuer_signature_base64 else ""
        issuer_sig_html = f"""
        <div class="sig-section">
            {sig_img}
            <div class="sig-line">
                Authorized Signature ({data.from_name})
            </div>
        </div>
        """

    recipient_sig_html = ""
    if data.include_recipient_signature:
        sig_img = f'<img src="{data.recipient_signature_base64}" class="sig-image">' if data.recipient_signature_base64 else ""
        signed_at_html = f'<div style="font-size: 8px; color: #999; margin-top: 5px;">Signed at: {data.signed_at}</div>' if data.signed_at else ""
        recipient_sig_html = f"""
        <div class="sig-section">
            {sig_img}
            <div class="sig-line">
                Client Signature ({data.to_name})
                {signed_at_html}
            </div>
        </div>
        """

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <style>
            body {{ font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.6; padding: 40px; position: relative; }}
            .header {{ border-bottom: 2px solid {accent_color}; padding-bottom: 20px; margin-bottom: 30px; }}
            .title {{ color: {accent_color}; font-size: 28px; font-weight: 300; margin: 0; }}
            .meta {{ font-size: 12px; color: #666; margin-top: 10px; }}
            .parties {{ display: flex; justify-content: space-between; margin-bottom: 30px; background: #f9f9f9; padding: 15px; border-radius: 8px; }}
            .party {{ width: 45%; }}
            .party-label {{ font-size: 10px; text-transform: uppercase; color: #999; font-weight: bold; margin-bottom: 5px; }}
            .party-name {{ font-weight: 500; font-size: 14px; }}
            .body {{ font-family: 'Georgia', serif; font-size: 14px; color: #444; text-align: justify; }}
            .body table {{ width: 100%; border-collapse: collapse; margin: 20px 0; }}
            .body th, .body td {{ border: 1px solid #ddd; padding: 12px; text-align: left; }}
            .body th {{ background-color: #f2f2f2; font-weight: bold; }}
            .body h1, .body h2, .body h3, .body h4, .body h5, .body h6 {{ font-weight: bold; margin-top: 1.2em; margin-bottom: 0.6em; color: #1a1a18; }}
            .body ul, .body ol {{ padding-left: 20px; margin: 15px 0; }}
            .body li {{ margin-bottom: 8px; }}
            .footer {{ margin-top: 50px; font-size: 10px; color: #999; text-align: center; border-top: 1px solid #eee; padding-top: 20px; }}
            .signature-box {{ margin-top: 60px; display: flex; justify-content: space-between; gap: 40px; }}
            .sig-section {{ width: 45%; }}
            .sig-line {{ border-top: 1px solid #333; padding-top: 10px; margin-top: 40px; font-size: 12px; }}
            .sig-image {{ height: 50px; margin-bottom: -40px; filter: grayscale(1); mix-blend-mode: multiply; }}
            
            /* V8 Interactive Clauses */
            .clause {{ 
                cursor: pointer; 
                padding: 4px 8px; 
                margin: -4px -8px; 
                border-radius: 4px; 
                transition: all 0.2s;
                position: relative;
            }}
            .clause:hover {{ background: rgba(212, 160, 23, 0.05); }}
            .clause.selected {{ background: rgba(212, 160, 23, 0.12); border-left: 3px solid #D4A017; padding-left: 5px; }}
            .clause::after {{ 
                content: "Click to comment"; 
                position: absolute; 
                right: 10px; 
                top: 50%; 
                transform: translateY(-50%); 
                font-size: 10px; 
                color: #D4A017; 
                opacity: 0; 
                transition: opacity 0.2s;
                pointer-events: none;
                font-family: sans-serif;
                font-weight: bold;
                text-transform: uppercase;
            }}
            .clause:hover::after {{ opacity: 0.6; }}
            .clause.selected::after {{ content: "SELECTED"; opacity: 1; }}
        </style>
    </head>
    <body>
        {watermark_html}
        <div class="header">
            {logo_html}
            <h1 class="title">{data.title.upper()}</h1>
            <div class="meta">
                Ref: {data.document_number}<br>
                Effective Date: {effective_date_str}
            </div>
        </div>
        
        <div class="parties">
            <div class="party">
                <div class="party-label">Party 1 (Provider)</div>
                <div class="party-name">{data.from_name}</div>
            </div>
            <div class="party">
                <div class="party-label">Party 2 (Client)</div>
                <div class="party-name">{data.to_name}</div>
            </div>
        </div>
        
        <div class="body">
            {body_html}
        </div>
        
        <div class="signature-box">
            {issuer_sig_html}
            {recipient_sig_html}
        </div>
        
        <div class="footer">
            Generated via Invoq.app — Secure Document Management
        </div>
        
        <script>
            // V8 Interactive Clause Handler
            document.addEventListener('click', (e) => {{
                const clause = e.target.closest('.clause');
                if (clause) {{
                    const clauseId = clause.getAttribute('data-clause-id');
                    
                    // Toggle selection UI
                    document.querySelectorAll('.clause').forEach(c => c.classList.remove('selected'));
                    clause.classList.add('selected');
                    
                    // Notify parent React app
                    window.parent.postMessage({{
                        type: 'CLAUSE_SELECTED',
                        clauseId: parseInt(clauseId)
                    }}, '*');
                }}
            }});
        </script>
    </body>
    </html>
    """
    return html

router = APIRouter(prefix="/api/contracts", tags=["contracts"])

TEMP_DIR = settings.temp_file_dir


@router.post("")
async def create_document(
    data: DocumentCreateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Save a new contract/NDA and generate a tracking token."""
    
    # Check usage limits
    allowed, reason = await check_usage(user, session)
    if not allowed:
        raise HTTPException(status_code=403, detail=reason)

    # V8: Orchestrate via services
    if data.relationship_id:
        # FIX: Ensure user is the initiator of the provided relationship
        rel_check = await session.execute(
            select(Relationship).where(Relationship.id == data.relationship_id)
        )
        rel = rel_check.scalars().first()
        if not rel or rel.initiator_id != user.id:
             raise HTTPException(status_code=403, detail="Invalid relationship ID or permission denied")
    else:
        rel = await RelationshipService.get_or_create_relationship(
            session, user.id, data.recipient_email, "company_contractor"
        )

    doc_data = data.model_dump(exclude={"relationship_id", "recipient_email"})
    new_document = await DocumentService.create_document(
        session, user.id, doc_data, rel.id
    )

    # Record usage
    await record_usage(user, session)

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


@router.post("/preview")
async def preview_document(data: DocumentCreateRequest):
    """Generate HTML preview of the document."""
    try:
        html = generate_document_html(data)
        return {
            "success": True,
            "html": html
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/track/{token}")
async def get_document_by_token(
    token: str,
    user: Optional[User] = Depends(get_optional_user),
    session: AsyncSession = Depends(get_session),
):
    """Public endpoint for clients to view a document by its tracked URL loop."""
    result = await session.execute(select(Document).where(Document.tracked_link_token == token))
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # FIX: If document is already claimed, restrict view to involved parties
    if document.recipient_id:
        if not user or (user.id != document.recipient_id and user.id != document.user_id):
            raise HTTPException(status_code=403, detail="This document is private and has already been claimed.")

    # Mark as viewed if first time AND not creator
    if not document.viewed_at and (not user or user.id != document.user_id):
        document.viewed_at = datetime.utcnow()
        document.status = "viewed"
        await session.commit()

    try:
        # Determine if watermark should be shown based on creator's plan
        # Fetch creator to check subscription status
        creator_result = await session.execute(select(User).where(User.id == document.user_id))
        creator = creator_result.scalars().first()
        show_watermark = should_watermark(creator)

        # Fetch comments
        comment_result = await session.execute(
            select(DocumentComment)
            .where(DocumentComment.document_id == document.id)
            .order_by(DocumentComment.created_at.desc())
        )
        comments = comment_result.scalars().all()

        # V8 Standard: Ensure frontend gets both legacy and V8 field names
        doc_dict = document.model_dump()
        doc_dict["contract_number"] = document.document_number or document.contract_number
        doc_dict["client_signature_data"] = document.recipient_signature_base64 or document.client_signature_data
        
        # Prepare data for HTML generation
        gen_data = DocumentCreateRequest(**document.model_dump())
        gen_data.recipient_signature_base64 = document.recipient_signature_base64
        gen_data.issuer_signature_base64 = document.issuer_signature_base64
        gen_data.logo_base64 = document.logo_base64
        gen_data.signed_at = document.signed_at.isoformat() if document.signed_at else None
        
        # V8: Inject rendered_html into the document object for frontend
        doc_dict["rendered_html"] = generate_document_html(gen_data)

        # V8: Fetch Trust Metrics for the Issuer
        from app.services.trust_service import TrustService
        trust_profile = await TrustService.get_trust_profile(session, document.user_id)
        
        # Calculate a simplified score for the badge
        trust_score = round(
            (trust_profile.invoice_accuracy * 0.4) + 
            (100 if trust_profile.total_engagements > 5 else 80 if trust_profile.total_engagements > 0 else 50) * 0.1 + 
            (100 - (trust_profile.dispute_rate * 10)) * 0.5
        )

        return {
            "success": True,
            "document": doc_dict,
            "comments": comments,
            "trust": {
                "score": trust_score,
                "total_engagements": trust_profile.total_engagements,
                "invoice_accuracy": trust_profile.invoice_accuracy,
                "on_time_rate": trust_profile.on_time_rate
            },
            "show_watermark": show_watermark,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

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
            
            # Sync with model attribute if exists
            if hasattr(document, key):
                setattr(document, key, value)
                
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


@router.get("/{token}/pdf")
async def generate_document_pdf(
    token: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Generate and return a PDF for the document."""
    result = await session.execute(select(Document).where(Document.tracked_link_token == token))
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    # Convert Document model back to DocumentCreateRequest schema for the helper
    data = DocumentCreateRequest(
        title=document.title,
        type=document.type,
        document_number=document.document_number or "",
        effective_date=document.effective_date,
        from_name=document.from_name or "",
        to_name=document.to_name or "",
        body_text=document.body_text,
        notes=document.notes,
        contract_id=document.contract_id,
        logo_base64=document.logo_base64,
        primary_color=document.primary_color or "#D4A017",
        include_issuer_signature=document.include_issuer_signature,
        include_recipient_signature=document.include_recipient_signature,
        issuer_signature_base64=document.issuer_signature_base64,
        watermark_enabled=document.watermark_enabled,
        watermark_text=document.watermark_text or "CONFIDENTIAL",
        watermark_opacity=document.watermark_opacity,
    )
    
    html_content = generate_document_html(data)
    
    # Add "Made with Invoq" watermark for free-tier users
    if should_watermark(user):
        invoq_badge = '''<div style="position: fixed; bottom: 10px; right: 20px; opacity: 0.4; font-size: 9px; color: #999;">Made with invoq.app</div>'''
        html_content = html_content.replace("</body>", f"{invoq_badge}</body>")

    html = HTML(string=html_content)
    pdf_bytes = html.write_pdf()

    file_id = str(uuid.uuid4())
    filename = f"{document.type}_{document.document_number.replace('/', '_') or 'doc'}_{file_id}.pdf"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(pdf_bytes)

    return {
        "success": True,
        "download_url": f"/api/contracts/download/{filename}"
    }


@router.get("/{token}/docx")
async def generate_contract_docx(
    token: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Generate and return a DOCX for the document."""
    result = await session.execute(select(Document).where(Document.tracked_link_token == token))
    document = result.scalars().first()
    
    if not document:
        raise HTTPException(status_code=404, detail="Document not found")
        
    data = document.__dict__.copy()
    data['title'] = document.title or "Agreement"
    
    docx_stream = DOCXService.generate_document(data)
    
    file_id = str(uuid.uuid4())
    filename = f"{document.type}_{document.document_number.replace('/', '_') or 'doc'}_{file_id}.docx"
    filepath = os.path.join(TEMP_DIR, filename)

    with open(filepath, "wb") as f:
        f.write(docx_stream.getbuffer())

    return {
        "success": True,
        "download_url": f"/api/contracts/download/{filename}"
    }


@router.get("/relationship/{relationship_id}")
async def get_contracts_by_relationship(
    relationship_id: str,
    session: AsyncSession = Depends(get_session),
):
    """List all governing contracts for a specific relationship."""
    result = await session.execute(
        select(Document).where(
            Document.relationship_id == relationship_id,
            Document.type.in_(["contract", "msa", "sow"]),
            Document.status.in_(["approved", "signed", "active"])  # Include active/signed contracts
        )
    )
    contracts = result.scalars().all()
    return {"success": True, "contracts": contracts}


@router.get("/lookup-relationship")
async def lookup_relationship(
    email: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Find a relationship by email for the current user."""
    rel = await RelationshipService.get_relationship_by_email(session, user.id, email)
    if not rel:
        return {"success": False, "error": "Relationship not found"}
    return {"success": True, "relationship_id": rel.id}


@router.get("/download/{filename}")
async def download_contract_pdf(filename: str):
    """Download generated document PDF."""
    if not filename or ".." in filename or "/" in filename:
        return {"error": "Invalid filename"}

    filepath = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(filepath):
        return {"error": "File not found or expired"}

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=filename,
    )

