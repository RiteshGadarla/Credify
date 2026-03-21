"""
Winston AI Text Detection Service
===================================
Wraps the Winston AI v2 AI content detection endpoint.

API: POST https://api.gowinston.ai/v2/ai-content-detection
Auth: Bearer token (WINSTON_API_KEY in .env)

The service is designed as a *non-blocking gate*:
  - If the API key is missing, text is too short, or a network error
    occurs, it returns a skipped result so the fact-checking pipeline
    is never blocked.
"""

import httpx
from app.core.config import settings
from app.models.ai_detection import WinstonDetectionResult, AttackDetected
from app.utils.logger import logger

WINSTON_ENDPOINT = "https://api.gowinston.ai/v2/ai-content-detection"
MIN_TEXT_LENGTH = 300  # Winston requires at least 300 characters


async def detect_ai_text(text: str) -> WinstonDetectionResult:
    """
    Calls the Winston AI text detection API and returns a structured result.
    Always returns a WinstonDetectionResult — never raises.

    Args:
        text: The input text to scan.

    Returns:
        WinstonDetectionResult with detection details, or skipped=True on error.
    """
    # --- Guard: API key not configured ---
    if not settings.WINSTON_API_KEY:
        logger.warning("Winston AI: WINSTON_API_KEY not set. Skipping AI text detection.")
        return WinstonDetectionResult(
            skipped=True,
            skip_reason="WINSTON_API_KEY not configured"
        )

    # --- Guard: text too short for reliable detection ---
    if len(text) < MIN_TEXT_LENGTH:
        logger.info(
            f"Winston AI: Text too short ({len(text)} chars < {MIN_TEXT_LENGTH}). "
            "Skipping detection."
        )
        return WinstonDetectionResult(
            skipped=True,
            skip_reason=f"Text too short ({len(text)} chars). Minimum is {MIN_TEXT_LENGTH}."
        )

    payload = {
        "text": text,
        "version": "latest",
        "sentences": False,   # We don't need per-sentence breakdown
        "language": "auto",
    }
    headers = {
        "Authorization": f"Bearer {settings.WINSTON_API_KEY}",
        "Content-Type": "application/json",
    }

    try:
        async with httpx.AsyncClient(timeout=20.0) as client:
            logger.info(f"Winston AI: Scanning text of length {len(text)}...")
            response = await client.post(WINSTON_ENDPOINT, json=payload, headers=headers)
            response.raise_for_status()
            data = response.json()

        human_score = float(data.get("score", 100))
        ai_score = round(100.0 - human_score, 2)
        is_ai_generated = human_score < 50.0

        raw_attack = data.get("attack_detected", {}) or {}
        attack = AttackDetected(
            zero_width_space=bool(raw_attack.get("zero_width_space", False)),
            homoglyph_attack=bool(raw_attack.get("homoglyph_attack", False)),
        )

        result = WinstonDetectionResult(
            human_score=round(human_score, 2),
            ai_score=ai_score,
            is_ai_generated=is_ai_generated,
            language=data.get("language", "unknown"),
            version=data.get("version", ""),
            readability_score=float(data.get("readability_score", 0)),
            attack_detected=attack,
            credits_used=int(data.get("credits_used", 0)),
            credits_remaining=int(data.get("credits_remaining", 0)),
            skipped=False,
        )

        logger.info(
            f"Winston AI: Detection complete. "
            f"Human score={human_score:.1f}, AI score={ai_score:.1f}, "
            f"is_ai_generated={is_ai_generated}"
        )
        return result

    except httpx.HTTPStatusError as e:
        logger.error(f"Winston AI: HTTP error {e.response.status_code} — {e.response.text}")
        return WinstonDetectionResult(
            skipped=True,
            skip_reason=f"Winston API returned HTTP {e.response.status_code}"
        )
    except Exception as e:
        logger.error(f"Winston AI: Unexpected error — {e}")
        return WinstonDetectionResult(
            skipped=True,
            skip_reason=f"Detection failed: {str(e)}"
        )
