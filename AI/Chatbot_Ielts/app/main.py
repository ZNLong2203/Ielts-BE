from fastapi import FastAPI, HTTPException, UploadFile, File
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pathlib import Path
from dotenv import load_dotenv
from .schemas import (
    ChatRequest, ChatResponse, PDFUploadResponse, 
    DocumentSearchRequest, DocumentSearchResponse, CollectionStatsResponse,
    DocumentListResponse
)
from .utils.translator import is_vietnamese, translate_vi_to_en, get_translation_info
from .llm.ollama_client import warmup_model, health_check_ollama
from .services.rag_service import get_rag_service
from .services.embedding_service import get_embedding_service
from .clients.milvus_client import get_milvus_client
from .utils.pdf_extractor import get_pdf_extractor
from .llm.llm_service import generate_with_fallback
from .services.router_service import get_router_service
from .services.database_rag_service import get_database_rag_service
import asyncio
import logging
import os
import aiofiles

env_path = Path(__file__).parent.parent.parent / ".env"
if env_path.exists():
    load_dotenv(env_path)
else:
    load_dotenv()

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(
    title="IELTS Assistant Chatbot API",
    description="AI-powered IELTS preparation assistant with Vietnamese translation support",
    version="1.0.0"
)

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

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting IELTS Assistant API...")
    asyncio.create_task(warmup_model())
    
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
    
    # Initialize router service
    try:
        router_service = get_router_service()
        logger.info("Router service initialized")
    except Exception as e:
        logger.warning(f"Failed to initialize router service: {e}. Routing may not work.")
    
    # Initialize database RAG service
    try:
        db_rag_service = get_database_rag_service()
        # Test connection
        await db_rag_service._get_pool()
        logger.info("Database RAG service initialized")
    except Exception as e:
        logger.warning(f"Failed to initialize database RAG service: {e}. Database RAG features may not work.")

@app.on_event("shutdown")
async def shutdown_event():
    try:
        db_rag_service = get_database_rag_service()
        await db_rag_service.close()
        logger.info("Database RAG service closed")
    except Exception as e:
        logger.warning(f"Error closing database RAG service: {e}")

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

        # Prepare conversation context for router
        conversation_context = ""
        if req.conversation_history:
            from .services.conversation_service import get_conversation_service
            conv_service = get_conversation_service()
            conversation_context = await conv_service.summarize_conversation(req.conversation_history)

        # Use LangChain router to determine the best route
        router = get_router_service()
        routing_decision = await router.route_query(translated_text, conversation_context)
        
        logger.info(
            f"Router decision: {routing_decision.route} "
            f"(confidence: {routing_decision.confidence:.2f}, "
            f"router_failed: {routing_decision.router_failed}, "
            f"reasoning: {routing_decision.reasoning})"
        )
        logger.info(f"Query: {translated_text[:100]}")

        # If router failed due to serious Ollama error, skip routing and use Gemini directly
        if routing_decision.router_failed:
            logger.warning("Router failed due to Ollama error. Skipping routing and using Gemini directly.")
            from .llm.gemini_fallback import query_gemini
            if req.conversation_history:
                from .services.conversation_service import get_conversation_service
                conv_service = get_conversation_service()
                summarized_history = await conv_service.summarize_conversation(req.conversation_history)
                prompt = conv_service.format_conversation_for_prompt(
                    conversation_history=summarized_history,
                    current_query=translated_text
                )
                response = await query_gemini(
                    f"You are an IELTS assistant. Continue the conversation:\n\n{prompt}"
                )
            else:
                response = await query_gemini(
                    "You are an IELTS preparation assistant. Help students with reading, writing, "
                    "listening, and speaking skills. Answer the following question clearly and "
                    f"provide helpful guidance:\n\n{translated_text}"
                )
            return ChatResponse(response=response, sources=None)

        # Route to appropriate handler
        if router.should_use_database_rag(routing_decision):
            # Database RAG: Query PostgreSQL for combo, coupon, blog, course info
            logger.info("Using database RAG for query")
            db_rag_service = get_database_rag_service()
            
            # Query database first to get context 
            db_results = None
            db_context = None
            try:
                db_results = await db_rag_service.intelligent_query(
                    translated_text,
                    conversation_history=req.conversation_history
                )
                db_context = db_results.get('formatted_context', '')
                logger.info(f"Database RAG query results - query_type: {db_results.get('query_type')}, "
                           f"formatted_context length: {len(db_context)}")
            except Exception as e:
                logger.warning(f"Database query failed, will try without context: {e}")
            
            # Try to generate answer with database context (pass pre-queried results to avoid duplicate query)
            try:
                response = await db_rag_service.generate_answer(
                    translated_text,
                    conversation_history=req.conversation_history,
                    db_results=db_results  # Pass pre-queried results to avoid duplicate query
                )
                # Database queries don't return sources in the same format
                sources = None
            except Exception as e:
                logger.warning(f"Database RAG generation failed, falling back to Gemini with context: {e}")
                # Fallback to Gemini with database context (if available)
                from .llm.gemini_fallback import query_gemini
                
                # Prepare prompt with database context
                prompt_parts = []
                
                if req.conversation_history:
                    from .services.conversation_service import get_conversation_service
                    conv_service = get_conversation_service()
                    summarized_history = await conv_service.summarize_conversation(req.conversation_history)
                    prompt_parts.append(f"Previous conversation:\n{summarized_history}\n")
                
                if db_context and db_context.strip() != "No relevant information found.":
                    prompt_parts.append(f"Database information:\n{db_context}\n")
                else:
                    prompt_parts.append("Database information:\nNo specific course information was found in the database for this query.\n")
                
                prompt_parts.append(f"User question: {translated_text}")
                prompt = "\n---\n".join(prompt_parts)
                
                enhanced_prompt = f"""You are an IELTS learning platform assistant. Use the database information provided to answer the user's question accurately and helpfully.

{prompt}

Instructions:
- Use the database information above to provide accurate answers about courses, combos, coupons, blogs, and mock tests
- If database information is available, provide details from it
- If the information is not available in the database, explain that you're checking the platform's offerings and provide general guidance
- Format your response in a clear and helpful manner
- Include relevant details like prices, descriptions, and availability when appropriate
- If asked about specific items, provide details from the database"""
                
                response = await query_gemini(enhanced_prompt)
                sources = None
        
        elif router.should_use_vector_db(routing_decision) and req.use_rag:
            # Vector DB RAG: Use Milvus for semantic search in documents
            logger.info("Using vector DB RAG for query")
            rag_service = get_rag_service()
            
            # Retrieve context first to get sources
            retrieved_docs = []
            rag_context = None
            try:
                retrieved_docs = rag_service.retrieve_context(translated_text)
                sources = retrieved_docs if retrieved_docs else None
                if retrieved_docs:
                    rag_context = await rag_service.format_and_summarize_context(retrieved_docs)
                logger.info(f"Retrieved {len(retrieved_docs)} documents, context length: {len(rag_context) if rag_context else 0}")
            except Exception as e:
                logger.warning(f"Vector DB context retrieval failed: {e}")
                sources = None
            
            # Generate answer with RAG and conversation history
            try:
                response = await rag_service.generate_answer(
                    translated_text,
                    use_rag=True,
                    conversation_history=req.conversation_history
                )
            except Exception as e:
                logger.warning(f"Vector DB RAG generation failed, falling back to Gemini with context: {e}")
                # Fallback to Gemini with RAG context (if available)
                from .llm.gemini_fallback import query_gemini
                
                # Prepare prompt with RAG context
                prompt_parts = []
                
                if req.conversation_history:
                    from .services.conversation_service import get_conversation_service
                    conv_service = get_conversation_service()
                    summarized_history = await conv_service.summarize_conversation(req.conversation_history)
                    prompt_parts.append(f"Previous conversation:\n{summarized_history}\n")
                
                if rag_context:
                    prompt_parts.append(f"Relevant study materials:\n{rag_context}\n")
                
                prompt_parts.append(f"User question: {translated_text}")
                prompt = "\n---\n".join(prompt_parts)
                
                instructions = []
                if req.conversation_history:
                    instructions.append("- Pay attention to the conversation history above. If the user refers to \"that topic\", \"the topic above\", \"đề đó\", \"cái đó\", or similar references, they are referring to topics/questions mentioned in the previous conversation.")
                    instructions.append("- Continue the conversation naturally and maintain context from previous messages.")
                if rag_context:
                    instructions.append("- Use the relevant study materials provided above to answer accurately.")
                    instructions.append("- If using information from study materials, cite the source (e.g., Document X).")
                instructions.append("- Provide a comprehensive and helpful answer.")
                
                instructions_text = "\n".join(instructions) if instructions else ""
                
                enhanced_prompt = f"""You are an IELTS preparation assistant. Use the following information to answer the question accurately and helpfully.

{prompt}

Instructions:
{instructions_text}"""
                
                response = await query_gemini(enhanced_prompt)
        
        else:
            # Base model: Direct generation for general questions (with Gemini fallback)
            logger.info("Using base model for query")
            if req.conversation_history:
                from .services.conversation_service import get_conversation_service
                conv_service = get_conversation_service()
                summarized_history = await conv_service.summarize_conversation(req.conversation_history)
                prompt = conv_service.format_conversation_for_prompt(
                    conversation_history=summarized_history,
                    current_query=translated_text
                )
                response = await generate_with_fallback(
                    f"You are an IELTS assistant. Continue the conversation:\n\n{prompt}"
                )
            else:
                response = await generate_with_fallback(
                    "You are an IELTS preparation assistant. Help students with reading, writing, "
                    "listening, and speaking skills. Answer the following question clearly and "
                    f"provide helpful guidance:\n\n{translated_text}"
                )
        
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
    try:
        embedding_service = get_embedding_service()
        query_embedding = embedding_service.encode_single(req.query)
        
        milvus_client = get_milvus_client(
            embedding_dimension=embedding_service.get_embedding_dimension()
        )
        
        results = milvus_client.search(
            query_embedding=query_embedding,
            top_k=req.top_k,
            score_threshold=0.5
        )
        
        return DocumentSearchResponse(query=req.query, results=results)
        
    except Exception as e:
        logger.error(f"Document search error: {e}")
        raise HTTPException(status_code=500, detail=f"Error searching documents: {str(e)}")

@app.get("/rag/stats", response_model=CollectionStatsResponse)
async def get_collection_stats():
    try:
        embedding_service = get_embedding_service()
        milvus_client = get_milvus_client(
            embedding_dimension=embedding_service.get_embedding_dimension()
        )
        stats = milvus_client.get_collection_stats()
        return CollectionStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Error getting stats: {e}")
        raise HTTPException(status_code=500, detail=f"Error getting stats: {str(e)}")

@app.get("/rag/documents", response_model=DocumentListResponse)
async def list_documents(limit: int = 100, offset: int = 0):
    try:
        embedding_service = get_embedding_service()
        milvus_client = get_milvus_client(
            embedding_dimension=embedding_service.get_embedding_dimension()
        )
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
    try:
        embedding_service = get_embedding_service()
        milvus_client = get_milvus_client(
            embedding_dimension=embedding_service.get_embedding_dimension()
        )
        milvus_client.delete_by_source_file(source_file)
        return {"message": f"Deleted all documents from {source_file}"}
    except Exception as e:
        logger.error(f"Error deleting documents: {e}")
        raise HTTPException(status_code=500, detail=f"Error deleting documents: {str(e)}")

@app.get("/")
async def root():
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
        "features": {
            "langchain_router": "Intelligent query routing (vector_db, database_rag, base_model)",
            "vector_db_rag": "Semantic search in uploaded documents (Milvus)",
            "database_rag": "Query combo courses, coupons, blogs from PostgreSQL",
            "base_model": "General IELTS conversation and advice"
        },
        "milvus_ui": {
            "attu": "http://localhost:3001",
            "milvus_webui": "http://localhost:9091/webui"
        }
    }