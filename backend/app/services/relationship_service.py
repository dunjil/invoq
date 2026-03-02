"""Relationship orchestration service (V8 Architecture)."""

from datetime import datetime
import uuid
from typing import Optional
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import Relationship, User
from app.services.email_service import EmailService

class RelationshipService:
    @staticmethod
    async def get_or_create_relationship(
        session: AsyncSession,
        initiator_id: str,
        recipient_email: str,
        rel_type: str = "company_contractor"
    ) -> Relationship:
        """Idempotent relationship resolution or creation."""
        if recipient_email:
            recipient_email = recipient_email.lower()
        else:
            # For V8, a relationship might be established with a placeholder name 
            # or just be a "draft relationship" until an email is bound.
            # However, Document currently requires a relationship_id or at least works better with one.
            # Let's use a "pending" identifier if no email.
            recipient_email = "pending_" + str(uuid.uuid4())[:8]
        
        result = await session.execute(
            select(Relationship).where(
                Relationship.initiator_id == initiator_id,
                Relationship.recipient_email == recipient_email
            )
        )
        existing = result.scalars().first()
        if existing:
            return existing
            
        # Check if recipient already exists as a user
        u_result = await session.execute(
            select(User).where(User.email == recipient_email)
        )
        target_user = u_result.scalars().first()
        
        new_rel = Relationship(
            initiator_id=initiator_id,
            recipient_id=target_user.id if target_user else None,
            recipient_email=recipient_email,
            type=rel_type,
            status="active"
        )
        session.add(new_rel)
        await session.commit()
        await session.refresh(new_rel)
        return new_rel

    @staticmethod
    async def get_relationship_by_email(
        session: AsyncSession,
        initiator_id: str,
        recipient_email: str
    ) -> Optional[Relationship]:
        """Find an existing relationship without creating one."""
        if not recipient_email:
            return None
        
        recipient_email = recipient_email.lower()
        result = await session.execute(
            select(Relationship).where(
                Relationship.initiator_id == initiator_id,
                Relationship.recipient_email == recipient_email
            )
        )
        return result.scalars().first()

    @staticmethod
    async def claim_relationship(
        session: AsyncSession,
        user_id: str,
        email: str
    ):
        """Link an anonymous recipient to their newly created user account across all entities."""
        from app.db.models import Quote, Invoice, Document
        
        email = email.lower()
        
        # 1. Claim Relationships
        result = await session.execute(
            select(Relationship).where(
                Relationship.recipient_email == email,
                Relationship.recipient_id == None
            )
        )
        rels = result.scalars().all()
        rel_ids = [r.id for r in rels]
        
        for rel in rels:
            rel.recipient_id = user_id
        
        # 2. Claim Quotes
        q_result = await session.execute(
            select(Quote).where(
                (Quote.recipient_email == email) | (Quote.relationship_id.in_(rel_ids))
            ).where(Quote.recipient_id == None)
        )
        for q in q_result.scalars().all():
            q.recipient_id = user_id

        # 3. Claim Invoices
        i_result = await session.execute(
            select(Invoice).where(
                (Invoice.recipient_email == email) | (Invoice.relationship_id.in_(rel_ids))
            ).where(Invoice.recipient_id == None)
        )
        for i in i_result.scalars().all():
            i.recipient_id = user_id

        # 4. Claim Documents (Contract, NDA, etc.)
        d_result = await session.execute(
            select(Document).where(
                (Document.recipient_email == email) | (Document.relationship_id.in_(rel_ids))
            ).where(Document.recipient_id == None)
        )
        for d in d_result.scalars().all():
            d.recipient_id = user_id
        
        await session.commit()
