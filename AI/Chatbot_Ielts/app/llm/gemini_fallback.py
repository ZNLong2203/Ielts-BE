import os
import logging
import re
import asyncio
from fastapi import HTTPException

import google.generativeai as genai

logger = logging.getLogger(__name__)

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

if API_KEY:
    genai.configure(api_key=API_KEY)


async def query_gemini(prompt: str) -> str:
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured for Gemini fallback.",
        )

    try:
        model = genai.GenerativeModel(MODEL_NAME)
        response = await asyncio.to_thread(model.generate_content, prompt)
        text = response.text or ""

        cleaned = re.sub(r"\n\s*\n+", "\n\n", text).strip()
        if not cleaned:
            cleaned = (
                "I'm here to help you with IELTS preparation. "
                "Please ask me a specific question."
            )
        return cleaned
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying Gemini: {e}")
        raise HTTPException(status_code=500, detail=f"Gemini error: {str(e)}")

