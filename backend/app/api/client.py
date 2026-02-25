"""Client tracking and Trust Network endpoints."""

from typing import List

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_session
from app.db.models import User, ClientProfile
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/clients", tags=["clients"])


@router.get("/")
async def get_client_profiles(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Retrieve all client trust profiles associated with the freelancer."""
    # Temporarily returning all as a stub until user_id filtering for client_profiles goes in
    result = await session.execute(select(ClientProfile))
    profiles = result.scalars().all()

    return {
        "success": True,
        "profiles": profiles
    }

@router.get("/{client_id}")
async def get_client_profile(
    client_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Retrieve a specific client's trust network profile."""
    result = await session.execute(select(ClientProfile).where(ClientProfile.client_user_id == client_id))
    profile = result.scalars().first()
    
    if not profile:
        raise HTTPException(status_code=404, detail="Client profile not found")

    return {
        "success": True,
        "profile": profile
    }
