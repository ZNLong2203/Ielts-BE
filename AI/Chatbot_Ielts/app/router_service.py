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

class RouterService:    
    def __init__(self):
        ollama_url = os.getenv("OLLAMA_API_URL", "http://localhost:11434/api/generate")
        # Extract base URL for LangChain (remove /api/generate)
        if "/api/generate" in ollama_url:
            base_url = ollama_url.replace("/api/generate", "")
        else:
            base_url = ollama_url.replace("/api", "")
        
        # Use the same model as ollama_client
        from .ollama_client import MODEL_NAME
        model_name = os.getenv("OLLAMA_MODEL", MODEL_NAME.split(":")[0] if ":" in MODEL_NAME else MODEL_NAME)
        
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

{format_instructions}"""),
            ("human", "Query: {query}\n\nConversation context: {context}")
        ])
    
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
            
            # Get LLM response
            response = await self.llm.ainvoke(formatted_prompt)
            
            # Parse response
            decision = self.parser.parse(response.content)
            
            logger.info(
                f"Query routed to '{decision.route}' "
                f"(confidence: {decision.confidence:.2f}): {decision.reasoning}"
            )
            
            return decision
            
        except Exception as e:
            logger.error(f"Error in routing query: {e}")
            # Fallback: default to base_model if routing fails
            return RouterDecision(
                route="base_model",
                confidence=0.5,
                reasoning=f"Routing failed, defaulting to base_model: {str(e)}"
            )
    
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
