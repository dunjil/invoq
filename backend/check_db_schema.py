import asyncio
from sqlalchemy import text
from app.db.session import engine
from app.config import settings

async def main():
    print(f"DATABASE URL: {settings.database_url}")
    async with engine.connect() as conn:
        for table in ["invoices", "quotes", "users"]:
            result = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}';"))
            columns = [row[0] for row in result.fetchall()]
            print(f"Table {table} columns: {columns}")

if __name__ == "__main__":
    asyncio.run(main())
