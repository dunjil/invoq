import asyncio
import os
import sys
import uuid

# Add current directory to path
sys.path.append(os.getcwd())

from app.db.session import async_session
from app.db.models import User
from app.services.usage import check_usage

async def verify():
    async with async_session() as session:
        # 1. Setup - Create Test Users
        free_email = f"free_{uuid.uuid4().hex[:6]}@example.com"
        free_user = User(
            email=free_email, 
            name="Free User", 
            hashed_password="...", 
            subscription_status="free",
            invoices_this_month=100  # Way over old limit
        )
        session.add(free_user)

        pro_email = f"pro_{uuid.uuid4().hex[:6]}@example.com"
        pro_user = User(
            email=pro_email, 
            name="Pro User", 
            hashed_password="...", 
            subscription_status="pro",
            invoices_this_month=100
        )
        session.add(pro_user)

        await session.commit()
        await session.refresh(free_user)
        await session.refresh(pro_user)
        print(f"✅ Created Free User ({free_email}) and Pro User ({pro_email})")

        # 2. Verify check_usage allows both
        allowed_free, reason_free = await check_usage(free_user, session)
        assert allowed_free is True, "Free user should be allowed to generate invoices"
        print(f"✅ Free user usage check passed (Unlimited) - Reason: {reason_free}")

        allowed_pro, reason_pro = await check_usage(pro_user, session)
        assert allowed_pro is True, "Pro user should be allowed to generate invoices"
        print(f"✅ Pro user usage check passed (Unlimited) - Reason: {reason_pro}")

        print("\n🎉 REVENUE MODEL REFINEMENTS VERIFIED 🎉")

if __name__ == "__main__":
    asyncio.run(verify())
