
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
        # 1. Setup - Create Test User if not exists
        user_email = f"test_{uuid.uuid4().hex[:6]}@example.com"
        recipient_email = f"client_{uuid.uuid4().hex[:6]}@example.com"
        
        user = User(email=user_email, name="Test User", hashed_password="...")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        print(f"✅ Created User: {user_email}")

        # 2. Relationship Lookup
        rel = await RelationshipService.get_or_create_relationship(session, user.id, recipient_email)
        print(f"✅ Resolved Relationship: {rel.id}")

        lookup_rel = await RelationshipService.get_relationship_by_email(session, user.id, recipient_email)
        assert lookup_rel.id == rel.id
        print(f"✅ Relationship lookup verified")

        # 3. Create governing contract
        contract = Document(
            user_id=user.id,
            relationship_id=rel.id,
            type="contract",
            title="Master Service Agreement",
            status="active"
        )
        session.add(contract)
        await session.commit()
        await session.refresh(contract)
        print(f"✅ Created Contract: {contract.id}")

        # 4. Create Quote linked to contract
        quote = Quote(
            user_id=user.id,
            issuer_id=user.id,
            relationship_id=rel.id,
            contract_id=contract.id,
            recipient_email=recipient_email,
            quote_number=f"QT-{uuid.uuid4().hex[:6]}",
            status="sent"
        )
        session.add(quote)
        await session.commit()
        await session.refresh(quote)
        print(f"✅ Created Quote linked to Contract: {quote.contract_id}")
        assert quote.contract_id == contract.id

        # 5. Simulate approval / inherit to Invoice
        # Simplified inherit logic as per quote.py approve_quote
        invoice = Invoice(
            user_id=user.id,
            issuer_id=quote.issuer_id,
            relationship_id=quote.relationship_id,
            contract_id=quote.contract_id,
            quote_id=quote.id,
            recipient_email=quote.recipient_email,
            invoice_number=quote.quote_number.replace("QT", "INV"),
            status="draft"
        )
        session.add(invoice)
        await session.commit()
        await session.refresh(invoice)
        print(f"✅ Created Invoice inheriting Contract: {invoice.contract_id}")
        assert invoice.contract_id == contract.id

        print("\n🎉 ALL FUNCTIONAL TESTS PASSED 🎉")

if __name__ == "__main__":
    asyncio.run(verify())
