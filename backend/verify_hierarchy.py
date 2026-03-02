
import asyncio
import os
import sys
import uuid

# Add current directory to path
sys.path.append(os.getcwd())

from sqlalchemy.future import select
from app.db.session import engine, async_session
from app.db.models import User, Relationship, Document, Quote, Invoice
from app.services.relationship_service import RelationshipService

async def verify():
    async with async_session() as session:
        # 1. Setup - Create Test User
        user_email = f"hierarchy_test_{uuid.uuid4().hex[:6]}@example.com"
        recipient_email = f"corp_{uuid.uuid4().hex[:6]}@example.com"
        
        user = User(email=user_email, name="Hierarchy Tester", hashed_password="...")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        print(f"✅ Created User: {user_email}")

        # 2. Relationship
        rel = await RelationshipService.get_or_create_relationship(session, user.id, recipient_email)
        print(f"✅ Relationship: {rel.id}")

        # 3. Create Master Contract (The Anchor)
        master_contract = Document(
            user_id=user.id,
            relationship_id=rel.id,
            type="contract",
            title="Master Framework Agreement",
            document_number="MFA-001",
            status="active"
        )
        session.add(master_contract)
        await session.commit()
        await session.refresh(master_contract)
        print(f"✅ Created Master Contract: {master_contract.id}")

        # 4. Create MSA linked to Master Contract
        msa = Document(
            user_id=user.id,
            relationship_id=rel.id,
            contract_id=master_contract.id,
            type="msa",
            title="Master Service Agreement",
            status="active"
        )
        session.add(msa)
        await session.commit()
        await session.refresh(msa)
        print(f"✅ Created MSA linked to Master: {msa.contract_id}")
        assert msa.contract_id == master_contract.id

        # 5. Create NDA linked to Master Contract
        nda = Document(
            user_id=user.id,
            relationship_id=rel.id,
            contract_id=master_contract.id,
            type="nda",
            title="Mutual NDA",
            status="active"
        )
        session.add(nda)
        await session.commit()
        await session.refresh(nda)
        print(f"✅ Created NDA linked to Master: {nda.contract_id}")
        assert nda.contract_id == master_contract.id

        # 6. Create SOW linked to MSA (which is linked to Master)
        sow = Document(
            user_id=user.id,
            relationship_id=rel.id,
            contract_id=msa.id,
            type="sow",
            title="SOW #1 - Phase 1",
            status="active"
        )
        session.add(sow)
        await session.commit()
        await session.refresh(sow)
        print(f"✅ Created SOW linked to MSA: {sow.contract_id}")
        assert sow.contract_id == msa.id

        # 7. Create Quote linked to SOW
        quote = Quote(
            user_id=user.id,
            issuer_id=user.id,
            relationship_id=rel.id,
            contract_id=sow.id,
            recipient_email=recipient_email,
            quote_number="QT-999"
        )
        session.add(quote)
        await session.commit()
        await session.refresh(quote)
        print(f"✅ Created Quote linked to SOW: {quote.contract_id}")
        assert quote.contract_id == sow.id

        print("\n🎉 MASTER HIERARCHY VERIFIED 🎉")

if __name__ == "__main__":
    asyncio.run(verify())
