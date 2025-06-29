from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from .schemas import ChatRequest, ChatResponse
from .translator import is_vietnamese, translate_vi_to_en, get_translation_info
from .ollama_client import query_ollama, warmup_model, health_check_ollama
import asyncio
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="IELTS Assistant Chatbot API",
    description="AI-powered IELTS preparation assistant with Vietnamese translation support",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_event():
    """Warm up the model on startup to reduce first request latency."""
    logger.info("Starting IELTS Assistant API...")
    asyncio.create_task(warmup_model())

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    try:
        original_text = req.message.strip()
        if not original_text:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        translated_text = original_text
        
        # Translate if Vietnamese
        if is_vietnamese(original_text):
            logger.info(f"Detected Vietnamese input: {original_text[:50]}...")
            translated_text = await translate_vi_to_en(original_text)
            logger.info(f"Translated to English: {translated_text[:50]}...")

        # Query the IELTS model
        response = await query_ollama(translated_text)
        
        return ChatResponse(response=response)
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Chat endpoint error: {e}")
        raise HTTPException(status_code=500, detail="Internal server error")

@app.get("/health")
async def health_check():
    try:
        ollama_status = await health_check_ollama()
        translation_info = get_translation_info()
        
        return {
            "status": "ok",
            "ollama_connected": ollama_status,
            "translation_available": translation_info["available"],
            "version": "1.0.0"
        }
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=500, detail="Health check failed")

@app.get("/")
async def root():
    """API information endpoint."""
    return {
        "name": "IELTS Assistant Chatbot API",
        "version": "1.0.0",
        "description": "AI-powered IELTS preparation assistant",
        "endpoints": {
            "chat": "/chat",
            "health": "/health", 
            "docs": "/docs"
        }
    }