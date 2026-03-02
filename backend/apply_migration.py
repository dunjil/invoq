
import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.db.session import engine

async def migrate():
    async with engine.begin() as conn:
        print("Applying migrations...")
        try:
            await conn.execute(text("ALTER TABLE quotes ADD COLUMN contract_id VARCHAR"))
            print("✅ Added contract_id to quotes")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("ℹ️ contract_id already exists in quotes")
            else:
                print(f"❌ Error adding contract_id to quotes: {e}")

        try:
            await conn.execute(text("ALTER TABLE invoices ADD COLUMN contract_id VARCHAR"))
            print("✅ Added contract_id to invoices")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("ℹ️ contract_id already exists in invoices")
            else:
                print(f"❌ Error adding contract_id to invoices: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
