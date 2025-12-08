import logging
from typing import List, Dict, Optional
from .embedding_service import get_embedding_service
from .milvus_client import get_milvus_client
from .ollama_client import query_ollama

logger = logging.getLogger(__name__)

class RAGService:
    """Service for RAG-based question answering"""
    
    def __init__(self, top_k: int = 5, score_threshold: float = 0.5):
        """
        Initialize RAG service
        
        Args:
            top_k: Number of relevant chunks to retrieve
            score_threshold: Minimum similarity score for retrieval
        """
        self.top_k = top_k
        self.score_threshold = score_threshold
        self.embedding_service = get_embedding_service()
        self.milvus_client = get_milvus_client(
            embedding_dimension=self.embedding_service.get_embedding_dimension()
        )
    
    def retrieve_context(self, query: str) -> List[Dict]:
        """
        Retrieve relevant context from vector database
        
        Args:
            query: User query string
            
        Returns:
            List of relevant document chunks
        """
        try:
            # Generate query embedding
            query_embedding = self.embedding_service.encode_single(query)
            
            # Search in Milvus
            results = self.milvus_client.search(
                query_embedding=query_embedding,
                top_k=self.top_k,
                score_threshold=self.score_threshold
            )
            
            logger.info(f"Retrieved {len(results)} relevant chunks for query")
            return results
        except Exception as e:
            logger.error(f"Error retrieving context: {e}")
            return []
    
    def format_context(self, retrieved_docs: List[Dict]) -> str:
        """
        Format retrieved documents into context string
        
        Args:
            retrieved_docs: List of retrieved document dictionaries
            
        Returns:
            Formatted context string
        """
        if not retrieved_docs:
            return ""
        
        context_parts = []
        for i, doc in enumerate(retrieved_docs, 1):
            source = doc.get("source_file", "Unknown")
            text = doc.get("text", "")
            score = doc.get("score", 0.0)
            
            context_parts.append(
                f"[Document {i} from {source} (relevance: {score:.2f})]\n{text}\n"
            )
        
        return "\n---\n".join(context_parts)
    
    async def generate_answer(self, query: str, use_rag: bool = True) -> str:
        """
        Generate answer using RAG
        
        Args:
            query: User query
            use_rag: Whether to use RAG (True) or direct generation (False)
            
        Returns:
            Generated answer
        """
        if not use_rag:
            # Direct generation without RAG
            return await query_ollama(query)
        
        try:
            # Retrieve relevant context
            retrieved_docs = self.retrieve_context(query)
            
            if not retrieved_docs:
                # No relevant context found, use direct generation
                logger.info("No relevant context found, using direct generation")
                return await query_ollama(query)
            
            # Format context
            context = self.format_context(retrieved_docs)
            
            # Create enhanced prompt with context
            enhanced_prompt = f"""You are an IELTS preparation assistant. Use the following context from IELTS study materials to answer the question accurately and helpfully.

Context from study materials:
{context}

Question: {query}

Please provide a comprehensive answer based on the context provided. If the context doesn't contain enough information, you can supplement with your general IELTS knowledge. Always cite the source when referencing specific information from the context."""
            
            # Generate answer with context
            answer = await query_ollama(enhanced_prompt)
            
            return answer
        except Exception as e:
            logger.error(f"Error in RAG generation: {e}")
            # Fallback to direct generation
            return await query_ollama(query)

# Global instance
_rag_service: Optional[RAGService] = None

def get_rag_service() -> RAGService:
    """Get or create the global RAG service instance"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service

