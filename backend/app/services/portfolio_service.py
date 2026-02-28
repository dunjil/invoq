"""Portfolio aggregation service (V8 Architecture)."""

from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.models import Relationship, Document, Invoice, PaymentRecord, TaxLedger, TrustProfile

class PortfolioService:
    @staticmethod
    async def get_portfolio_summary(session: AsyncSession, user_id: str):
        """Aggregate data for the Section 03 Dashboard Panels."""
        
        # 1. Active Relationships
        rel_result = await session.execute(
            select(func.count(Relationship.id))
            .where(Relationship.initiator_id == user_id, Relationship.status == "active")
        )
        active_rels_count = rel_result.scalar() or 0
        
        # 2. Documents Awaiting Action
        # Sent to the user OR where status is "needs_revision" and user is creator
        doc_sent_result = await session.execute(
            select(func.count(Document.id))
            .where(Document.recipient_id == user_id, Document.status.in_(["sent", "viewed"]))
        )
        docs_awaiting_user = doc_sent_result.scalar() or 0
        
        doc_revision_result = await session.execute(
            select(func.count(Document.id))
            .where(Document.user_id == user_id, Document.status == "needs_revision")
        )
        docs_needing_revision = doc_revision_result.scalar() or 0
        
        # 3. Outstanding Invoices
        inv_result = await session.execute(
            select(func.sum(Invoice.total))
            .where(Invoice.issuer_id == user_id, Invoice.status.in_(["sent", "viewed", "acknowledged"]))
        )
        outstanding_amount = inv_result.scalar() or 0.0
        
        # 4. Monthly Cash Flow (Current Month)
        now = datetime.utcnow()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        
        cash_flow_result = await session.execute(
            select(func.sum(PaymentRecord.amount))
            .where(PaymentRecord.confirmed_by_id == user_id, PaymentRecord.paid_at >= month_start)
        )
        confirmed_this_month = cash_flow_result.scalar() or 0.0
        
        # 5. Tax Position (from Ledger)
        tax_result = await session.execute(
            select(TaxLedger).where(TaxLedger.user_id == user_id).order_by(TaxLedger.tax_year.desc())
        )
        latest_ledger = tax_result.scalars().first()
        
        return {
            "active_relationships": active_rels_count,
            "documents_awaiting_action": docs_awaiting_user + docs_needing_revision,
            "outstanding_invoices_total": outstanding_amount,
            "confirmed_cash_flow_month": confirmed_this_month,
            "tax_position": {
                "total_earned": latest_ledger.total_earned if latest_ledger else 0.0,
                "estimated_tax": (latest_ledger.total_earned * 0.2) if latest_ledger else 0.0 # Placeholder logic
            }
        }
