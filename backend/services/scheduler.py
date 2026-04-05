# ============================================================
#  services/scheduler.py
#  Cloud Principle: Background tasks running on cloud server
#  No cron job on user machine — server handles it 24/7
# ============================================================

import logging
import threading
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger("emotion-cloud.scheduler")

_scheduler: BackgroundScheduler = None


def _run_cleanup():
    """
    Scheduled job: runs every day at 02:00 UTC on the cloud server.
    Checks the MongoDB setting before deleting anything.
    Cloud Principle: Background computation runs server-side — zero
    client involvement. User devices can be offline.
    """
    try:
        from services.mongodb_service import (
            get_auto_delete_setting,
            bulk_delete_older_than_days,
            save_log,
        )
        if get_auto_delete_setting():
            count = bulk_delete_older_than_days(days=7)
            save_log("INFO", f"[Scheduler] Auto-cleanup ran — {count} records deleted", {})
            logger.info(f"⏰ Scheduled cleanup: {count} records removed")
        else:
            logger.info("⏰ Scheduler ran — auto-delete is disabled, skipping.")
    except Exception as e:
        logger.error(f"Scheduler error: {e}")


def trigger_cleanup_now() -> int:
    """Manually invoke the cleanup job (admin endpoint)."""
    from services.mongodb_service import (
        bulk_delete_older_than_days,
        save_log,
    )
    count = bulk_delete_older_than_days(days=7)
    save_log("INFO", f"[Admin] Manual cleanup — {count} records deleted", {})
    return count


def start_scheduler():
    global _scheduler
    _scheduler = BackgroundScheduler(timezone="UTC")
    # Run daily at 02:00 UTC
    _scheduler.add_job(_run_cleanup, "cron", hour=2, minute=0, id="auto_cleanup")
    _scheduler.start()
    logger.info("✅ Background scheduler started (daily at 02:00 UTC)")


def stop_scheduler():
    global _scheduler
    if _scheduler and _scheduler.running:
        _scheduler.shutdown(wait=False)
        logger.info("🛑 Scheduler stopped")
