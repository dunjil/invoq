from typing import Optional, List
from pydantic import BaseModel

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
    total_extractions: int
    successful_extractions: int
    failed_extractions: int
    avg_extraction_time_ms: int
    active_users_today: int
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

class UpdateUserRequest(BaseModel):
    subscription_status: Optional[str] = None
    name: Optional[str] = None
