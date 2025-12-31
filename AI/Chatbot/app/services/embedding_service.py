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
        logger.info(f"Using HuggingFace Inference API for embeddings (model: {self.model_name})")
        pass
    
    def encode(self, texts: List[str], batch_size: int = None, show_progress_bar: bool = False) -> np.ndarray:
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
                    
                    # HuggingFace Inference API returns embeddings as a list
                    # For batch input, it returns: [[emb1_dim1, ..., emb1_dim1024], [emb2_dim1, ..., emb2_dim1024], ...]
                    # Try to convert directly to numpy array first (most common case)
                    try:
                        batch_embeddings = np.array(embeddings, dtype=np.float32)
                        # If 1D array (single embedding), reshape to (1, embedding_dim)
                        if batch_embeddings.ndim == 1:
                            batch_embeddings = batch_embeddings.reshape(1, -1)
                        # If 2D array, should be (batch_size, embedding_dim) - verify below
                    except (ValueError, TypeError) as e:
                        # If direct conversion fails (unequal lengths), parse manually
                        logger.debug(f"Direct array conversion failed for batch {i//batch_size + 1}, parsing manually: {e}")
                        if isinstance(embeddings, list) and len(embeddings) > 0:
                            if isinstance(embeddings[0], list):
                                # Nested list: [[emb1], [emb2], ...]
                                embedding_list = [np.array(emb, dtype=np.float32) for emb in embeddings]
                                # Validate all have same length before stacking
                                dims = [emb.shape[0] if emb.ndim == 1 else emb.size for emb in embedding_list]
                                if len(set(dims)) > 1:
                                    logger.error(f"Batch {i//batch_size + 1}: Inconsistent embedding dimensions: {dims}")
                                    raise ValueError(f"Inconsistent embedding dimensions in batch: {dims}")
                                batch_embeddings = np.vstack(embedding_list)
                            else:
                                # Flat list (single embedding)
                                batch_embeddings = np.array(embeddings, dtype=np.float32).reshape(1, -1)
                        else:
                            raise ValueError(f"Unexpected embeddings format: {type(embeddings)}")
                    
                    # Log shape for debugging
                    logger.debug(f"Batch {i//batch_size + 1}: Parsed embeddings shape: {batch_embeddings.shape}, expected rows: {len(batch)}")
                    
                    # Validate shape: should be (batch_size, embedding_dim)
                    expected_rows = len(batch)
                    if batch_embeddings.shape[0] != expected_rows:
                        logger.warning(
                            f"Batch {i//batch_size + 1}: Row count mismatch. "
                            f"Expected {expected_rows} rows (batch size), got {batch_embeddings.shape[0]}. "
                            f"Shape: {batch_embeddings.shape}"
                        )
                        # Adjust to match batch size
                        if batch_embeddings.shape[0] > expected_rows:
                            batch_embeddings = batch_embeddings[:expected_rows, :]
                        else:
                            # This shouldn't happen normally, but handle it
                            logger.error(f"Batch {i//batch_size + 1}: Got fewer embeddings than batch size!")
                            padding = np.zeros((expected_rows - batch_embeddings.shape[0], batch_embeddings.shape[1]), dtype=np.float32)
                            batch_embeddings = np.vstack([batch_embeddings, padding])
                    
                    # Validate embedding dimension matches expected (bge-m3 should be 1024)
                    if batch_embeddings.shape[1] != self.embedding_dimension:
                        logger.warning(
                            f"Batch {i//batch_size + 1}: Expected embedding dimension {self.embedding_dimension}, "
                            f"got {batch_embeddings.shape[1]}. Reshaping or truncating..."
                        )
                        # If dimension is larger, truncate; if smaller, pad with zeros
                        if batch_embeddings.shape[1] > self.embedding_dimension:
                            batch_embeddings = batch_embeddings[:, :self.embedding_dimension]
                        else:
                            # Pad with zeros
                            padding = np.zeros((batch_embeddings.shape[0], self.embedding_dimension - batch_embeddings.shape[1]))
                            batch_embeddings = np.hstack([batch_embeddings, padding])
                    
                    # Normalize embeddings for cosine similarity
                    norms = np.linalg.norm(batch_embeddings, axis=1, keepdims=True)
                    norms = np.where(norms == 0, 1, norms)  # Avoid division by zero
                    batch_embeddings = batch_embeddings / norms
                    
                    # Validate final shape before appending
                    if batch_embeddings.shape[1] != self.embedding_dimension:
                        logger.error(f"Batch {i//batch_size + 1}: Failed to fix embedding dimension. Shape: {batch_embeddings.shape}")
                        raise ValueError(f"Invalid embedding dimension: {batch_embeddings.shape[1]}, expected {self.embedding_dimension}")
                    
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
                            
                            # Validate and fix embedding dimension
                            if emb_array.shape[1] != self.embedding_dimension:
                                logger.warning(
                                    f"Single text embedding: Expected dimension {self.embedding_dimension}, "
                                    f"got {emb_array.shape[1]}. Reshaping..."
                                )
                                if emb_array.shape[1] > self.embedding_dimension:
                                    emb_array = emb_array[:, :self.embedding_dimension]
                                else:
                                    padding = np.zeros((1, self.embedding_dimension - emb_array.shape[1]))
                                    emb_array = np.hstack([emb_array, padding])
                            
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
            
            # Validate all embeddings have same dimension before stacking
            for idx, emb in enumerate(all_embeddings):
                if emb.shape[1] != self.embedding_dimension:
                    logger.error(f"Embedding batch {idx} has invalid dimension: {emb.shape[1]}, expected {self.embedding_dimension}")
                    raise ValueError(f"Embedding dimension mismatch: batch {idx} has {emb.shape[1]}, expected {self.embedding_dimension}")
            
            result = np.vstack(all_embeddings)
            logger.debug(f"Generated embeddings for {len(texts)} texts, shape: {result.shape}")
            
            # Final validation
            if result.shape[1] != self.embedding_dimension:
                logger.error(f"Final embeddings have invalid dimension: {result.shape[1]}, expected {self.embedding_dimension}")
                raise ValueError(f"Final embedding dimension mismatch: {result.shape[1]}, expected {self.embedding_dimension}")
            
            return result
            
        except Exception as e:
            logger.error(f"Error encoding texts with HuggingFace API: {e}")
            raise
    
    def encode_single(self, text: str) -> List[float]:
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

