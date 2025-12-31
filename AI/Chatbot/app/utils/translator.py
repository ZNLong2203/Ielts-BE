from langdetect import detect, DetectorFactory
from transformers import pipeline
import logging
import os

DetectorFactory.seed = 0
logger = logging.getLogger(__name__)

_translator = None

def _load_translator():
    global _translator
    if _translator is not None:
        return _translator
    
    hf_token = os.getenv("HF_TOKEN")
    model_name = "Helsinki-NLP/opus-mt-vi-en"
    
    try:
        if hf_token:
            _translator = pipeline(
                "translation",
                model=model_name,
                tokenizer=model_name,
                token=hf_token
            )
        else:
            _translator = pipeline(
                "translation",
                model=model_name,
                tokenizer=model_name
            )
        logger.info("Vietnamese-English translator loaded successfully")
    except Exception as e:
        logger.warning(f"Failed to load translator model '{model_name}': {e}. Translation features will be disabled. The application will continue to work, but Vietnamese text will not be automatically translated.")
        _translator = None
    
    return _translator

_load_translator()

def is_vietnamese(text: str) -> bool:
    if not text or len(text.strip()) < 3:
        return False
    
    try:
        cleaned_text = text.strip()
        detected_lang = detect(cleaned_text)
        
        vietnamese_chars = ['ă', 'â', 'đ', 'ê', 'ô', 'ơ', 'ư', 'á', 'à', 'ả', 'ã', 'ạ', 
                          'é', 'è', 'ẻ', 'ẽ', 'ẹ', 'í', 'ì', 'ỉ', 'ĩ', 'ị', 'ó', 'ò', 
                          'ỏ', 'õ', 'ọ', 'ú', 'ù', 'ủ', 'ũ', 'ụ', 'ý', 'ỳ', 'ỷ', 'ỹ', 'ỵ']
        
        has_vietnamese_chars = any(char in cleaned_text.lower() for char in vietnamese_chars)
        
        return detected_lang == "vi" or has_vietnamese_chars
        
    except Exception as e:
        logger.warning(f"Language detection failed: {e}")

        vietnamese_words = ['tôi', 'bạn', 'là', 'của', 'với', 'để', 'có', 'được', 'này', 'đó']
        return any(word in text.lower() for word in vietnamese_words)

async def translate_vi_to_en(text: str) -> str:
    translator = _load_translator()
    if not translator:
        logger.debug("Translator not available, returning original text")
        return text
    
    try:
        cleaned_text = text.strip()
        if len(cleaned_text) > 512:
            logger.warning("Text too long, truncating for translation")
            cleaned_text = cleaned_text[:512]
        
        result = translator(cleaned_text, max_length=512, num_return_sequences=1)
        translated = result[0]["translation_text"]
        
        logger.info(f"Translation: '{cleaned_text[:50]}...' -> '{translated[:50]}...'")
        return translated.strip()
        
    except Exception as e:
        logger.error(f"Translation failed: {e}")
        return text  

def get_translation_info() -> dict:
    return {
        "model": "Helsinki-NLP/opus-mt-vi-en",
        "available": _translator is not None,
        "supported_languages": ["vi", "en"],
        "max_length": 512
    }