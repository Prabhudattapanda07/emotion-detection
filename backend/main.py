# ============================================================
#  Cloud-Based Emotion Detection System — FastAPI Backend
#  Cloud Role: Stateless API server deployed on Render/Railway
#  Every request is independent — enables horizontal scaling
# ============================================================

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from routes import face, voice, results, admin, files
from services.scheduler import start_scheduler, stop_scheduler
from services.mongodb_service import init_mongodb

# ── Logging (Cloud Principle: Centralised observability) ──
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)s | %(name)s | %(message)s",
)
logger = logging.getLogger("emotion-cloud")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle for cloud deployment."""
    logger.info("Connecting to MongoDB Atlas...")
    init_mongodb()
    logger.info("⏰ Starting background scheduler (auto-cleanup)...")
    start_scheduler()
    yield
    logger.info("🛑 Shutting down scheduler...")
    stop_scheduler()


app = FastAPI(
    title="Cloud-Based Emotion Detection API",
    description=(
        "Production-level emotion detection using facial expressions and voice. "
        "Deployed on cloud — stateless, scalable, always-on."
    ),
    version="2.0.0",
    lifespan=lifespan,
)

# ── CORS (Cloud Principle: Remote access from any origin) ──
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],          # Tighten to Vercel URL in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Route registration ──
app.include_router(files.router,   tags=["Files"])
app.include_router(face.router,    prefix="/detect-face",      tags=["Face Detection"])
app.include_router(voice.router,   prefix="/detect-voice",     tags=["Voice Detection"])
app.include_router(results.router, prefix="",                  tags=["Results & History"])
app.include_router(admin.router,   prefix="/admin",            tags=["Admin"])


@app.get("/", tags=["Health"])
async def root():
    """Health-check endpoint used by cloud platform monitors."""
    return {
        "status": "online",
        "service": "Cloud Emotion Detection API",
        "cloud_features": [
            "on-demand processing",
            "stateless REST API",
            "mongodb atlas + gridfs",
            "background auto-cleanup",
            "usage tracking",
        ],
    }


@app.get("/health", tags=["Health"])
async def health():
    return {"status": "healthy"}
