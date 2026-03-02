import asyncio
from sqlalchemy import text
from app.db.session import engine

async def main():
    async with engine.connect() as conn:
        print("\n--- INVOICES ---")
        res = await conn.execute(text("SELECT id, invoice_number, user_id, issuer_id, tracked_link_token FROM invoices"))
        for row in res.fetchall():
            print(row)
            
        print("\n--- QUOTES ---")
        res = await conn.execute(text("SELECT id, quote_number, user_id, issuer_id, tracked_link_token FROM quotes"))
        for row in res.fetchall():
            print(row)

if __name__ == "__main__":
    asyncio.run(main())
