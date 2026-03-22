from pydantic import BaseModel
from typing import Optional


class DeepfakeDetectionResult(BaseModel):
    """
    Structured result from the Reality Defender deepfake detection API.
    `final_score` ranges 0–100: higher means MORE authentic (less likely synthetic).
    `status` is the platform verdict: AUTHENTIC, FAKE, SUSPICIOUS,
             NOT_APPLICABLE, or UNABLE_TO_EVALUATE.
    When `skipped` is True the API was never called (key missing, unsupported
    file type, or a network/service error).
    """
    request_id: str = ""
    original_filename: str = ""
    media_type: str = "UNKNOWN"          # IMAGE | VIDEO | AUDIO | TEXT
    status: str = "UNABLE_TO_EVALUATE"   # AUTHENTIC | FAKE | SUSPICIOUS | etc.
    final_score: float = 0.0             # 0–100; higher = more authentic
    is_fake: bool = False                # True when status == FAKE
    skipped: bool = False
    skip_reason: Optional[str] = None
