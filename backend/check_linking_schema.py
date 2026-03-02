
import asyncio
import os
import sys

# Add current directory to path so we can import 'app'
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.db.session import engine

async def check_schema():
    async with engine.connect() as conn:
        for table in ['quotes', 'invoices', 'contracts']:
            print(f"\nColumns in '{table}':")
            try:
                res = await conn.execute(text(f"SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = '{table}'"))
                found = False
                for row in res.fetchall():
                    if row[0] == 'contract_id':
                        print(f"✅ Found: {row}")
                        found = True
                if not found:
                    print(f"❌ Missing: contract_id")
            except Exception as e:
                print(f"Error checking table {table}: {e}")

if __name__ == "__main__":
    asyncio.run(check_schema())
