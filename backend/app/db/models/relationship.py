import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text

class Relationship(SQLModel, table=True):
    """The core parent object connecting two parties."""
    __tablename__ = "relationships"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    initiator_id: str = Field(foreign_key="users.id", index=True)
    recipient_id: Optional[str] = Field(default=None, foreign_key="users.id", index=True, nullable=True)
    recipient_email: Optional[str] = Field(default=None, index=True)

    type: str = Field(default="company_contractor") 
    status: str = Field(default="active")
    
    start_date: Optional[str] = None
    billing_rate: Optional[str] = None
    billing_cycle: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

class SavedClient(SQLModel, table=True):
    """Legacy client record for quick picking."""
    __tablename__ = "saved_clients"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    
    name: str
    email: Optional[str] = None
    phone: Optional[str] = None
    address: Optional[str] = Field(default=None, sa_column=Column(Text))
    
    created_at: datetime = Field(default_factory=datetime.utcnow)
