import os
import logging
from typing import List, Dict, Optional
from PyPDF2 import PdfReader
import re

logger = logging.getLogger(__name__)

class PDFExtractor:
    """Service for extracting and chunking text from PDF files"""
    
    def __init__(self, chunk_size: int = 500, chunk_overlap: int = 50):
        """
        Initialize PDF extractor
        
        Args:
            chunk_size: Maximum number of characters per chunk
            chunk_overlap: Number of characters to overlap between chunks
        """
        self.chunk_size = chunk_size
        self.chunk_overlap = chunk_overlap
    
    def extract_text_from_pdf(self, file_path: str) -> str:
        """
        Extract all text from a PDF file
        
        Args:
            file_path: Path to the PDF file
            
        Returns:
            Extracted text as a string
        """
        try:
            reader = PdfReader(file_path)
            text_parts = []
            
            for page_num, page in enumerate(reader.pages):
                try:
                    text = page.extract_text()
                    if text.strip():
                        text_parts.append(text)
                except Exception as e:
                    logger.warning(f"Error extracting text from page {page_num + 1}: {e}")
                    continue
            
            full_text = "\n\n".join(text_parts)
            logger.info(f"Extracted {len(full_text)} characters from PDF")
            return full_text
        except Exception as e:
            logger.error(f"Error extracting PDF: {e}")
            raise
    
    def clean_text(self, text: str) -> str:
        """
        Clean extracted text
        
        Args:
            text: Raw extracted text
            
        Returns:
            Cleaned text
        """
        # Remove excessive whitespace
        text = re.sub(r'\s+', ' ', text)
        # Remove special characters but keep punctuation
        text = re.sub(r'[^\w\s\.\,\!\?\;\:\-\(\)\[\]\"\']', ' ', text)
        # Remove multiple spaces
        text = re.sub(r' +', ' ', text)
        return text.strip()
    
    def chunk_text(self, text: str, metadata: Dict = None) -> List[Dict[str, str]]:
        """
        Split text into overlapping chunks
        
        Args:
            text: Text to chunk
            metadata: Optional metadata to attach to each chunk
            
        Returns:
            List of dictionaries containing chunk text and metadata
        """
        # Clean text first
        text = self.clean_text(text)
        
        if not text:
            return []
        
        chunks = []
        start = 0
        chunk_index = 0
        
        while start < len(text):
            # Calculate end position
            end = start + self.chunk_size
            
            # Try to break at sentence boundary
            if end < len(text):
                # Look for sentence endings
                sentence_endings = ['. ', '.\n', '! ', '!\n', '? ', '?\n']
                best_break = end
                
                for ending in sentence_endings:
                    # Look backwards from end
                    for i in range(end, max(start, end - 200), -1):
                        if text[i:i+len(ending)] == ending:
                            best_break = i + len(ending)
                            break
                    if best_break < end:
                        break
                
                end = best_break
            
            # Extract chunk
            chunk_text = text[start:end].strip()
            
            if chunk_text:
                chunk_data = {
                    "text": chunk_text,
                    "chunk_index": chunk_index,
                    "start_char": start,
                    "end_char": end
                }
                
                if metadata:
                    chunk_data["metadata"] = metadata
                
                chunks.append(chunk_data)
                chunk_index += 1
            
            # Move start position with overlap
            start = end - self.chunk_overlap
            if start >= len(text):
                break
        
        logger.info(f"Created {len(chunks)} chunks from text")
        return chunks
    
    def extract_and_chunk_pdf(self, file_path: str, source_file_name: str = None) -> List[Dict[str, str]]:
        """
        Extract text from PDF and chunk it
        
        Args:
            file_path: Path to the PDF file
            source_file_name: Name of the source file (for metadata)
            
        Returns:
            List of chunk dictionaries
        """
        # Extract text
        text = self.extract_text_from_pdf(file_path)
        
        # Prepare metadata
        metadata = {
            "source": source_file_name or os.path.basename(file_path),
            "type": "pdf"
        }
        
        # Chunk text
        chunks = self.chunk_text(text, metadata)
        
        return chunks

# Global instance
_pdf_extractor: Optional[PDFExtractor] = None

def get_pdf_extractor(chunk_size: int = 500, chunk_overlap: int = 50) -> PDFExtractor:
    """Get or create the global PDF extractor instance"""
    global _pdf_extractor
    if _pdf_extractor is None:
        _pdf_extractor = PDFExtractor(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
    return _pdf_extractor

