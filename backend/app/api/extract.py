"""AI text-to-invoice extraction — uses Anthropic Claude Haiku to parse natural language into invoice fields."""

import json
import time
from typing import Optional

from fastapi import APIRouter, File, UploadFile
from pydantic import BaseModel, Field
import anthropic
import pypdf
import docx
import io

from app.config import settings
from app.db.session import async_session
from app.db.models import ExtractionLog

# Schemas
from app.schemas.extract import ExtractionRequest, ExtractedItem, ExtractedInvoice, ExtractedLegal, ExtractionResponse


router = APIRouter(prefix="/api/extract", tags=["extract"])


SYSTEM_PROMPT_INVOICE = """You are an invoice extraction assistant. Given a natural language description of an invoice, extract structured JSON data.

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

Return ONLY valid JSON. No markdown, no explanation, no code fences."""

SYSTEM_PROMPT_LEGAL = """You are a legal document extraction assistant. Given a legal agreement (NDA, Contract, MSA, SOW) or a description of one, extract structured JSON data and draft/clean the body text.

Return a JSON object with these fields:
- title: string (e.g., "Non-Disclosure Agreement", "Service Agreement")
- type: string (one of: contract, nda, msa, sow)
- from_name: string (Discloser / Party 1 / Service Provider)
- to_name: string (Recipient / Party 2 / Client)
- effective_date: YYYY-MM-DD or null
- expiry_date: YYYY-MM-DD or null
- body_text: string (The full formal text of the agreement. Use professional legal boilerplate if drafting from a prompt. If parsing text, clean up any OCR artifacts.)
- summary: short 1-sentence summary of the agreement purpose.

Return ONLY valid JSON. No markdown, no explanation, no code fences."""


@router.post("", response_model=ExtractionResponse)
async def extract_invoice(request: ExtractionRequest):
    """Extract structured invoice data from natural language text."""
    return await _run_extraction(request.text, SYSTEM_PROMPT_INVOICE)


@router.post("/legal", response_model=ExtractionResponse)
async def extract_legal(request: ExtractionRequest):
    """Extract structured legal document data."""
    return await _run_extraction(request.text, SYSTEM_PROMPT_LEGAL)


@router.post("/upload", response_model=ExtractionResponse)
async def upload_and_extract(file: UploadFile = File(...)):
    """Upload a PDF, DOCX, or Text file and extract legal/invoice data from it."""
    try:
        content = await file.read()
        text = ""
        
        if file.filename.endswith(".pdf"):
            pdf_reader = pypdf.PdfReader(io.BytesIO(content))
            for page in pdf_reader.pages:
                text += page.extract_text() + "\n"
        elif file.filename.endswith(".docx"):
            doc = docx.Document(io.BytesIO(content))
            text = "\n".join([paragraph.text for paragraph in doc.paragraphs])
        else:
            text = content.decode("utf-8")
        
        # Heuristic: if it looks like legal text (contains "Agreement", "NDA", "Party"), use legal prompt
        legal_keywords = ["Agreement", "NDA", "Confidentiality", "Contractor", "Intellectual Property"]
        if any(kw in text for kw in legal_keywords):
            return await _run_extraction(text[:10000], SYSTEM_PROMPT_LEGAL)
        else:
            return await _run_extraction(text[:5000], SYSTEM_PROMPT_INVOICE)
            
    except Exception as e:
        return ExtractionResponse(success=False, error=f"File processing error: {str(e)}")


async def _run_extraction(text: str, system_prompt: str):
    if not settings.anthropic_api_key:
        return ExtractionResponse(
            success=False,
            error="Anthropic API key not configured.",
        )

    try:
        client = anthropic.Anthropic(api_key=settings.anthropic_api_key)
        start_time = time.time()
        
        response = client.messages.create(
            model="claude-3-5-haiku-latest",
            max_tokens=4096,
            system=system_prompt,
            messages=[{"role": "user", "content": text}],
        )

        raw = response.content[0].text
        elapsed_ms = int((time.time() - start_time) * 1000)

        if raw.strip().startswith("```"):
            if "json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            else:
                raw = raw.split("```")[1].split("```")[0].strip()

        parsed = json.loads(raw)

        # Log extraction
        async with async_session() as session:
            session.add(ExtractionLog(
                input_text=text[:500],
                success=True,
                items_extracted=0,
                response_time_ms=elapsed_ms,
            ))
            await session.commit()

        return ExtractionResponse(success=True, data=parsed)

    except Exception as e:
        return ExtractionResponse(success=False, error=str(e))

