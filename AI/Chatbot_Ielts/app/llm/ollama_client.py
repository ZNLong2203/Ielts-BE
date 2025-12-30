import httpx
import re
import os
import asyncio
import logging
from fastapi import HTTPException

logger = logging.getLogger(__name__)

API_URL = os.getenv("OLLAMA_API_URL", "http://ollama:11434/api/generate")
MODEL_NAME = "hf.co/Zkare/Chatbot_Ielts_Assistant_v2:Q4_K_M"

_http_client = httpx.AsyncClient(
    timeout=httpx.Timeout(180.0), 
    limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
)

_response_cache = {}
_cache_max_size = 50

async def query_ollama(prompt: str) -> str:
    payload = {
        "model": MODEL_NAME, 
        "prompt": prompt, 
        "stream": False,
        "options": {
            "temperature": 0.7,
            "top_p": 0.9,
            "top_k": 40,
            "num_ctx": 4096,
            "num_predict": 1200,  
            "repeat_penalty": 1.1,
        }
    }
    try:
        resp = await _http_client.post(API_URL, json=payload)
        
        if resp.status_code == 404:
            error_msg = f"Model '{MODEL_NAME}' not found. Please pull the model first: docker exec ollama-ielts ollama pull {MODEL_NAME}"
            logger.error(error_msg)
            raise HTTPException(status_code=404, detail=error_msg)
        
        resp.raise_for_status()
        
        # Ollama may return streaming format even with stream=False
        # Parse the response text line by line to handle both formats
        response_text = ""
        thinking_text = ""
        text_content = resp.text.strip()
        from_response_field = False
        
        # Try to parse as single JSON first
        try:
            data = resp.json()
            # Prioritize response field, fallback to thinking field if response is empty
            response_text = data.get("response", "")
            
            # Track if we got data from response field
            if response_text and response_text.strip():
                from_response_field = True
            else:
                # Only use thinking if response is empty or None
                thinking_text = data.get("thinking", "")
                if thinking_text and thinking_text.strip():
                    logger.debug("Response field is empty, using thinking field instead")
                    response_text = thinking_text
        except (ValueError, httpx.DecodeError):
            # If single JSON fails, parse streaming format
            # Accumulate all response chunks until done=True
            import json
            for line in text_content.split('\n'):
                if not line.strip():
                    continue
                try:
                    chunk = json.loads(line)
                    chunk_response = chunk.get("response", "")
                    if chunk_response and chunk_response.strip():
                        response_text += chunk_response
                        from_response_field = True
                    # Only check thinking if we don't have response yet
                    elif not from_response_field:
                        chunk_thinking = chunk.get("thinking", "")
                        if chunk_thinking and chunk_thinking.strip():
                            logger.debug("Response field is empty in stream, using thinking field instead")
                            thinking_text += chunk_thinking
                            response_text += chunk_thinking
                    if chunk.get("done", False):
                        break
                except json.JSONDecodeError:
                    # Skip invalid JSON lines
                    continue
        
        # If still no response, try to extract from last JSON object
        if not response_text:
            import json
            try:
                lines = text_content.split('\n')
                for line in reversed(lines):
                    if line.strip():
                        try:
                            data = json.loads(line)
                            response_text = data.get("response", "")
                            if response_text and response_text.strip():
                                from_response_field = True
                                break
                            # Only check thinking if response is empty
                            if not from_response_field:
                                thinking_text = data.get("thinking", "")
                                if thinking_text and thinking_text.strip():
                                    logger.debug("Response field is empty, using thinking field instead")
                                    response_text = thinking_text
                                    break
                        except json.JSONDecodeError:
                            continue
            except Exception:
                pass
        
        # Clean up response
        if from_response_field:
            cleaned_response = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL | re.IGNORECASE)
            cleaned_response = re.sub(r'<thinking>.*?</thinking>', '', cleaned_response, flags=re.DOTALL | re.IGNORECASE)
        else:
            cleaned_response = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL | re.IGNORECASE)
        
        cleaned_response = cleaned_response.strip()
        cleaned_response = re.sub(r'\n\s*\n+', '\n\n', cleaned_response)
        
        if not cleaned_response:
            logger.warning(f"Empty response from Ollama. Original response_text length: {len(response_text)}, content preview: {response_text[:200]}")
            try:
                debug_data = resp.json()
                logger.debug(f"Response JSON keys: {list(debug_data.keys())}")
                logger.debug(f"Has 'response' field: {'response' in debug_data}, Has 'thinking' field: {'thinking' in debug_data}")
            except:
                pass
            cleaned_response = "I'm here to help you with IELTS preparation. Please ask me a specific question."
        
        return cleaned_response
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timeout - please try again with a shorter question")
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error querying Ollama: {e}")
        raise HTTPException(status_code=500, detail=f"Ollama error: {str(e)}")

async def warmup_model():
    """
    Warm up the model by sending a simple request to prevent cold starts.
    """
    try:
        await query_ollama("Hello")
        print("Model warmed up successfully")
    except Exception as e:
        print(f"Model warmup failed: {e}")

async def health_check_ollama() -> bool:
    """
    Check if Ollama service is responding.
    """
    try:
        resp = await _http_client.get(f"{API_URL.replace('/api/generate', '/api/tags')}")
        return resp.status_code == 200
    except Exception:
        return False