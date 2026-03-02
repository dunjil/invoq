"""Tax and Trust data retrieval endpoints."""

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.future import select

from app.db.session import get_session
from app.api.deps import get_current_user
from app.db.models import User, TaxLedger, TrustProfile
from datetime import datetime

router = APIRouter(prefix="/api/profile", tags=["profile_metrics"])

@router.get("/tax")
async def get_tax_position(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get the detailed tax position for the current year."""
    tax_result = await session.execute(
        select(TaxLedger).where(TaxLedger.user_id == user.id).order_by(TaxLedger.tax_year.desc())
    )
    latest_ledger = tax_result.scalars().first()
    
    if not latest_ledger:
        return {
            "success": True,
            "tax": {
                "total_earned": 0.0,
                "total_tax_collected": 0.0,
                "estimated_tax": 0.0,
                "q1_q4_breakdown": {"q1": 0, "q2": 0, "q3": 0, "q4": 0},
                "per_client_breakdown": {}
            }
        }
        
    return {
        "success": True,
        "tax": {
            "total_earned": latest_ledger.total_earned,
            "total_tax_collected": latest_ledger.total_tax_collected,
            "estimated_tax": latest_ledger.total_earned * 0.2, # Baseline 20% mock
            "q1_q4_breakdown": latest_ledger.q1_q4_json or {"q1": 0, "q2": 0, "q3": 0, "q4": 0},
            "per_client_breakdown": latest_ledger.per_relationship_json or {}
        }
    }

@router.get("/trust")
async def get_trust_profile(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get the verified trust profile dimensions."""
    from app.services.trust_service import TrustService
    # Ensure it's up to date
    await TrustService.update_metrics(session, user.id)
    
    result = await session.execute(select(TrustProfile).where(TrustProfile.user_id == user.id))
    profile = result.scalars().first()
    
    if not profile:
        return {
            "success": False,
            "error": "Trust profile not found."
        }
        
    return {
        "success": True,
        "trust": {
            "invoice_accuracy": profile.invoice_accuracy,
            "on_time_rate": profile.on_time_rate,
            "avg_response_hours": profile.avg_response_hours,
            "dispute_rate": profile.dispute_rate,
            "avg_relationship_days": profile.avg_relationship_days,
            "total_engagements": profile.total_engagements
        }
    }
