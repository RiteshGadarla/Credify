import easyocr
import trafilatura
from newspaper import Article
from PIL import Image
import io
import os
import logging

logger = logging.getLogger(__name__)

# Global cache for EasyOCR reader
_reader_cache = None

def get_ocr_reader():
    """Lazily load and cache the EasyOCR reader."""
    global _reader_cache
    if _reader_cache is None:
        try:
            logger.info("Initializing EasyOCR reader (this may download models)...")
            _reader_cache = easyocr.Reader(['en'])
        except Exception as e:
            logger.error(f"Failed to initialize EasyOCR: {e}")
            _reader_cache = None
    return _reader_cache

def extract_text_from_image(image_bytes: bytes) -> str:
    """Extract text from an image using EasyOCR."""
    reader = get_ocr_reader()
    if not reader:
        return "OCR Error: Reader could not be initialized. Please check your internet connection or server logs."
    
    try:
        results = reader.readtext(image_bytes)
        # Result is a list of tuples: (bbox, text, confidence)
        text_list = [result[1] for result in results]
        return " ".join(text_list)
    except Exception as e:
        logger.error(f"OCR processing failed: {e}")
        return f"OCR Error: {str(e)}"

def extract_content_from_url(url: str) -> dict:
    """Extract main article text and images from a URL using Trafilatura and Newspaper3k."""
    result = {
        "title": "",
        "text": "",
        "images": []
    }

    # Primary extractor: Trafilatura
    try:
        downloaded = trafilatura.fetch_url(url)
        if downloaded:
            content = trafilatura.extract(downloaded, include_images=True, include_comments=False)
            metadata = trafilatura.extract_metadata(downloaded)
            
            if content:
                result["text"] = content
            if metadata:
                result["title"] = metadata.title or ""
    except Exception as e:
        logger.error(f"Trafilatura extraction failed for {url}: {e}")

    # Fallback/Supplemental extractor: Newspaper3k
    try:
        article = Article(url)
        article.download()
        article.parse()
        
        if not result["text"]:
            result["text"] = article.text
        if not result["title"]:
            result["title"] = article.title
        
        # Get images
        if hasattr(article, 'top_image') and article.top_image:
            result["images"].append(article.top_image)
        if article.images:
            result["images"].extend(list(article.images))
            # Remove duplicates
            result["images"] = list(set(result["images"]))
            
    except Exception as e:
        logger.error(f"Newspaper3k extraction failed for {url}: {e}")

    # Final cleanup if nothing found
    if not result["text"] and not result["title"]:
        return {"error": "Failed to extract content from URL"}
        
    return result
