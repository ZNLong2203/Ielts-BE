from langdetect import detect
from transformers import pipeline

# Initialize translation pipeline
_translator = pipeline(
    "translation_vi_to_en",
    model="Helsinki-NLP/opus-mt-vi-en",
    tokenizer="Helsinki-NLP/opus-mt-vi-en"
)


def is_vietnamese(text: str) -> bool:
    """
    Detect if text is Vietnamese.
    """
    try:
        return detect(text) == "vi"
    except Exception:
        return False

async def translate_vi_to_en(text: str) -> str:
    """
    Translate Vietnamese text to English.
    """
    result = _translator(text, max_length=512)
    return result[0]["translation_text"]