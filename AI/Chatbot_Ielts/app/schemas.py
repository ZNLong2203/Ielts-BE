from pydantic import BaseModel
from typing import Optional, List

class ChatRequest(BaseModel):
    message: str
    use_rag: bool = True  # Whether to use RAG or direct generation

class ChatResponse(BaseModel):
    response: str
    sources: Optional[List[dict]] = None  # Retrieved sources if RAG was used

class PDFUploadResponse(BaseModel):
    message: str
    file_name: str
    chunks_processed: int
    collection_stats: dict

class DocumentSearchRequest(BaseModel):
    query: str
    top_k: int = 5

class DocumentSearchResponse(BaseModel):
    results: List[dict]
    query: str

class CollectionStatsResponse(BaseModel):
    num_entities: int
    collection_name: str

class DocumentListResponse(BaseModel):
    documents: List[dict]
    total: int
    limit: int
    offset: int