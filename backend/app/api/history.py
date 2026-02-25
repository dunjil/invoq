"""Invoice history endpoints."""

from typing import Optional, List

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc

from app.db.session import get_session
from app.db.models import User, Invoice
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/history", tags=["history"])


class InvoiceSummary(BaseModel):
    id: str
    invoice_number: str
    invoice_date: str
    to_name: str
    total: float
    currency_symbol: str
    created_at: str


class InvoiceDetail(BaseModel):
    id: str
    invoice_number: str
    invoice_date: str
    due_date: Optional[str]
    from_name: str
    from_details: Optional[str]
    to_name: str
    to_details: Optional[str]
    items: Optional[dict]
    currency: str
    currency_symbol: str
    subtotal: float
    tax_total: float
    total: float
    notes: Optional[str]
    primary_color: str
    original_prompt: Optional[str]
    created_at: str


@router.get("", response_model=List[InvoiceSummary])
async def list_invoices(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """List all invoices for the current user."""
    result = await session.execute(
        select(Invoice)
        .where(Invoice.user_id == user.id)
        .order_by(desc(Invoice.created_at))
        .limit(100)
    )
    invoices = result.scalars().all()
    return [
        InvoiceSummary(
            id=inv.id,
            invoice_number=inv.invoice_number,
            invoice_date=inv.invoice_date,
            to_name=inv.to_name,
            total=inv.total,
            currency_symbol=inv.currency_symbol,
            created_at=inv.created_at.isoformat(),
        )
        for inv in invoices
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
