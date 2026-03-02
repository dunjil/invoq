import asyncio
from sqlalchemy import text
from app.db.session import engine

async def main():
    async with engine.begin() as conn:
        # Fix invoices
        try:
            await conn.execute(text("ALTER TABLE invoices ADD COLUMN tracked_link_token VARCHAR;"))
            print("Added tracked_link_token to invoices.")
        except Exception as e:
            print(f"Invoices error (maybe already exists?): {e}")
            
        # Fix quotes
        try:
            await conn.execute(text("ALTER TABLE quotes ADD COLUMN tracked_link_token VARCHAR;"))
            print("Added tracked_link_token to quotes.")
        except Exception as e:
            print(f"Quotes error (maybe already exists?): {e}")

asyncio.run(main())
