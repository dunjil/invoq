"""Seed script — creates the admin/pro user.

Run with: python -m app.seed
"""

import asyncio
import uuid
from datetime import datetime, timedelta

import bcrypt
from sqlmodel import select

from app.db.session import async_session, init_db
from app.db.models import User, BusinessProfile


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


async def seed():
    await init_db()

    async with async_session() as session:
        # Check if user already exists
        result = await session.execute(
            select(User).where(User.email == "jsduna@gmail.com")
        )
        existing = result.scalar_one_or_none()

        if existing:
            print(f"✓ User jsduna@gmail.com already exists (id={existing.id})")
            print(f"  Status: {existing.subscription_status}")
            # Ensure pro status
            if existing.subscription_status != "pro":
                existing.subscription_status = "pro"
                await session.commit()
                print("  → Upgraded to Pro")
            return

        # Create admin + pro user
        # First user = admin (checked by admin.py)
        now = datetime.utcnow()
        next_month = now.replace(day=1)
        if now.month == 12:
            next_month = next_month.replace(year=now.year + 1, month=1)
        else:
            next_month = next_month.replace(month=now.month + 1)

        user = User(
            id=str(uuid.uuid4()),
            email="jsduna@gmail.com",
            hashed_password=hash_password("Jilang@4u"),
            name="Admin",
            subscription_status="pro",
            invoices_this_month=0,
            usage_reset_date=next_month,
            created_at=now,
        )

        session.add(user)
        await session.commit()
        await session.refresh(user)

        print(f"✓ Created admin user:")
        print(f"  Email:    jsduna@gmail.com")
        print(f"  Password: Jilang@4u")
        print(f"  Status:   pro")
        print(f"  ID:       {user.id}")
        print(f"  (First user = admin)")

        # Create a default business profile
        profile = BusinessProfile(
            id=str(uuid.uuid4()),
            user_id=user.id,
            label="Default",
            is_default=True,
            name="Admin",
            primary_color="#D4A017",
            default_currency="USD",
            default_currency_symbol="$",
            created_at=now,
            updated_at=now,
        )
        session.add(profile)
        await session.commit()
        print(f"✓ Created default business profile")


if __name__ == "__main__":
    asyncio.run(seed())
