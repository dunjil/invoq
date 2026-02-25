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
from app.db.models import User, Quote, QuoteLineItem, QuoteComment, Invoice, InvoiceLineItem
from app.api.deps import get_optional_user, get_current_user
from app.api.invoice import generate_invoice_html, InvoiceRequest, InvoiceAddress, InvoiceItem
from weasyprint import HTML

router = APIRouter(prefix="/api/quotes", tags=["quotes"])


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


@router.post("")
async def create_quote(
    data: QuoteCreateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Save a new quote and generate a tracking token."""
    new_quote = Quote(
        user_id=user.id,
        status="sent",
        quote_number=data.quote_number,
        quote_date=data.quote_date,
        due_date=data.due_date,
        from_name=data.from_name,
        to_name=data.to_name,
        currency=data.currency,
        currency_symbol=data.currency_symbol,
        subtotal=data.subtotal,
        tax_total=data.tax_total,
        total=data.total,
        notes=data.notes,
        extracted_json=data.extracted_json or {"items": data.items},
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

    return {
        "success": True,
        "quote_id": new_quote.id,
        "tracked_link_token": new_quote.tracked_link_token
    }


@router.get("/track/{token}")
async def get_quote_by_token(
    token: str,
    session: AsyncSession = Depends(get_session),
):
    """Public endpoint for clients to view a quote by tracked link."""
    result = await session.execute(select(Quote).where(Quote.tracked_link_token == token))
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
    if not quote.viewed_at:
        # Note: In a real app, we'd check the session or JWT here.
        # For now, let's keep it simple: if viewed_at is None, we mark it.
        # To truly ignore the creator, we need to pass user into this public endpoint.
        quote.viewed_at = datetime.utcnow()
        quote.status = "viewed"
        await session.commit()

    # Load items
    items_result = await session.execute(select(QuoteLineItem).where(QuoteLineItem.quote_id == quote.id))
    items = items_result.scalars().all()

    return {
        "success": True,
        "quote": quote,
        "items": items
    }

@router.get("/{token}/pdf")
async def download_dynamic_quote_pdf(
    token: str,
    session: AsyncSession = Depends(get_session),
):
    """Dynamically reconstruct and render the PDF for a quote."""
    result = await session.execute(select(Quote).where(Quote.tracked_link_token == token))
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
        signature_data=quote.signature_data,
        client_signature_data=quote.client_signature_data,
        items=[
            InvoiceItem(description=i.description, quantity=i.quantity, unit_price=i.unit_price, tax_rate=i.tax_rate) 
            for i in items
        ]
    )

    html_content, _, _, _ = generate_invoice_html(data)
    pdf_bytes = HTML(string=html_content).write_pdf()

    filename = f"Quote_{quote.quote_number}.pdf"
    return Response(
        content=pdf_bytes, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f'attachment; filename="{filename}"'}
    )

@router.put("/{token}")
async def update_quote(
    token: str,
    data: QuoteCreateRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Edit the entire quote document dynamically."""
    result = await session.execute(select(Quote).where(Quote.tracked_link_token == token))
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


class QuoteApproveRequest(BaseModel):
    signature_data: Optional[str] = None


@router.post("/{token}/approve")
async def approve_quote(
    token: str,
    data: QuoteApproveRequest,
    session: AsyncSession = Depends(get_session),
):
    """Client approves the quote. Auto-converts to an invoice."""
    result = await session.execute(select(Quote).where(Quote.tracked_link_token == token))
    quote = result.scalars().first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    if quote.status in ["approved", "converted"]:
        return {"success": False, "error": "Quote already approved"}

    quote.status = "approved"
    quote.approved_at = datetime.utcnow()
    if data.signature_data:
        quote.signed_at = datetime.utcnow()
        quote.client_signature_data = data.signature_data
    
    await session.commit()
    
    # Auto-convert to Invoice
    inv_number = quote.quote_number.replace("QT", "INV") if "QT" in quote.quote_number else f"INV-{quote.quote_number}"
    new_invoice = Invoice(
        user_id=quote.user_id,
        quote_id=quote.id,
        status="draft",
        invoice_number=inv_number,
        invoice_date=datetime.utcnow().strftime("%Y-%m-%d"),
        due_date=quote.due_date,
        from_name=quote.from_name or "",
        to_name=quote.to_name or "",
        subtotal=quote.subtotal,
        tax_total=quote.tax_total,
        total=quote.total,
        currency=quote.currency,
        currency_symbol=quote.currency_symbol,
        notes=quote.notes,
        signature_data=quote.signature_data,
        client_signature_data=quote.client_signature_data,
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


class CommentRequest(BaseModel):
    author_name: str
    body: str
    author_role: str = "client"

@router.post("/{token}/comments")
async def add_comment(
    token: str,
    data: CommentRequest,
    session: AsyncSession = Depends(get_session),
):
    """Add a comment/correction request to the quote."""
    result = await session.execute(select(Quote).where(Quote.tracked_link_token == token))
    quote = result.scalars().first()
    
    if not quote:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    comment = QuoteComment(
        quote_id=quote.id,
        author_id="anonymous_client" if data.author_role == "client" else quote.user_id,
        author_name=data.author_name,
        author_role=data.author_role,
        body=data.body
    )
    session.add(comment)
    
    if data.author_role == "client":
        quote.status = "needs_revision"
        
    await session.commit()
    return {"success": True, "message": "Comment added successfully."}


@router.post("/{token}/request-review")
async def request_review_quote(
    token: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Explicitly mark quote as sent/review requested."""
    result = await session.execute(select(Quote).where(Quote.tracked_link_token == token))
    quote = result.scalars().first()
    
    if not quote or quote.user_id != user.id:
        raise HTTPException(status_code=404, detail="Quote not found")
        
    quote.status = "sent"
    await session.commit()
    return {"success": True, "message": "Review requested"}
