"""Whisper speech-to-text endpoint."""

from fastapi import APIRouter, UploadFile, File, HTTPException
from openai import OpenAI
from pydantic import BaseModel
from typing import Optional

from app.config import settings

# Schemas
from app.schemas.whisper import TranscriptionResponse


router = APIRouter(prefix="/api/whisper", tags=["whisper"])


@router.post("/transcribe", response_model=TranscriptionResponse)
async def transcribe_audio(file: UploadFile = File(...)):
    """Transcribe audio file using OpenAI Whisper API."""
    if not settings.openai_api_key:
        return TranscriptionResponse(
            success=False,
            error="OpenAI API key not configured",
        )

    # Validate file type
    allowed_types = [
        "audio/webm", "audio/wav", "audio/mp3", "audio/mpeg",
        "audio/mp4", "audio/ogg", "audio/flac", "audio/m4a",
        "video/webm",  # Chrome records as video/webm
    ]
    content_type = file.content_type or ""
    if not any(content_type.startswith(t.split("/")[0]) for t in ["audio/", "video/"]):
        return TranscriptionResponse(
            success=False,
            error=f"Unsupported audio format: {content_type}",
        )

    # Check file size (max 25MB — Whisper limit)
    contents = await file.read()
    if len(contents) > 25 * 1024 * 1024:
        return TranscriptionResponse(
            success=False,
            error="Audio file too large (max 25MB)",
        )

    try:
        client = OpenAI(api_key=settings.openai_api_key)

        # Whisper expects a file-like object with a name
        import io
        audio_file = io.BytesIO(contents)
        audio_file.name = file.filename or "audio.webm"

        transcription = client.audio.transcriptions.create(
            model="whisper-1",
            file=audio_file,
            language="en",
        )

        return TranscriptionResponse(
            success=True,
            transcript=transcription.text,
        )

    except Exception as e:
        return TranscriptionResponse(
            success=False,
            error=str(e),
        )
