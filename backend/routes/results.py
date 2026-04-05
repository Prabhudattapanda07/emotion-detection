# ============================================================
#  routes/results.py
#  Cloud Role: History / combine / usage via MongoDB Atlas
# ============================================================

import logging
from typing import Optional
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from services import mongodb_service as fb
from utils.emotion_combiner import combine_emotions

logger = logging.getLogger("emotion-cloud.results")
router = APIRouter()


# ── Schemas ────────────────────────────────────────────────

class SaveResultRequest(BaseModel):
    emotion: str
    confidence: float
    detection_type: str          # "face" | "voice" | "combined"
    file_url: str
    combined_emotion: Optional[str] = None


class CombineRequest(BaseModel):
    face_emotion: str
    face_confidence: float
    voice_emotion: str
    voice_confidence: float


# ── Endpoints ──────────────────────────────────────────────

@router.post("/save-result")
async def save_result(body: SaveResultRequest):
    """
    POST /save-result
    Cloud Principle (Cloud Storage + DB):
      Stores metadata in MongoDB; file already in GridFS.
      No data touches local disk.
    """
    record_id = fb.save_emotion_record(
        emotion=body.emotion,
        confidence=body.confidence,
        detection_type=body.detection_type,
        file_url=body.file_url,
        combined_emotion=body.combined_emotion,
    )
    return {"record_id": record_id, "status": "saved"}


@router.get("/get-history")
async def get_history(limit: int = 50):
    """
    GET /get-history
    Cloud Principle (Real-time DB):
      Returns live data from MongoDB Atlas.
    """
    records = fb.get_all_records(limit=limit)
    return {"count": len(records), "records": records}


@router.delete("/delete/{record_id}")
async def delete_record(record_id: str):
    """
    DELETE /delete/{id}
    Soft-deletes document and removes GridFS blob.
    """
    success = fb.delete_record(record_id)
    if not success:
        raise HTTPException(status_code=404, detail="Record not found.")
    return {"status": "deleted", "record_id": record_id}


@router.post("/combine-emotions")
async def combine_emotions_endpoint(body: CombineRequest):
    """
    POST /combine-emotions
    Weighted fusion of face + voice predictions.
    Returns a single dominant emotion with confidence.
    """
    result = combine_emotions(
        face_emotion=body.face_emotion,
        face_confidence=body.face_confidence,
        voice_emotion=body.voice_emotion,
        voice_confidence=body.voice_confidence,
    )
    return result


@router.get("/usage-stats")
async def usage_stats():
    """
    GET /usage-stats
    Cloud Principle (Usage Tracking):
      Returns usage counters from MongoDB.
    """
    stats = fb.get_usage_stats()
    return {"stats": stats}
