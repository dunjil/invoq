"""AI text-to-invoice extraction — uses Anthropic Claude Haiku to parse natural language into invoice fields."""

import json
import time
from typing import Optional

from fastapi import APIRouter
from pydantic import BaseModel, Field
import anthropic

from app.config import settings
from app.db.session import async_session
from app.db.models import ExtractionLog

router = APIRouter(prefix="/api/extract", tags=["extract"])


class ExtractionRequest(BaseModel):
    text: str = Field(..., max_length=2000, description="Natural language invoice description")


class ExtractedItem(BaseModel):
    description: str
    quantity: float = 1
    unit_price: float = 0
    tax_rate: float = 0


class ExtractedInvoice(BaseModel):
    client_name: Optional[str] = None
    client_email: Optional[str] = None
    client_address: Optional[str] = None
    items: list[ExtractedItem] = []
    due_date: Optional[str] = None
    currency: str = "USD"
    currency_symbol: str = "$"
    notes: Optional[str] = None


class ExtractionResponse(BaseModel):
    success: bool
    data: Optional[ExtractedInvoice] = None
    error: Optional[str] = None


SYSTEM_PROMPT = """You are an invoice extraction assistant. Given a natural language description of an invoice, extract structured JSON data.

Return a JSON object with these fields:
- client_name: string (name of the person or company being billed)
- client_email: string or null
- client_address: string or null
- items: array of objects, each with:
  - description: string (what the work/product is)
  - quantity: number (default 1)
  - unit_price: number (the price per unit)
  - tax_rate: number (percentage, default 0)
- due_date: string in YYYY-MM-DD format or null (interpret "net 15" as 15 days from today, "net 30" as 30 days, etc.)
- currency: string (3-letter code like USD, EUR, GBP, NGN, etc.)
- currency_symbol: string (the symbol for the currency, like $, €, £, ₦, etc.)
- notes: string or null

Be smart about parsing. For example:
- "$800 for logo design" → one item with description "Logo Design", quantity 1, unit_price 800
- "2 hours of consulting at $150/hr" → one item with description "Consulting", quantity 2, unit_price 150
- "net 15" → due_date is 15 days from today

Return ONLY valid JSON. No markdown, no explanation, no code fences."""


@router.post("", response_model=ExtractionResponse)
async def extract_invoice(request: ExtractionRequest):
    """Extract structured invoice data from natural language text."""
    if not settings.anthropic_api_key:
        return ExtractionResponse(
            success=False,
            error="Anthropic API key not configured. Please set ANTHROPIC_API_KEY in your .env file.",
        )

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)

        start_time = time.time()
        response = client.messages.create(
            model="claude-3-5-haiku-latest",
            max_tokens=1024,
            system=SYSTEM_PROMPT,
            messages=[
                {"role": "user", "content": request.text},
            ],
        )

        raw = response.content[0].text
        elapsed_ms = int((time.time() - start_time) * 1000)

        # Strip any markdown fencing if present
        if raw.startswith("```"):
            raw = raw.split("\n", 1)[1].rsplit("```", 1)[0]

        parsed = json.loads(raw)

        extracted = ExtractedInvoice(
            client_name=parsed.get("client_name"),
            client_email=parsed.get("client_email"),
            client_address=parsed.get("client_address"),
            items=[ExtractedItem(**item) for item in parsed.get("items", [])],
            due_date=parsed.get("due_date"),
            currency=parsed.get("currency", "USD"),
            currency_symbol=parsed.get("currency_symbol", "$"),
            notes=parsed.get("notes"),
        )

        # Log extraction
        async with async_session() as session:
            session.add(ExtractionLog(
                input_text=request.text[:500],
                success=True,
                items_extracted=len(extracted.items),
                response_time_ms=elapsed_ms,
            ))
            await session.commit()

        return ExtractionResponse(success=True, data=extracted)

    except json.JSONDecodeError:
        # Log failure
        async with async_session() as session:
            session.add(ExtractionLog(
                input_text=request.text[:500],
                success=False,
                error_message="Failed to parse AI response as JSON",
            ))
            await session.commit()
        return ExtractionResponse(
            success=False, error="Failed to parse AI response as JSON"
        )
    except Exception as e:
        async with async_session() as session:
            session.add(ExtractionLog(
                input_text=request.text[:500],
                success=False,
                error_message=str(e)[:500],
            ))
            await session.commit()
        return ExtractionResponse(success=False, error=str(e))
