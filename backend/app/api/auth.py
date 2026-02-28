"""Authentication endpoints — JWT + bcrypt."""

import uuid
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
import jwt
from fastapi import APIRouter, Depends, HTTPException, Request, Header
from pydantic import BaseModel, Field
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_session
from app.db.models import User, ActivityLog, Relationship, Quote, Invoice, Document
from app.services.geoip_service import GeoIPService

router = APIRouter(prefix="/api/auth", tags=["auth"])

JWT_SECRET = settings.secret_key
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 72


# ── Schemas ──────────────────────────────────────────────────────────────────


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


# ── Helpers ──────────────────────────────────────────────────────────────────


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode("utf-8"), hashed.encode("utf-8"))


def create_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.utcnow(),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def decode_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload.get("sub")
    except jwt.ExpiredSignatureError:
        return None
    except jwt.InvalidTokenError:
        return None


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/register", response_model=AuthResponse)
async def register(
    data: RegisterRequest, 
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """Register a new user."""
    result = await session.execute(select(User).where(User.email == data.email.lower()))
    if result.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Email already registered")

    now = datetime.utcnow()
    next_month = now.replace(day=1)
    if now.month == 12:
        next_month = next_month.replace(year=now.year + 1, month=1)
    else:
        next_month = next_month.replace(month=now.month + 1)

    user = User(
        id=str(uuid.uuid4()),
        email=data.email.lower(),
        hashed_password=hash_password(data.password),
        name=data.name,
        subscription_status="free",
        invoices_this_month=0,
        usage_reset_date=next_month,
    )

    session.add(user)
    await session.commit()
    await session.refresh(user)

    # V8: Handle token claiming
    if data.claim_token:
        # Check Quotes, Invoices, Contracts
        # Note: In a larger app, we'd have a specific table for tokens or a polymorphic lookup.
        # For V8, we check all three document types.
        
        # 1. Check Quotes
        q_result = await session.execute(select(Quote).where(Quote.tracked_token == data.claim_token))
        quote = q_result.scalars().first()
        if quote and quote.relationship_id:
            rel_result = await session.execute(select(Relationship).where(Relationship.id == quote.relationship_id))
            rel = rel_result.scalars().first()
            if rel:
                rel.recipient_id = user.id
                quote.recipient_id = user.id
        
        # 2. Check Invoices
        i_result = await session.execute(select(Invoice).where(Invoice.tracked_token == data.claim_token))
        inv = i_result.scalars().first()
        if inv and inv.relationship_id:
            rel_result = await session.execute(select(Relationship).where(Relationship.id == inv.relationship_id))
            rel = rel_result.scalars().first()
            if rel:
                rel.recipient_id = user.id
                inv.recipient_id = user.id

        # 3. Check Documents (Contract, NDA, etc.)
        c_result = await session.execute(select(Document).where(Document.tracked_link_token == data.claim_token))
        doc = c_result.scalars().first()
        if doc and doc.relationship_id:
            rel_result = await session.execute(select(Relationship).where(Relationship.id == doc.relationship_id))
            rel = rel_result.scalars().first()
            if rel:
                rel.recipient_id = user.id
                doc.recipient_id = user.id # NEW: documents now have recipient_id too for portfolio view
        
        await session.commit()

    # Get geo data
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    country_code, country_name = await GeoIPService.get_country(ip) if ip else (None, None)

    # Log activity
    session.add(ActivityLog(
        user_id=user.id, 
        action="register",
        ip_address=ip,
        user_agent=ua,
        country_code=country_code,
        country_name=country_name
    ))
    await session.commit()

    token = create_token(user.id)
    return AuthResponse(
        token=token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "subscription_status": user.subscription_status,
        },
    )


@router.post("/login", response_model=AuthResponse)
async def login(
    data: LoginRequest, 
    request: Request,
    session: AsyncSession = Depends(get_session)
):
    """Login with email and password."""
    result = await session.execute(select(User).where(User.email == data.email.lower()))
    user = result.scalar_one_or_none()

    if not user or not verify_password(data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    # Get geo data
    ip = request.client.host if request.client else None
    ua = request.headers.get("user-agent")
    country_code, country_name = await GeoIPService.get_country(ip) if ip else (None, None)

    # Track login
    user.last_login_at = datetime.utcnow()
    user.login_count = (user.login_count or 0) + 1
    session.add(ActivityLog(
        user_id=user.id, 
        action="login",
        ip_address=ip,
        user_agent=ua,
        country_code=country_code,
        country_name=country_name
    ))
    await session.commit()

    token = create_token(user.id)
    return AuthResponse(
        token=token,
        user={
            "id": user.id,
            "email": user.email,
            "name": user.name,
            "subscription_status": user.subscription_status,
        },
    )


@router.get("/me", response_model=UserResponse)
async def get_me(
    authorization: Optional[str] = Header(default=None),
    session: AsyncSession = Depends(get_session),
):
    """Get current user profile."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")

    token = authorization.split(" ", 1)[1]
    user_id = decode_token(token)
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    return UserResponse(
        id=user.id,
        email=user.email,
        name=user.name,
        subscription_status=user.subscription_status,
        invoices_this_month=user.invoices_this_month,
        created_at=user.created_at.isoformat(),
    )
