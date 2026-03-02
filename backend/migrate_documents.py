
import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.db.session import engine

async def migrate():
    async with engine.begin() as conn:
        print("Applying migrations to 'contracts' table...")
        try:
            # Note: Document model maps to __tablename__ = "contracts"
            await conn.execute(text("ALTER TABLE contracts ADD COLUMN contract_id VARCHAR"))
            print("✅ Added contract_id to contracts")
        except Exception as e:
            if "already exists" in str(e).lower() or "duplicate column" in str(e).lower():
                print("ℹ️ contract_id already exists in contracts")
            else:
                print(f"❌ Error adding contract_id to contracts: {e}")

if __name__ == "__main__":
    asyncio.run(migrate())
