from typing import Optional, List
from pydantic import BaseModel, Field

class ProfileRequest(BaseModel):
    id: Optional[str] = None  # if provided → update existing
    label: str = "Default"
    name: str = Field(..., max_length=200)
    address: Optional[str] = Field(default=None, max_length=500)
    email: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)
    logo_base64: Optional[str] = None          # base64
    signature_base64: Optional[str] = None    # base64
    primary_color: str = "#D4A017"
    default_currency: str = "USD"
    default_currency_symbol: str = "$"
    default_notes: Optional[str] = Field(default=None, max_length=1000)
    is_default: bool = False
    # Watermark
    watermark_enabled: bool = False
    watermark_type: str = "text"
    watermark_text: str = "CONFIDENTIAL"
    watermark_image: Optional[str] = None   # base64
    watermark_color: str = "#6B6B63"
    watermark_opacity: float = 0.15
    watermark_rotation: float = -45
    watermark_font_size: int = 60

class ProfileResponse(BaseModel):
    id: str
    label: str
    is_default: bool
    name: str
    address: Optional[str]
    email: Optional[str]
    phone: Optional[str]
    logo_base64: Optional[str]
    signature_base64: Optional[str]
    primary_color: str
    default_currency: str
    default_currency_symbol: str
    default_notes: Optional[str]
    watermark_enabled: bool
    watermark_type: str
    watermark_text: str
    watermark_image: Optional[str]
    watermark_color: str
    watermark_opacity: float
    watermark_rotation: float
    watermark_font_size: int

class SavedClientCreate(BaseModel):
    name: str
    email: Optional[str] = None
    address: Optional[str] = None
    phone: Optional[str] = None

class SavedClientResponse(BaseModel):
    id: str
    name: str
    email: Optional[str]
    address: Optional[str]
    phone: Optional[str]
    created_at: str
    updated_at: str
