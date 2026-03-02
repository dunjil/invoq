import asyncio
import uuid
import sys
import os
from datetime import datetime
from sqlalchemy import select

# Add app to path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.db.session import async_session
from app.db.models import User, Relationship, Quote, Document

async def create_test_contract():
    try:
        async with async_session() as session:
            # Get or create a test user
            result = await session.execute(select(User).where(User.email == "test@example.com"))
            user = result.scalars().first()
            if not user:
                user = User(
                    id=str(uuid.uuid4()),
                    email="test@example.com",
                    hashed_password="fakehash",
                    name="Test User",
                    subscription_status="active",
                    invoices_this_month=0,
                    usage_reset_date=datetime.utcnow()
                )
                session.add(user)
                await session.commit()
                await session.refresh(user)
            
            # Create a relationship
            rel = Relationship(
                id=str(uuid.uuid4()),
                initiator_id=user.id,
                name="Browser Test Relationship",
                status="active"
            )
            session.add(rel)
            await session.commit()
            await session.refresh(rel)
            
            # Create a contract (Document)
            token = "test-token-" + str(uuid.uuid4())[:8]
            contract = Document(
                id=str(uuid.uuid4()),
                relationship_id=rel.id,
                user_id=user.id,
                type="contract",
                status="sent",
                title="Browser Test Contract",
                body_text="This is a test contract with [[Editable Field 1]] and [[Editable Field 2]].",
                tracked_link_token=token,
                editable_fields_json={
                    "Editable Field 1": "Initial Value 1",
                    "Editable Field 2": "Initial Value 2"
                }
            )
            session.add(contract)
            await session.commit()
            await session.refresh(contract)
            
            print(f"Created Test Contract with Token: {token}")
            print(f"URL: http://localhost:3000/view/contract/{token}")
    except Exception as e:
        print(f"ERROR: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(create_test_contract())
