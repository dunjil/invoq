"""Relationship orchestration service (V8 Architecture)."""

from datetime import datetime
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
        recipient_email = recipient_email.lower()
        
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
    async def claim_relationship(
        session: AsyncSession,
        user_id: str,
        email: str
    ):
        """Link an anonymous recipient to their newly created user account."""
        email = email.lower()
        result = await session.execute(
            select(Relationship).where(
                Relationship.recipient_email == email,
                Relationship.recipient_id == None
            )
        )
        rels = result.scalars().all()
        for rel in rels:
            rel.recipient_id = user_id
        
        await session.commit()
