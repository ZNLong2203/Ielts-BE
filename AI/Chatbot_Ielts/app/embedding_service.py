import os
import logging
from typing import List, Optional
import torch
from sentence_transformers import SentenceTransformer
import numpy as np

logger = logging.getLogger(__name__)

class EmbeddingService:
    """Service for generating embeddings using sentence-transformers"""
    
    def __init__(self, model_name: str = None):
        # Default to bge-m3 for stronger multilingual retrieval
        self.model_name = model_name or os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-m3")
        self.model: Optional[SentenceTransformer] = None
        # bge-m3 outputs 1024-dim dense embeddings
        self.embedding_dimension = 1024
        # Allow choosing lighter dtype; fallback to safer dtype if not supported
        # Options: fp16, bf16, fp32
        self.dtype_str = os.getenv("EMBEDDING_MODEL_DTYPE", "bf16").lower()
        self.device = os.getenv("EMBEDDING_DEVICE", None)  # e.g., "cuda", "cpu", or None for auto
        # Batch size for encode (tune for memory/speed)
        self.batch_size = int(os.getenv("EMBEDDING_BATCH_SIZE", "16"))
        
    def load_model(self):
        """Load the embedding model"""
        if self.model is None:
            try:
                logger.info(f"Loading embedding model: {self.model_name} (dtype={self.dtype_str})")
                
                dtype_map = {
                    "fp16": torch.float16,
                    "float16": torch.float16,
                    "bf16": torch.bfloat16,
                    "bfloat16": torch.bfloat16,
                    "fp32": torch.float32,
                    "float32": torch.float32,
                }
                dtype = dtype_map.get(self.dtype_str, torch.bfloat16)

                # On CPU, fp16 is often slower/unsupported; prefer bf16 or fp32
                if (self.device is None or self.device == "cpu") and dtype == torch.float16:
                    logger.info("CPU detected with fp16 requested; switching to bf16 for better compatibility/perf")
                    dtype = torch.bfloat16

                # Some CPUs have limited support for float16; fallback to float32 if loading fails
                try:
                    self.model = SentenceTransformer(
                        self.model_name,
                        # transformers warns torch_dtype is deprecated; use dtype instead
                        model_kwargs={"dtype": dtype},
                        device=self.device,  # lets torch pick automatically when None
                        trust_remote_code=True,
                    )
                except Exception as e:
                    logger.warning(
                        f"Failed to load model with dtype {self.dtype_str}, falling back to float32: {e}"
                    )
                    self.model = SentenceTransformer(
                        self.model_name,
                        model_kwargs={"dtype": torch.float32},
                        device=self.device,
                        trust_remote_code=True,
                    )

                logger.info("Embedding model loaded successfully")
            except Exception as e:
                logger.error(f"Failed to load embedding model: {e}")
                raise
    
    def encode(self, texts: List[str], batch_size: int = None, show_progress_bar: bool = False) -> np.ndarray:
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
                batch_size=batch_size or self.batch_size,
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

