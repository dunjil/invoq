"""FastAPI application — Invoq backend."""

from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.db.session import init_db
from app.api.invoice import router as invoice_router
from app.api.extract import router as extract_router
from app.api.auth import router as auth_router
from app.api.whisper import router as whisper_router
from app.api.profile import router as profile_router
from app.api.history import router as history_router
from app.api.billing import router as billing_router
from app.api.admin import router as admin_router
from app.api.quote import router as quote_router
from app.api.client import router as client_router
from app.api.address_book import router as address_book_router
from app.api.documents import router as documents_router
from app.api.dashboard import router as dashboard_router
from app.api.metrics import router as metrics_router
from app.api.onboarding import router as onboarding_router
from app.api.tax import router as tax_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown events."""
    await init_db()
    yield


app = FastAPI(
    title="Invoq API",
    description="The fastest invoice tool alive.",
    version="0.2.0",
    lifespan=lifespan,
)

# CORS
origins = [o.strip() for o in settings.cors_origins.split(",")]
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers
app.include_router(auth_router)
app.include_router(invoice_router)
app.include_router(extract_router)
app.include_router(whisper_router)
app.include_router(profile_router)
app.include_router(history_router)
app.include_router(billing_router)
app.include_router(admin_router)
app.include_router(quote_router)
app.include_router(client_router)
app.include_router(address_book_router)
app.include_router(documents_router)
app.include_router(dashboard_router)
app.include_router(metrics_router)
app.include_router(onboarding_router)
app.include_router(tax_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "invoq", "version": "0.2.0"}
