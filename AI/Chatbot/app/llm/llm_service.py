import asyncio
import logging
from fastapi import HTTPException

from .ollama_client import query_ollama
from .gemini_fallback import query_gemini

logger = logging.getLogger(__name__)

BASE_MODEL_TIMEOUT = 120.0  


async def generate_with_fallback(prompt: str) -> str:
    try:
        return await asyncio.wait_for(query_ollama(prompt), timeout=BASE_MODEL_TIMEOUT)
    except asyncio.TimeoutError:
        logger.warning(
            f"Ollama request timed out after {BASE_MODEL_TIMEOUT}s. "
            "Falling back to Gemini."
        )
        return await query_gemini(prompt)
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
