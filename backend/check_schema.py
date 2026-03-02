
import asyncio
from sqlalchemy import text
from app.db.session import engine

async def check_schema():
    async with engine.connect() as conn:
        res = await conn.execute(text("SELECT column_name, data_type, is_nullable FROM information_schema.columns WHERE table_name = 'contracts'"))
        for row in res.fetchall():
            print(row)

if __name__ == "__main__":
    asyncio.run(check_schema())
