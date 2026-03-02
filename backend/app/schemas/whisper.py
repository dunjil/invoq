from typing import Optional
from pydantic import BaseModel

class TranscriptionResponse(BaseModel):
    success: bool
    transcript: Optional[str] = None
    error: Optional[str] = None
