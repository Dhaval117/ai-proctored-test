"""
FastAPI application entrypoint for the AI Proctored Verbal Examination System.

Story 1.1: API contract established (mock routers).
Story 1.3: Session routes replaced with real DB-backed implementation.
           Remaining routes (exam, proctoring, admin) still use mock router.
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.routers import mock_router, session_router, exam_router, admin_router

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

# ── Remaining mock routes ────────────────
app.include_router(mock_router.router)
app.include_router(exam_router.router)


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
