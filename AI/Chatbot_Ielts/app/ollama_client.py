import httpx
import re
import os
import asyncio
from fastapi import HTTPException

API_URL = os.getenv("OLLAMA_API_URL", "http://ollama:11434/api/generate")
MODEL_NAME = "hf.co/Zkare/Chatbot_Ielts_Assistant:F16"

_http_client = httpx.AsyncClient(
    timeout=httpx.Timeout(180.0), 
    limits=httpx.Limits(max_keepalive_connections=5, max_connections=10)
)

_response_cache = {}
_cache_max_size = 50

async def query_ollama(prompt: str) -> str:
    """
    Send prompt to Ollama REST API and return the generated response.
    Requires `ollama serve` to be running (default port 11434).
    """

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
        resp.raise_for_status()
        data = resp.json()
        
        response_text = data.get("response", "")
        
        cleaned_response = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL | re.IGNORECASE)
        cleaned_response = re.sub(r'<thinking>.*?</thinking>', '', cleaned_response, flags=re.DOTALL | re.IGNORECASE)
        
        cleaned_response = cleaned_response.strip()
        cleaned_response = re.sub(r'\n\s*\n+', '\n\n', cleaned_response)
        
        if not cleaned_response:
            cleaned_response = "I'm here to help you with IELTS preparation. Please ask me a specific question."
        
        return cleaned_response
    except httpx.TimeoutException:
        raise HTTPException(status_code=504, detail="Request timeout - please try again with a shorter question")
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Ollama HTTP error: {e}")

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