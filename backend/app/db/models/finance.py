import uuid
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import JSON

class TaxLedger(SQLModel, table=True):
    """Tax position tracking."""
    __tablename__ = "tax_ledgers"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)
    
    tax_year: str # e.g. "2026-2027"
    total_earned: float = 0.0
    total_tax_collected: float = 0.0

    q1_q4_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
    per_relationship_json: Optional[dict] = Field(default=None, sa_column=Column(JSON))
