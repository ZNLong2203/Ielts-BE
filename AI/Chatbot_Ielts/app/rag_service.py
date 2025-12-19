import logging
from typing import List, Dict, Optional
from .embedding_service import get_embedding_service
from .milvus_client import get_milvus_client
from .ollama_client import query_ollama
from .conversation_service import get_conversation_service

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
        self.conversation_service = get_conversation_service()
    
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
    
    async def format_and_summarize_context(self, retrieved_docs: List[Dict]) -> str:
        """
        Format and optionally summarize context if too long
        
        Args:
            retrieved_docs: List of retrieved document dictionaries
            
        Returns:
            Formatted and potentially summarized context string
        """
        context = self.format_context(retrieved_docs)
        
        # Summarize if context is too long
        if self.conversation_service.should_summarize_context(context):
            context = await self.conversation_service.summarize_rag_context(context)
        
        return context
    
    async def generate_answer(
        self,
        query: str,
        use_rag: bool = True,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        """
        Generate answer using RAG with optional conversation history
        
        Args:
            query: User query
            use_rag: Whether to use RAG (True) or direct generation (False)
            conversation_history: Previous conversation messages
            
        Returns:
            Generated answer
        """
        # Summarize conversation history if provided
        summarized_history = None
        if conversation_history:
            summarized_history = await self.conversation_service.summarize_conversation(
                conversation_history
            )
        
        if not use_rag:
            if summarized_history:
                prompt = self.conversation_service.format_conversation_for_prompt(
                    conversation_history=summarized_history,
                    current_query=query
                )
                enhanced_prompt = f"""You are an IELTS preparation assistant. Continue the conversation naturally.

{prompt}

Instructions:
- Pay attention to the conversation history. If the user refers to "that topic", "the topic above", "đề đó", or similar references, they are referring to topics/questions mentioned in the previous conversation.
- Provide a helpful and accurate response based on the context."""
            else:
                # Add proper system prompt when no history
                enhanced_prompt = f"""You are an IELTS preparation assistant. Help students with reading, writing, listening, and speaking skills. Answer the following question clearly and provide helpful guidance:

{query}"""
            return await query_ollama(enhanced_prompt)
        
        try:
            # Retrieve relevant context
            retrieved_docs = self.retrieve_context(query)
            
            # Format and optionally summarize context
            context = ""
            if retrieved_docs:
                context = await self.format_and_summarize_context(retrieved_docs)
            
            # Build prompt with conversation history and RAG context
            prompt_text = self.conversation_service.format_conversation_for_prompt(
                conversation_history=summarized_history,
                current_query=query,
                rag_context=context if context else None
            )
            
            # Build instructions based on what's available
            instructions = []
            
            if summarized_history:
                instructions.append(
                    "- Pay attention to the conversation history above. If the user refers to \"that topic\", \"the topic above\", \"đề đó\", \"cái đó\", or similar references, they are referring to topics/questions mentioned in the previous conversation."
                )
                instructions.append("- Continue the conversation naturally and maintain context from previous messages.")
            
            if context:
                instructions.append("- Use the relevant study materials provided above to answer accurately.")
                instructions.append("- If using information from study materials, cite the source (e.g., Document X).")
            
            instructions.append("- Provide a comprehensive and helpful answer.")
            
            instructions_text = "\n".join(instructions) if instructions else ""
            
            enhanced_prompt = f"""You are an IELTS preparation assistant. Use the following information to answer the question accurately and helpfully.

{prompt_text}

Instructions:
{instructions_text}"""
            
            # Generate answer
            answer = await query_ollama(enhanced_prompt)
            
            return answer
        except Exception as e:
            logger.error(f"Error in RAG generation: {e}")
            # Fallback to direct generation with proper prompt
            return await query_ollama(f"You are an IELTS preparation assistant. Help students with reading, writing, listening, and speaking skills. Answer the following question clearly and provide helpful guidance:\n\n{query}")

# Global instance
_rag_service: Optional[RAGService] = None

def get_rag_service() -> RAGService:
    """Get or create the global RAG service instance"""
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service