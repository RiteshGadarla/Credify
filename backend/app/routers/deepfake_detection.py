from fastapi import APIRouter, HTTPException, UploadFile, File
from app.services.reality_defender_service import scan_media_for_deepfake
from app.utils.logger import logger

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
async def scan_media_for_deepfake_endpoint(file: UploadFile = File(...)):
    """
    Accepts a media file (image, video, audio) and runs it through
    Reality Defender's deepfake detection pipeline.

    Returns a DeepfakeDetectionResult with:
      - status: AUTHENTIC | FAKE | SUSPICIOUS | NOT_APPLICABLE | UNABLE_TO_EVALUATE
      - final_score: 0–100 ensemble confidence (higher = more authentic)
      - media_type: IMAGE | VIDEO | AUDIO
    """
    content_type = (file.content_type or "").lower()
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

    result = await scan_media_for_deepfake(file_bytes, file.filename or "upload")
    return result.model_dump()
