import logging
from fastapi import HTTPException

from .ollama_client import query_ollama
from .gemini_fallback import query_gemini

logger = logging.getLogger(__name__)


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
