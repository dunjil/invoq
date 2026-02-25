"""Usage tracking service."""

from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User

FREE_MONTHLY_LIMIT = 3


async def check_usage(user: Optional[User], session: AsyncSession) -> tuple[bool, str]:
    """Check if user can generate an invoice.
    Returns (allowed, reason).
    """
    if not user:
        # Anonymous users can generate freely (no history saved)
        return True, "anonymous"

    # Pro users — unlimited
    if user.subscription_status == "pro":
        return True, "pro"

    # Reset monthly counter if needed
    now = datetime.utcnow()
    if user.usage_reset_date and now >= user.usage_reset_date:
        user.invoices_this_month = 0
        # Set next reset date to first of next month
        next_month = now.replace(day=1)
        if now.month == 12:
            next_month = next_month.replace(year=now.year + 1, month=1)
        else:
            next_month = next_month.replace(month=now.month + 1)
        user.usage_reset_date = next_month
        await session.commit()

    # Check limit
    if user.invoices_this_month >= FREE_MONTHLY_LIMIT:
        return False, f"Free plan limit reached ({FREE_MONTHLY_LIMIT}/month). Upgrade to Pro for unlimited invoices."

    return True, "free"


async def record_usage(user: Optional[User], session: AsyncSession):
    """Record that the user generated an invoice."""
    if not user:
        return
    user.invoices_this_month += 1
    await session.commit()


def should_watermark(user: Optional[User]) -> bool:
    """Whether to add 'Made with Invoq' watermark."""
    if not user:
        return True  # Anonymous gets watermark
    return user.subscription_status != "pro"
