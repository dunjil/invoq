import asyncio
from app.db.session import engine
from app.db.models import User
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

async def main():
    async with AsyncSession(engine) as session:
        result = await session.execute(select(User))
        users = result.scalars().all()
        for u in users:
            print(f"User: {u.email}")

asyncio.run(main())
