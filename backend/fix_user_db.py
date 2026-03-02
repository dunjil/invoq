import asyncio
from sqlalchemy import text
from app.db.session import engine

async def main():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE users ADD COLUMN usage_reset_date TIMESTAMP WITHOUT TIME ZONE;"))
            print("Added usage_reset_date to users.")
        except Exception as e:
            print(f"Error (maybe already exists?): {e}")

asyncio.run(main())
