import asyncio
import google.generativeai as genai
from app.core.config import settings
from app.utils.logger import logger

# Configure Google Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

PRIMARY_MODEL = "models/gemini-3.1-flash-lite-preview"
BACKUP_MODEL = "models/gemma-3-27b-it"

async def _generate_with_model(model_name: str, prompt: str, temperature: float, max_retries: int) -> str:
    """Internal helper with exponential backoff for rate limits."""
    model = genai.GenerativeModel(model_name)
    last_exception = None
    for attempt in range(max_retries):
        try:
            response = await model.generate_content_async(
                prompt,
                generation_config=genai.types.GenerationConfig(temperature=temperature)
            )
            return response.text
        except Exception as e:
            last_exception = e
            error_msg = str(e).lower()
            if any(key in error_msg for key in ["429", "quota", "rate limit", "exhausted"]):
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 4 # Wait 4, 8, 16... seconds
                    logger.warning(f"[Rate Limit] Hit for {model_name}. Retrying in {wait_time}s... (Attempt {attempt+1}/{max_retries})")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Max retries reached for {model_name}: {e}")
            else:
                logger.error(f"Error with {model_name}: {e}")
                raise e
    
    if last_exception:
        raise last_exception
    return "" # Should not reach here

async def generate_gemini_response(prompt: str, temperature: float = 0.7, max_retries: int = 5) -> str:
    """
    Main interface to get a response from Gemini.
    Attempts primary model first, falls back on failure.
    """
    try:
        return await _generate_with_model(PRIMARY_MODEL, prompt, temperature, max_retries)
    except Exception as e:
        logger.warning(f"Primary model {PRIMARY_MODEL} failed. Falling back to {BACKUP_MODEL}. Error: {e}")
        try:
            return await _generate_with_model(BACKUP_MODEL, prompt, temperature, 2)
        except Exception as backup_e:
            logger.error(f"Both primary and backup models failed. Backup error: {backup_e}")
            raise backup_e
