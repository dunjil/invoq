import uuid
from datetime import datetime
from typing import Optional
from sqlmodel import SQLModel, Field, Column
from sqlalchemy import Text

class User(SQLModel, table=True):
    """Registered user."""
    __tablename__ = "users"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    email: str = Field(unique=True, index=True)
    full_name: str = ""
    name: str = ""
    hashed_password: str
    role: str = Field(default="contractor")

    stripe_customer_id: Optional[str] = None
    plan: str = Field(default="free")
    subscription_status: str = Field(default="free")
    
    invoices_this_month: int = 0
    usage_reset_date: Optional[datetime] = None
    login_count: int = 0
    last_login_at: Optional[datetime] = None

    logo_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    tax_region: Optional[str] = None
    email_verified: bool = False

    created_at: datetime = Field(default_factory=datetime.utcnow)

class BusinessProfile(SQLModel, table=True):
    """Saved business profile for quick invoice creation."""
    __tablename__ = "business_profiles"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True)

    label: str = "Default"
    is_default: bool = Field(default=False)

    name: str
    address: Optional[str] = Field(default=None, sa_column=Column(Text))
    email: Optional[str] = None
    phone: Optional[str] = None

    logo_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    signature_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    primary_color: str = "#D4A017"

    default_currency: str = "USD"
    default_currency_symbol: str = "$"
    default_notes: Optional[str] = Field(default=None, sa_column=Column(Text))

    watermark_enabled: bool = False
    watermark_type: str = "text"
    watermark_text: str = "CONFIDENTIAL"
    watermark_image: Optional[str] = Field(default=None, sa_column=Column(Text))
    watermark_color: str = "#6B6B63"
    watermark_opacity: float = 0.15
    watermark_rotation: float = -45
    watermark_font_size: int = 60

    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

class Company(SQLModel, table=True):
    """Company profile linked to an admin user."""
    __tablename__ = "companies"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    admin_user_id: str = Field(foreign_key="users.id", index=True)

    name: str
    address: Optional[str] = Field(default=None, sa_column=Column(Text))
    registration_number: Optional[str] = None
    logo_base64: Optional[str] = Field(default=None, sa_column=Column(Text))
    industry: Optional[str] = None

    created_at: datetime = Field(default_factory=datetime.utcnow)

class TrustProfile(SQLModel, table=True):
    """Verified badge dimensions and metrics."""
    __tablename__ = "trust_profiles"

    id: str = Field(default_factory=lambda: str(uuid.uuid4()), primary_key=True)
    user_id: str = Field(foreign_key="users.id", index=True, unique=True)
    client_user_id: Optional[str] = None
    
    invoice_accuracy: float = 0.0
    on_time_rate: float = 0.0
    avg_response_hours: float = 0.0
    dispute_rate: float = 0.0
    avg_relationship_days: float = 0.0
    total_engagements: int = 0
    
    last_updated: datetime = Field(default_factory=datetime.utcnow)

ClientProfile = TrustProfile
