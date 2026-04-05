# ============================================================
#  MongoDB Atlas: metadata collections + GridFS for binaries
#  No local disk — files live in GridFS, documents in Atlas.
# ============================================================

import logging
import os
from datetime import datetime, timedelta, timezone
from typing import Any, Optional

from bson import ObjectId
from bson.errors import InvalidId
from gridfs import GridFS
from pymongo import ASCENDING, DESCENDING, MongoClient

logger = logging.getLogger("emotion-cloud.mongodb")

_client: Optional[MongoClient] = None
_db: Any = None
_fs: Optional[GridFS] = None


def init_mongodb() -> None:
    global _client, _db, _fs

    uri = os.getenv("MONGODB_URI", "").strip()
    if not uri:
        raise RuntimeError("MONGODB_URI is not set (MongoDB Atlas connection string).")

    db_name = os.getenv("MONGODB_DB_NAME", "emotion_system").strip()
    _client = MongoClient(uri)
    _db = _client[db_name]
    _fs = GridFS(_db, collection="emotion_files")

    _db.emotions.create_index([("deleted", ASCENDING), ("timestamp", DESCENDING)])
    _db.logs.create_index([("timestamp", DESCENDING)])

    _client.admin.command("ping")
    logger.info("MongoDB Atlas connected — DB=%s", db_name)


def get_db():
    if _db is None:
        raise RuntimeError("MongoDB not initialised. Call init_mongodb() first.")
    return _db


def get_fs() -> GridFS:
    if _fs is None:
        raise RuntimeError("MongoDB not initialised. Call init_mongodb() first.")
    return _fs


def _public_base_url() -> str:
    return os.getenv("API_PUBLIC_URL", "http://localhost:8000").rstrip("/")


def upload_file_to_storage(file_bytes: bytes, filename: str, content_type: str) -> str:
    fs = get_fs()
    ctype = content_type or "application/octet-stream"
    oid = fs.put(file_bytes, filename=filename or "upload", content_type=ctype)
    url = f"{_public_base_url()}/files/{oid}"
    logger.info("GridFS upload %s → %s", oid, url)
    return url


def _delete_storage_file(file_url: str) -> None:
    if not file_url or "/files/" not in file_url:
        return
    try:
        tail = file_url.rstrip("/").split("/files/")[-1]
        oid = ObjectId(tail)
        get_fs().delete(oid)
        logger.info("GridFS deleted %s", oid)
    except (InvalidId, Exception) as e:
        logger.warning("Could not delete GridFS object: %s", e)


def save_emotion_record(
    emotion: str,
    confidence: float,
    detection_type: str,
    file_url: str,
    combined_emotion: Optional[str] = None,
) -> str:
    db = get_db()
    oid = ObjectId()
    record_id = str(oid)
    # Ensure BSON-serializable floats (e.g., numpy.float32 -> float)
    safe_confidence = float(round(float(confidence), 4))
    record = {
        "_id": oid,
        "id": record_id,
        "emotion": emotion,
        "confidence": safe_confidence,
        "type": detection_type,
        "file_url": file_url,
        "combined_emotion": combined_emotion,
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "deleted": False,
    }
    db.emotions.insert_one(record)
    logger.info("Saved emotion record %s", record_id)
    _increment_usage_counter(detection_type)
    return record_id


def _serialize_emotion(doc: dict) -> dict:
    out = dict(doc)
    out.pop("_id", None)
    return out


def get_all_records(limit: int = 100) -> list[dict]:
    db = get_db()
    cur = (
        db.emotions.find({"deleted": False})
        .sort("timestamp", DESCENDING)
        .limit(limit)
    )
    return [_serialize_emotion(d) for d in cur]


def get_record_by_id(record_id: str) -> Optional[dict]:
    db = get_db()
    doc = None
    try:
        doc = db.emotions.find_one({"_id": ObjectId(record_id), "deleted": False})
    except InvalidId:
        pass
    if doc is None:
        doc = db.emotions.find_one({"id": record_id, "deleted": False})
    return _serialize_emotion(doc) if doc else None


def delete_record(record_id: str) -> bool:
    db = get_db()
    filt: dict
    try:
        filt = {"_id": ObjectId(record_id), "deleted": False}
    except InvalidId:
        filt = {"id": record_id, "deleted": False}

    doc = db.emotions.find_one(filt)
    if not doc:
        return False

    _delete_storage_file(doc.get("file_url", ""))
    db.emotions.update_one(
        {"_id": doc["_id"]},
        {
            "$set": {
                "deleted": True,
                "deleted_at": datetime.now(timezone.utc).isoformat(),
            }
        },
    )
    logger.info("Soft-deleted record %s", record_id)
    return True


def bulk_delete_older_than_days(days: int) -> int:
    db = get_db()
    cutoff = (datetime.now(timezone.utc) - timedelta(days=days)).isoformat()
    cur = db.emotions.find({"deleted": False, "timestamp": {"$lt": cutoff}})
    count = 0
    for doc in cur:
        _delete_storage_file(doc.get("file_url", ""))
        db.emotions.update_one(
            {"_id": doc["_id"]},
            {
                "$set": {
                    "deleted": True,
                    "deleted_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )
        count += 1
    logger.info("Auto-cleanup: soft-deleted %s records older than %s days", count, days)
    return count


def _increment_usage_counter(detection_type: str) -> None:
    db = get_db()
    inc: dict[str, int] = {"total_requests": 1}
    key = f"{detection_type}_requests"
    inc[key] = 1
    db.system_stats.update_one(
        {"_id": "usage"},
        {
            "$inc": inc,
            "$set": {"last_request": datetime.now(timezone.utc).isoformat()},
        },
        upsert=True,
    )


def get_usage_stats() -> dict:
    doc = get_db().system_stats.find_one({"_id": "usage"})
    if not doc:
        return {}
    out = dict(doc)
    out.pop("_id", None)
    return out


def get_auto_delete_setting() -> bool:
    doc = get_db().system_stats.find_one({"_id": "settings"})
    return bool(doc.get("auto_delete_enabled")) if doc else False


def set_auto_delete_setting(enabled: bool) -> None:
    get_db().system_stats.update_one(
        {"_id": "settings"},
        {"$set": {"auto_delete_enabled": enabled}},
        upsert=True,
    )
    logger.info("Auto-delete set to %s", enabled)


def save_log(level: str, message: str, meta: Optional[dict] = None) -> None:
    get_db().logs.insert_one(
        {
            "level": level,
            "message": message,
            "meta": meta or {},
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }
    )


def get_logs(limit: int = 50) -> list[dict]:
    cur = get_db().logs.find().sort("timestamp", DESCENDING).limit(limit)
    rows = []
    for d in cur:
        row = dict(d)
        row.pop("_id", None)
        rows.append(row)
    return rows
