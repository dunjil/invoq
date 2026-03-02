from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from sqlalchemy import func
from app.db.models import TrustProfile, Invoice, Quote, Relationship
from datetime import datetime

class TrustService:
    @staticmethod
    async def update_metrics(session: AsyncSession, user_id: str):
        """Recalculates trust metrics for a given user (contractor)."""
        # Find or create trust profile
        result = await session.execute(select(TrustProfile).where(TrustProfile.user_id == user_id))
        profile = result.scalars().first()
        
        if not profile:
            profile = TrustProfile(user_id=user_id)
            session.add(profile)
            await session.flush()
            
        # 1. Invoice Accuracy
        # (Percentage of invoices sent without needing revision comments from clients)
        # Simplified: Check for InvoiceComment count per invoice
        total_invoices_result = await session.execute(
            select(func.count(Invoice.id)).where(Invoice.issuer_id == user_id)
        )
        total_invoices = total_invoices_result.scalar() or 0
        
        if total_invoices > 0:
            # We'd ideally check for specific 'needs_revision' status history
            # For now: 100% - (invoices with comments / total)
            # This is a placeholder for more complex logic
            profile.invoice_accuracy = 98.5 # High by default until we have data
            
        # 2. On-time Rate
        # Percentage of invoices paid on or before due date
        paid_invoices_result = await session.execute(
            select(Invoice).where(Invoice.issuer_id == user_id, Invoice.status == "paid")
        )
        paid_invoices = paid_invoices_result.scalars().all()
        
        if paid_invoices:
            on_time = 0
            for inv in paid_invoices:
                if inv.paid_at and inv.due_date:
                    try:
                        due = datetime.strptime(inv.due_date, "%Y-%m-%d")
                        if inv.paid_at.date() <= due.date():
                            on_time += 1
                    except:
                        on_time += 1
            profile.on_time_rate = (on_time / len(paid_invoices)) * 100
            
        # 3. Relationship Longevity
        # Avg duration of active relationships
        rel_result = await session.execute(
            select(Relationship).where(Relationship.initiator_id == user_id)
        )
        rels = rel_result.scalars().all()
        if rels:
            total_days = 0
            for rel in rels:
                duration = (datetime.utcnow() - rel.created_at).days
                total_days += max(1, duration)
            profile.avg_relationship_days = total_days / len(rels)
            
        profile.total_engagements = total_invoices
        profile.last_updated = datetime.utcnow()
        
        await session.commit()

    @staticmethod
    async def get_trust_profile(session: AsyncSession, user_id: str) -> TrustProfile:
        """Retrieves the trust profile for a user, creating it if it doesn't exist."""
        result = await session.execute(select(TrustProfile).where(TrustProfile.user_id == user_id))
        profile = result.scalars().first()
        
        if not profile:
            profile = TrustProfile(user_id=user_id)
            session.add(profile)
            await session.flush()
            await session.commit()
            await session.refresh(profile)
            
        return profile
