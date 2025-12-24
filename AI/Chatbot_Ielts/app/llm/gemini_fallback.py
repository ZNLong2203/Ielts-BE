import os
import logging
import re
import asyncio
from fastapi import HTTPException
from google import genai

logger = logging.getLogger(__name__)

API_KEY = os.getenv("GEMINI_API_KEY")
MODEL_NAME = os.getenv("GEMINI_MODEL", "gemini-2.5-flash")

# Initialize client
genai_client = None
if API_KEY:
    genai_client = genai.Client(api_key=API_KEY)


async def query_gemini(prompt: str) -> str:
    if not API_KEY:
        raise HTTPException(
            status_code=500,
            detail="GEMINI_API_KEY is not configured for Gemini fallback.",
        )

    if not genai_client:
        raise HTTPException(
            status_code=500,
            detail="Gemini client is not initialized.",
        )

    try:
        response = await asyncio.to_thread(
            genai_client.models.generate_content,
            model=MODEL_NAME,
            contents=prompt
        )
        # Extract text from response
        text = response.text if hasattr(response, 'text') else str(response)

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

