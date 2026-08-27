"""
FastAPI application entrypoint for the AI Proctored Verbal Examination System.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import proctor_router, session_router, exam_router, admin_router, speech_router

from contextlib import asynccontextmanager
import asyncio
import logging

logger = logging.getLogger(__name__)

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Preload the Whisper and VAD models in a background thread on server startup
    # so they are instantly ready when the user clicks 'Start Recording'.
    from app.config import SPEECH_TO_TEXT_PROVIDER
    if SPEECH_TO_TEXT_PROVIDER == "local":
        from app.speech_service import get_speech_service
        logger.info("Pre-loading speech models in background...")
        asyncio.create_task(asyncio.to_thread(get_speech_service))
    else:
        logger.info("Using Gemini Live API for speech transcription. Local models will not be loaded.")
    yield

app = FastAPI(
    title="AI Proctored Verbal Examination API",
    description=(
        "REST API for the AI Proctored Verbal Examination System. "
        "Manages candidate sessions, proctoring telemetry, conversational AI exam flow, "
        "and admin reporting."
    ),
    version="1.0.0",
    docs_url="/docs",         # Swagger UI
    redoc_url="/redoc",       # ReDoc
    openapi_url="/openapi.json",
    lifespan=lifespan,
)

# Allow local frontend dev server
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Real DB-backed routers ──────────────────────────────────
app.include_router(session_router.router)
app.include_router(admin_router.router)
app.include_router(proctor_router.router)
app.include_router(exam_router.router)
app.include_router(speech_router.router)

@app.get("/health", tags=["meta"])
def health_check():
    """Health check endpoint."""
    return {"status": "ok", "version": "1.0.0"}


@app.get("/api/ping", tags=["meta"])
def ping():
    """
    Minimal latency-probe endpoint.
    Returns an empty object as quickly as possible for browser-side RTT measurement.
    No DB access, no auth — purely for network timing.
    """
    return {}
