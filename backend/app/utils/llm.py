import os
import asyncio
import google.generativeai as genai
from groq import AsyncGroq
from app.core.config import settings
from app.utils.logger import logger

# Configuration for Gemini
if settings.GEMINI_API_KEY:
    genai.configure(api_key=settings.GEMINI_API_KEY)

GEMINI_PRIMARY = "models/gemini-3.1-flash-lite-preview"
GEMINI_BACKUP = "models/gemma-3-27b-it"

# Configuration for Groq
groq_client = None
if settings.GROQ_API_KEY:
    groq_client = AsyncGroq(api_key=settings.GROQ_API_KEY)

GROQ_PRIMARY = "openai/gpt-oss-120b"
GROQ_BACKUP = "mixtral-8x7b-32768"

async def _generate_with_gemini(model_name: str, prompt: str, temperature: float, max_retries: int) -> str:
    """Internal helper for Gemini with exponential backoff for rate limits."""
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
                    wait_time = (2 ** attempt) * 4
                    logger.warning(f"[Rate Limit] Hit for Gemini {model_name}. Retrying in {wait_time}s... (Attempt {attempt+1}/{max_retries})")
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Max retries reached for Gemini {model_name}: {e}")
            else:
                logger.error(f"Error with Gemini {model_name}: {e}")
                raise e
    
    if last_exception:
        raise last_exception
    return ""

async def _generate_with_groq(model_name: str, prompt: str, temperature: float, max_retries: int) -> str:
    """Internal helper for Groq with exponential backoff for rate limits."""
    if groq_client is None:
        raise ValueError("GROQ_API_KEY is not configured")

    last_exception = None
    for attempt in range(max_retries):
        try:
            response = await groq_client.chat.completions.create(
                model=model_name,
                messages=[{"role": "user", "content": prompt}],
                temperature=temperature
            )
            return response.choices[0].message.content

        except Exception as e:
            last_exception = e
            error_msg = str(e).lower()

            if any(key in error_msg for key in ["429", "quota", "rate limit", "exhausted"]):
                if attempt < max_retries - 1:
                    wait_time = (2 ** attempt) * 4
                    logger.warning(
                        f"[Rate Limit] Hit for Groq {model_name}. Retrying in {wait_time}s... "
                        f"(Attempt {attempt+1}/{max_retries})"
                    )
                    await asyncio.sleep(wait_time)
                else:
                    logger.error(f"Max retries reached for Groq {model_name}: {e}")
            else:
                logger.error(f"Error with Groq {model_name}: {e}")
                raise e

    if last_exception:
        raise last_exception
    return ""

async def generate_llm_response(prompt: str, temperature: float = 0.7, max_retries: int = 5) -> str:
    """
    Main interface. Delegates to either Gemini or Groq based on LLM_PROVIDER env var.
    """
    provider = os.getenv("LLM_PROVIDER", "gemini").lower()
    
    if provider == "groq":
        try:
            return await _generate_with_groq(GROQ_PRIMARY, prompt, temperature, max_retries)
        except Exception as e:
            logger.warning(
                f"Groq Primary model {GROQ_PRIMARY} failed. Falling back to {GROQ_BACKUP}. Error: {e}"
            )
            try:
                return await _generate_with_groq(GROQ_BACKUP, prompt, temperature, 2)
            except Exception as backup_e:
                logger.error(f"Both Groq models failed. Backup error: {backup_e}")
                raise backup_e
    else:
        # Default to Gemini
        try:
            return await _generate_with_gemini(GEMINI_PRIMARY, prompt, temperature, max_retries)
        except Exception as e:
            logger.warning(
                f"Gemini Primary model {GEMINI_PRIMARY} failed. Falling back to {GEMINI_BACKUP}. Error: {e}"
            )
            try:
                return await _generate_with_gemini(GEMINI_BACKUP, prompt, temperature, 2)
            except Exception as backup_e:
                logger.error(f"Both Gemini models failed. Backup error: {backup_e}")
                raise backup_e
