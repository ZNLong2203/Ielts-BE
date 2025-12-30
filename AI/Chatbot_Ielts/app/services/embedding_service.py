import os
import logging
from typing import List, Optional
import numpy as np
from huggingface_hub import InferenceClient

logger = logging.getLogger(__name__)

class EmbeddingService:    
    def __init__(self, model_name: str = None):
        self.model_name = model_name or os.getenv("EMBEDDING_MODEL_NAME", "BAAI/bge-m3")
        self.embedding_dimension = 1024  # bge-m3 has 1024 dimensions
        self.batch_size = int(os.getenv("EMBEDDING_BATCH_SIZE", "16"))
        self.hf_token = os.getenv("HF_TOKEN")
        
        if not self.hf_token:
            raise ValueError("HF_TOKEN environment variable is required for HuggingFace Inference API")
        
        self.client = InferenceClient(
            provider="auto",
            api_key=self.hf_token,
        )
        logger.info(f"Initialized HuggingFace Inference Client for model: {self.model_name}")
        
    def load_model(self):
        """No-op for HuggingFace Inference API (model is loaded on-demand)"""
        logger.info(f"Using HuggingFace Inference API for embeddings (model: {self.model_name})")
        pass
    
    def encode(self, texts: List[str], batch_size: int = None, show_progress_bar: bool = False) -> np.ndarray:
        """
        Generate embeddings for a list of texts using HuggingFace Inference API
        
        Args:
            texts: List of text strings to encode
            batch_size: Batch size for encoding (used for batching requests)
            show_progress_bar: Whether to show progress bar (not supported by API)
            
        Returns:
            numpy array of embeddings with shape (n_texts, embedding_dimension)
        """
        if not texts:
            return np.array([])
        
        try:
            batch_size = batch_size or self.batch_size
            all_embeddings = []
            
            # Process in batches
            for i in range(0, len(texts), batch_size):
                batch = texts[i:i + batch_size]
                
                # Use feature_extraction endpoint for embeddings
                # HuggingFace Inference API returns embeddings as nested lists
                try:
                    embeddings = self.client.feature_extraction(
                        batch,
                        model=self.model_name,
                    )
                    
                    # Handle different response formats
                    if isinstance(embeddings, list):
                        if len(embeddings) > 0 and isinstance(embeddings[0], list):
                            # Multiple texts: [[emb1], [emb2], ...]
                            batch_embeddings = np.array(embeddings)
                        else:
                            # Single text: [emb1, emb2, ...]
                            batch_embeddings = np.array([embeddings])
                    else:
                        # Single embedding as array
                        batch_embeddings = np.array([embeddings])
                    
                    # Ensure correct shape: (batch_size, embedding_dim)
                    if batch_embeddings.ndim == 1:
                        batch_embeddings = batch_embeddings.reshape(1, -1)
                    
                    # Normalize embeddings for cosine similarity
                    norms = np.linalg.norm(batch_embeddings, axis=1, keepdims=True)
                    norms = np.where(norms == 0, 1, norms)  # Avoid division by zero
                    batch_embeddings = batch_embeddings / norms
                    
                    all_embeddings.append(batch_embeddings)
                    
                except Exception as e:
                    logger.error(f"Error encoding batch {i//batch_size + 1}: {e}")
                    # If batch fails, try individual texts
                    for text in batch:
                        try:
                            emb = self.client.feature_extraction(text, model=self.model_name)
                            if isinstance(emb, list):
                                emb_array = np.array(emb)
                            else:
                                emb_array = np.array([emb])
                            if emb_array.ndim == 1:
                                emb_array = emb_array.reshape(1, -1)
                            norms = np.linalg.norm(emb_array, axis=1, keepdims=True)
                            norms = np.where(norms == 0, 1, norms)
                            emb_array = emb_array / norms
                            all_embeddings.append(emb_array)
                        except Exception as e2:
                            logger.error(f"Error encoding single text: {e2}")
                            # Return zero vector as fallback
                            zero_emb = np.zeros((1, self.embedding_dimension))
                            all_embeddings.append(zero_emb)
            
            if not all_embeddings:
                return np.array([])
            
            result = np.vstack(all_embeddings)
            logger.debug(f"Generated embeddings for {len(texts)} texts, shape: {result.shape}")
            return result
            
        except Exception as e:
            logger.error(f"Error encoding texts with HuggingFace API: {e}")
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
        return self.embedding_dimension

_embedding_service: Optional[EmbeddingService] = None

def get_embedding_service() -> EmbeddingService:
    global _embedding_service
    if _embedding_service is None:
        _embedding_service = EmbeddingService()
    return _embedding_service

