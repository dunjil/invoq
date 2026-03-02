
import asyncio
import os
import sys

# Add current directory to path
sys.path.append(os.getcwd())

from sqlalchemy import text
from app.db.session import engine

async def migrate():
    async with engine.begin() as conn:
        print("🚀 Starting Onboarding Bundles migration...")
        
        # 1. Update contracts table
        print("Updating 'contracts' table...")
        try:
            await conn.execute(text("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT FALSE"))
            await conn.execute(text("ALTER TABLE contracts ADD COLUMN IF NOT EXISTS template_name VARCHAR"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_contracts_is_template ON contracts (is_template)"))
            print("✅ 'contracts' table updated.")
        except Exception as e:
            print(f"❌ Error updating 'contracts': {e}")

        # 2. Create document_bundles table
        print("Creating 'document_bundles' table...")
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS document_bundles (
                    id VARCHAR PRIMARY KEY,
                    user_id VARCHAR NOT NULL REFERENCES users(id),
                    name VARCHAR NOT NULL,
                    description TEXT,
                    created_at TIMESTAMP WITHOUT TIME ZONE DEFAULT CURRENT_TIMESTAMP
                )
            """))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_document_bundles_user_id ON document_bundles (user_id)"))
            print("✅ 'document_bundles' table created.")
        except Exception as e:
            print(f"❌ Error creating 'document_bundles': {e}")

        # 3. Create bundle_items table
        print("Creating 'bundle_items' table...")
        try:
            await conn.execute(text("""
                CREATE TABLE IF NOT EXISTS bundle_items (
                    id VARCHAR PRIMARY KEY,
                    bundle_id VARCHAR NOT NULL REFERENCES document_bundles(id) ON DELETE CASCADE,
                    template_id VARCHAR NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
                    order_index INTEGER DEFAULT 0
                )
            """))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_bundle_items_bundle_id ON bundle_items (bundle_id)"))
            await conn.execute(text("CREATE INDEX IF NOT EXISTS ix_bundle_items_template_id ON bundle_items (template_id)"))
            print("✅ 'bundle_items' table created.")
        except Exception as e:
            print(f"❌ Error creating 'bundle_items': {e}")

        print("\n🎉 Migration completed successfully!")

if __name__ == "__main__":
    asyncio.run(migrate())
