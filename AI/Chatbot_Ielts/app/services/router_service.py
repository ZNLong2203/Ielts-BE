import logging
import os
from typing import Literal, Dict, Any
from langchain_core.prompts import ChatPromptTemplate
from langchain_ollama import ChatOllama
from langchain_core.output_parsers import PydanticOutputParser
from pydantic import BaseModel, Field

logger = logging.getLogger(__name__)

class RouterDecision(BaseModel):
    route: Literal["vector_db", "database_rag", "base_model"] = Field(
        description="The routing decision: 'vector_db' for semantic search in documents, 'database_rag' for querying combo/coupon/blog data, 'base_model' for general IELTS questions"
    )
    confidence: float = Field(
        description="Confidence score between 0 and 1",
        ge=0.0,
        le=1.0
    )
    reasoning: str = Field(
        description="Brief explanation of why this route was chosen"
    )
    router_failed: bool = Field(
        default=False,
        description="True if router failed due to Ollama error and should use direct Gemini fallback"
    )

class RouterService:    
    def __init__(self):
        ollama_url = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")
        if "/api/generate" in ollama_url:
            base_url = ollama_url.replace("/api/generate", "")
        else:
            base_url = ollama_url.replace("/api", "")
        
        from ..llm.ollama_client import MODEL_NAME
        model_name = MODEL_NAME
        
        try:
            # LangChain ChatOllama expects base_url without /api
            self.llm = ChatOllama(
                model=model_name,
                base_url=base_url,
                temperature=0.1,  # Low temperature for consistent routing
            )
        except Exception as e:
            logger.warning(f"Failed to initialize ChatOllama with base_url, trying default: {e}")
            self.llm = ChatOllama(
                model=model_name,
                temperature=0.1,
            )
        
        # Create output parser
        self.parser = PydanticOutputParser(pydantic_object=RouterDecision)
        
        # Create routing prompt template
        self.routing_prompt = ChatPromptTemplate.from_messages([
            ("system", """You are an intelligent query router for an IELTS learning platform chatbot.

Your task is to analyze user queries and route them to the most appropriate handler:

1. **vector_db**: Use when the query asks about:
   - IELTS study materials, tips, strategies, techniques
   - Reading/listening/writing/speaking skills and practice
   - Grammar, vocabulary, test preparation advice
   - Questions that can be answered from uploaded PDF documents or study materials
   - General IELTS knowledge and educational content

2. **database_rag**: Use when the query asks about:
   - Course information, course details, course prices
   - Combo courses, combo packages, combo prices
   - Coupons, discount codes, promotions
   - Blog posts, articles, blog content
   - Mock tests, test information
   - Enrollment, purchasing, pricing information
   - Specific product/service information from the platform
   - Questions about website/platform offerings (courses, combos, services)

3. **base_model**: Use when the query:
   - Is a general conversation, greeting, or casual chat
   - Asks for general IELTS advice without needing specific data
   - Is a follow-up question in a conversation
   - Doesn't clearly fit into vector_db or database_rag categories

Examples:
- "What are the best reading strategies?" → vector_db
- "Tell me about combo courses" → database_rag
- "What is IELTS?" → base_model
- "Show me courses for band 5.0" → database_rag
- "How to improve writing?" → vector_db
- "Hello, how are you?" → base_model
- "Do you have any coupons?" → database_rag
- "What course your website have?" → database_rag
- "What courses do you offer?" → database_rag
- "What courses are available?" → database_rag
- "Show me your courses" → database_rag
- "Do you have courses?" → database_rag
- "What course you have in this website" → database_rag
- "What courses does this website have?" → database_rag
- "What courses are on this platform?" → database_rag

{format_instructions}"""),
            ("human", "Query: {query}\n\nConversation context: {context}")
        ])
    
    async def _invoke_ollama_direct(self, messages: list) -> str:
        """
        Call Ollama API directly to handle thinking field properly.
        This is a workaround for LangChain ChatOllama not handling thinking field correctly.
        """
        import httpx
        
        ollama_url = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")
        if "/api/generate" in ollama_url:
            base_url = ollama_url.replace("/api/generate", "")
        else:
            base_url = ollama_url.replace("/api", "")
        
        from ..llm.ollama_client import MODEL_NAME
        
        # Convert LangChain messages to Ollama format
        # For router, we just need the last human message or combine system + human
        prompt_parts = []
        for msg in messages:
            if hasattr(msg, 'content'):
                if hasattr(msg, 'type'):
                    if msg.type == 'system':
                        prompt_parts.append(f"System: {msg.content}")
                    elif msg.type == 'human':
                        prompt_parts.append(f"Human: {msg.content}")
                else:
                    prompt_parts.append(msg.content)
        
        prompt = "\n\n".join(prompt_parts)
        
        # Call Ollama API directly with full options
        async with httpx.AsyncClient(timeout=60.0) as client:
            response = await client.post(
                f"{base_url}/api/generate",
                json={
                    "model": MODEL_NAME,
                    "prompt": prompt,
                    "stream": False,
                    "options": {
                        "temperature": 0.1,
                        "num_predict": 500,  # Ensure enough tokens for JSON response
                        "num_ctx": 4096,
                        "top_p": 0.9,
                        "top_k": 40,
                        "repeat_penalty": 1.1,
                    }
                }
            )
            response.raise_for_status()
            data = response.json()
            
            logger.info(f"Ollama response keys: {list(data.keys())}")
            logger.debug(f"Ollama eval_count: {data.get('eval_count', 0)}, done_reason: {data.get('done_reason', 'unknown')}")
            
            # Extract content: prioritize response field, fallback to thinking field if response is empty
            content = data.get("response", "")
            thinking_content = data.get("thinking", "")
            
            logger.debug(f"Response field length: {len(content) if content else 0}, Thinking field length: {len(thinking_content) if thinking_content else 0}")
            
            # Only use thinking field if response is empty or None
            if not content or not content.strip():
                if thinking_content and thinking_content.strip():
                    logger.info("Response field is empty, using thinking field instead")
                    content = thinking_content
                else:
                    logger.error(f"Both response and thinking fields are empty from Ollama. Eval count: {data.get('eval_count', 0)}, Done reason: {data.get('done_reason', 'unknown')}")
                    logger.error(f"Full Ollama response (first 500 chars): {str(data)[:500]}")
                    raise Exception(f"Empty response from Ollama (eval_count: {data.get('eval_count', 0)}, done_reason: {data.get('done_reason', 'unknown')})")
            
            logger.debug(f"Router extracted content length: {len(content)}")
            return content
    
    async def route_query(
        self, 
        query: str, 
        conversation_context: str = ""
    ) -> RouterDecision:
        try:
            formatted_prompt = self.routing_prompt.format_messages(
                query=query,
                context=conversation_context or "No previous context",
                format_instructions=self.parser.get_format_instructions()
            )
            
            # Use direct Ollama API call to properly handle thinking field
            # This is a workaround for LangChain ChatOllama not handling thinking field correctly
            content = await self._invoke_ollama_direct(formatted_prompt)
            
            # Log raw content for debugging
            logger.debug(f"Router raw response from Ollama: {content[:500]}")
            
            # Parse response content
            try:
                decision = self.parser.parse(content)
                
                logger.info(
                    f"Query '{query[:100]}' routed to '{decision.route}' "
                    f"(confidence: {decision.confidence:.2f}): {decision.reasoning}"
                )
                
                return decision
            except Exception as parse_error:
                logger.error(f"Failed to parse router response: {parse_error}")
                logger.error(f"Raw content that failed to parse: {content[:1000]}")
                raise
            
        except Exception as e:
            error_str = str(e).lower()
            error_type = type(e).__name__
            error_msg = str(e) if str(e) else "Unknown error"
            
            logger.error(f"Router exception caught: {error_type}: {error_msg}")
            logger.error(f"Exception repr: {repr(e)}")
            
            # Try keyword-based fallback routing if Ollama fails
            fallback_route = self._keyword_based_routing(query)
            if fallback_route:
                logger.info(f"Using keyword-based fallback routing: {fallback_route} for query: {query}")
                return RouterDecision(
                    route=fallback_route,
                    confidence=0.7,  # Medium confidence for keyword-based routing
                    reasoning=f"Router failed ({error_msg}), using keyword-based fallback",
                    router_failed=False
                )
            
            # Check if it's a serious Ollama error (500, timeout, connection issues)
            # These indicate Ollama is likely down or unreachable
            is_serious_error = any(keyword in error_str for keyword in [
                '500', 'timeout', 'connection', 'refused', 'unreachable',
                'network', 'econnrefused', 'etimedout', 'internal server error'
            ])
            
            if is_serious_error:
                logger.error(f"Router failed with serious Ollama error: {error_type}: {error_msg}. Will use direct Gemini fallback.")
                return RouterDecision(
                    route="base_model",
                    confidence=0.0,
                    reasoning=f"Router failed due to Ollama error: {error_msg}",
                    router_failed=True  # Flag to indicate direct fallback needed
                )
            else:
                # Minor error (e.g., parsing error, empty response) - default to base_model
                logger.warning(f"Router failed with minor error: {error_type}: {error_msg}. Defaulting to base_model.")
                return RouterDecision(
                    route="base_model",
                    confidence=0.5,
                    reasoning=f"Routing failed, defaulting to base_model: {error_msg}",
                    router_failed=False
                )
    
    def _keyword_based_routing(self, query: str) -> str:
        """
        Fallback keyword-based routing when Ollama fails.
        Returns route name or None if no match.
        """
        query_lower = query.lower()
        
        # Database RAG keywords
        database_keywords = [
            "course", "khóa học", "class", "combo", "package", "bundle", "gói",
            "coupon", "discount", "promo", "mã giảm", "khuyến mãi",
            "blog", "article", "post", "bài viết",
            "mock test", "test", "đề thi",
            "price", "pricing", "cost", "giá", "enrollment", "enroll", "đăng ký",
            "website", "platform", "site", "what do you have", "what courses", "what course"
        ]
        
        # Vector DB keywords
        vector_keywords = [
            "reading", "writing", "listening", "speaking",
            "grammar", "vocabulary", "strategy", "strategy", "technique", "tip",
            "how to", "cách", "pdf", "document", "material", "study material"
        ]
        
        # Check database keywords first (more specific)
        if any(keyword in query_lower for keyword in database_keywords):
            return "database_rag"
        
        # Check vector DB keywords
        if any(keyword in query_lower for keyword in vector_keywords):
            return "vector_db"
        
        return None
    
    def should_use_vector_db(self, decision: RouterDecision) -> bool:
        return decision.route == "vector_db" and decision.confidence >= 0.6
    
    def should_use_database_rag(self, decision: RouterDecision) -> bool:
        return decision.route == "database_rag" and decision.confidence >= 0.6
    
    def should_use_base_model(self, decision: RouterDecision) -> bool:
        return decision.route == "base_model" or decision.confidence < 0.6

_router_service = None

def get_router_service() -> RouterService:
    global _router_service
    if _router_service is None:
        _router_service = RouterService()
    return _router_service
