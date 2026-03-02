
import asyncio
import os
import sys
import uuid

# Add current directory to path
sys.path.append(os.getcwd())

from app.db.session import async_session
from app.db.models import User, Document
from app.services.relationship_service import RelationshipService

async def verify_custom_types():
    async with async_session() as session:
        # 1. Setup
        user_email = f"custom_test_{uuid.uuid4().hex[:6]}@example.com"
        recipient_email = f"client_{uuid.uuid4().hex[:6]}@example.com"
        
        user = User(email=user_email, name="Custom Tester", hashed_password="...")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        print(f"✅ Created User: {user_email}")

        # 2. Relationship
        rel = await RelationshipService.get_or_create_relationship(session, user.id, recipient_email)
        print(f"✅ Relationship: {rel.id}")

        # 3. Create Master Contract
        master = Document(
            user_id=user.id,
            relationship_id=rel.id,
            type="contract",
            title="Master Service Agreement",
            status="active"
        )
        session.add(master)
        await session.commit()
        await session.refresh(master)
        print(f"✅ Created Master: {master.id}")

        # 4. Create Custom Document (Addendum) linked to Master
        addendum = Document(
            user_id=user.id,
            relationship_id=rel.id,
            contract_id=master.id,
            type="Addendum",
            title="Addendum #1 - Scope Expansion",
            status="draft"
        )
        session.add(addendum)
        await session.commit()
        await session.refresh(addendum)
        print(f"✅ Created Custom Addendum linked to Master: {addendum.contract_id}")
        assert addendum.type == "Addendum"
        assert addendum.contract_id == master.id

        # 5. Create Custom Document (Policy Update) linked to Master
        policy = Document(
            user_id=user.id,
            relationship_id=rel.id,
            contract_id=master.id,
            type="Policy Update",
            title="Data Protection Policy 2024",
            status="draft"
        )
        session.add(policy)
        await session.commit()
        await session.refresh(policy)
        print(f"✅ Created Custom Policy Update linked to Master: {policy.contract_id}")
        assert policy.type == "Policy Update"
        assert policy.contract_id == master.id

        print("\n🎉 CUSTOM DOCUMENT HIERARCHY VERIFIED 🎉")

if __name__ == "__main__":
    asyncio.run(verify_custom_types())
