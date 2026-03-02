import asyncio
import os
import sys

# Add the project root to sys.path
sys.path.append(os.getcwd())

from app.db.session import async_session
from sqlalchemy import text

async def main():
    async with async_session() as session:
        # Use raw SQL to avoid model mapping errors with missing columns
        result = await session.execute(text("SELECT tracked_link_token FROM contracts LIMIT 1"))
        doc = result.fetchone()
        if doc:
            print(f"TOKEN:{doc[0]}")
        else:
            # Try invoices if contracts fail
            result = await session.execute(text("SELECT tracked_link_token FROM invoices LIMIT 1"))
            doc = result.fetchone()
            if doc:
                print(f"TOKEN:{doc[0]}")
            else:
                print("TOKEN:NONE")

if __name__ == "__main__":
    asyncio.run(main())
