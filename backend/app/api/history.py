"""Invoice history endpoints."""

from typing import Optional, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc

from app.db.session import get_session
from app.db.models import User, Invoice, Quote, InvoiceComment, QuoteComment, Contract
from app.api.deps import get_current_user
from sqlalchemy import func

router = APIRouter(prefix="/api/history", tags=["history"])

class DocumentSummary(BaseModel):
    id: str
    token: str
    type: str # "QUOTE" or "INVOICE"
    document_number: str
    document_date: str
    to_name: str
    total: float
    currency_symbol: str
    status: str
    created_at: str
    comment_count: int = 0

class InvoiceDetail(BaseModel):
    pass
# ... retaining InvoiceDetail as is for now, but will likely deprecate later if unified or keep for legacy routes

@router.get("", response_model=List[DocumentSummary])
async def list_documents(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List all quotes and invoices for the current user, merged and sorted by creation date."""
    
    # Fetch invoices
    inv_result = await session.execute(
        select(Invoice)
        .where(Invoice.user_id == user.id)
        .order_by(desc(Invoice.created_at))
        .limit(100)
    )
    invoices = inv_result.scalars().all()
    
    # Fetch Contracts
    contract_res = await session.execute(
        select(Contract)
        .where(Contract.user_id == user.id)
        .order_by(desc(Contract.created_at))
        .limit(100)
    )
    contracts = contract_res.scalars().all()
    
    # Fetch quotes
    quote_result = await session.execute(
        select(Quote)
        .where(Quote.user_id == user.id)
        .order_by(desc(Quote.created_at))
        .limit(100)
    )
    quotes = quote_result.scalars().all()
    
    # Fetch comment counts
    invoice_ids = [inv.id for inv in invoices]
    quote_ids = [q.id for q in quotes]
    
    inv_comments_res = await session.execute(
        select(InvoiceComment.invoice_id, func.count(InvoiceComment.id))
        .where(InvoiceComment.invoice_id.in_(invoice_ids))
        .group_by(InvoiceComment.invoice_id)
    ) if invoice_ids else []
    inv_comment_counts = dict(inv_comments_res.all()) if invoice_ids else {}
    
    quote_comments_res = await session.execute(
        select(QuoteComment.quote_id, func.count(QuoteComment.id))
        .where(QuoteComment.quote_id.in_(quote_ids))
        .group_by(QuoteComment.quote_id)
    ) if quote_ids else []
    quote_comment_counts = dict(quote_comments_res.all()) if quote_ids else {}

    # Merge and map
    documents = []
    for inv in invoices:
        documents.append({
            "id": inv.id,
            "token": inv.tracked_link_token,
            "type": "INVOICE",
            "document_number": inv.invoice_number,
            "document_date": inv.invoice_date,
            "to_name": inv.to_name,
            "total": inv.total,
            "currency_symbol": inv.currency_symbol,
            "status": inv.status,
            "created_at": inv.created_at,
            "comment_count": inv_comment_counts.get(inv.id, 0)
        })
        
    for q in quotes:
        documents.append({
            "id": q.id,
            "token": q.tracked_link_token,
            "type": "QUOTE",
            "document_number": q.quote_number or "Draft",
            "document_date": q.quote_date or "",
            "to_name": q.to_name or "Unknown Client",
            "total": q.total,
            "currency_symbol": q.currency_symbol,
            "status": q.status,
            "created_at": q.created_at,
            "comment_count": quote_comment_counts.get(q.id, 0)
        })

    # Add contracts
    for c in contracts:
        documents.append({
            "id": c.id,
            "token": c.tracked_link_token,
            "type": c.type.upper(), # contract, nda, msa
            "document_number": c.contract_number or "Draft",
            "document_date": c.created_at.isoformat(), # Using created_at as document_date for contracts
            "to_name": c.to_name or "Unknown Client",
            "total": 0.0, # Contracts don't typically have a 'total' field in the same way invoices/quotes do
            "currency_symbol": "", # Contracts don't typically have a currency_symbol
            "status": c.status,
            "created_at": c.created_at,
            "comment_count": 0 # Contracts don't have comments yet
        })
        
    # Sort merged result by created_at descending
    documents.sort(key=lambda x: x["created_at"], reverse=True)
    
    # Format and return standard summaries
    return [
        DocumentSummary(
            id=d["id"],
            token=d["token"],
            type=d["type"],
            document_number=d["document_number"],
            document_date=d["document_date"],
            to_name=d["to_name"],
            total=d["total"],
            currency_symbol=d["currency_symbol"],
            status=d["status"],
            created_at=d["created_at"].isoformat(),
            comment_count=d["comment_count"]
        )
        for d in documents[:100] # Ensure we cap the unified feed at 100 for now
    ]


@router.get("/{invoice_id}", response_model=Optional[InvoiceDetail])
async def get_invoice(
    invoice_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get a single invoice detail."""
    result = await session.execute(
        select(Invoice).where(Invoice.id == invoice_id, Invoice.user_id == user.id)
    )
    inv = result.scalar_one_or_none()
    if not inv:
        return None

    return InvoiceDetail(
        id=inv.id,
        invoice_number=inv.invoice_number,
        invoice_date=inv.invoice_date,
        due_date=inv.due_date,
        from_name=inv.from_name,
        from_details=inv.from_details,
        to_name=inv.to_name,
        to_details=inv.to_details,
        items=inv.items,
        currency=inv.currency,
        currency_symbol=inv.currency_symbol,
        subtotal=inv.subtotal,
        tax_total=inv.tax_total,
        total=inv.total,
        notes=inv.notes,
        primary_color=inv.primary_color,
        original_prompt=inv.original_prompt,
        created_at=inv.created_at.isoformat(),
    )
