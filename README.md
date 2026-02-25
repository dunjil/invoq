# Invoq

**The fastest invoice tool alive.** Speak or type. Preview. Sign. Download. Done in 60 seconds.

## Architecture

```
invoq/
├── frontend/    → Next.js 15 (TypeScript, Tailwind CSS, Radix UI)
├── backend/     → FastAPI (Python, SQLModel, PostgreSQL, WeasyPrint, OpenAI)
```

## Quick Start

### Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
# Edit .env with your database URL and OpenAI key
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — Backend runs on [http://localhost:8000](http://localhost:8000).

## Features (MVP)

- ✅ **AI text extraction** — describe your invoice in plain language
- ✅ **Invoice form** — full control over every field
- ✅ **PDF generation** — professional PDFs via WeasyPrint
- ✅ **Preview** — review before downloading
- ✅ **Signature pad** — draw or upload signatures
- ✅ **Watermarks** — text or image watermarks
- ✅ **45+ currencies** — including crypto
- 🔜 **Voice input** — Whisper speech-to-text
- 🔜 **Auth & profiles** — saved business details
- 🔜 **Invoice history** — PostgreSQL-backed
- 🔜 **Stripe payments** — subscription billing
