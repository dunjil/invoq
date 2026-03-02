import asyncio
import uuid
from sqlalchemy import text
from app.db.session import engine

async def main():
    async with engine.begin() as conn:
        # Patch invoices
        res = await conn.execute(text("SELECT id FROM invoices WHERE tracked_link_token IS NULL;"))
        rows = res.fetchall()
        for row in rows:
            new_token = str(uuid.uuid4())
            await conn.execute(
                text("UPDATE invoices SET tracked_link_token = :token WHERE id = :id"),
                {"token": new_token, "id": row[0]}
            )
        print(f"Patched {len(rows)} invoices.")

        # Patch quotes
        res = await conn.execute(text("SELECT id FROM quotes WHERE tracked_link_token IS NULL;"))
        rows = res.fetchall()
        for row in rows:
            new_token = str(uuid.uuid4())
            await conn.execute(
                text("UPDATE quotes SET tracked_link_token = :token WHERE id = :id"),
                {"token": new_token, "id": row[0]}
            )
        print(f"Patched {len(rows)} quotes.")

if __name__ == "__main__":
    asyncio.run(main())
