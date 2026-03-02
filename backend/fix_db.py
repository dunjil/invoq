import asyncio
from sqlalchemy import text
from app.db.session import engine

async def main():
    async with engine.begin() as conn:
        try:
            await conn.execute(text("ALTER TABLE business_profiles ADD COLUMN logo_base64 TEXT;"))
            print("Added logo_base64 to business_profiles.")
        except Exception as e:
            print(f"Error (maybe already exists?): {e}")

asyncio.run(main())
