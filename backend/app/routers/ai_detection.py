from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.winston_service import detect_ai_text
from app.utils.logger import logger

router = APIRouter()


class AiDetectionRequest(BaseModel):
    text: str


@router.post("/scan")
async def scan_text_for_ai(req: AiDetectionRequest):
    """
    Standalone endpoint: run Winston AI text detection on an arbitrary input.
    Returns the WinstonDetectionResult as JSON.
    Does not require auth — detection is a public, stateless utility call.
    """
    try:
        logger.info(f"AI Detection scan requested for text of length {len(req.text)}")
        result = await detect_ai_text(req.text)
        return result.model_dump()
    except Exception as e:
        logger.error(f"AI Detection scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
