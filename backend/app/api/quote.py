"""Quote generation and tracking endpoints."""

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
from app.api.deps import get_optional_user, get_current_user
from app.api.invoice import generate_invoice_html, InvoiceRequest, InvoiceAddress, InvoiceItem
from app.services.email_service import EmailService
from app.services.relationship_service import RelationshipService
from app.db.models import User, Quote, QuoteLineItem, QuoteComment, Invoice, InvoiceLineItem, Relationship
from app.services.usage import check_usage, record_usage, should_watermark
from app.services.docx_service import DOCXService

# Schemas
from app.schemas.invoice import InvoiceItem, InvoiceAddress, InvoiceRequest
from app.schemas.quote import QuoteCreateRequest, QuoteApproveRequest, QuoteRejectionRequest, CommentRequest, QuoteRejectRequest

from weasyprint import HTML

router = APIRouter(prefix="/api/quotes", tags=["quotes"])


@router.post("")
async def create_quote(
    data: QuoteCreateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Save a new quote and generate a tracking token."""
    
    # Check usage limits
    allowed, reason = await check_usage(user, session)
    if not allowed:
        raise HTTPException(status_code=403, detail=reason)

    # V8: Resolve or create relationship
    rel_id = data.relationship_id
    if not rel_id and data.recipient_email:
        rel = await RelationshipService.get_or_create_relationship(
            session, user.id, data.recipient_email, "freelancer_individual"
        )
        rel_id = rel.id

    new_quote = Quote(
        user_id=user.id,
        issuer_id=user.id,
        relationship_id=rel_id,
        contract_id=data.contract_id,
        recipient_email=data.recipient_email,
        status="sent",
        quote_number=data.quote_number,
        quote_date=data.quote_date,
        due_date=data.due_date,
        from_name=data.from_name,
        from_details=data.from_details,
        to_name=data.to_name,
        to_details=data.to_details,
        currency=data.currency,
        currency_symbol=data.currency_symbol,
        subtotal=data.subtotal,
        tax_total=data.tax_total,
        total=data.total,
        notes=data.notes,
        line_items_json={"items": data.items},
        extracted_json=data.extracted_json or {"items": data.items},
        issuer_signature_base64=data.signature_data if hasattr(data, 'signature_data') else None,
        recipient_signature_base64=data.client_signature_data if hasattr(data, 'client_signature_data') else None,
        sent_at=datetime.utcnow()
    )
    session.add(new_quote)
    await session.commit()
    await session.refresh(new_quote)

    for item in data.items:
        line_item = QuoteLineItem(
            quote_id=new_quote.id,
            description=item.get("description", ""),
            quantity=item.get("quantity", 1),
            unit_price=item.get("unit_price", 0),
            tax_rate=item.get("tax_rate", 0),
            total=item.get("quantity", 1) * item.get("unit_price", 0)
        )
        session.add(line_item)
    
    await session.commit()

    await session.commit()

    # V8: Launch Invocation Email
    if data.recipient_email:
        await EmailService.send_invocation_email(
            sender_name=data.from_name or user.name or "A contractor",
            recipient_email=data.recipient_email,
            document_type="quote",
            token=new_quote.tracked_token
        )

    # Record usage
    await record_usage(user, session)

    return {
        "success": True,
        "quote_id": new_quote.id,
        "tracked_link_token": new_quote.tracked_token
    }


@router.get("/track/{token}")
async def get_quote_by_token(
    token: str,
    user: Optional[User] = Depends(get_optional_user),
    session: AsyncSession = Depends(get_session),
):
    """Public endpoint for clients to view a quote by tracked link."""
    result = await session.execute(select(Quote).where(Quote.tracked_token == token))
    quote = result.scalars().first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    # Try to get current user optionally
    try:
        from app.api.deps import get_current_user_optional
        # We might not have easy access to the exact FastAPI Request here to pull the Auth header manually, 
        # but let's assume we can refine this later if needed. For now, simple owner check.
    except:
        pass

    # Mark as viewed if first time AND not creator
    if not quote.viewed_at and (not user or user.id != quote.user_id):
        quote.viewed_at = datetime.utcnow()
        quote.status = "viewed"
        await session.commit()

    # Load items
    items_result = await session.execute(select(QuoteLineItem).where(QuoteLineItem.quote_id == quote.id))
    items = items_result.scalars().all()

    # V8: Fetch Trust Metrics for the Issuer
    from app.services.trust_service import TrustService
    trust_profile = await TrustService.get_trust_profile(session, quote.user_id)
    
    # Calculate a simplified score for the badge
    trust_score = round(
        (trust_profile.invoice_accuracy * 0.4) + 
        (100 if trust_profile.total_engagements > 5 else 80 if trust_profile.total_engagements > 0 else 50) * 0.1 + 
        (100 - (trust_profile.dispute_rate * 10)) * 0.5
    )

    return {
        "success": True,
        "quote": quote,
        "items": items,
        "trust": {
            "score": trust_score,
            "total_engagements": trust_profile.total_engagements,
            "invoice_accuracy": trust_profile.invoice_accuracy,
            "on_time_rate": trust_profile.on_time_rate
        },
        "rendered_html": generate_invoice_html(InvoiceRequest(
            title="QUOTE",
            quote_number=quote.quote_number,
            invoice_number=quote.quote_number,
            invoice_date=quote.quote_date,
            due_date=quote.due_date,
            from_address=InvoiceAddress(name=quote.from_name or "", address_line1=""),
            to_address=InvoiceAddress(name=quote.to_name or "", address_line1=""),
            currency=quote.currency,
            currency_symbol=quote.currency_symbol,
            notes=quote.notes,
            primary_color="#D4A017",
            signature_data=quote.issuer_signature_base64,
            client_signature_data=quote.recipient_signature_base64,
            items=[
                InvoiceItem(description=i.description, quantity=i.quantity, unit_price=i.unit_price, tax_rate=i.tax_rate) 
                for i in items
            ]
        ))[0]
    }

@router.get("/{token}/pdf")
async def download_dynamic_quote_pdf(
    token: str,
    session: AsyncSession = Depends(get_session),
):
    """Dynamically reconstruct and render the PDF for a quote."""
    result = await session.execute(select(Quote).where(Quote.tracked_token == token))
    quote = result.scalars().first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")

    items_result = await session.execute(select(QuoteLineItem).where(QuoteLineItem.quote_id == quote.id))
    items = items_result.scalars().all()

    data = InvoiceRequest(
        title="QUOTE",
        quote_number=quote.quote_number,
        invoice_number=quote.quote_number,
        invoice_date=quote.quote_date,
        due_date=quote.due_date,
        from_address=InvoiceAddress(name=quote.from_name or "", address_line1=""),
        to_address=InvoiceAddress(name=quote.to_name or "", address_line1=""),
        currency=quote.currency,
        currency_symbol=quote.currency_symbol,
        notes=quote.notes,
        primary_color="#D4A017",
        signature_data=quote.issuer_signature_base64,
        client_signature_data=quote.recipient_signature_base64,
        items=[
            InvoiceItem(description=i.description, quantity=i.quantity, unit_price=i.unit_price, tax_rate=i.tax_rate) 
            for i in items
        ]
    )

    html_content, _, _, _ = generate_invoice_html(data)
    pdf_bytes = HTML(string=html_content).write_pdf()

    file_id = str(uuid.uuid4())
    filename = f"quote_{quote.quote_number.replace('/', '_')}_{file_id}.pdf"
    filepath = os.path.join(settings.temp_file_dir, filename)

    with open(filepath, "wb") as f:
        f.write(pdf_bytes)

    return {
        "success": True,
        "download_url": f"/api/quotes/download/{filename}"
    }


@router.get("/{token}/docx")
async def generate_quote_docx_by_token(
    token: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Generate and return a DOCX for the quote."""
    result = await session.execute(select(Quote).where(Quote.tracked_token == token))
    quote = result.scalars().first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    # Prepare body text from items
    items_result = await session.execute(select(QuoteLineItem).where(QuoteLineItem.quote_id == quote.id))
    items = items_result.scalars().all()
    
    body = "### Line Items\n\n| Description | Qty | Price | Total |\n|---|---|---|---|\n"
    for item in items:
        body += f"| {item.description} | {item.quantity} | {item.unit_price} | {item.total} |\n"
    
    body += f"\n**Total: {quote.currency_symbol}{quote.total}**\n"
    if quote.notes:
        body += f"\n#### Notes\n{quote.notes}"

    data = {
        "title": "QUOTE",
        "document_number": quote.quote_number,
        "effective_date": quote.quote_date,
        "from_name": quote.from_name,
        "to_name": quote.to_name,
        "body_text": body,
        "primary_color": "#D4A017"
    }
    
    docx_stream = DOCXService.generate_document(data)
    
    file_id = str(uuid.uuid4())
    filename = f"quote_{quote.quote_number.replace('/', '_')}_{file_id}.docx"
    filepath = os.path.join(settings.temp_file_dir, filename)

    with open(filepath, "wb") as f:
        f.write(docx_stream.getbuffer())

    return {
        "success": True,
        "download_url": f"/api/quotes/download/{filename}"
    }


@router.get("/download/{filename}")
async def download_quote_pdf(filename: str):
    """Download generated quote PDF."""
    from fastapi.responses import FileResponse
    if not filename or ".." in filename or "/" in filename:
        return {"error": "Invalid filename"}

    filepath = os.path.join(settings.temp_file_dir, filename)
    if not os.path.exists(filepath):
        return {"error": "File not found or expired"}

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=filename,
    )

@router.patch("/{token}/fields")
async def update_quote_fields(
    token: str,
    data: dict,
    session: AsyncSession = Depends(get_session),
):
    """Allow recipient to update specific fields marked as editable."""
    result = await session.execute(select(Quote).where(Quote.tracked_token == token))
    quote = result.scalars().first()
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    if not quote.editable_fields_json:
        raise HTTPException(status_code=400, detail="No fields are marked as editable")
        
    # Update only fields present in editable_fields_json
    current_fields = quote.editable_fields_json.copy()
    for key, value in data.items():
        if key in current_fields:
            # Update the actual field on the quote object if it exists as a column
            if hasattr(quote, key):
                setattr(quote, key, value)
            # Also track in the JSON for consistency
            current_fields[key] = value
            
    quote.editable_fields_json = current_fields
    await session.commit()
    return {"success": True, "message": "Fields updated"}
    return {"success": True, "message": "Fields updated"}

@router.put("/{token}")
async def update_quote(
    token: str,
    data: QuoteCreateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Edit the entire quote document dynamically."""
    result = await session.execute(select(Quote).where(Quote.tracked_token == token))
    quote = result.scalars().first()
    
    if not quote or quote.user_id != user.id:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    quote.quote_number = data.quote_number
    quote.quote_date = data.quote_date
    quote.due_date = data.due_date
    quote.from_name = data.from_name
    quote.to_name = data.to_name
    quote.currency = data.currency
    quote.currency_symbol = data.currency_symbol
    quote.subtotal = data.subtotal
    quote.tax_total = data.tax_total
    quote.total = data.total
    quote.notes = data.notes
    quote.issuer_signature_base64 = data.signature_data if hasattr(data, 'signature_data') else None
    quote.recipient_signature_base64 = data.client_signature_data if hasattr(data, 'client_signature_data') else None
    quote.extracted_json = data.extracted_json or {"items": data.items}

    # Delete existing line items
    await session.execute(delete(QuoteLineItem).where(QuoteLineItem.quote_id == quote.id))
    
    # Insert new ones
    for item in data.items:
        line_item = QuoteLineItem(
            quote_id=quote.id,
            description=item.get("description", ""),
            quantity=item.get("quantity", 1),
            unit_price=item.get("unit_price", 0),
            tax_rate=item.get("tax_rate", 0),
            total=item.get("quantity", 1) * item.get("unit_price", 0)
        )
        session.add(line_item)
        
    await session.commit()
    return {"success": True, "message": "Quote updated"}


@router.post("/{token}/approve")
async def approve_quote(
    token: str,
    data: QuoteApproveRequest,
    session: AsyncSession = Depends(get_session),
):
    """Client approves the quote. Auto-converts to an invoice."""
    result = await session.execute(select(Quote).where(Quote.tracked_token == token))
    quote = result.scalars().first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    quote.status = "approved"
    quote.approved_at = datetime.utcnow()
    if data.signature_data:
        quote.signed_at = datetime.utcnow()
        quote.recipient_signature_base64 = data.signature_data
    
    await session.commit()

@router.post("/{token}/reject")
async def reject_quote(
    token: str,
    data: QuoteRejectionRequest,
    session: AsyncSession = Depends(get_session),
):
    """Client formally rejects the quote with a structured reason."""
    result = await session.execute(select(Quote).where(Quote.tracked_token == token))
    quote = result.scalars().first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    if quote.status in ["approved", "converted"]:
        return {"success": False, "error": "Cannot reject an already approved quote."}

    quote.status = "needs_revision"
    
    comment = QuoteComment(
        quote_id=quote.id,
        author_name=data.author_name,
        content=f"REJECTION [{data.reason_code.upper()}]: {data.details}",
        is_from_creator=False,
        created_at=datetime.utcnow()
    )
    session.add(comment)
    await session.commit()

    return {
        "success": True,
        "message": "Quote status updated to needs_revision.",
        "status": quote.status
    }
    
    # Auto-convert to Invoice
    inv_number = quote.quote_number.replace("QT", "INV") if "QT" in quote.quote_number else f"INV-{quote.quote_number}"
    new_invoice = Invoice(
        user_id=quote.user_id,
        issuer_id=quote.issuer_id,
        recipient_id=quote.recipient_id,
        relationship_id=quote.relationship_id,
        contract_id=quote.contract_id,
        quote_id=quote.id,
        status="draft",
        invoice_number=inv_number,
        invoice_date=datetime.utcnow().strftime("%Y-%m-%d"),
        due_date=quote.due_date,
        from_name=quote.from_name or "",
        from_details=quote.from_details,
        to_name=quote.to_name or "",
        to_details=quote.to_details,
        subtotal=quote.subtotal,
        tax_total=quote.tax_total,
        tax_amount=quote.tax_total,
        total=quote.total,
        currency=quote.currency,
        currency_symbol=quote.currency_symbol,
        notes=quote.notes,
        issuer_signature_base64=quote.issuer_signature_base64,
        recipient_signature_base64=quote.recipient_signature_base64,
        line_items_json=quote.line_items_json,
        extracted_json=quote.extracted_json
    )
    session.add(new_invoice)
    await session.commit()
    await session.refresh(new_invoice)

    # Copy line items
    items_result = await session.execute(select(QuoteLineItem).where(QuoteLineItem.quote_id == quote.id))
    items = items_result.scalars().all()
    
    for item in items:
        inv_item = InvoiceLineItem(
            invoice_id=new_invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
            total=item.total
        )
        session.add(inv_item)
        
    quote.status = "converted"
    await session.commit()

    return {
        "success": True,
        "message": "Quote approved and automatically converted to invoice.",
        "invoice_id": new_invoice.id
    }


@router.post("/{token}/comments")
async def add_comment(
    token: str,
    data: CommentRequest,
    session: AsyncSession = Depends(get_session),
):
    """Add a comment/correction request to the quote."""
    result = await session.execute(select(Quote).where(Quote.tracked_token == token))
    quote = result.scalars().first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    comment = QuoteComment(
        quote_id=quote.id,
        author_id="anonymous_client" if data.author_role == "client" else quote.user_id,
        author_name=data.author_name,
        author_role=data.author_role,
        body=data.body,
        element_reference=data.element_reference,
        comment_type=data.comment_type
    )
    session.add(comment)
    
    if data.author_role == "client":
        quote.status = "needs_revision"
        
    await session.commit()
    return {"success": True, "message": "Comment added successfully."}


@router.post("/{token}/reject")
async def reject_quote(
    token: str,
    data: QuoteRejectRequest,
    session: AsyncSession = Depends(get_session),
):
    """Structured rejection of a quote with mandatory reason and category."""
    result = await session.execute(select(Quote).where(Quote.tracked_token == token))
    quote = result.scalars().first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    quote.status = "needs_revision"
    quote.rejection_reason = data.reason
    quote.rejection_category = data.category
    
    await session.commit()
    
    # Notify issuer
    issuer_result = await session.execute(select(User).where(User.id == quote.issuer_id))
    issuer = issuer_result.scalars().first()
    
    if issuer:
        await EmailService.send_rejection_notification(
            sender_name=quote.to_name or "A client",
            recipient_email=issuer.email,
            document_type="quote",
            document_number=quote.quote_number or "N/A",
            reason=data.reason,
            category=data.category,
            notes=data.notes,
            context_block=data.context_block
        )
    
    return {"success": True, "message": "Quote marked as needs revision and issuer notified."}


@router.post("/{token}/request-review")
async def request_review_quote(
    token: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Explicitly mark quote as sent/review requested."""
    result = await session.execute(select(Quote).where(Quote.tracked_token == token))
    quote = result.scalars().first()
    
    if not quote or quote.user_id != user.id:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    quote.status = "sent"
    await session.commit()
    return {"success": True, "message": "Review requested"}


    quote.status = "sent"
    await session.commit()
    return {"success": True, "message": "Review requested"}
