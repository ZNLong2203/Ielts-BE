from fastapi import FastAPI, HTTPException
from .schemas import ChatRequest, ChatResponse
from .translator import is_vietnamese, translate_vi_to_en
from .ollama_client import query_ollama

app = FastAPI(title="IELTS Assistant Chatbot API")

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    text = req.user_input
    # Translate if Vietnamese
    if is_vietnamese(text):
        text = await translate_vi_to_en(text)

    # Query the fine-tuned DeepSeek on Ollama
    response = await query_ollama(text)
    return ChatResponse(response=response)

@app.get("/health")
async def health_check():
    return {"status": "ok"}