import asyncio
import os
import sys
import uuid

# Add current directory to path
sys.path.append(os.getcwd())

from app.db.session import async_session
from app.db.models import User, TaxLedger, Relationship

from app.api.tax import export_tax_excel, export_tax_docx

async def verify():
    async with async_session() as session:
        # 1. Setup - Create Test User and Ledger
        pro_email = f"pro_{uuid.uuid4().hex[:6]}@example.com"
        pro_user = User(
            email=pro_email, 
            name="Pro Tax User", 
            hashed_password="...", 
            subscription_status="pro",
            invoices_this_month=0
        )
        session.add(pro_user)
        await session.commit()
        await session.refresh(pro_user)
        
        rel = Relationship(
            initiator_id=pro_user.id,
            recipient_email="client@example.com",
            type="contractor_client",
            status="active"
        )
        session.add(rel)
        await session.commit()
        await session.refresh(rel)

        ledger = TaxLedger(
            user_id=pro_user.id,
            tax_year="2026",
            total_earned=1500.0,
            total_tax_collected=200.0,
            q1_q4_json={"q1": 500, "q2": 1000, "q3": 0, "q4": 0},
            per_relationship_json={str(rel.id): 1500.0}
        )
        session.add(ledger)
        await session.commit()

        print(f"✅ Setup complete for {pro_email}")

        # 2. Test Excel
        excel_response = await export_tax_excel(user=pro_user, session=session)
        assert excel_response.media_type == "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        assert len(excel_response.body) > 1000 # ensure some bytes are there
        print(f"✅ Excel export generated correctly ({len(excel_response.body)} bytes)")

        # 3. Test Docx
        docx_response = await export_tax_docx(user=pro_user, session=session)
        assert docx_response.media_type == "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        assert len(docx_response.body) > 1000
        print(f"✅ DOCX export generated correctly ({len(docx_response.body)} bytes)")


        print("\n🎉 TAX EXPORTS WORKS! 🎉")


if __name__ == "__main__":
    asyncio.run(verify())
