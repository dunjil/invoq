import asyncio
import sys
import os
from sqlalchemy import text

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import engine

async def fix_schema():
    async with engine.connect() as conn:
        print("Starting comprehensive schema fix...")
        
        # 1. Relationships - Ensure recipient_id is nullable and recipient_email exists
        res = await conn.execute(text("SELECT is_nullable FROM information_schema.columns WHERE table_name = 'relationships' AND column_name = 'recipient_id'"))
        row = res.fetchone()
        if row and row[0] == 'NO':
            print("Making relationships.recipient_id nullable...")
            await conn.execute(text("ALTER TABLE relationships ALTER COLUMN recipient_id DROP NOT NULL"))
            
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'relationships'"))
        cols = [r[0] for r in res]
        if 'recipient_email' not in cols:
            print("Adding recipient_email to relationships...")
            await conn.execute(text("ALTER TABLE relationships ADD COLUMN recipient_email VARCHAR"))

        # Contracts
        res = await conn.execute(text("SELECT column_name FROM information_schema.columns WHERE table_name = 'contracts'"))
        cols = [r[0] for r in res]
        if 'editable_fields_json' not in cols:
            print("Adding editable_fields_json to contracts...")
            await conn.execute(text("ALTER TABLE contracts ADD COLUMN editable_fields_json JSONB"))
        if 'recipient_email' not in cols:
            print("Adding recipient_email to contracts...")
            await conn.execute(text("ALTER TABLE contracts ADD COLUMN recipient_email VARCHAR"))
        if 'rejection_category' not in cols:
            print("Adding rejection_category to contracts...")
            await conn.execute(text("ALTER TABLE contracts ADD COLUMN rejection_category VARCHAR"))
        if 'recipient_id' not in cols:
            print("Adding recipient_id to contracts...")
            await conn.execute(text("ALTER TABLE contracts ADD COLUMN recipient_id VARCHAR"))
        if 'document_number' not in cols:
            print("Adding document_number to contracts...")
            await conn.execute(text("ALTER TABLE contracts ADD COLUMN document_number VARCHAR"))

        # 2. Document Tables (Contracts, Quotes, Invoices)
        tables = ['contracts', 'quotes', 'invoices']
        columns_to_add = [
            ('recipient_email', 'VARCHAR'),
            ('editable_fields_json', 'JSONB'),
            ('rejection_category', 'VARCHAR'),
            ('issuer_signature_base64', 'TEXT'),
            ('recipient_signature_base64', 'TEXT')
        ]
        
        for table in tables:
            print(f"Checking table: {table}")
            res = await conn.execute(text(f"SELECT column_name FROM information_schema.columns WHERE table_name = '{table}'"))
            existing_cols = [r[0] for r in res]
            
            for col_name, col_type in columns_to_add:
                if col_name not in existing_cols:
                    print(f"  Adding {col_name} to {table}...")
                    await conn.execute(text(f"ALTER TABLE {table} ADD COLUMN {col_name} {col_type}"))
        
        await conn.commit()
        print("Schema fix complete.")

if __name__ == "__main__":
    asyncio.run(fix_schema())
