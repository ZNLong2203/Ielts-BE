import httpx
import re
from fastapi import HTTPException

API_URL = "http://localhost:11434/api/generate"
MODEL_NAME = "hf.co/Zkare/Chatbot_Ielts_Assistant:F16"

async def query_ollama(prompt: str) -> str:
    """
    Send prompt to Ollama REST API and return the generated response.
    Requires `ollama serve` to be running (default port 11434).
    """
    payload = {"model": MODEL_NAME, "prompt": prompt, "stream": False}
    try:
        resp = httpx.post(API_URL, json=payload, timeout=60.0)
        resp.raise_for_status()
        data = resp.json()
        # Get the response text
        response_text = data.get("response", "")
        
        # Remove thinking tags and their content
        cleaned_response = re.sub(r'<think>.*?</think>', '', response_text, flags=re.DOTALL)
        # Remove any empty lines that might be left
        cleaned_response = cleaned_response.strip()
        
        return cleaned_response
    except httpx.HTTPError as e:
        raise HTTPException(status_code=500, detail=f"Ollama HTTP error: {e}")