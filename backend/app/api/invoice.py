"""Invoice generation endpoints — ported from ToolHub."""

import os
import re
import uuid
from datetime import datetime
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import FileResponse
from pydantic import BaseModel, Field
from num2words import num2words
from weasyprint import HTML
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.db.session import get_session
from app.db.models import User, Invoice as InvoiceModel, InvoiceComment, InvoiceLineItem
from app.api.deps import get_optional_user, get_current_user
from sqlalchemy.future import select
from sqlalchemy import delete
from app.services.usage import check_usage, record_usage, should_watermark

router = APIRouter(prefix="/api/invoice", tags=["invoice"])

TEMP_DIR = settings.temp_file_dir


# ── Schemas ──────────────────────────────────────────────────────────────────


class InvoiceItem(BaseModel):
    description: str = Field(..., max_length=200)
    quantity: float = Field(..., gt=0)
    unit_price: float = Field(..., ge=0)
    tax_rate: float = Field(default=0, ge=0, le=100)


class InvoiceAddress(BaseModel):
    name: str = Field(..., max_length=100)
    address_line1: str = Field(default="", max_length=200)
    address_line2: Optional[str] = Field(default=None, max_length=200)
    city: str = Field(default="", max_length=100)
    state: Optional[str] = Field(default=None, max_length=100)
    postal_code: str = Field(default="", max_length=20)
    country: str = Field(default="", max_length=100)
    email: Optional[str] = Field(default=None, max_length=100)
    phone: Optional[str] = Field(default=None, max_length=30)


class WatermarkConfig(BaseModel):
    enabled: bool = False
    content: Optional[str] = None
    content_type: str = "text"
    color: str = "#6b7280"
    opacity: float = Field(default=0.15, ge=0.05, le=1.0)
    rotation: int = Field(default=-45, ge=-90, le=90)
    font_size: int = Field(default=60, ge=20, le=200)


class InvoiceRequest(BaseModel):
    title: str = Field(default="INVOICE", max_length=50)
    invoice_number: Optional[str] = Field(default=None, max_length=50)
    quote_number: Optional[str] = Field(default=None, max_length=50)
    invoice_date: str
    due_date: Optional[str] = None

    from_address: InvoiceAddress
    to_address: InvoiceAddress
    items: List[InvoiceItem] = Field(..., min_length=1, max_length=50)

    currency: str = Field(default="USD", max_length=5)
    currency_symbol: str = Field(default="$", max_length=5)
    notes: Optional[str] = Field(default=None, max_length=5000)
    terms: Optional[str] = Field(default=None, max_length=1000)
    amount_in_words: Optional[str] = Field(default=None, max_length=200)
    logo_url: Optional[str] = None
    signature_data: Optional[str] = None
    client_signature_data: Optional[str] = None

    primary_color: str = "#3498db"
    template: str = "modern"
    show_tax: bool = True
    show_signature_section: bool = True

    watermark: Optional[WatermarkConfig] = None


class InvoiceResponse(BaseModel):
    success: bool
    download_url: Optional[str] = None
    error: Optional[str] = None
    invoice_number: Optional[str] = None
    total: Optional[float] = None
    subtotal: Optional[float] = None
    tax_total: Optional[float] = None
    tracked_link_token: Optional[str] = None
    invoice_id: Optional[str] = None


# ── Currency names ───────────────────────────────────────────────────────────

CURRENCY_NAMES = {
    "USD": ("Dollar", "Dollars", "Cent", "Cents"),
    "EUR": ("Euro", "Euros", "Cent", "Cents"),
    "GBP": ("Pound", "Pounds", "Penny", "Pence"),
    "JPY": ("Yen", "Yen", "Sen", "Sen"),
    "CNY": ("Yuan", "Yuan", "Jiao", "Jiao"),
    "CHF": ("Franc", "Francs", "Rappen", "Rappen"),
    "CAD": ("Canadian Dollar", "Canadian Dollars", "Cent", "Cents"),
    "AUD": ("Australian Dollar", "Australian Dollars", "Cent", "Cents"),
    "NZD": ("New Zealand Dollar", "New Zealand Dollars", "Cent", "Cents"),
    "SGD": ("Singapore Dollar", "Singapore Dollars", "Cent", "Cents"),
    "HKD": ("Hong Kong Dollar", "Hong Kong Dollars", "Cent", "Cents"),
    "INR": ("Rupee", "Rupees", "Paisa", "Paise"),
    "KRW": ("Won", "Won", "Jeon", "Jeon"),
    "MXN": ("Mexican Peso", "Mexican Pesos", "Centavo", "Centavos"),
    "BRL": ("Real", "Reais", "Centavo", "Centavos"),
    "ZAR": ("Rand", "Rand", "Cent", "Cents"),
    "NGN": ("Naira", "Naira", "Kobo", "Kobo"),
    "AED": ("Dirham", "Dirhams", "Fils", "Fils"),
    "SAR": ("Riyal", "Riyals", "Halala", "Halalat"),
    "ILS": ("Shekel", "Shekels", "Agora", "Agorot"),
    "TRY": ("Lira", "Liras", "Kurus", "Kurus"),
    "PLN": ("Zloty", "Zlotys", "Grosz", "Groszy"),
    "SEK": ("Krona", "Kronor", "Ore", "Ore"),
    "NOK": ("Krone", "Kroner", "Ore", "Ore"),
    "DKK": ("Krone", "Kroner", "Ore", "Ore"),
    "THB": ("Baht", "Baht", "Satang", "Satang"),
    "MYR": ("Ringgit", "Ringgit", "Sen", "Sen"),
    "PHP": ("Peso", "Pesos", "Centavo", "Centavos"),
    "IDR": ("Rupiah", "Rupiah", "Sen", "Sen"),
    "VND": ("Dong", "Dong", "Hao", "Hao"),
    "EGP": ("Egyptian Pound", "Egyptian Pounds", "Piastre", "Piastres"),
    "KES": ("Kenyan Shilling", "Kenyan Shillings", "Cent", "Cents"),
    "GHS": ("Cedi", "Cedis", "Pesewa", "Pesewas"),
    "PKR": ("Pakistani Rupee", "Pakistani Rupees", "Paisa", "Paise"),
    "BDT": ("Taka", "Taka", "Poisha", "Poisha"),
    "COP": ("Colombian Peso", "Colombian Pesos", "Centavo", "Centavos"),
    "ARS": ("Argentine Peso", "Argentine Pesos", "Centavo", "Centavos"),
    "CLP": ("Chilean Peso", "Chilean Pesos", "Centavo", "Centavos"),
    "PEN": ("Sol", "Soles", "Centimo", "Centimos"),
    "RUB": ("Ruble", "Rubles", "Kopeck", "Kopecks"),
    "UAH": ("Hryvnia", "Hryvnias", "Kopiyka", "Kopiykas"),
    "CZK": ("Koruna", "Korunas", "Haler", "Halere"),
    "HUF": ("Forint", "Forints", "Filler", "Fillers"),
    "RON": ("Leu", "Lei", "Ban", "Bani"),
    "BTC": ("Bitcoin", "Bitcoins", "Satoshi", "Satoshis"),
    "ETH": ("Ether", "Ether", "Gwei", "Gwei"),
    "USDT": ("Tether", "Tether", "Cent", "Cents"),
}


def get_amount_in_words(amount: float, currency_code: str) -> str:
    integer_part = int(amount)
    fractional_part = int(round((amount - integer_part) * 100))

    major_sing, major_plur, minor_sing, minor_plur = CURRENCY_NAMES.get(
        currency_code.upper(),
        (currency_code, currency_code + "s", "Cent", "Cents"),
    )

    words = num2words(integer_part).replace("-", " ")
    words += f" {major_sing}" if integer_part == 1 else f" {major_plur}"

    if fractional_part > 0:
        words += f" and {num2words(fractional_part).replace('-', ' ')}"
        words += f" {minor_sing}" if fractional_part == 1 else f" {minor_plur}"

    return words


# ── HTML Generation ──────────────────────────────────────────────────────────


def generate_invoice_html(data: InvoiceRequest) -> tuple[str, float, float, float]:
    """Generate HTML for the invoice and return (html, subtotal, tax_total, total)."""

    subtotal = 0.0
    tax_total = 0.0

    items_html = ""
    for item in data.items:
        line_total = item.quantity * item.unit_price
        line_tax = line_total * (item.tax_rate / 100) if data.show_tax else 0
        subtotal += line_total
        tax_total += line_tax

        tax_cell = (
            f'<td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 12px;">{item.tax_rate}%</td>'
            if data.show_tax
            else ""
        )
        items_html += f"""
        <tr>
            <td style="padding: 8px; border-bottom: 1px solid #eee; font-size: 12px;">{item.description}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: center; font-size: 12px;">{item.quantity}</td>
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-size: 12px;">{data.currency_symbol}{item.unit_price:,.2f}</td>
            {tax_cell}
            <td style="padding: 8px; border-bottom: 1px solid #eee; text-align: right; font-weight: 500; font-size: 12px;">{data.currency_symbol}{line_total:,.2f}</td>
        </tr>
        """

    total = subtotal + tax_total if data.show_tax else subtotal

    def format_address(addr: InvoiceAddress) -> str:
        lines = [f"<strong>{addr.name}</strong>"]
        if addr.address_line1:
            lines.append(addr.address_line1.replace("\n", "<br>"))
        if addr.address_line2:
            lines.append(addr.address_line2)
        city_line = ", ".join(filter(None, [addr.city, addr.state, addr.postal_code]))
        if city_line:
            lines.append(city_line)
        if addr.country:
            lines.append(addr.country)
        if addr.email:
            lines.append(f"<br>{addr.email}")
        if addr.phone:
            lines.append(addr.phone)
        return "<br>".join(lines)

    from_html = format_address(data.from_address)
    to_html = format_address(data.to_address)

    notes_html = (
        f'<div style="margin-top: 30px;"><h4 style="color: {data.primary_color};">Notes</h4><p style="color: #666; font-size: 12px;">{data.notes}</p></div>'
        if data.notes
        else ""
    )
    terms_html = (
        f'<div style="margin-top: 20px;"><h4 style="color: {data.primary_color};">Terms & Conditions</h4><p style="color: #666; font-size: 12px;">{data.terms}</p></div>'
        if data.terms
        else ""
    )

    logo_html = (
        f'<img src="{data.logo_url}" style="max-height: 60px; max-width: 200px;">'
        if data.logo_url
        else ""
    )

    # Watermark
    watermark_html = ""
    if data.watermark and data.watermark.enabled and data.watermark.content:
        wm = data.watermark
        if wm.content_type == "text":
            watermark_html = f"""
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate({wm.rotation}deg);
                        opacity: {wm.opacity}; pointer-events: none; z-index: 1000; white-space: nowrap;">
                <span style="font-size: {wm.font_size}px; font-weight: bold; color: {wm.color};">{wm.content}</span>
            </div>
            """
        elif wm.content_type == "image" and wm.content:
            watermark_html = f"""
            <div style="position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%) rotate({wm.rotation}deg);
                        opacity: {wm.opacity}; pointer-events: none; z-index: 1000;">
                <img src="{wm.content}" style="max-width: 300px; max-height: 300px;" alt="Watermark">
            </div>
            """

    # Signature
    signature_html = ""
    if data.show_signature_section:
        justify = "space-between" if data.client_signature_data else "flex-end"
        client_sig_html = ""
        if data.client_signature_data:
            client_sig_html = f"""
                <div style="width: 45%;">
                    <div style="margin-bottom: 8px;"><img src="{data.client_signature_data}" style="max-height: 60px; max-width: 180px;" alt="Client Signature"></div>
                    <div style="border-top: 1px solid #333; padding-top: 8px;">
                        <p style="margin: 0; font-size: 11px; color: #666;">Client Signature</p>
                    </div>
                </div>"""
        auth_sig_img = (
            f'<div style="margin-bottom: 8px;"><img src="{data.signature_data}" style="max-height: 60px; max-width: 180px;" alt="Signature"></div>'
            if data.signature_data
            else '<div style="height: 50px;"></div>'
        )
        signature_html = f"""<!-- Signature Section -->
            <div style="margin-top: 40px; display: flex; justify-content: {justify};">
                {client_sig_html}
                <div style="width: 45%;">
                    {auth_sig_img}
                    <div style="border-top: 1px solid #333; padding-top: 8px;">
                        <p style="margin: 0; font-size: 11px; color: #666;">Authorized Signature</p>
                    </div>
                </div>
            </div>"""

    html = f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Invoice {data.invoice_number}</title>
    </head>
    <body style="font-family: 'Helvetica Neue', Arial, sans-serif; color: #333; line-height: 1.5; margin: 0; padding: 20px 25px; position: relative;">
        {watermark_html}
        <div style="max-width: 100%; position: relative;">
            <!-- Header -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 20px;">
                <div>
                    {logo_html}
                    <div style="margin-top: 8px; color: #666; font-size: 12px;">
                        {from_html}
                    </div>
                </div>
                <div style="text-align: right;">
                    <h1 style="margin: 0; color: {data.primary_color}; font-size: 28px; font-weight: 300;">{data.title.upper()}</h1>
                    <div style="margin-top: 8px; color: #666; font-size: 12px;">
                        <p style="margin: 3px 0;"><strong>{ "Quote" if data.title.upper() == "QUOTE" else "Invoice" } #:</strong> {data.quote_number or data.invoice_number or 'N/A'}</p>
                        <p style="margin: 3px 0;"><strong>Date:</strong> {data.invoice_date}</p>
                        {f'<p style="margin: 3px 0;"><strong>Due Date:</strong> {data.due_date}</p>' if data.due_date else ''}
                    </div>
                </div>
            </div>

            <!-- Bill To -->
            <div style="background: #f9f9f9; padding: 12px; border-radius: 6px; margin-bottom: 16px;">
                <h3 style="margin: 0 0 6px 0; color: {data.primary_color}; font-size: 11px; text-transform: uppercase;">Bill To</h3>
                <div style="color: #666; font-size: 12px;">
                    {to_html}
                </div>
            </div>

            <!-- Items Table -->
            <table style="width: 100%; border-collapse: collapse; margin-bottom: 16px;">
                <thead>
                    <tr style="background: {data.primary_color}; color: white;">
                        <th style="padding: 8px; text-align: left; font-weight: 500; font-size: 11px;">Description</th>
                        <th style="padding: 8px; text-align: center; font-weight: 500; font-size: 11px;">Qty</th>
                        <th style="padding: 8px; text-align: right; font-weight: 500; font-size: 11px;">Unit Price</th>
                        {'<th style="padding: 8px; text-align: right; font-weight: 500; font-size: 11px;">Tax</th>' if data.show_tax else ''}
                        <th style="padding: 8px; text-align: right; font-weight: 500; font-size: 11px;">Amount</th>
                    </tr>
                </thead>
                <tbody>
                    {items_html}
                </tbody>
            </table>

            <!-- Totals -->
            <div style="display: flex; justify-content: flex-end;">
                <div style="width: 240px;">
                    <div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; font-size: 12px;">
                        <span style="color: #666;">Subtotal</span>
                        <span>{data.currency_symbol}{subtotal:,.2f}</span>
                    </div>
                    {'<div style="display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; font-size: 12px;"><span style="color: #666;">Tax</span><span>' + data.currency_symbol + f'{tax_total:,.2f}</span></div>' if data.show_tax else ''}
                    <div style="display: flex; justify-content: space-between; padding: 8px 0; font-size: 16px; font-weight: bold; color: {data.primary_color};">
                        <span>Total ({data.currency})</span>
                        <span>{data.currency_symbol}{total:,.2f}</span>
                    </div>
                </div>
            </div>

            {f'''<div style="margin-top: 30px; margin-bottom: 20px; padding: 12px; background: #f9f9f9; border-radius: 6px;">
                <h4 style="margin: 0 0 4px 0; color: #666; font-size: 11px; text-transform: uppercase;">Amount in Words</h4>
                <p style="margin: 0; color: #333; font-size: 12px; font-weight: 500; text-transform: capitalize;">{data.amount_in_words}</p>
            </div>''' if data.amount_in_words else ''}

            {notes_html}
            {terms_html}

            {signature_html}

            <!-- Footer -->
            <div style="margin-top: 30px; padding-top: 12px; border-top: 1px solid #eee; text-align: center; color: #999; font-size: 10px;">
                <p style="margin: 0;">Thank you for your business!</p>
            </div>
        </div>
    </body>
    </html>
    """

    return html, subtotal, tax_total, total


# ── Endpoints ────────────────────────────────────────────────────────────────


@router.post("/generate", response_model=InvoiceResponse)
async def generate_invoice(
    data: InvoiceRequest,
    user: Optional[User] = Depends(get_optional_user),
    session: AsyncSession = Depends(get_session),
):
    """Generate a PDF invoice and return a download URL."""
    # Check usage limits
    allowed, reason = await check_usage(user, session)
    if not allowed:
        return InvoiceResponse(success=False, error=reason)

    try:
        # Add "Made with Invoq" watermark for free-tier users
        add_invoq_watermark = should_watermark(user)

        html_content, subtotal, tax_total, total = generate_invoice_html(data)

        if add_invoq_watermark:
            # Inject a subtle footer watermark
            invoq_badge = '''<div style="position: fixed; bottom: 10px; right: 20px; opacity: 0.4; font-size: 9px; color: #999;">Made with invoq.app</div>'''
            html_content = html_content.replace("</body>", f"{invoq_badge}</body>")

        html = HTML(string=html_content)
        pdf_bytes = html.write_pdf()

        file_id = str(uuid.uuid4())
        filename = f"invoice_{data.invoice_number.replace('/', '_')}_{file_id}.pdf"
        filepath = os.path.join(TEMP_DIR, filename)

        with open(filepath, "wb") as f:
            f.write(pdf_bytes)

        # Record usage for logged-in users
        await record_usage(user, session)

        # Save to history for logged-in users
        if user:
            invoice_record = InvoiceModel(
                user_id=user.id,
                invoice_number=data.invoice_number,
                invoice_date=data.invoice_date,
                due_date=data.due_date,
                from_name=data.from_address.name,
                from_details=data.from_address.address_line1,
                to_name=data.to_address.name,
                to_details=data.to_address.address_line1,
                items={"items": [item.model_dump() for item in data.items]},
                currency=data.currency,
                currency_symbol=data.currency_symbol,
                subtotal=subtotal,
                tax_total=tax_total,
                total=total,
                notes=data.notes,
                primary_color=data.primary_color,
                signature_data=data.signature_data,
                client_signature_data=data.client_signature_data,
                pdf_filename=filename,
                status="sent",
                sent_at=datetime.utcnow()
            )
            session.add(invoice_record)
            await session.commit()
            await session.refresh(invoice_record)

            # Copy line items for structured data tracking
            for item in data.items:
                inv_item = InvoiceLineItem(
                    invoice_id=invoice_record.id,
                    description=item.description,
                    quantity=item.quantity,
                    unit_price=item.unit_price,
                    tax_rate=item.tax_rate,
                    total=item.quantity * item.unit_price
                )
                session.add(inv_item)
            await session.commit()

        return InvoiceResponse(
            success=True,
            download_url=f"/api/invoice/download/{filename}",
            invoice_number=data.invoice_number,
            subtotal=subtotal,
            tax_total=tax_total,
            total=total,
            tracked_link_token=invoice_record.tracked_link_token if user else None,
            invoice_id=invoice_record.id if user else None,
        )

    except Exception as e:
        return InvoiceResponse(success=False, error=str(e))


@router.get("/download/{filename}")
async def download_invoice(filename: str):
    """Download generated invoice PDF."""
    if not filename or ".." in filename or "/" in filename:
        return {"error": "Invalid filename"}

    filepath = os.path.join(TEMP_DIR, filename)
    if not os.path.exists(filepath):
        return {"error": "File not found or expired"}

    parts = filename.split("_")
    invoice_num = parts[1] if len(parts) > 1 else "invoice"

    return FileResponse(
        filepath,
        media_type="application/pdf",
        filename=f"Invoice_{invoice_num}.pdf",
    )


@router.post("/preview")
async def preview_invoice(data: InvoiceRequest):
    """Generate HTML preview of invoice."""
    try:
        html_content, subtotal, tax_total, total = generate_invoice_html(data)

        body_match = re.search(
            r"<body[^>]*>(.*?)</body>", html_content, re.DOTALL | re.IGNORECASE
        )
        preview_html = body_match.group(1) if body_match else html_content

        return {
            "success": True,
            "html": preview_html,
            "subtotal": subtotal,
            "tax_total": tax_total,
            "total": total,
        }
    except Exception as e:
        return {"success": False, "error": str(e)}


@router.get("/templates")
async def get_templates():
    """Available invoice templates."""
    return {
        "templates": [
            {"id": "modern", "name": "Modern", "description": "Clean and contemporary design"},
            {"id": "classic", "name": "Classic", "description": "Traditional professional look"},
            {"id": "minimal", "name": "Minimal", "description": "Simple and elegant"},
        ]
    }


# ── Tracking Endpoints (Phase 6 & 7 Parity) ──────────────────────────────────

@router.get("/track/{token}")
async def get_invoice_by_token(
    token: str,
    session: AsyncSession = Depends(get_session),
):
    """Public endpoint for clients to view an invoice by tracked link."""
    result = await session.execute(select(InvoiceModel).where(InvoiceModel.tracked_link_token == token))
    invoice = result.scalars().first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    # Pass current user if authenticated
    try:
        from app.api.deps import get_current_user_optional
        current_user = await get_current_user_optional(session, token=None) # We don't have the token in header here easily if it's a public link, but let's try
    except:
        current_user = None

    # Mark as viewed if first time AND not the creator
    if not invoice.viewed_at and (not current_user or current_user.id != invoice.user_id):
        invoice.viewed_at = datetime.utcnow()
        if invoice.status == "sent":
            invoice.status = "viewed"
        await session.commit()

    # Load structured line items rather than JSON bag
    items_result = await session.execute(select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id))
    items = items_result.scalars().all()

    return {
        "success": True,
        "invoice": invoice,
        "items": items
    }

from fastapi import Response
from weasyprint import HTML

@router.get("/{token}/pdf")
async def download_dynamic_invoice_pdf(
    token: str,
    session: AsyncSession = Depends(get_session),
):
    """Dynamically reconstruct and render the PDF for an invoice."""
    result = await session.execute(select(InvoiceModel).where(InvoiceModel.tracked_link_token == token))
    invoice = result.scalars().first()
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")

    items_result = await session.execute(select(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id))
    items = items_result.scalars().all()

    data = InvoiceRequest(
        invoice_number=invoice.invoice_number,
        invoice_date=invoice.invoice_date,
        due_date=invoice.due_date,
        from_address=InvoiceAddress(name=invoice.from_name, address_line1=invoice.from_details or ""),
        to_address=InvoiceAddress(name=invoice.to_name, address_line1=invoice.to_details or ""),
        currency=invoice.currency,
        currency_symbol=invoice.currency_symbol,
        notes=invoice.notes,
        primary_color=invoice.primary_color,
        signature_data=invoice.signature_data,
        client_signature_data=invoice.client_signature_data,
        items=[
            InvoiceItem(description=i.description, quantity=i.quantity, unit_price=i.unit_price, tax_rate=i.tax_rate) 
            for i in items
        ]
    )

    html_content, _, _, _ = generate_invoice_html(data)
    pdf_bytes = HTML(string=html_content).write_pdf()

    return Response(
        content=pdf_bytes, 
        media_type="application/pdf", 
        headers={"Content-Disposition": f'attachment; filename="Invoice_{invoice.invoice_number}.pdf"'}
    )

@router.put("/{token}")
async def update_invoice(
    token: str,
    data: InvoiceRequest,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Edit the entire document dynamically."""
    result = await session.execute(select(InvoiceModel).where(InvoiceModel.tracked_link_token == token))
    invoice = result.scalars().first()
    
    if not invoice or invoice.user_id != user.id:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    _, subtotal, tax_total, total = generate_invoice_html(data) # Just to re-calculate totals safely

    invoice.invoice_number = data.invoice_number
    invoice.invoice_date = data.invoice_date
    invoice.due_date = data.due_date
    invoice.from_name = data.from_address.name
    invoice.from_details = data.from_address.address_line1
    invoice.to_name = data.to_address.name
    invoice.to_details = data.to_address.address_line1
    invoice.items = {"items": [item.model_dump() for item in data.items]}
    invoice.currency = data.currency
    invoice.currency_symbol = data.currency_symbol
    invoice.subtotal = subtotal
    invoice.tax_total = tax_total
    invoice.total = total
    invoice.notes = data.notes
    invoice.primary_color = data.primary_color
    invoice.signature_data = data.signature_data
    invoice.client_signature_data = data.client_signature_data

    # Delete existing line items
    await session.execute(delete(InvoiceLineItem).where(InvoiceLineItem.invoice_id == invoice.id))
    
    # Insert new ones
    for item in data.items:
        inv_item = InvoiceLineItem(
            invoice_id=invoice.id,
            description=item.description,
            quantity=item.quantity,
            unit_price=item.unit_price,
            tax_rate=item.tax_rate,
            total=item.quantity * item.unit_price
        )
        session.add(inv_item)
        
    await session.commit()
    return {"success": True, "message": "Invoice updated"}

@router.post("/{token}/request-review")
async def request_review_invoice(
    token: str,
    user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_session),
):
    """Explicitly mark invoice as sent/review requested."""
    result = await session.execute(select(InvoiceModel).where(InvoiceModel.tracked_link_token == token))
    invoice = result.scalars().first()
    
    if not invoice or invoice.user_id != user.id:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    invoice.status = "sent"
    invoice.sent_at = datetime.utcnow()
    await session.commit()
    return {"success": True, "message": "Review requested"}

class InvoiceAcknowledgeRequest(BaseModel):
    payment_method: Optional[str] = None


@router.post("/{token}/acknowledge")
async def acknowledge_invoice(
    token: str,
    data: InvoiceAcknowledgeRequest,
    session: AsyncSession = Depends(get_session),
):
    """Client marks the invoice as acknowledged or scheduled to pay."""
    result = await session.execute(select(InvoiceModel).where(InvoiceModel.tracked_link_token == token))
    invoice = result.scalars().first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    if invoice.status in ["acknowledged", "paid"]:
        return {"success": False, "error": f"Invoice already {invoice.status}"}

    invoice.status = "acknowledged"
    await session.commit()

    return {
        "success": True,
        "message": "Invoice acknowledged. The freelancer has been notified.",
    }


class InvoiceCommentRequest(BaseModel):
    author_name: str
    body: str
    author_role: str = "client"

@router.post("/{token}/comments")
async def add_invoice_comment(
    token: str,
    data: InvoiceCommentRequest,
    session: AsyncSession = Depends(get_session),
):
    """Add a comment/question to the invoice."""
    result = await session.execute(select(InvoiceModel).where(InvoiceModel.tracked_link_token == token))
    invoice = result.scalars().first()
    
    if not invoice:
        raise HTTPException(status_code=404, detail="Invoice not found")
        
    comment = InvoiceComment(
        invoice_id=invoice.id,
        author_id="anonymous_client" if data.author_role == "client" else invoice.user_id,
        author_name=data.author_name,
        author_role=data.author_role,
        body=data.body
    )
    session.add(comment)
    await session.commit()
    
    return {"success": True, "message": "Comment added successfully."}

