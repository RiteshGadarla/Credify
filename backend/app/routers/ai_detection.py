from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from app.services.winston_service import detect_ai_text
from app.utils.logger import logger
from app.routers.deps import get_current_user_optional
from fastapi import Depends

router = APIRouter()


class AiDetectionRequest(BaseModel):
    text: str


@router.post("/scan")
async def scan_text_for_ai(req: AiDetectionRequest, current_user: dict = Depends(get_current_user_optional)):
    """
    Standalone endpoint: run Winston AI text detection on an arbitrary input.
    Returns the WinstonDetectionResult as JSON.
    Does not require auth — detection is a public, stateless utility call.
    """
    try:
        logger.info(f"AI Detection scan requested for text of length {len(req.text)}")
        result = await detect_ai_text(req.text)
        
        user_id = current_user.get("id") if current_user else None
        if user_id:
            from app.utils.mongo import get_database
            import datetime
            import uuid
            db = get_database()
            history_record = {
                "task_id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": "ai_detection",
                "input_type": "text",
                "input_data": req.text,
                "ai_result": result.model_dump(),
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            await db["history"].insert_one(history_record)

        return result.model_dump()
    except Exception as e:
        logger.error(f"AI Detection scan failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))
