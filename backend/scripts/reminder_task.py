import asyncio
import os
import sys
from datetime import datetime, timedelta
from sqlalchemy.future import select
from sqlalchemy.ext.asyncio import AsyncSession

# Add backend to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from app.db.session import async_session
from app.db.models import Invoice, User
from app.services.email_service import EmailService

async def run_reminders():
    """Daily task to send 3-touch invoice reminders."""
    print(f"[{datetime.utcnow()}] Starting reminder task...")
    
    async with async_session() as session:
        now = datetime.utcnow().date()
        
        # 1. Heads-up: Due in 3 days
        three_days_from_now = (now + timedelta(days=3)).strftime("%Y-%m-%d")
        result = await session.execute(
            select(Invoice).where(
                Invoice.status.in_(["sent", "viewed", "acknowledged"]),
                Invoice.due_date == three_days_from_now
            )
        )
        for inv in result.scalars().all():
            await send_inv_reminder(session, inv, "heads-up")
            
        # 2. Due Today
        today_str = now.strftime("%Y-%m-%d")
        result = await session.execute(
            select(Invoice).where(
                Invoice.status.in_(["sent", "viewed", "acknowledged"]),
                Invoice.due_date == today_str
            )
        )
        for inv in result.scalars().all():
            await send_inv_reminder(session, inv, "due-today")
            
        # 3. Overdue: 7 days late
        seven_days_ago = (now - timedelta(days=7)).strftime("%Y-%m-%d")
        result = await session.execute(
            select(Invoice).where(
                Invoice.status.in_(["sent", "viewed", "acknowledged"]),
                Invoice.due_date == seven_days_ago
            )
        )
        for inv in result.scalars().all():
            await send_inv_reminder(session, inv, "overdue")

    print(f"[{datetime.utcnow()}] Reminder task complete.")

async def send_inv_reminder(session, invoice, reminder_type):
    """Internal helper to dispatch email."""
    # We need the recipient email and issuer name
    # recipient_email is on the invoice (V8)
    # issuer name is on the User linked to issuer_id
    
    issuer_result = await session.execute(select(User).where(User.id == invoice.issuer_id))
    issuer = issuer_result.scalars().first()
    
    if not invoice.recipient_email or not issuer:
        print(f"Skipping invoice {invoice.invoice_number}: Missing recipient_email or issuer.")
        return

    print(f"Sending {reminder_type} reminder for {invoice.invoice_number} to {invoice.recipient_email}")
    
    await EmailService.send_reminder_email(
        sender_name=invoice.from_name or issuer.name or "A contractor",
        recipient_email=invoice.recipient_email,
        document_type="invoice",
        document_number=invoice.invoice_number or invoice.id[:8],
        amount=invoice.total,
        currency_symbol=invoice.currency_symbol,
        due_date=invoice.due_date or "N/A",
        reminder_type=reminder_type
    )

if __name__ == "__main__":
    asyncio.run(run_reminders())
