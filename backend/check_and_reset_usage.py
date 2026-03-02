import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import engine
from app.db.models import User, UsageAudit
from sqlalchemy.future import select

async def main():
    async with AsyncSession(engine) as session:
        # Get duna
        result = await session.execute(select(User).where(User.email == "duna@example.com"))
        user = result.scalars().first()
        
        # Demote to free
        user.subscription_status = "free"
        
        # Reset usage count
        result = await session.execute(select(UsageAudit).where(UsageAudit.user_id == user.id))
        audit = result.scalars().first()
        if audit:
            audit.documents_generated = 0
            
        await session.commit()
        print("Demoted duna@example.com to free and reset usage count to 0")

asyncio.run(main())
