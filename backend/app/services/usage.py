"""Usage tracking service."""

from datetime import datetime
from typing import Optional

from sqlalchemy.ext.asyncio import AsyncSession

from app.db.models import User

FREE_MONTHLY_LIMIT = 5


async def check_usage(user: Optional[User], session: AsyncSession) -> tuple[bool, str]:
    """Check if user can generate an invoice.
    Returns (allowed, reason).
    """
    if not user:
        # Anonymous users can generate freely (no history saved)
        return True, "anonymous"

    # Invoices are now unlimited for all registered users (Pro and Free)
    return True, user.subscription_status


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
