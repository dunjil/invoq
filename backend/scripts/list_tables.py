import asyncio
import sys
import os
from sqlalchemy import text

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import engine

async def check():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT table_name FROM information_schema.tables WHERE table_schema='public'"))
        tables = [r[0] for r in res]
        print(f"Tables in database: {tables}")

if __name__ == "__main__":
    asyncio.run(check())
