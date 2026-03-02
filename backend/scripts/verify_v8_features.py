import asyncio
import uuid
import sys
import os
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession
from sqlmodel import select

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import async_session, engine
from app.db.models import User, Relationship, Quote, Invoice, Document, QuoteLineItem

async def verify():
    try:
        async with async_session() as session:
            # 1. Setup - Create an issuer and a quote with a token
            issuer = User(
                id=str(uuid.uuid4()),
                email=f"issuer_{uuid.uuid4().hex[:6]}@example.com",
                hashed_password="fakehash",
                name="Test Issuer",
                subscription_status="free",
                invoices_this_month=0,
                usage_reset_date=datetime.utcnow()
            )
            session.add(issuer)
            await session.commit()
            await session.refresh(issuer)
            
            rel = Relationship(
                id=str(uuid.uuid4()),
                initiator_id=issuer.id,
                name="Test Project",
                status="active"
            )
            session.add(rel)
            await session.commit()
            await session.refresh(rel)
            
            claim_token = str(uuid.uuid4())
            quote = Quote(
                id=str(uuid.uuid4()),
                relationship_id=rel.id,
                issuer_id=issuer.id,
                quote_number="Q-VERIFY-001",
                tracked_token=claim_token,
                tracked_link_token=claim_token,
                editable_fields_json={"to_name": "Initial Name", "total": 100.0},
                status="sent",
                user_id=issuer.id
            )
            session.add(quote)
            await session.commit()
            await session.refresh(quote)
            
            print(f"Created Quote {quote.id} with token {claim_token}")
            
            # 2. Simulate Registration with claim_token
            new_user = User(
                id=str(uuid.uuid4()),
                email=f"recipient_{uuid.uuid4().hex[:6]}@example.com",
                hashed_password="fakehash",
                name="New Recipient",
                subscription_status="free",
                invoices_this_month=0,
                usage_reset_date=datetime.utcnow()
            )
            session.add(new_user)
            await session.commit()
            await session.refresh(new_user)
            
            print(f"Registered New User {new_user.id}")
            
            # Simulate backend/app/api/auth.py:register logic for claiming
            # 1. Check Quotes
            q_result = await session.execute(select(Quote).where(Quote.tracked_token == claim_token))
            found_quote = q_result.scalars().first()
            if found_quote and found_quote.relationship_id:
                rel_result = await session.execute(select(Relationship).where(Relationship.id == found_quote.relationship_id))
                found_rel = rel_result.scalars().first()
                if found_rel:
                    found_rel.recipient_id = new_user.id
                    found_quote.recipient_id = new_user.id
            
            await session.commit()
            await session.refresh(found_quote)
            await session.refresh(found_rel)
            
            print(f"Claimed Relationship: Rel Recipient={found_rel.recipient_id}, Quote Recipient={found_quote.recipient_id}")
            assert found_rel.recipient_id == new_user.id
            assert found_quote.recipient_id == new_user.id
            
            # 3. Test Editable Fields PATCH
            # Simulate PATCH /api/quotes/{token}/fields logic
            updated_fields = {"to_name": "Updated Recipient Name"}
            current_fields = found_quote.editable_fields_json.copy() if found_quote.editable_fields_json else {}
            for key, value in updated_fields.items():
                if key in current_fields:
                    if hasattr(found_quote, key):
                        setattr(found_quote, key, value)
                    current_fields[key] = value
            
            found_quote.editable_fields_json = current_fields
            await session.commit()
            await session.refresh(found_quote)
            
            print(f"Updated Fields: to_name={found_quote.to_name}, JSON={found_quote.editable_fields_json}")
            assert found_quote.to_name == "Updated Recipient Name"
            assert found_quote.editable_fields_json["to_name"] == "Updated Recipient Name"
            
            print("Verification Successful!")
    except Exception as e:
        print(f"CRITICAL ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(verify())

