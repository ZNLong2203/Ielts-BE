import os
import logging
from typing import List, Optional
from sentence_transformers import SentenceTransformer
import numpy as np

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating embeddings using sentence-transformers"""
    
    def __init__(self, model_name: str = "sentence-transformers/all-mpnet-base-v2"):
        self.model_name = model_name
        self.model: Optional[SentenceTransformer] = None
        self.embedding_dimension = 768  # all-mpnet-base-v2 produces 768-dimensional vectors
        
    def load_model(self):
        """Load the embedding model"""
        if self.model is None:
            try:
                logger.info(f"Loading embedding model: {self.model_name}")
                self.model = SentenceTransformer(self.model_name)
                logger.info("Embedding model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise
    
    def encode(self, texts: List[str], batch_size: int = 32, show_progress_bar: bool = False) -> np.ndarray:
        """
        Generate embeddings for a list of texts
        
        Args:
            texts: List of text strings to encode
            batch_size: Batch size for encoding
            show_progress_bar: Whether to show progress bar
            
        Returns:
            numpy array of embeddings with shape (n_texts, embedding_dimension)
        """
        if self.model is None:
            self.load_model()
        
        if not texts:
            return np.array([])
        
        try:
            embeddings = self.model.encode(
                texts,
                batch_size=batch_size,
                show_progress_bar=show_progress_bar,
                convert_to_numpy=True,
                normalize_embeddings=True  # Normalize for cosine similarity
            )
            return embeddings
        except Exception as e:
            logger.error(f"Error encoding texts: {e}")
            raise
    
    def encode_single(self, text: str) -> List[float]:
        """
        Generate embedding for a single text
        
        Args:
            text: Text string to encode
            
        Returns:
            List of float values representing the embedding
        """
        embeddings = self.encode([text])
        return embeddings[0].tolist()
    
    def get_embedding_dimension(self) -> int:
        """Get the dimension of embeddings produced by this model"""
        return self.embedding_dimension

# Global instance
_embedding_service: Optional[EmbeddingService] = None

def get_embedding_service() -> EmbeddingService:
    """Get or create the global embedding service instance"""
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service

