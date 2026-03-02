import asyncio
from sqlalchemy import text
from app.db.session import engine

async def main():
    async with engine.connect() as conn:
        # Get contractor user id
        user_res = await conn.execute(text("SELECT id FROM users WHERE email='contractor@toolhub.com';"))
        user_id = user_res.scalar()
        print(f"User ID for contractor@toolhub.com: {user_id}")
        
        if user_id:
            # Check all invoices for this user
            inv_res = await conn.execute(text(f"SELECT id, invoice_number, user_id, issuer_id FROM invoices WHERE user_id='{user_id}' OR issuer_id='{user_id}';"))
            rows = inv_res.fetchall()
            print(f"Invoices found ({len(rows)}):")
            for r in rows:
                print(f"  {r}")
            
            # Check all quotes
            q_res = await conn.execute(text(f"SELECT id, quote_number, user_id, issuer_id FROM quotes WHERE user_id='{user_id}' OR issuer_id='{user_id}';"))
            q_rows = q_res.fetchall()
            print(f"Quotes found ({len(q_rows)}):")
            for r in q_rows:
                print(f"  {r}")

if __name__ == "__main__":
    asyncio.run(main())
