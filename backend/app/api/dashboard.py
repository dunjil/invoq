"""Dashboard and Portfolio View endpoints (V8 Architecture)."""

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from app.db.session import get_session
from app.api.deps import get_current_user
from app.db.models import User
from app.services.portfolio_service import PortfolioService

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])

@router.get("/portfolio")
async def get_portfolio_dashboard(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session)
):
    """Get the Section 03 Portfolio View aggregation."""
    summary = await PortfolioService.get_portfolio_summary(session, user.id)
    return {
        "success": True,
        "summary": summary
    }
