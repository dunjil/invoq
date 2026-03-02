from typing import Optional
from pydantic import BaseModel, Field

class RegisterRequest(BaseModel):
    email: str = Field(..., max_length=255)
    password: str = Field(..., min_length=6, max_length=128)
    name: str = Field(default="", max_length=100)
    claim_token: Optional[str] = None # V8: For invocation onboarding

class LoginRequest(BaseModel):
    email: str
    password: str

class AuthResponse(BaseModel):
    token: str
    user: dict

class UserResponse(BaseModel):
    id: str
    email: str
    name: str
    subscription_status: str
    invoices_this_month: int
    created_at: str
