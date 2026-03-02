"""SQLModel database models (V8 Relationship Architecture).

This __init__.py allows the rest of the application to continue using:
`from app.db.models import User, Invoice, Quote`
by aggregating the models split across files into a single module namespace.
"""

from sqlmodel import SQLModel, Field, Column

# Forward definitions to allow proper SQLModel metadata registration
from .user import User, BusinessProfile, Company, TrustProfile, ClientProfile
from .relationship import Relationship, SavedClient
from .document import (
    Document, Contract, DocumentVersion, Signatory, 
    DocumentComment, ContractComment,
    Quote, QuoteLineItem, QuoteComment,
    Invoice, InvoiceLineItem, InvoiceComment,
    PaymentRecord
)
from .onboarding import DocumentBundle, BundleItem
from .activity import ActivityLog, ExtractionLog
from .finance import TaxLedger

# We export everything
__all__ = [
    "SQLModel", "Field", "Column",
    "User", "BusinessProfile", "Company", "TrustProfile", "ClientProfile",
    "Relationship", "SavedClient",
    "Document", "Contract", "DocumentVersion", "Signatory",
    "DocumentComment", "ContractComment",
    "Quote", "QuoteLineItem", "QuoteComment",
    "Invoice", "InvoiceLineItem", "InvoiceComment",
    "PaymentRecord",
    "DocumentBundle", "BundleItem",
    "ActivityLog", "ExtractionLog",
    "TaxLedger"
]
