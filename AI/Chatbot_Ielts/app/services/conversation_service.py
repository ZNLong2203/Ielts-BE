import logging
import os
from typing import List, Dict, Optional, Tuple
from ..llm.llm_service import generate_with_fallback

logger = logging.getLogger(__name__)

class ConversationService:    
    def __init__(
        self,
        max_history_tokens: int = 800,
        summarize_threshold: int = 1200,
        max_context_length: int = 1500
    ):
        self.max_history_tokens = max_history_tokens
        self.summarize_threshold = summarize_threshold
        self.max_context_length = max_context_length
    
    def estimate_tokens(self, text: str) -> int:
        return len(text) // 4
    
    async def summarize_text(self, text: str, purpose: str = "conversation") -> str:
        try:
            if purpose == "conversation":
                prompt = f"""Summarize the following IELTS conversation history, preserving key information, questions asked, and important answers given. Keep it concise but informative:

{text}

Summary:"""
            elif purpose == "context":
                prompt = f"""Summarize the following IELTS study material excerpts, focusing on the most relevant information for answering questions. Keep key facts, examples, and explanations:

{text}

Summary:"""
            else:
                prompt = f"""Summarize the following text concisely:

{text}

Summary:"""
            
            summary = await generate_with_fallback(prompt)
            logger.info(f"Summarized {len(text)} chars to {len(summary)} chars ({purpose})")
            return summary.strip()
        except Exception as e:
            logger.error(f"Error summarizing text: {e}")
            # Fallback: return truncated version
            return text[:self.max_context_length] + "..."
    
    async def summarize_conversation(self, messages: List[Dict[str, str]]) -> str:
        if not messages:
            return ""
        
        # Format conversation with better structure
        conversation_parts = []
        for i, msg in enumerate(messages):
            role = msg.get('role', 'unknown').upper()
            content = msg.get('content', '')
            conversation_parts.append(f"{role}: {content}")
        
        conversation_text = "\n".join(conversation_parts)
        
        # Check if summarization is needed
        estimated_tokens = self.estimate_tokens(conversation_text)
        if estimated_tokens <= self.max_history_tokens:
            # Return full conversation if short enough
            return conversation_text
        
        # Only summarize if really necessary (above threshold)
        if estimated_tokens <= self.summarize_threshold:
            # Keep recent messages intact, only summarize older ones
            # Keep last 2 messages (most recent context)
            recent_messages = messages[-2:] if len(messages) > 2 else messages
            older_messages = messages[:-2] if len(messages) > 2 else []
            
            if older_messages:
                older_text = "\n".join([
                    f"{msg['role'].upper()}: {msg['content']}"
                    for msg in older_messages
                ])
                summarized_older = await self.summarize_text(older_text, purpose="conversation")
                
                recent_text = "\n".join([
                    f"{msg['role'].upper()}: {msg['content']}"
                    for msg in recent_messages
                ])
                
                return f"[Previous conversation summary]: {summarized_older}\n\n[Recent conversation]:\n{recent_text}"
            else:
                return conversation_text
        
        # Full summarization only if way too long
        return await self.summarize_text(conversation_text, purpose="conversation")
    
    async def summarize_rag_context(self, context: str) -> str:
        if not context:
            return ""
        
        estimated_tokens = self.estimate_tokens(context)
        if estimated_tokens <= self.max_context_length:
            return context
        
        logger.info(f"Context too long ({estimated_tokens} tokens), summarizing...")
        return await self.summarize_text(context, purpose="context")
    
    def format_conversation_for_prompt(
        self,
        conversation_history: Optional[str],
        current_query: str,
        rag_context: Optional[str] = None
    ) -> str:
        parts = []
        
        # Add conversation history if available
        if conversation_history:
            parts.append(f"Previous conversation:\n{conversation_history}\n")
        
        # Add RAG context if available
        if rag_context:
            parts.append(f"Relevant study materials:\n{rag_context}\n")
        
        # Add current query
        parts.append(f"Current question: {current_query}")
        
        return "\n---\n".join(parts)
    
    def should_summarize_context(self, context: str) -> bool:
        return self.estimate_tokens(context) > self.max_context_length

# Global instance
_conversation_service: Optional[ConversationService] = None

def get_conversation_service() -> ConversationService:
    global _conversation_service
    if _conversation_service is None:
        # Optimized defaults for local deployment
        max_history = int(os.getenv("MAX_HISTORY_TOKENS", "800"))
        summarize_threshold = int(os.getenv("SUMMARIZE_THRESHOLD", "1200"))
        max_context = int(os.getenv("MAX_CONTEXT_LENGTH", "1500"))
        _conversation_service = ConversationService(
            max_history_tokens=max_history,
            summarize_threshold=summarize_threshold,
            max_context_length=max_context
        )
    return _conversation_service

