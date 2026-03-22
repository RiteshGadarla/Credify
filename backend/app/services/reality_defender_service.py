"""
Reality Defender Deepfake Detection Service
============================================
Wraps the Reality Defender REST API for deepfake media detection.

Three-step flow:
  1. POST /api/files/aws-presigned  → presigned S3 URL + requestId
  2. PUT  <presignedUrl>            → upload raw file bytes
  3. GET  /api/media/users/{requestId} (poll) → detection result

Auth: X-API-KEY header (REALITY_DEFENDER_API_KEY in .env)

Non-blocking gate: if the key is missing or any error occurs, returns
a skipped result so the application is never blocked.
"""

import asyncio
import httpx
from app.core.config import settings
from app.models.deepfake_detection import DeepfakeDetectionResult
from app.utils.logger import logger

RD_BASE = "https://api.prd.realitydefender.xyz"
RD_PRESIGN_URL = f"{RD_BASE}/api/files/aws-presigned"
RD_MEDIA_URL = f"{RD_BASE}/api/media/users"

POLL_INTERVAL = 3      # seconds between polls
MAX_POLLS = 15         # up to ~45 seconds total
TERMINAL_STATUSES = {"AUTHENTIC", "FAKE", "SUSPICIOUS", "NOT_APPLICABLE", "UNABLE_TO_EVALUATE"}


def _rd_headers() -> dict:
    return {
        "X-API-KEY": settings.REALITY_DEFENDER_API_KEY,
        "Content-Type": "application/json",
    }


async def scan_media_for_deepfake(file_bytes: bytes, filename: str) -> DeepfakeDetectionResult:
    """
    Sends a media file to Reality Defender and returns a structured detection result.
    Always returns a DeepfakeDetectionResult — never raises.

    Args:
        file_bytes: Raw bytes of the uploaded file.
        filename:   Original filename (used to determine media type on the platform).

    Returns:
        DeepfakeDetectionResult with verdict, score, and metadata.
    """
    # --- Guard: API key not configured ---
    if not settings.REALITY_DEFENDER_API_KEY:
        logger.warning("Reality Defender: REALITY_DEFENDER_API_KEY not set. Skipping deepfake detection.")
        return DeepfakeDetectionResult(
            skipped=True,
            skip_reason="REALITY_DEFENDER_API_KEY not configured",
            original_filename=filename,
        )

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            # ── Step 1: Request a presigned upload URL ──────────────────────
            logger.info(f"Reality Defender: Requesting presigned URL for '{filename}'...")
            presign_resp = await client.post(
                RD_PRESIGN_URL,
                json={"fileName": filename},
                headers=_rd_headers(),
            )
            presign_resp.raise_for_status()
            presign_data = presign_resp.json()

            # Actual API shape: { "code": "ok", "response": { "signedUrl": "..." },
            #                     "requestId": "...", "mediaId": "..." }
            inner = presign_data.get("response") or {}
            presigned_url = (
                inner.get("signedUrl")
                or inner.get("presignedUrl")
                or presign_data.get("presignedUrl")
                or presign_data.get("url")
            )
            request_id = (
                presign_data.get("requestId")
                or presign_data.get("mediaId")
                or presign_data.get("request_id", "")
            )

            if not presigned_url or not request_id:
                logger.error(f"Reality Defender: Unexpected presign response: {presign_data}")
                return DeepfakeDetectionResult(
                    skipped=True,
                    skip_reason="Invalid presign response from Reality Defender",
                    original_filename=filename,
                )

            # ── Step 2: Upload file bytes to presigned URL ──────────────────
            logger.info(f"Reality Defender: Uploading file to presigned URL (requestId={request_id})...")
            upload_resp = await client.put(
                presigned_url,
                content=file_bytes,
                headers={"Content-Type": "application/octet-stream"},
            )
            upload_resp.raise_for_status()

            # ── Step 3: Poll for results ─────────────────────────────────────
            logger.info(f"Reality Defender: Polling for results (requestId={request_id})...")
            for attempt in range(MAX_POLLS):
                await asyncio.sleep(POLL_INTERVAL)
                result_resp = await client.get(
                    f"{RD_MEDIA_URL}/{request_id}",
                    headers=_rd_headers(),
                )
                result_resp.raise_for_status()
                data = result_resp.json()

                results_summary = data.get("resultsSummary") or {}
                status = results_summary.get("status", "")
                metadata = results_summary.get("metadata") or {}
                final_score = float(metadata.get("finalScore", 0) or 0)
                logger.info(f"Reality Defender RAW finalScore: {final_score}, status: {status}")

                if status in TERMINAL_STATUSES:
                    is_fake = status == "FAKE"
                    media_type = data.get("mediaType", "UNKNOWN")
                    original_filename = data.get("originalFileName", filename)

                    logger.info(
                        f"Reality Defender: Detection complete — "
                        f"status={status}, score={final_score:.1f}, mediaType={media_type}"
                    )
                    return DeepfakeDetectionResult(
                        request_id=request_id,
                        original_filename=original_filename,
                        media_type=media_type,
                        status=status,
                        final_score=100-final_score,
                        is_fake=is_fake,
                        skipped=False,
                    )

                logger.info(
                    f"Reality Defender: Attempt {attempt + 1}/{MAX_POLLS} — "
                    f"status='{status}' (not terminal yet)..."
                )

            # Timed out
            logger.warning(f"Reality Defender: Polling timed out for requestId={request_id}")
            return DeepfakeDetectionResult(
                request_id=request_id,
                original_filename=filename,
                skipped=True,
                skip_reason="Detection timed out waiting for results",
            )

    except httpx.HTTPStatusError as e:
        logger.error(f"Reality Defender: HTTP error {e.response.status_code} — {e.response.text}")
        return DeepfakeDetectionResult(
            skipped=True,
            skip_reason=f"Reality Defender API returned HTTP {e.response.status_code}",
            original_filename=filename,
        )
    except Exception as e:
        logger.error(f"Reality Defender: Unexpected error — {e}")
        return DeepfakeDetectionResult(
            skipped=True,
            skip_reason=f"Detection failed: {str(e)}",
            original_filename=filename,
        )
