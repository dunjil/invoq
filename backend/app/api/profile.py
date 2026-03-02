"""Business profile CRUD endpoints — multi-profile support."""

from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_session
from app.db.models import User, BusinessProfile
from app.api.deps import get_current_user

# Schemas
from app.schemas.profile import ProfileRequest, ProfileResponse


router = APIRouter(prefix="/api", tags=["profile"])


# ── Schemas ──────────────────────────────────────────────────

def _to_response(p: BusinessProfile) -> ProfileResponse:
    return ProfileResponse(
        id=p.id,
        label=p.label,
        is_default=p.is_default,
        name=p.name,
        address=p.address,
        email=p.email,
        phone=p.phone,
        logo_base64=p.logo_base64,
        signature_base64=p.signature_base64,
        primary_color=p.primary_color,
        default_currency=p.default_currency,
        default_currency_symbol=p.default_currency_symbol,
        default_notes=p.default_notes,
        watermark_enabled=p.watermark_enabled,
        watermark_type=p.watermark_type,
        watermark_text=p.watermark_text,
        watermark_image=p.watermark_image,
        watermark_color=p.watermark_color,
        watermark_opacity=p.watermark_opacity,
        watermark_rotation=p.watermark_rotation,
        watermark_font_size=p.watermark_font_size,
    )


def _apply_data(profile: BusinessProfile, data: ProfileRequest):
    """Apply request data to a profile model."""
    profile.label = data.label
    profile.name = data.name
    profile.address = data.address
    profile.email = data.email
    profile.phone = data.phone
    profile.logo_base64 = data.logo_base64
    profile.signature_base64 = data.signature_base64
    profile.primary_color = data.primary_color
    profile.default_currency = data.default_currency
    profile.default_currency_symbol = data.default_currency_symbol
    profile.default_notes = data.default_notes
    profile.watermark_enabled = data.watermark_enabled
    profile.watermark_type = data.watermark_type
    profile.watermark_text = data.watermark_text
    profile.watermark_image = data.watermark_image
    profile.watermark_color = data.watermark_color
    profile.watermark_opacity = data.watermark_opacity
    profile.watermark_rotation = data.watermark_rotation
    profile.watermark_font_size = data.watermark_font_size
    profile.updated_at = datetime.utcnow()


# ── Endpoints ────────────────────────────────────────────────

@router.get("/profiles", response_model=List[ProfileResponse])
async def list_profiles(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get all business profiles for the current user."""
    result = await session.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == user.id)
        .order_by(BusinessProfile.is_default.desc(), BusinessProfile.updated_at.desc())
    )
    profiles = result.scalars().all()
    return [_to_response(p) for p in profiles]


@router.get("/profile", response_model=Optional[ProfileResponse])
async def get_default_profile(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get the user's default profile (backward-compatible)."""
    # Try default first
    result = await session.execute(
        select(BusinessProfile)
        .where(BusinessProfile.user_id == user.id, BusinessProfile.is_default == True)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        # Fall back to most recently updated
        result = await session.execute(
            select(BusinessProfile)
            .where(BusinessProfile.user_id == user.id)
            .order_by(BusinessProfile.updated_at.desc())
            .limit(1)
        )
        profile = result.scalar_one_or_none()
    if not profile:
        return None
    return _to_response(profile)


@router.get("/profile/{profile_id}", response_model=ProfileResponse)
async def get_profile_by_id(
    profile_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Get a specific profile by ID."""
    result = await session.execute(
        select(BusinessProfile)
        .where(BusinessProfile.id == profile_id, BusinessProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")
    return _to_response(profile)


@router.post("/profile", response_model=ProfileResponse)
async def create_or_update_profile(
    data: ProfileRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Create or update a business profile.

    Premium Feature: Only Pro users can save and reuse profiles.
    """
    if user.subscription_status != "pro":
        raise HTTPException(
            status_code=403, 
            detail="Business profiles are a Pro feature. Please upgrade to save and reuse profiles."
        )

    if data.id:
        # Update existing
        result = await session.execute(
            select(BusinessProfile)
            .where(BusinessProfile.id == data.id, BusinessProfile.user_id == user.id)
        )
        profile = result.scalar_one_or_none()
        if not profile:
            raise HTTPException(status_code=404, detail="Profile not found")
        _apply_data(profile, data)
    else:
        # Create new
        profile = BusinessProfile(user_id=user.id)
        _apply_data(profile, data)

        # If this is the first profile or is_default requested, ensure it's default
        count_result = await session.execute(
            select(BusinessProfile).where(BusinessProfile.user_id == user.id)
        )
        existing_count = len(count_result.scalars().all())
        if existing_count == 0:
            profile.is_default = True

        session.add(profile)

    # Handle is_default flag — ensure only one default per user
    if data.is_default:
        await _set_single_default(session, user.id, profile.id if data.id else None)
        profile.is_default = True

    await session.commit()
    await session.refresh(profile)
    return _to_response(profile)


@router.put("/profile/{profile_id}", response_model=ProfileResponse)
async def update_profile(
    profile_id: str,
    data: ProfileRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Update a specific profile."""
    if user.subscription_status != "pro":
        raise HTTPException(
            status_code=403, 
            detail="Business profiles are a Pro feature. Please upgrade to save and reuse profiles."
        )

    result = await session.execute(
        select(BusinessProfile)
        .where(BusinessProfile.id == profile_id, BusinessProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    _apply_data(profile, data)

    if data.is_default:
        await _set_single_default(session, user.id, profile_id)
        profile.is_default = True

    await session.commit()
    await session.refresh(profile)
    return _to_response(profile)


@router.delete("/profile/{profile_id}")
async def delete_profile(
    profile_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Delete a profile. Cannot delete the last one."""
    result = await session.execute(
        select(BusinessProfile).where(BusinessProfile.user_id == user.id)
    )
    all_profiles = result.scalars().all()
    if len(all_profiles) <= 1:
        raise HTTPException(status_code=400, detail="Cannot delete your only profile")

    target = next((p for p in all_profiles if p.id == profile_id), None)
    if not target:
        raise HTTPException(status_code=404, detail="Profile not found")

    was_default = target.is_default
    await session.delete(target)

    # If we deleted the default, promote another
    if was_default:
        remaining = [p for p in all_profiles if p.id != profile_id]
        if remaining:
            remaining[0].is_default = True

    await session.commit()
    return {"success": True}


@router.post("/profile/{profile_id}/default", response_model=ProfileResponse)
async def set_default_profile(
    profile_id: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Set a profile as the default."""
    result = await session.execute(
        select(BusinessProfile)
        .where(BusinessProfile.id == profile_id, BusinessProfile.user_id == user.id)
    )
    profile = result.scalar_one_or_none()
    if not profile:
        raise HTTPException(status_code=404, detail="Profile not found")

    await _set_single_default(session, user.id, profile_id)
    profile.is_default = True

    await session.commit()
    await session.refresh(profile)
    return _to_response(profile)


async def _set_single_default(session: AsyncSession, user_id: str, except_id: Optional[str] = None):
    """Unset is_default for all profiles except the given one."""
    result = await session.execute(
        select(BusinessProfile).where(BusinessProfile.user_id == user_id)
    )
    for p in result.scalars().all():
        if except_id and p.id == except_id:
            continue
        p.is_default = False
