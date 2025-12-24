import os
import logging
import re
import asyncio
from fastapi import HTTPException

import google.generativeai as genai

from .ollama_client import query_ollama

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


async def generate_with_fallback(prompt: str) -> str:
    try:
        return await query_ollama(prompt)
    except HTTPException as e:
        if 400 <= e.status_code < 500 and e.status_code != 404:
            raise

        logger.warning(
            f"Ollama failed with HTTP {e.status_code}: {e.detail}. "
            "Falling back to Gemini."
        )
        return await query_gemini(prompt)
    except Exception as e:
        logger.warning(f"Ollama unexpected error: {e}. Falling back to Gemini.")
        return await query_gemini(prompt)

