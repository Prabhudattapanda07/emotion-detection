# ============================================================
#  Serve GridFS files (images/audio) to the browser
# ============================================================

from bson import ObjectId
from bson.errors import InvalidId
from fastapi import APIRouter, HTTPException
from fastapi.responses import Response

from services.mongodb_service import get_fs

router = APIRouter()


@router.get("/files/{file_id}")
def serve_gridfs_file(file_id: str):
    try:
        oid = ObjectId(file_id)
    except InvalidId:
        raise HTTPException(status_code=404, detail="Invalid file id")

    fs = get_fs()
    try:
        grid_out = fs.get(oid)
    except Exception:
        raise HTTPException(status_code=404, detail="File not found")

    data = grid_out.read()
    ct = getattr(grid_out, "content_type", None) or "application/octet-stream"
    return Response(content=data, media_type=ct)
