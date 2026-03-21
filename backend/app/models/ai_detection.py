from pydantic import BaseModel
from typing import Optional, Dict


class AttackDetected(BaseModel):
    zero_width_space: bool = False
    homoglyph_attack: bool = False


class WinstonDetectionResult(BaseModel):
    """
    Structured result from the Winston AI text detection API.
    `human_score` ranges 0–100: higher means more likely human-written.
    `ai_score` is the inverse (100 - human_score).
    `is_ai_generated` is True when human_score < 50.
    When `skipped` is True, the API was not called (e.g. text too short or key missing).
    """
    human_score: float = 100.0           # 0–100; higher = more human
    ai_score: float = 0.0                # Derived: 100 - human_score
    is_ai_generated: bool = False        # True if human_score < 50
    language: str = "unknown"
    version: str = ""
    readability_score: float = 0.0
    attack_detected: AttackDetected = AttackDetected()
    credits_used: int = 0
    credits_remaining: int = 0
    skipped: bool = False                # True if detection was skipped
    skip_reason: Optional[str] = None    # Reason for skipping, if any
