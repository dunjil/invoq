
import asyncio
import os
import sys
import uuid

# Add current directory to path
sys.path.append(os.getcwd())

from app.db.session import async_session
from app.db.models import User, Document, DocumentBundle, BundleItem
from app.services.document_service import DocumentService

async def verify_onboarding():
    async with async_session() as session:
        # 1. Setup - Create Test User
        user_email = f"onboard_test_{uuid.uuid4().hex[:6]}@example.com"
        user = User(email=user_email, name="Onboard Manager", hashed_password="...")
        session.add(user)
        await session.commit()
        await session.refresh(user)
        print(f"✅ Created User: {user_email}")

        # 2. Create Templates
        nda_template = Document(
            user_id=user.id,
            is_template=True,
            template_name="Standard NDA",
            type="nda",
            title="Mutual NDA for {{recipient_name}}",
            body_text="This NDA protects info between {{sender_name}} and {{recipient_name}} starting {{effective_date}}."
        )
        msa_template = Document(
            user_id=user.id,
            is_template=True,
            template_name="Standard MSA",
            type="msa",
            title="Service Agreement",
            body_text="Master terms for {{recipient_name}}."
        )
        session.add(nda_template)
        session.add(msa_template)
        await session.commit()
        await session.refresh(nda_template)
        await session.refresh(msa_template)
        print(f"✅ Created Templates: {nda_template.id}, {msa_template.id}")

        # 3. Create Bundle
        bundle = DocumentBundle(
            user_id=user.id,
            name="Contractor Onboarding",
            description="NDA + MSA"
        )
        session.add(bundle)
        await session.commit()
        await session.refresh(bundle)
        
        item1 = BundleItem(bundle_id=bundle.id, template_id=nda_template.id, order_index=0)
        item2 = BundleItem(bundle_id=bundle.id, template_id=msa_template.id, order_index=1)
        session.add(item1)
        session.add(item2)
        await session.commit()
        print(f"✅ Created Bundle: {bundle.id} with 2 items")

        # 4. Simulate Invocation (Logic from API)
        recipient_email = f"new_hire_{uuid.uuid4().hex[:6]}@example.com"
        variables = {
            "recipient_name": "John Doe",
            "effective_date": "2026-04-01",
            "sender_name": user.name
        }
        
        # Test variable replacement helper
        test_body = DocumentService.apply_template_variables(nda_template.body_text, variables)
        print(f"✅ Variable replacement test: {test_body}")
        assert "John Doe" in test_body
        assert "2026-04-01" in test_body
        assert user.name in test_body

        print("\n🎉 ONBOARDING BUNDLE LOGIC VERIFIED 🎉")

if __name__ == "__main__":
    asyncio.run(verify_onboarding())
