import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text

class ActivityLog(SQLModel, table=True):
    """Tracks user activity."""
    __tablename__ = "activity_logs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True)
    action: str = Field(index=True)
    details: Optional[str] = None
    ip_address: Optional[str] = None
    user_agent: Optional[str] = None
    country_code: Optional[str] = None
    country_name: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)

class ExtractionLog(SQLModel, table=True):
    """Tracks AI extraction usage."""
    __tablename__ = "extraction_logs"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: Optional[str] = Field(default=None, index=True)
    input_text: Optional[str] = Field(default=None, sa_column=Column(Text))
    success: bool = True
    error_message: Optional[str] = None
    model: str = "claude-3-5-haiku-latest"
    items_extracted: int = 0
    response_time_ms: int = 0
    created_at: datetime = Field(default_factory=datetime.utcnow, index=True)
