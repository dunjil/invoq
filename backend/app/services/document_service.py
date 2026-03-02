"""Document lifecycle service (V8 Architecture)."""

from datetime import datetime
from typing import Optional, Dict
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select
from app.db.models import Document, DocumentVersion, User
from app.services.email_service import EmailService

class DocumentService:
    @staticmethod
    async def create_document(
        session: AsyncSession,
        creator_id: str,
        data: dict,
        rel_id: Optional[str] = None
    ) -> Document:
        """Create a new document and its initial version."""
        # V8: Fetch user to copy defaults if missing
        result = await session.execute(select(User).where(User.id == creator_id))
        user = result.scalars().first()
        
        if user:
            if not data.get("logo_base64"):
                data["logo_base64"] = user.logo_base64
            if not data.get("issuer_signature_base64"):
                data["issuer_signature_base64"] = user.signature_base64
            if not data.get("primary_color") or data.get("primary_color") == "#D4A017":
                if user.primary_color:
                    data["primary_color"] = user.primary_color

        new_doc = Document(
            user_id=creator_id,
            relationship_id=rel_id,
            **data,
            version=1,
            sent_at=datetime.utcnow()
        )
        session.add(new_doc)
        await session.commit()
        await session.refresh(new_doc)
        
        # Initial version record
        version = DocumentVersion(
            document_id=new_doc.id,
            version_number=1,
            metadata_json=new_doc.metadata_json,
            changed_by_id=creator_id,
            change_summary="Initial creation"
        )
        session.add(version)
        await session.commit()
        
        return new_doc

    @staticmethod
    async def issue_new_version(
        session: AsyncSession,
        document_id: str,
        updater_id: str,
        updates: dict,
        summary: str = "Updates applied"
    ) -> Document:
        """Issue a new version of the document (Creator only)."""
        result = await session.execute(select(Document).where(Document.id == document_id))
        doc = result.scalars().first()
        
        if not doc or doc.user_id != updater_id:
            raise PermissionError("Only the document creator can issue new versions.")
            
        # Update doc fields
        for key, value in updates.items():
            if hasattr(doc, key):
                setattr(doc, key, value)
        
        doc.version += 1
        doc.status = "sent" # Reset to sent on new version
        
        # Create version history
        version = DocumentVersion(
            document_id=doc.id,
            version_number=doc.version,
            metadata_json=doc.metadata_json,
            changed_by_id=updater_id,
            change_summary=summary
        )
        session.add(version)
        await session.commit()
        await session.refresh(doc)
        return doc

    @staticmethod
    def apply_template_variables(body_text: str, variables: Dict[str, str]) -> str:
        """Replace placeholders in document body."""
        for key, value in variables.items():
            placeholder = f"{{{{{key}}}}}"
            body_text = body_text.replace(placeholder, str(value) if value else "")
        return body_text

    @staticmethod
    async def handle_rejection(
        session: AsyncSession,
        document_id: str,
        category: str,
        reason: str,
        notes: Optional[str] = None,
        context_block: Optional[Dict] = None
    ):
        """Structured rejection of a document."""
        result = await session.execute(select(Document).where(Document.id == document_id))
        doc = result.scalars().first()
        if not doc:
            return
            
        doc.status = "needs_revision"
        
        # Notify creator
        issuer_result = await session.execute(select(User).where(User.id == doc.user_id))
        issuer = issuer_result.scalars().first()
        
        if issuer:
            await EmailService.send_rejection_notification(
                sender_name=doc.to_name or "A client",
                recipient_email=issuer.email,
                document_type=doc.type,
                document_number=doc.contract_number or "N/A",
                reason=reason,
                category=category,
                notes=notes,
                context_block=context_block
            )
        
        await session.commit()
