from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import TaxLedger, PaymentRecord, User
from datetime import datetime

class TaxService:
    @staticmethod
    async def record_payment(session: AsyncSession, payment: PaymentRecord):
        """Updates the tax ledger based on a new payment confirmation."""
        # Find the issuer (the one who earned the money)
        from app.db.models import Invoice
        inv_result = await session.execute(select(Invoice).where(Invoice.id == payment.invoice_id))
        invoice = inv_result.scalars().first()
        
        if not invoice:
            return
            
        user_id = invoice.issuer_id
        current_year = f"{datetime.utcnow().year}" # Simplified for now
        
        # Find or create ledger
        ledger_result = await session.execute(
            select(TaxLedger).where(
                TaxLedger.user_id == user_id,
                TaxLedger.tax_year == current_year
            )
        )
        ledger = ledger_result.scalars().first()
        
        if not ledger:
            ledger = TaxLedger(
                user_id=user_id,
                tax_year=current_year,
                total_earned=0.0,
                total_tax_collected=0.0,
                q1_q4_json={"q1": 0, "q2": 0, "q3": 0, "q4": 0},
                per_relationship_json={}
            )
            session.add(ledger)
            await session.flush()
            
        # Update totals
        ledger.total_earned += payment.amount
        ledger.total_tax_collected += invoice.tax_total
        
        # Update per-relationship breakdown
        rel_id = str(invoice.relationship_id)
        rel_data = ledger.per_relationship_json or {}
        rel_data[rel_id] = rel_data.get(rel_id, 0.0) + payment.amount
        ledger.per_relationship_json = rel_data
        
        # Update quarterly (simplified)
        month = datetime.utcnow().month
        quarter = f"q{(month-1)//3 + 1}"
        q_data = ledger.q1_q4_json or {"q1": 0, "q2": 0, "q3": 0, "q4": 0}
        q_data[quarter] = q_data.get(quarter, 0.0) + payment.amount
        ledger.q1_q4_json = q_data
        
        await session.commit()
