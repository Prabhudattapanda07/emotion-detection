# ============================================================
#  routes/admin.py
#  Cloud Role: Remote admin operations via API
#  No SSH, no server access — pure cloud API management
#  Set ADMIN_PASSWORD (+ optional ADMIN_JWT_SECRET) to require JWT on all routes except /login.
# ============================================================

import logging
import os

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from services import mongodb_service as fb
from services.scheduler import trigger_cleanup_now
from utils.admin_auth import admin_auth_enabled, create_admin_token, require_admin

logger = logging.getLogger("emotion-cloud.admin")
router = APIRouter()


class AutoDeleteToggle(BaseModel):
    enabled: bool


class BulkDeleteRequest(BaseModel):
    older_than_days: int = 7


class AdminLoginBody(BaseModel):
    password: str


@router.post("/login")
async def admin_login(body: AdminLoginBody):
    """
    POST /admin/login
    Exchange ADMIN_PASSWORD for a short-lived JWT. Public endpoint.
    """
    expected = os.getenv("ADMIN_PASSWORD", "").strip()
    if not expected:
        raise HTTPException(
            status_code=503,
            detail="Admin authentication is not configured on the server (ADMIN_PASSWORD empty).",
        )
    if body.password != expected:
        raise HTTPException(status_code=401, detail="Invalid credentials")
    token = create_admin_token()
    return {"access_token": token, "token_type": "bearer"}


@router.get("/auth-status")
async def admin_auth_status():
    """Whether the API expects a Bearer token for protected admin routes."""
    return {"auth_required": admin_auth_enabled()}


@router.get("/usage-stats")
async def admin_usage_stats(_: None = Depends(require_admin)):
    """Same counters as GET /usage-stats but behind admin auth when enabled."""
    stats = fb.get_usage_stats()
    return {"stats": stats}


@router.post("/toggle-auto-delete")
async def toggle_auto_delete(body: AutoDeleteToggle, _: None = Depends(require_admin)):
    """
    POST /admin/toggle-auto-delete
    ────────────────────────────────
    Enable/disable the background cloud cleanup job.
    Cloud Principle (Background Tasks):
      The scheduler runs inside the cloud process 24/7.
      Admin can remotely toggle it — no local server access needed.
    """
    fb.set_auto_delete_setting(body.enabled)
    fb.save_log("INFO", f"Auto-delete toggled to {body.enabled}", {})
    return {
        "auto_delete_enabled": body.enabled,
        "message": f"Auto-cleanup {'enabled' if body.enabled else 'disabled'}.",
    }


@router.get("/auto-delete-status")
async def auto_delete_status():
    enabled = fb.get_auto_delete_setting()
    return {"auto_delete_enabled": enabled}


@router.post("/bulk-delete")
async def bulk_delete(body: BulkDeleteRequest, _: None = Depends(require_admin)):
    """
    POST /admin/bulk-delete
    Delete all records older than N days (MongoDB + GridFS).
    """
    if body.older_than_days < 1:
        raise HTTPException(status_code=400, detail="Days must be >= 1")
    count = fb.bulk_delete_older_than_days(body.older_than_days)
    fb.save_log("INFO", f"Bulk delete: {count} records removed", {
        "older_than_days": body.older_than_days
    })
    return {"deleted_count": count, "older_than_days": body.older_than_days}


@router.post("/trigger-cleanup")
async def trigger_cleanup(_: None = Depends(require_admin)):
    """Manually trigger the auto-cleanup job (for testing)."""
    count = trigger_cleanup_now()
    return {"status": "cleanup_triggered", "deleted_count": count}


@router.get("/logs")
async def get_logs(limit: int = 50, _: None = Depends(require_admin)):
    """
    GET /admin/logs
    Cloud Principle (Centralised Logging):
      API events persisted in MongoDB.
    """
    logs = fb.get_logs(limit=limit)
    return {"count": len(logs), "logs": logs}
