
import asyncio
from app.db.session import async_session
from app.db.models import User, Document, Relationship
from sqlalchemy.future import select
from datetime import datetime

async def simulate_save():
    email = "dunjil111@gmail.com"
    async with async_session() as session:
        # Get user
        res = await session.execute(select(User).where(User.email == email))
        user = res.scalar_one_or_none()
        if not user:
            print("User not found")
            return

        print(f"User ID: {user.id}")
        
        # Try to create a document
        doc = Document(
            user_id=user.id,
            type="contract",
            title="Test Agreement",
            document_number="TEST-001",
            from_name="Test From",
            to_name="Test To",
            body_text="# Test Body",
            status="draft"
        )
        
        try:
            session.add(doc)
            await session.commit()
            print("Successfully saved contract!")
        except Exception as e:
            print(f"Failed to save contract: {e}")
            import traceback
            traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(simulate_save())
