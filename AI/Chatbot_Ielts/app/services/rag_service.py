import logging
from typing import List, Dict, Optional
from .embedding_service import get_embedding_service
from ..clients.milvus_client import get_milvus_client
from ..llm.llm_service import generate_with_fallback
from .conversation_service import get_conversation_service

logger = logging.getLogger(__name__)

class RAGService:    
    def __init__(self, top_k: int = 5, score_threshold: float = 0.5, min_relevance_score: float = 0.6):
        self.top_k = top_k
        self.score_threshold = score_threshold  # Minimum score for retrieval
        self.min_relevance_score = min_relevance_score  # Minimum score to actually use RAG context
        self.embedding_service = get_embedding_service()
        self.milvus_client = get_milvus_client(
            embedding_dimension=self.embedding_service.get_embedding_dimension()
        )
        self.conversation_service = get_conversation_service()
    
    def retrieve_context(self, query: str) -> List[Dict]:
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
    
    def filter_relevant_docs(self, retrieved_docs: List[Dict]) -> List[Dict]:
        if not retrieved_docs:
            return []
        
        # Get max score to decide strategy
        max_score = max((doc.get("score", 0.0) for doc in retrieved_docs), default=0.0)
        
        # If max score is very low (< 0.55), don't use RAG at all
        if max_score < 0.55:
            logger.debug(f"Max relevance score {max_score:.2f} too low, not using RAG context")
            return []
        
        # Filter to only include documents with score above minimum relevance threshold
        relevant_docs = [
            doc for doc in retrieved_docs 
            if doc.get("score", 0.0) >= self.min_relevance_score
        ]
        
        # If we have some highly relevant docs (>= 0.6), use them
        if relevant_docs:
            return relevant_docs
        
        # If no docs meet the high threshold (0.6), but max score is decent (0.55-0.6)
        # Use top 2-3 documents with leniency
        if max_score >= 0.55:
            logger.debug(f"Using top documents with leniency (max score: {max_score:.2f}, threshold: {self.min_relevance_score})")
            return retrieved_docs[:min(3, len(retrieved_docs))]
        
        # Shouldn't reach here, but return empty as fallback
        return []
    
    def format_context(self, retrieved_docs: List[Dict]) -> str:
        if not retrieved_docs:
            return ""
        
        context_parts = []
        for i, doc in enumerate(retrieved_docs, 1):
            source = doc.get("source_file", "Unknown")
            text = doc.get("text", "").strip()
            # Only include if text is not empty
            if text:
                context_parts.append(f"Document {i}:\n{text}")
        
        return "\n\n".join(context_parts)
    
    async def format_and_summarize_context(self, retrieved_docs: List[Dict]) -> str:
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
            return await generate_with_fallback(enhanced_prompt)
        
        try:
            # Retrieve relevant context
            retrieved_docs = self.retrieve_context(query)
            
            # Filter to only use highly relevant documents
            relevant_docs = self.filter_relevant_docs(retrieved_docs)
            
            # Check if we have relevant enough documents to use RAG
            use_rag_context = len(relevant_docs) > 0
            
            if not use_rag_context:
                # No relevant documents found, use base model instead
                logger.info(f"No highly relevant documents found (max score: {max((d.get('score', 0.0) for d in retrieved_docs), default=0.0):.2f}), using base model")
                # Fall through to base model generation below
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
                    enhanced_prompt = f"""You are an IELTS preparation assistant. Help students with reading, writing, listening, and speaking skills. Answer the following question clearly and provide helpful guidance:

{query}"""
                return await generate_with_fallback(enhanced_prompt)
            
            # Format and optionally summarize context from relevant documents only
            context = ""
            if relevant_docs:
                context = await self.format_and_summarize_context(relevant_docs)
                scores_str = ", ".join([f"{d.get('score', 0.0):.2f}" for d in relevant_docs])
                logger.info(f"Using {len(relevant_docs)} relevant documents (scores: {scores_str})")
            
            # Build prompt with clear structure
            prompt_parts = []
            
            # Add RAG context if we have it
            if context:
                prompt_parts.append(f"Study materials:\n{context}")
            
            # Add conversation history if available
            if summarized_history:
                prompt_parts.append(f"Previous conversation:\n{summarized_history}")
            
            # Add current query
            prompt_parts.append(f"Question: {query}")
            
            prompt_text = "\n\n".join(prompt_parts)
            
            # Build prompt - use RAG context if available, otherwise base model style
            if context:
                system_message = "You are an IELTS preparation assistant. Answer questions clearly and helpfully using the provided study materials."
                enhanced_prompt = f"""{system_message}

{prompt_text}

Answer the question using information from the study materials. Provide a clear, helpful response."""
            else:
                # Shouldn't reach here if logic is correct, but handle it
                system_message = "You are an IELTS preparation assistant. Help students with reading, writing, listening, and speaking skills."
                enhanced_prompt = f"""{system_message}

{prompt_text}

Provide a clear, helpful answer to the question."""
            
            # Generate answer
            answer = await generate_with_fallback(enhanced_prompt)
            
            return answer
        except Exception as e:
            logger.error(f"Error in RAG generation: {e}")
            # Fallback to direct generation with proper prompt
            return await generate_with_fallback(f"You are an IELTS preparation assistant. Help students with reading, writing, listening, and speaking skills. Answer the following question clearly and provide helpful guidance:\n\n{query}")

_rag_service: Optional[RAGService] = None

def get_rag_service() -> RAGService:
    global _rag_service
    if _rag_service is None:
        _rag_service = RAGService()
    return _rag_service