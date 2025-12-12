from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from .schemas import (
    ChatRequest, ChatResponse, PDFUploadResponse, 
    DocumentSearchRequest, DocumentSearchResponse, CollectionStatsResponse,
    DocumentListResponse
)
from .translator import is_vietnamese, translate_vi_to_en, get_translation_info
from .ollama_client import query_ollama, warmup_model, health_check_ollama
from .rag_service import get_rag_service
from .embedding_service import get_embedding_service
from .milvus_client import get_milvus_client
from .pdf_extractor import get_pdf_extractor
import asyncio
import logging
import os
import aiofiles
from pathlib import Path

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="IELTS Assistant Chatbot API",
    description="AI-powered IELTS preparation assistant with Vietnamese translation support",
    version="1.0.0"
)

# CORS configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://localhost:8000",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:8000",
        "*"  
    ],
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["*"],
    max_age=3600,
)

# Create uploads directory if it doesn't exist
UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.on_event("startup")
async def startup_event():
    """Warm up the model on startup to reduce first request latency."""
    logger.info("Starting IELTS Assistant API...")
    asyncio.create_task(warmup_model())
    
    # Initialize embedding service and Milvus
    try:
        embedding_service = get_embedding_service()
        embedding_service.load_model()
        logger.info("Embedding service initialized")
        
        milvus_client = get_milvus_client(
            embedding_dimension=embedding_service.get_embedding_dimension()
        )
        milvus_client.create_collection_if_not_exists()
        logger.info("Milvus client initialized")
    except Exception as e:
        logger.warning(f"Failed to initialize RAG services: {e}. RAG features may not work.")

@app.post("/chat", response_model=ChatResponse)
async def chat_endpoint(req: ChatRequest):
    try:
        original_text = req.message.strip()
        if not original_text:
            raise HTTPException(status_code=400, detail="Message cannot be empty")
        
        translated_text = original_text
        sources = None
        
        # Translate if Vietnamese
        if is_vietnamese(original_text):
            logger.info(f"Detected Vietnamese input: {original_text[:50]}...")
            translated_text = await translate_vi_to_en(original_text)
            logger.info(f"Translated to English: {translated_text[:50]}...")

        # Use RAG if enabled
        if req.use_rag:
            try:
                rag_service = get_rag_service()
                # Retrieve context first to get sources
                retrieved_docs = rag_service.retrieve_context(translated_text)
                sources = retrieved_docs if retrieved_docs else None
                
                # Generate answer with RAG and conversation history
                response = await rag_service.generate_answer(
                    translated_text,
                    use_rag=True,
                    conversation_history=req.conversation_history
                )
            except Exception as e:
                logger.warning(f"RAG failed, falling back to direct generation: {e}")
                # Fallback with conversation history
                if req.conversation_history:
                    from .conversation_service import get_conversation_service
                    conv_service = get_conversation_service()
                    summarized_history = await conv_service.summarize_conversation(req.conversation_history)
                    prompt = conv_service.format_conversation_for_prompt(
                        conversation_history=summarized_history,
                        current_query=translated_text
                    )
                    response = await query_ollama(f"You are an IELTS assistant. Continue the conversation:\n\n{prompt}")
                else:
                    response = await query_ollama(translated_text)
        else:
            # Direct generation with optional conversation history
            if req.conversation_history:
                from .conversation_service import get_conversation_service
                conv_service = get_conversation_service()
                summarized_history = await conv_service.summarize_conversation(req.conversation_history)
                prompt = conv_service.format_conversation_for_prompt(
                    conversation_history=summarized_history,
                    current_query=translated_text
                )
                response = await query_ollama(f"You are an IELTS assistant. Continue the conversation:\n\n{prompt}")
            else:
                response = await query_ollama(translated_text)
        
        return ChatResponse(response=response, sources=sources)
        
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

@app.post("/rag/upload-pdf", response_model=PDFUploadResponse)
async def upload_pdf(file: UploadFile = File(...)):
    """
    Upload and process a PDF file for RAG
    
    - Extract text from PDF
    - Chunk the text
    - Generate embeddings
    - Store in Milvus vector database
    """
    try:
        # Validate file type
        if not file.filename.endswith('.pdf'):
            raise HTTPException(status_code=400, detail="Only PDF files are supported")
        
        # Save uploaded file
        file_path = UPLOAD_DIR / file.filename
        async with aiofiles.open(file_path, 'wb') as f:
            content = await file.read()
            await f.write(content)
        
        logger.info(f"Processing PDF: {file.filename}")
        
        # Delete existing documents from this file to avoid duplicates
        try:
            milvus_client_temp = get_milvus_client(
                embedding_dimension=get_embedding_service().get_embedding_dimension()
            )
            milvus_client_temp.create_collection_if_not_exists()
            deleted_count = milvus_client_temp.delete_by_source_file(file.filename)
            if deleted_count > 0:
                logger.info(f"Deleted {deleted_count} existing documents for {file.filename}")
        except Exception as e:
            logger.warning(f"Could not delete existing documents (may not exist): {e}")
        
        # Extract and chunk PDF (uses env vars or defaults)
        pdf_extractor = get_pdf_extractor()
        chunks = pdf_extractor.extract_and_chunk_pdf(str(file_path), file.filename)
        
        if not chunks:
            raise HTTPException(status_code=400, detail="No text could be extracted from PDF")
        
        logger.info(f"Generated {len(chunks)} chunks, starting embedding generation...")
        
        # Generate embeddings in batches (with progress logging)
        embedding_service = get_embedding_service()
        texts = [chunk["text"] for chunk in chunks]
        
        # Filter out empty texts
        valid_texts = []
        valid_chunks = []
        for i, text in enumerate(texts):
            if text and text.strip():
                valid_texts.append(text)
                valid_chunks.append(chunks[i])
        
        if not valid_texts:
            raise HTTPException(status_code=400, detail="No valid text chunks found after filtering")
        
        logger.info(f"Processing {len(valid_texts)} valid chunks (filtered {len(texts) - len(valid_texts)} empty chunks)")
        
        # Use batch_size from env or default
        batch_size = embedding_service.batch_size
        logger.info(f"Generating embeddings with batch_size={batch_size}...")
        
        embeddings = embedding_service.encode(
            valid_texts, 
            batch_size=batch_size,
            show_progress_bar=False  # Don't show progress bar in API
        )
        
        # Validate embeddings shape matches texts
        if len(embeddings) != len(valid_texts):
            raise HTTPException(
                status_code=500,
                detail=f"Embedding count mismatch: {len(embeddings)} embeddings for {len(valid_texts)} texts"
            )
        
        logger.info(f"Generated {len(embeddings)} embeddings, inserting into Milvus...")
        
        # Prepare metadata for valid chunks only
        metadata_list = [
            {
                "chunk_index": chunk["chunk_index"],
                "start_char": chunk.get("start_char", 0),
                "end_char": chunk.get("end_char", 0)
            }
            for chunk in valid_chunks
        ]
        
        # Store in Milvus
        milvus_client = get_milvus_client(
            embedding_dimension=embedding_service.get_embedding_dimension()
        )
        milvus_client.create_collection_if_not_exists()
        
        inserted_ids = milvus_client.insert_documents(
            texts=valid_texts,
            embeddings=embeddings,
            source_file=file.filename,
            metadata_list=metadata_list
        )
        
        # Get collection stats
        stats = milvus_client.get_collection_stats()
        
        # Clean up uploaded file
        os.remove(file_path)
        
        return PDFUploadResponse(
            message=f"Successfully processed {len(chunks)} chunks from {file.filename}",
            file_name=file.filename,
            chunks_processed=len(chunks),
            collection_stats=stats
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"PDF upload error: {e}")
        raise HTTPException(status_code=500, detail=f"Error processing PDF: {str(e)}")

@app.post("/rag/search", response_model=DocumentSearchResponse)
async def search_documents(req: DocumentSearchRequest):
    """
    Search for relevant documents in the knowledge base
    """
    try:
        embedding_service = get_embedding_service()
        query_embedding = embedding_service.encode_single(req.query)
        
        milvus_client = get_milvus_client(
            embedding_dimension=embedding_service.get_embedding_dimension()
        )
        
        results = milvus_client.search(
            query_embedding=query_embedding,
            top_k=req.top_k,
            score_threshold=0.6
        )
        
        return DocumentSearchResponse(query=req.query, results=results)
        
    except Exception as e:
        logger.error(f"Document search error: {e}")
        raise HTTPException(status_code=500, detail=f"Error searching documents: {str(e)}")

@app.get("/rag/stats", response_model=CollectionStatsResponse)
async def get_collection_stats():
    """Get statistics about the knowledge base collection"""
    try:
        milvus_client = get_milvus_client()
        stats = milvus_client.get_collection_stats()
        return CollectionStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

@app.get("/rag/documents", response_model=DocumentListResponse)
async def list_documents(limit: int = 100, offset: int = 0):
    """List documents in the knowledge base"""
    try:
        milvus_client = get_milvus_client()
        documents = milvus_client.list_documents(limit=limit, offset=offset)
        stats = milvus_client.get_collection_stats()
        
        return DocumentListResponse(
            documents=documents,
            total=stats.get("num_entities", 0),
            limit=limit,
            offset=offset
        )
    except Exception as e:
        logger.error(f"Error listing documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error listing documents: {str(e)}")

@app.delete("/rag/documents/{source_file}")
async def delete_documents(source_file: str):
    """Delete all documents from a specific source file"""
    try:
        milvus_client = get_milvus_client()
        milvus_client.delete_by_source_file(source_file)
        return {"message": f"Deleted all documents from {source_file}"}
    except Exception as e:
        logger.error(f"Error deleting documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting documents: {str(e)}")

@app.get("/")
async def root():
    """API information endpoint."""
    return {
        "name": "IELTS Assistant Chatbot API",
        "version": "1.0.0",
        "description": "AI-powered IELTS preparation assistant with RAG support",
        "endpoints": {
            "chat": "/chat",
            "rag_upload": "/rag/upload-pdf",
            "rag_search": "/rag/search",
            "rag_stats": "/rag/stats",
            "rag_list_documents": "/rag/documents",
            "rag_delete_documents": "/rag/documents/{source_file}",
            "health": "/health", 
            "docs": "/docs"
        },
        "milvus_ui": {
            "attu": "http://localhost:3001",
            "milvus_webui": "http://localhost:9091/webui"
        }
    }