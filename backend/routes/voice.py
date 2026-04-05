# ============================================================
#  routes/voice.py
#  Cloud Role: On-demand audio/MFCC processing via REST API
# ============================================================

import logging
from fastapi import APIRouter, File, UploadFile, HTTPException

from services import mongodb_service as fb
from utils.voice_utils import detect_emotion_from_audio

logger = logging.getLogger("emotion-cloud.voice")
router = APIRouter()


@router.post("/")
async def detect_voice_emotion(file: UploadFile = File(...)):
    """
    POST /detect-voice
    ──────────────────
    Accepts: audio/wav, audio/mpeg, audio/webm
    Returns: emotion label, confidence, mfcc_summary, file_url, record_id

    Cloud Principle (Reduced Hardware Dependency):
      Librosa MFCC extraction runs on cloud server — user's device
      only records and uploads a small WAV file. Heavy DSP computation
      is offloaded to the cloud backend.
    """
    allowed = {"audio/wav", "audio/wave", "audio/mpeg", "audio/webm", "audio/ogg"}
    if file.content_type not in allowed:
        # Be permissive — browsers label webm differently
        if not file.content_type.startswith("audio/"):
            raise HTTPException(status_code=400, detail="Only audio files are accepted.")

    file_bytes = await file.read()
    if len(file_bytes) < 1000:
        raise HTTPException(status_code=422, detail="Audio file is too short or empty.")
    if len(file_bytes) > 25 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Audio too large (max 25 MB).")

    logger.info(f"🎙️ Voice detection request: {file.filename} ({len(file_bytes)} bytes)")

    try:
        result = detect_emotion_from_audio(file_bytes)
    except ValueError as e:
        fb.save_log("WARNING", str(e), {"filename": file.filename})
        raise HTTPException(status_code=422, detail=str(e))

    # ── Upload to GridFS ──
    file_url = fb.upload_file_to_storage(
        file_bytes, file.filename or "recording.wav", file.content_type or "audio/wav"
    )

    record_id = fb.save_emotion_record(
        emotion=result["emotion"],
        confidence=result["confidence"],
        detection_type="voice",
        file_url=file_url,
    )

    fb.save_log("INFO", "Voice emotion detected", {
        "record_id": record_id,
        "emotion": result["emotion"],
    })

    return {
        "record_id": record_id,
        "emotion": result["emotion"],
        "confidence": result["confidence"],
        "all_scores": result["all_scores"],
        "mfcc_summary": result.get("mfcc_summary"),
        "file_url": file_url,
        "type": "voice",
    }
