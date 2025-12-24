import logging
import os
import asyncpg
from typing import List, Dict, Optional
from .ollama_client import query_ollama
from .conversation_service import get_conversation_service

logger = logging.getLogger(__name__)

class DatabaseRAGService:    
    def __init__(self):
        self.db_host = os.getenv("POSTGRES_HOST", "localhost")
        self.db_port = int(os.getenv("POSTGRES_PORT", "5433"))
        self.db_name = os.getenv("POSTGRES_DB", "ielts")
        self.db_user = os.getenv("RAG_DB_USER", "rag_reader")
        self.db_password = os.getenv("RAG_DB_PASSWORD", "rag_password")
        self.conversation_service = get_conversation_service()
        self._pool: Optional[asyncpg.Pool] = None
    
    async def _get_pool(self) -> asyncpg.Pool:
        if self._pool is None:
            self._pool = await asyncpg.create_pool(
                host=self.db_host,
                port=self.db_port,
                database=self.db_name,
                user=self.db_user,
                password=self.db_password,
                min_size=1,
                max_size=5
            )
        return self._pool
    
    async def close(self):
        if self._pool:
            await self._pool.close()
            self._pool = None
    
    async def query_courses(
        self, 
        search_term: Optional[str] = None,
        skill_focus: Optional[str] = None,
        difficulty_level: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        try:
            pool = await self._get_pool()
            conditions = []
            params = []
            param_idx = 1
            
            if search_term:
                conditions.append(
                    f"(title ILIKE ${param_idx} OR description ILIKE ${param_idx})"
                )
                params.append(f"%{search_term}%")
                param_idx += 1
            
            if skill_focus:
                conditions.append(f"skill_focus = ${param_idx}")
                params.append(skill_focus)
                param_idx += 1
            
            if difficulty_level:
                conditions.append(f"difficulty_level = ${param_idx}")
                params.append(difficulty_level)
                param_idx += 1
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            query = f"""
                SELECT * FROM rag_courses
                WHERE {where_clause}
                ORDER BY enrollment_count DESC, rating DESC
                LIMIT ${param_idx}
            """
            params.append(limit)
            
            async with pool.acquire() as conn:
                rows = await conn.fetch(query, *params)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error querying courses: {e}")
            return []
    
    async def query_combo_courses(
        self,
        search_term: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        try:
            pool = await self._get_pool()
            query = """
                SELECT * FROM rag_combo_courses
                WHERE ($1::text IS NULL OR name ILIKE $1 OR description ILIKE $1)
                ORDER BY enrollment_count DESC
                LIMIT $2
            """
            search_pattern = f"%{search_term}%" if search_term else None
            
            async with pool.acquire() as conn:
                rows = await conn.fetch(query, search_pattern, limit)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error querying combo courses: {e}")
            return []
    
    async def query_coupons(
        self,
        combo_id: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        try:
            pool = await self._get_pool()
            query = """
                SELECT * FROM rag_combo_coupons
                WHERE ($1::uuid IS NULL OR combo_id = $1)
                ORDER BY valid_until DESC
                LIMIT $2
            """
            
            async with pool.acquire() as conn:
                rows = await conn.fetch(query, combo_id, limit)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error querying coupons: {e}")
            return []
    
    async def query_blogs(
        self,
        search_term: Optional[str] = None,
        category: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        try:
            pool = await self._get_pool()
            conditions = []
            params = []
            param_idx = 1
            
            if search_term:
                conditions.append(
                    f"(title ILIKE ${param_idx} OR content ILIKE ${param_idx})"
                )
                params.append(f"%{search_term}%")
                param_idx += 1
            
            if category:
                conditions.append(f"category_name ILIKE ${param_idx}")
                params.append(f"%{category}%")
                param_idx += 1
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            query = f"""
                SELECT * FROM rag_blogs
                WHERE {where_clause}
                ORDER BY published_at DESC
                LIMIT ${param_idx}
            """
            params.append(limit)
            
            async with pool.acquire() as conn:
                rows = await conn.fetch(query, *params)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error querying blogs: {e}")
            return []
    
    async def query_mock_tests(
        self,
        test_type: Optional[str] = None,
        difficulty_level: Optional[str] = None,
        limit: int = 10
    ) -> List[Dict]:
        try:
            pool = await self._get_pool()
            conditions = []
            params = []
            param_idx = 1
            
            if test_type:
                conditions.append(f"test_type = ${param_idx}")
                params.append(test_type)
                param_idx += 1
            
            if difficulty_level:
                conditions.append(f"difficulty_level = ${param_idx}")
                params.append(difficulty_level)
                param_idx += 1
            
            where_clause = " AND ".join(conditions) if conditions else "1=1"
            query = f"""
                SELECT * FROM rag_mock_tests
                WHERE {where_clause}
                ORDER BY created_at DESC
                LIMIT ${param_idx}
            """
            params.append(limit)
            
            async with pool.acquire() as conn:
                rows = await conn.fetch(query, *params)
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error querying mock tests: {e}")
            return []
    
    async def intelligent_query(
        self,
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> Dict:
        query_lower = query.lower()
        results = {}
        query_type = None
        
        # Determine what to query based on keywords
        if any(keyword in query_lower for keyword in ["course", "khóa học", "class"]):
            # Extract search terms
            search_term = query
            skill_focus = None
            difficulty = None
            
            # Extract skill focus
            for skill in ["reading", "writing", "listening", "speaking"]:
                if skill in query_lower:
                    skill_focus = skill
                    break
            
            # Extract difficulty
            for diff in ["beginner", "intermediate", "advanced"]:
                if diff in query_lower:
                    difficulty = diff
                    break
            
            courses = await self.query_courses(
                search_term=search_term,
                skill_focus=skill_focus,
                difficulty_level=difficulty,
                limit=5
            )
            results["courses"] = courses
            query_type = "courses"
        
        elif any(keyword in query_lower for keyword in ["combo", "package", "bundle", "gói"]):
            combo_courses = await self.query_combo_courses(
                search_term=query,
                limit=5
            )
            results["combo_courses"] = combo_courses
            query_type = "combo_courses"
        
        elif any(keyword in query_lower for keyword in ["coupon", "discount", "promo", "mã giảm", "khuyến mãi"]):
            coupons = await self.query_coupons(limit=10)
            results["coupons"] = coupons
            query_type = "coupons"
        
        elif any(keyword in query_lower for keyword in ["blog", "article", "post", "bài viết"]):
            blogs = await self.query_blogs(
                search_term=query,
                limit=5
            )
            results["blogs"] = blogs
            query_type = "blogs"
        
        elif any(keyword in query_lower for keyword in ["mock test", "practice test", "đề thi thử"]):
            test_type = None
            for ttype in ["reading", "writing", "listening", "speaking", "full_test"]:
                if ttype in query_lower:
                    test_type = ttype
                    break
            
            mock_tests = await self.query_mock_tests(
                test_type=test_type,
                limit=5
            )
            results["mock_tests"] = mock_tests
            query_type = "mock_tests"
        
        else:
            # Try to query all relevant tables
            courses = await self.query_courses(search_term=query, limit=3)
            combo_courses = await self.query_combo_courses(search_term=query, limit=3)
            blogs = await self.query_blogs(search_term=query, limit=3)
            
            results = {
                "courses": courses,
                "combo_courses": combo_courses,
                "blogs": blogs
            }
            query_type = "general"
        
        context_parts = []
        
        if results.get("courses"):
            context_parts.append("=== COURSES ===")
            for course in results["courses"]:
                context_parts.append(
                    f"Title: {course.get('title', 'N/A')}\n"
                    f"Description: {course.get('description', 'N/A')[:200]}...\n"
                    f"Skill: {course.get('skill_focus', 'N/A')}, "
                    f"Level: {course.get('difficulty_level', 'N/A')}, "
                    f"Price: ${course.get('price', 0)}\n"
                )
        
        if results.get("combo_courses"):
            context_parts.append("\n=== COMBO COURSES ===")
            for combo in results["combo_courses"]:
                context_parts.append(
                    f"Name: {combo.get('name', 'N/A')}\n"
                    f"Description: {combo.get('description', 'N/A')[:200]}...\n"
                    f"Price: ${combo.get('combo_price', 0)} "
                    f"(Original: ${combo.get('original_price', 0)})\n"
                )
        
        if results.get("coupons"):
            context_parts.append("\n=== COUPONS ===")
            for coupon in results["coupons"]:
                context_parts.append(
                    f"Code: {coupon.get('code', 'N/A')}\n"
                    f"Description: {coupon.get('description', 'N/A')[:200]}...\n"
                    f"Discount: {coupon.get('discount_value', 0)} "
                    f"({coupon.get('discount_type', 'N/A')})\n"
                    f"Valid until: {coupon.get('valid_until', 'N/A')}\n"
                )
        
        if results.get("blogs"):
            context_parts.append("\n=== BLOG POSTS ===")
            for blog in results["blogs"]:
                content_preview = blog.get('content', '')[:300] if blog.get('content') else 'N/A'
                context_parts.append(
                    f"Title: {blog.get('title', 'N/A')}\n"
                    f"Content: {content_preview}...\n"
                    f"Category: {blog.get('category_name', 'N/A')}\n"
                )
        
        if results.get("mock_tests"):
            context_parts.append("\n=== MOCK TESTS ===")
            for test in results["mock_tests"]:
                context_parts.append(
                    f"Title: {test.get('title', 'N/A')}\n"
                    f"Description: {test.get('description', 'N/A')[:200]}...\n"
                    f"Type: {test.get('test_type', 'N/A')}, "
                    f"Duration: {test.get('duration', 0)} minutes\n"
                )
        
        formatted_context = "\n".join(context_parts) if context_parts else "No relevant information found."
        
        return {
            "query_type": query_type,
            "results": results,
            "formatted_context": formatted_context
        }
    
    async def generate_answer(
        self,
        query: str,
        conversation_history: Optional[List[Dict[str, str]]] = None
    ) -> str:
        db_results = await self.intelligent_query(query, conversation_history)
        
        # Summarize conversation history if provided
        summarized_history = None
        if conversation_history:
            summarized_history = await self.conversation_service.summarize_conversation(
                conversation_history
            )
        
        # Format prompt
        prompt_parts = []
        
        if summarized_history:
            prompt_parts.append(f"Previous conversation:\n{summarized_history}\n")
        
        prompt_parts.append(f"Database information:\n{db_results['formatted_context']}\n")
        prompt_parts.append(f"User question: {query}")
        
        prompt = "\n---\n".join(prompt_parts)
        
        enhanced_prompt = f"""You are an IELTS learning platform assistant. Use the database information provided to answer the user's question accurately and helpfully.

{prompt}

Instructions:
- Use the database information above to provide accurate answers about courses, combos, coupons, blogs, and mock tests
- If the information is not available in the database, say so politely
- Format your response in a clear and helpful manner
- Include relevant details like prices, descriptions, and availability when appropriate
- If asked about specific items, provide details from the database"""
        
        answer = await query_ollama(enhanced_prompt)
        return answer

_database_rag_service = None

def get_database_rag_service() -> DatabaseRAGService:
    global _database_rag_service
    if _database_rag_service is None:
        _database_rag_service = DatabaseRAGService()
    return _database_rag_service
