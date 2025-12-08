import os
import logging
from typing import List, Dict, Optional, Tuple
from pymilvus import (
    connections,
    Collection,
    CollectionSchema,
    FieldSchema,
    DataType,
    utility,
    MilvusException
)
import numpy as np

logger = logging.getLogger(__name__)

class MilvusClient:
    """Client for interacting with Milvus vector database"""
    
    def __init__(
        self,
        host: str = None,
        port: int = None,
        collection_name: str = "ielts_knowledge_base",
        embedding_dimension: int = 768
    ):
        self.host = host or os.getenv("MILVUS_HOST", "localhost")
        self.port = port or int(os.getenv("MILVUS_PORT", "19530"))
        self.collection_name = collection_name
        self.embedding_dimension = embedding_dimension
        self.collection: Optional[Collection] = None
        self._connected = False
    
    def connect(self):
        """Connect to Milvus server"""
        if self._connected:
            return
        
        try:
            logger.info(f"Connecting to Milvus at {self.host}:{self.port}")
            connections.connect(
                alias="default",
                host=self.host,
                port=self.port
            )
            self._connected = True
            logger.info("Connected to Milvus successfully")
        except Exception as e:
            logger.error(f"Failed to connect to Milvus: {e}")
            raise
    
    def create_collection_if_not_exists(self):
        """Create collection if it doesn't exist"""
        self.connect()
        
        if utility.has_collection(self.collection_name):
            logger.info(f"Collection {self.collection_name} already exists")
            self.collection = Collection(self.collection_name)
            return
        
        logger.info(f"Creating collection {self.collection_name}")
        
        # Define schema
        fields = [
            FieldSchema(name="id", dtype=DataType.INT64, is_primary=True, auto_id=True),
            FieldSchema(name="text", dtype=DataType.VARCHAR, max_length=65535),
            FieldSchema(name="embedding", dtype=DataType.FLOAT_VECTOR, dim=self.embedding_dimension),
            FieldSchema(name="source_file", dtype=DataType.VARCHAR, max_length=255),
            FieldSchema(name="chunk_index", dtype=DataType.INT64),
            FieldSchema(name="metadata", dtype=DataType.VARCHAR, max_length=1000),
        ]
        
        schema = CollectionSchema(
            fields=fields,
            description="IELTS Knowledge Base - Vector embeddings for RAG"
        )
        
        # Create collection
        self.collection = Collection(
            name=self.collection_name,
            schema=schema
        )
        
        # Create index for vector search
        index_params = {
            "metric_type": "COSINE",  # Use cosine similarity
            "index_type": "IVF_FLAT",  # IVF_FLAT is good for small to medium datasets
            "params": {"nlist": 128}
        }
        
        self.collection.create_index(
            field_name="embedding",
            index_params=index_params
        )
        
        logger.info(f"Collection {self.collection_name} created successfully")
    
    def insert_documents(
        self,
        texts: List[str],
        embeddings: np.ndarray,
        source_file: str,
        metadata_list: Optional[List[Dict]] = None
    ) -> List[int]:
        """
        Insert documents into the collection
        
        Args:
            texts: List of text chunks
            embeddings: numpy array of embeddings
            source_file: Name of the source file
            metadata_list: Optional list of metadata dictionaries
            
        Returns:
            List of inserted IDs
        """
        if self.collection is None:
            self.create_collection_if_not_exists()
        
        # Prepare data
        data = []
        for i, (text, embedding) in enumerate(zip(texts, embeddings)):
            metadata_str = ""
            if metadata_list and i < len(metadata_list):
                import json
                metadata_str = json.dumps(metadata_list[i])
            
            data.append({
                "text": text[:65535],  # Ensure within max length
                "embedding": embedding.tolist(),
                "source_file": source_file[:255],
                "chunk_index": i,
                "metadata": metadata_str[:1000]
            })
        
        # Insert data
        try:
            result = self.collection.insert(data)
            self.collection.flush()  # Ensure data is written
            logger.info(f"Inserted {len(texts)} documents into collection")
            return result.primary_keys
        except Exception as e:
            logger.error(f"Error inserting documents: {e}")
            raise
    
    def search(
        self,
        query_embedding: List[float],
        top_k: int = 5,
        score_threshold: float = 0.5
    ) -> List[Dict]:
        """
        Search for similar documents
        
        Args:
            query_embedding: Query embedding vector
            top_k: Number of results to return
            score_threshold: Minimum similarity score
            
        Returns:
            List of dictionaries containing text, source_file, and score
        """
        if self.collection is None:
            self.create_collection_if_not_exists()
        
        # Load collection into memory
        self.collection.load()
        
        # Search parameters
        search_params = {
            "metric_type": "COSINE",
            "params": {"nprobe": 10}
        }
        
        try:
            results = self.collection.search(
                data=[query_embedding],
                anns_field="embedding",
                param=search_params,
                limit=top_k,
                output_fields=["text", "source_file", "chunk_index", "metadata"]
            )
            
            # Process results
            retrieved_docs = []
            if results and len(results) > 0:
                for hit in results[0]:
                    score = hit.score
                    if score >= score_threshold:
                        retrieved_docs.append({
                            "text": hit.entity.get("text", ""),
                            "source_file": hit.entity.get("source_file", ""),
                            "chunk_index": hit.entity.get("chunk_index", 0),
                            "metadata": hit.entity.get("metadata", ""),
                            "score": float(score)
                        })
            
            return retrieved_docs
        except Exception as e:
            logger.error(f"Error searching: {e}")
            raise
    
    def delete_by_source_file(self, source_file: str):
        """Delete all documents from a specific source file"""
        if self.collection is None:
            self.create_collection_if_not_exists()
        
        try:
            expr = f'source_file == "{source_file}"'
            self.collection.delete(expr)
            self.collection.flush()
            logger.info(f"Deleted documents from {source_file}")
        except Exception as e:
            logger.error(f"Error deleting documents: {e}")
            raise
    
    def get_collection_stats(self) -> Dict:
        """Get statistics about the collection"""
        if self.collection is None:
            self.create_collection_if_not_exists()
        
        try:
            stats = {
                "num_entities": self.collection.num_entities,
                "collection_name": self.collection_name
            }
            return stats
        except Exception as e:
            logger.error(f"Error getting stats: {e}")
            return {"error": str(e)}
    
    def list_documents(self, limit: int = 100, offset: int = 0) -> List[Dict]:
        """
        List documents from the collection
        
        Args:
            limit: Maximum number of documents to return
            offset: Number of documents to skip
            
        Returns:
            List of document dictionaries
        """
        if self.collection is None:
            self.create_collection_if_not_exists()
        
        try:
            # Load collection
            self.collection.load()
            
            # Query documents - use expr to get all (id >= 0)
            # Note: This assumes auto_id is True, so IDs start from 0
            expr = "id >= 0"
            results = self.collection.query(
                expr=expr,
                limit=limit,
                offset=offset,
                output_fields=["id", "text", "source_file", "chunk_index", "metadata"]
            )
            
            documents = []
            for result in results:
                text = result.get("text", "")
                text_preview = text[:200] + "..." if len(text) > 200 else text
                
                documents.append({
                    "id": result.get("id"),
                    "text": text_preview,
                    "text_full": text,  # Include full text for detailed view
                    "source_file": result.get("source_file", ""),
                    "chunk_index": result.get("chunk_index", 0),
                    "metadata": result.get("metadata", "")
                })
            
            return documents
        except Exception as e:
            logger.error(f"Error listing documents: {e}")
            return []

# Global instance
_milvus_client: Optional[MilvusClient] = None

def get_milvus_client(embedding_dimension: int = 768) -> MilvusClient:
    """Get or create the global Milvus client instance"""
    global _milvus_client
    if _milvus_client is None:
        _milvus_client = MilvusClient(embedding_dimension=embedding_dimension)
    return _milvus_client

