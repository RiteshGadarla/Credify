from fastapi import APIRouter, HTTPException, UploadFile, File
from app.services.reality_defender_service import scan_media_for_deepfake
from app.utils.logger import logger
from app.routers.deps import get_current_user_optional
from fastapi import Depends
import aiofiles

router = APIRouter()

# Supported MIME types (Reality Defender accepts these)
SUPPORTED_MIME_TYPES = {
    "image/jpeg", "image/jpg", "image/png", "image/gif", "image/webp",
    "video/mp4", "video/quicktime",
    "audio/mpeg", "audio/mp3", "audio/wav", "audio/x-wav",
    "audio/mp4", "audio/aac", "audio/ogg", "audio/flac",
}

MAX_FILE_SIZE_BYTES = 250 * 1024 * 1024  # 250 MB ceiling (video limit)


@router.post("/scan")
async def scan_media_for_deepfake_endpoint(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_optional)
):
    """
    Accepts a media file (image, video, audio) and runs it through
    Reality Defender's deepfake detection pipeline.

    Returns a DeepfakeDetectionResult with:
      - status: AUTHENTIC | FAKE | SUSPICIOUS | NOT_APPLICABLE | UNABLE_TO_EVALUATE
      - final_score: 0–100 ensemble confidence (higher = more authentic)
      - media_type: IMAGE | VIDEO | AUDIO
    """
    content_type = (file.content_type or "").lower()
    input_type = content_type.split('/')[0] if '/' in content_type else "media"
    
    if content_type not in SUPPORTED_MIME_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported media type '{content_type}'. "
                "Supported: JPEG, PNG, GIF, WEBP images; MP4/MOV video; MP3/WAV/AAC/OGG/FLAC audio."
            ),
        )

    file_bytes = await file.read()

    if len(file_bytes) > MAX_FILE_SIZE_BYTES:
        raise HTTPException(
            status_code=413,
            detail=f"File too large. Maximum size is 250 MB for video, 50 MB for images, 20 MB for audio.",
        )

    logger.info(
        f"Deepfake Detection scan requested: '{file.filename}' "
        f"({content_type}, {len(file_bytes)} bytes)"
    )
    
    saved_filename = file.filename or "upload"
    
    if input_type == "image":
        import os
        import uuid
        upload_dir = os.path.join(os.path.dirname(__file__), "..", "uploads")
        os.makedirs(upload_dir, exist_ok=True)
        saved_filename = f"{uuid.uuid4()}_{file.filename}"
        file_path = os.path.join(upload_dir, saved_filename)
        
        async with aiofiles.open(file_path, 'wb') as out_file:
            await out_file.write(file_bytes)

    result = await scan_media_for_deepfake(file_bytes, file.filename or "upload")
    result_dict = result.model_dump()
    result_dict["saved_filename"] = saved_filename
    
    user_id = current_user.get("id") if current_user else None
    if user_id:
        from app.utils.mongo import get_database
        import datetime
        import uuid
        try:
            db = get_database()
            history_record = {
                "task_id": str(uuid.uuid4()),
                "user_id": user_id,
                "type": "deepfake",
                "input_type": input_type,
                "input_data": saved_filename,
                "deepfake_result": result_dict,
                "timestamp": datetime.datetime.now(datetime.timezone.utc).isoformat()
            }
            await db["history"].insert_one(history_record)
        except Exception as e:
            logger.error(f"Failed to insert deepfake history: {e}")

    return result_dict
