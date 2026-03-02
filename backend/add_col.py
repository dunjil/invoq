import asyncio
from sqlalchemy import text
from app.db.session import engine

async def main():
    async with engine.begin() as conn:
        await conn.execute(text("ALTER TABLE invoices ADD COLUMN tracked_link_token VARCHAR;"))
        print("Successfully added tracked_link_token to invoices.")

if __name__ == "__main__":
    asyncio.run(main())
