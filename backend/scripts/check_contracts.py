import asyncio
import sys
import os
from sqlalchemy import text

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'contracts'"))
        cols = {r[0]: r[1] for r in res}
        print(f"Columns in contracts: {cols}")

if __name__ == "__main__":
    asyncio.run(check())
