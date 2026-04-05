# ============================================================
#  routes/face.py
#  Cloud Role: On-demand image processing via REST API
#  No session state — each request is fully independent
# ============================================================

import io
import logging
import numpy as np
from fastapi import APIRouter, File, UploadFile, HTTPException

from services import mongodb_service as fb
from utils.face_utils import detect_emotion_from_image

logger = logging.getLogger("emotion-cloud.face")
router = APIRouter()


@router.post("/")
async def detect_face_emotion(file: UploadFile = File(...)):
    """
    POST /detect-face
    ─────────────────
    Accepts: image/jpeg, image/png
    Returns: emotion label, confidence, file_url, record_id

    Cloud Principle (On-Demand Computing):
      Request hits cloud server → spins up processing → returns result.
      No persistent session required. Multiple users hit this endpoint
      simultaneously — cloud platform scales workers automatically.
    """
    # ── Validate content type ──
    if not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image files are accepted.")

    file_bytes = await file.read()
    if len(file_bytes) > 10 * 1024 * 1024:  # 10 MB guard
        raise HTTPException(status_code=413, detail="Image too large (max 10 MB).")

    logger.info(f"📸 Face detection request: {file.filename} ({len(file_bytes)} bytes)")

    # ── Run emotion model ──
    try:
        result = detect_emotion_from_image(file_bytes)
    except ValueError as e:
        fb.save_log("WARNING", str(e), {"filename": file.filename})
        raise HTTPException(status_code=422, detail=str(e))

    # ── Upload to GridFS on MongoDB Atlas ──
    file_url = fb.upload_file_to_storage(
        file_bytes, file.filename or "capture.jpg", file.content_type
    )

    # ── Persist metadata ──
    record_id = fb.save_emotion_record(
        emotion=result["emotion"],
        confidence=result["confidence"],
        detection_type="face",
        file_url=file_url,
    )

    fb.save_log("INFO", "Face emotion detected", {
        "record_id": record_id,
        "emotion": result["emotion"],
    })

    return {
        "record_id": record_id,
        "emotion": result["emotion"],
        "confidence": result["confidence"],
        "all_scores": result["all_scores"],
        "file_url": file_url,
        "type": "face",
    }
