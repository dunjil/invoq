"""Admin dashboard API — metrics, user management, analytics.

Only accessible by admin users (first registered user or flagged).
"""

from datetime import datetime, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlmodel import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import desc

from app.db.session import get_session
from app.db.models import User, Invoice, Quote, SavedClient, BusinessProfile, ActivityLog, ExtractionLog
from app.api.deps import get_current_user

router = APIRouter(prefix="/api/admin", tags=["admin"])


# ── Admin Check ──────────────────────────────────────────────

async def require_admin(
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Check if user is admin. First registered user is admin."""
    result = await session.execute(
        select(User).order_by(User.created_at.asc()).limit(1)
    )
    first_user = result.scalar_one_or_none()
    if not first_user or first_user.id != user.id:
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# ── Schemas ──────────────────────────────────────────────────

class OverviewMetrics(BaseModel):
    total_users: int
    total_invoices: int
    total_quotes: int
    total_clients: int
    total_revenue: float
    pro_users: int
    free_users: int
    users_today: int
    users_this_week: int
    users_this_month: int
    invoices_today: int
    invoices_this_week: int
    invoices_this_month: int
    quotes_this_month: int
    # Extraction stats
    total_extractions: int
    successful_extractions: int
    failed_extractions: int
    avg_extraction_time_ms: int
    # Engagement
    active_users_today: int  # users who logged in today
    active_users_week: int
    dau: int
    mau: int
    arr: float
    churn_rate: float
    retention_rate: float


class GrowthPoint(BaseModel):
    date: str
    count: int


class RevenuePoint(BaseModel):
    date: str
    amount: float
    count: int


class UserRow(BaseModel):
    id: str
    email: str
    name: str
    subscription_status: str
    invoices_this_month: int
    invoice_count: int
    login_count: int
    last_login_at: Optional[str]
    created_at: str
    last_active: Optional[str]
    country_code: Optional[str]
    country_name: Optional[str]


class InvoiceRow(BaseModel):
    id: str
    invoice_number: str
    from_name: str
    to_name: str
    total: float
    currency_symbol: str
    user_email: Optional[str]
    created_at: str


class ActivityRow(BaseModel):
    action: str
    user_email: Optional[str]
    details: Optional[str]
    created_at: str
    country_code: Optional[str]
    country_name: Optional[str]
class QuoteRow(BaseModel):
    id: str
    quote_number: str
    from_name: str
    to_name: str
    total: float
    currency_symbol: str
    user_email: Optional[str]
    status: str
    created_at: str

class ClientRow(BaseModel):
    id: str
    name: str
    email: Optional[str]
    phone: Optional[str]
    user_email: Optional[str]
    created_at: str


class ExtractionRow(BaseModel):
    success: bool
    items_extracted: int
    response_time_ms: int
    error_message: Optional[str]
    created_at: str


class DashboardResponse(BaseModel):
    overview: OverviewMetrics
    user_growth: List[GrowthPoint]
    invoice_growth: List[GrowthPoint]
    quote_growth: List[GrowthPoint]
    revenue_growth: List[RevenuePoint]
    recent_users: List[UserRow]
    top_users: List[UserRow]
    recent_invoices: List[InvoiceRow]
    recent_quotes: List[QuoteRow]
    recent_clients: List[ClientRow]
    recent_activity: List[ActivityRow]
    recent_extractions: List[ExtractionRow]


# ── Endpoints ────────────────────────────────────────────────

@router.get("/dashboard", response_model=DashboardResponse)
async def get_dashboard(
    days: int = 30,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    """Full admin dashboard data."""
    now = datetime.utcnow()
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    period_start = now - timedelta(days=days)
    week_ago = today - timedelta(days=7)
    month_ago = today - timedelta(days=30)

    # ── Load all data ────────────────────────────────────
    users_result = await session.execute(select(User))
    all_users = users_result.scalars().all()
    user_map = {u.id: u for u in all_users}

    invoices_result = await session.execute(select(Invoice))
    all_invoices = invoices_result.scalars().all()
    
    quotes_result = await session.execute(select(Quote))
    all_quotes = quotes_result.scalars().all()
    
    clients_result = await session.execute(select(SavedClient))
    all_clients = clients_result.scalars().all()

    extractions_result = await session.execute(select(ExtractionLog))
    all_extractions = extractions_result.scalars().all()

    activity_result = await session.execute(
        select(ActivityLog).order_by(desc(ActivityLog.created_at)).limit(50)
    )
    recent_activities = activity_result.scalars().all()

    # ── Overview Metrics ─────────────────────────────────
    all_activities_result = await session.execute(select(ActivityLog))
    all_activities = all_activities_result.scalars().all()

    total_revenue = sum(inv.total for inv in all_invoices)
    pro_users = len([u for u in all_users if u.subscription_status == "pro"])
    free_users = len(all_users) - pro_users

    users_today = len([u for u in all_users if u.created_at >= today])
    users_this_week = len([u for u in all_users if u.created_at >= week_ago])
    users_this_month = len([u for u in all_users if u.created_at >= month_ago])

    invoices_today = len([i for i in all_invoices if i.created_at >= today])
    invoices_this_week = len([i for i in all_invoices if i.created_at >= week_ago])
    invoices_this_month = len([i for i in all_invoices if i.created_at >= month_ago])
    quotes_this_month = len([q for q in all_quotes if q.created_at >= month_ago])

    # Churn & Retention Calculation
    downgrades = sum(1 for a in all_activities if a.action == "downgrade" and a.created_at >= period_start)
    upgrades = sum(1 for a in all_activities if a.action == "upgrade" and a.created_at >= period_start)
    
    pro_at_start = pro_users + downgrades - upgrades
    if pro_at_start <= 0:
        churn_rate = 0.0
    else:
        churn_rate = (downgrades / pro_at_start) * 100.0
    
    retention_rate = 100.0 - churn_rate if pro_users > 0 or pro_at_start > 0 else 0.0
    arr = (pro_users * 9.0) * 12.0 # Assuming $9/mo plan

    # Extraction stats
    successful = [e for e in all_extractions if e.success]
    failed = [e for e in all_extractions if not e.success]
    avg_time = int(sum(e.response_time_ms for e in successful) / max(len(successful), 1))

    # Active users (logged in today / this week)
    active_today = len([u for u in all_users if u.last_login_at and u.last_login_at >= today])
    active_week = len([u for u in all_users if u.last_login_at and u.last_login_at >= week_ago])
    active_month = len([u for u in all_users if u.last_login_at and u.last_login_at >= month_ago])

    overview = OverviewMetrics(
        total_users=len(all_users),
        total_invoices=len(all_invoices),
        total_quotes=len(all_quotes),
        total_clients=len(all_clients),
        total_revenue=total_revenue,
        pro_users=pro_users,
        free_users=free_users,
        users_today=users_today,
        users_this_week=users_this_week,
        users_this_month=users_this_month,
        invoices_today=invoices_today,
        invoices_this_week=invoices_this_week,
        invoices_this_month=invoices_this_month,
        quotes_this_month=quotes_this_month,
        total_extractions=len(all_extractions),
        successful_extractions=len(successful),
        failed_extractions=len(failed),
        avg_extraction_time_ms=avg_time,
        active_users_today=active_today,
        active_users_week=active_week,
        dau=active_today,
        mau=active_month,
        arr=arr,
        churn_rate=churn_rate,
        retention_rate=retention_rate,
    )

    # ── Daily Growth ─────────────────────────────────────
    user_growth = []
    invoice_growth = []
    quote_growth = []
    revenue_growth = []

    for i in range(days, -1, -1):
        day_start = today - timedelta(days=i)
        day_end = day_start + timedelta(days=1)
        date_str = day_start.strftime("%Y-%m-%d")

        day_users = len([u for u in all_users if day_start <= u.created_at < day_end])
        user_growth.append(GrowthPoint(date=date_str, count=day_users))

        day_invoices = [inv for inv in all_invoices if day_start <= inv.created_at < day_end]
        invoice_growth.append(GrowthPoint(date=date_str, count=len(day_invoices)))

        day_quotes = [q for q in all_quotes if day_start <= q.created_at < day_end]
        quote_growth.append(GrowthPoint(date=date_str, count=len(day_quotes)))

        day_rev = sum(inv.total for inv in day_invoices)
        revenue_growth.append(RevenuePoint(date=date_str, amount=day_rev, count=len(day_invoices)))

    # ── User Lists ───────────────────────────────────────
    inv_counts: dict[str, int] = {}
    last_active: dict[str, datetime] = {}
    for inv in all_invoices:
        if inv.user_id:
            inv_counts[inv.user_id] = inv_counts.get(inv.user_id, 0) + 1
            if inv.user_id not in last_active or inv.created_at > last_active[inv.user_id]:
                last_active[inv.user_id] = inv.created_at

    # User geography lookup (from recent activity logs)
    user_geo = {}
    for a in recent_activities:
        if a.user_id and a.country_code and a.user_id not in user_geo:
            user_geo[a.user_id] = (a.country_code, a.country_name)

    def to_row(u: User) -> UserRow:
        cc, cn = user_geo.get(u.id, (None, None))
        return UserRow(
            id=u.id,
            email=u.email,
            name=u.name,
            subscription_status=u.subscription_status,
            invoices_this_month=u.invoices_this_month,
            invoice_count=inv_counts.get(u.id, 0),
            login_count=u.login_count or 0,
            last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
            created_at=u.created_at.isoformat(),
            last_active=last_active[u.id].isoformat() if u.id in last_active else None,
            country_code=cc,
            country_name=cn,
        )

    recent_users = sorted(all_users, key=lambda u: u.created_at, reverse=True)[:20]
    top_users = sorted(all_users, key=lambda u: inv_counts.get(u.id, 0), reverse=True)[:20]

    # ── Recent Invoices ──────────────────────────────────
    sorted_invoices = sorted(all_invoices, key=lambda i: i.created_at, reverse=True)[:20]
    recent_invoices = [
        InvoiceRow(
            id=inv.id,
            invoice_number=inv.invoice_number,
            from_name=inv.from_name,
            to_name=inv.to_name,
            total=inv.total,
            currency_symbol=inv.currency_symbol,
            user_email=user_map.get(inv.user_id, None).email if inv.user_id and inv.user_id in user_map else None,
            created_at=inv.created_at.isoformat(),
        )
        for inv in sorted_invoices
    ]

    # ── Recent Quotes ────────────────────────────────────
    sorted_quotes = sorted(all_quotes, key=lambda q: q.created_at, reverse=True)[:20]
    recent_quotes = [
        QuoteRow(
            id=q.id,
            quote_number=q.quote_number,
            from_name=q.from_name,
            to_name=q.to_name,
            total=q.total,
            currency_symbol=q.currency_symbol,
            user_email=user_map.get(q.user_id).email if q.user_id and q.user_id in user_map else None,
            status=q.status,
            created_at=q.created_at.isoformat(),
        )
        for q in sorted_quotes
    ]

    # ── Recent Clients ───────────────────────────────────
    sorted_clients = sorted(all_clients, key=lambda c: c.created_at, reverse=True)[:20]
    recent_clients = [
        ClientRow(
            id=c.id,
            name=c.name,
            email=c.email,
            phone=c.phone,
            user_email=user_map.get(c.user_id).email if c.user_id and c.user_id in user_map else None,
            created_at=c.created_at.isoformat(),
        )
        for c in sorted_clients
    ]

    # ── Recent Activity ──────────────────────────────────
    recent_activity = [
        ActivityRow(
            action=a.action,
            user_email=user_map.get(a.user_id, None).email if a.user_id and a.user_id in user_map else None,
            details=a.details,
            created_at=a.created_at.isoformat(),
            country_code=a.country_code,
            country_name=a.country_name,
        )
        for a in recent_activities[:30]
    ]

    # ── Recent Extractions ───────────────────────────────
    sorted_extractions = sorted(all_extractions, key=lambda e: e.created_at, reverse=True)[:20]
    recent_extractions_list = [
        ExtractionRow(
            success=e.success,
            items_extracted=e.items_extracted,
            response_time_ms=e.response_time_ms,
            error_message=e.error_message,
            created_at=e.created_at.isoformat(),
        )
        for e in sorted_extractions
    ]

    return DashboardResponse(
        overview=overview,
        user_growth=user_growth,
        invoice_growth=invoice_growth,
        quote_growth=quote_growth,
        revenue_growth=revenue_growth,
        recent_users=[to_row(u) for u in recent_users],
        top_users=[to_row(u) for u in top_users],
        recent_invoices=recent_invoices,
        recent_quotes=recent_quotes,
        recent_clients=recent_clients,
        recent_activity=recent_activity,
        recent_extractions=recent_extractions_list,
    )


@router.get("/users", response_model=List[UserRow])
async def list_users(
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    """List all users with metrics."""
    users_result = await session.execute(select(User).order_by(desc(User.created_at)))
    all_users = users_result.scalars().all()

    invoices_result = await session.execute(select(Invoice))
    all_invoices = invoices_result.scalars().all()

    inv_counts: dict[str, int] = {}
    last_active: dict[str, datetime] = {}
    for inv in all_invoices:
        if inv.user_id:
            inv_counts[inv.user_id] = inv_counts.get(inv.user_id, 0) + 1
            if inv.user_id not in last_active or inv.created_at > last_active[inv.user_id]:
                last_active[inv.user_id] = inv.created_at

    return [
        UserRow(
            id=u.id,
            email=u.email,
            name=u.name,
            subscription_status=u.subscription_status,
            invoices_this_month=u.invoices_this_month,
            invoice_count=inv_counts.get(u.id, 0),
            login_count=u.login_count or 0,
            last_login_at=u.last_login_at.isoformat() if u.last_login_at else None,
            created_at=u.created_at.isoformat(),
            last_active=last_active[u.id].isoformat() if u.id in last_active else None,
            country_code=None,  # skipped for full list
            country_name=None,
        )
        for u in all_users
    ]


# ── User Management ─────────────────────────────────────────

class UpdateUserRequest(BaseModel):
    subscription_status: Optional[str] = None
    name: Optional[str] = None


@router.put("/users/{user_id}")
async def update_user(
    user_id: str,
    data: UpdateUserRequest,
    admin: User = Depends(require_admin),
    session: AsyncSession = Depends(get_session),
):
    """Admin update user — upgrade/downgrade, rename."""
    result = await session.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")

    if data.subscription_status is not None:
        user.subscription_status = data.subscription_status
    if data.name is not None:
        user.name = data.name

    session.add(ActivityLog(
        user_id=admin.id,
        action="admin_update_user",
        details=f"Updated user {user.email}: {data.dict(exclude_none=True)}",
    ))
    await session.commit()
    return {"success": True}
