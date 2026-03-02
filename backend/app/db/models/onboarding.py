import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field

class DocumentBundle(SQLModel, table=True):
    """A collection of document templates for onboarding."""
    __tablename__ = "document_bundles"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    name: str
    description: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)

class BundleItem(SQLModel, table=True):
    """Links a template to a bundle."""
    __tablename__ = "bundle_items"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    bundle_id: str = Field(foreign_key="document_bundles.id", index=True)
    template_id: str = Field(foreign_key="contracts.id", index=True)
    order_index: int = 0
