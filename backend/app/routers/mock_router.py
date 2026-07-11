"""
Mock routers for Story 1.1.
Handles: exam flow, proctoring telemetry, admin reporting (still mocked).
Session routes (create / verify / get) moved to session_router.py in Story 1.3.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Query, Request

from app.schemas import (
    AdminSessionDetailResponse,
    AdminSessionListResponse,
    AdminSessionSummary,
    ExamStatus,
    LogEventRequest,
    LogEventResponse,
    NextAction,
    ProctoringLogEntry,
    QAEntry,
    QuestionResponse,
    SessionDetail,
    SeverityLevel,
    SubmitAnswerRequest,
    SubmitAnswerResponse,
    ViolationType,
)
from app import mock_data

router = APIRouter()

NOW = datetime.now(timezone.utc)




# ─────────────────────────────────────────────
# PROCTORING ROUTES
# ─────────────────────────────────────────────

# Violation counter lives in app.state so TestClient instances are isolated per test.

@router.post("/api/sessions/{session_id}/log-event", response_model=LogEventResponse, tags=["proctoring"])
def log_proctoring_event(session_id: uuid.UUID, body: LogEventRequest, request: Request):
    """Log a proctoring event. Increments violation count. Suspends session at 3 violations."""
    # Initialise violation store on first use
    if not hasattr(request.app.state, "mock_violations"):
        request.app.state.mock_violations = {}

    sid = str(session_id)
    if sid not in request.app.state.mock_violations:
        request.app.state.mock_violations[sid] = 0

    # Only count MEDIUM/HIGH severity violations toward the 3-warning policy.
    # LOW severity events (background noise, brief noise spikes) are logged but don't suspend.
    if body.severity in (SeverityLevel.MEDIUM, SeverityLevel.HIGH):
        request.app.state.mock_violations[sid] += 1

    count = request.app.state.mock_violations[sid]
    max_v = 3

    if count >= max_v:
        return LogEventResponse(
            violation_count=count,
            max_violations=max_v,
            session_status=ExamStatus.SUSPENDED,
            warning_message="Your exam has been suspended due to repeated violations.",
        )

    messages = {
        1: "Warning 1 of 3: This activity is not permitted. Please return to the exam.",
        2: "Warning 2 of 3: This is not permitted. One more violation will suspend your exam.",
    }
    return LogEventResponse(
        violation_count=count,
        max_violations=max_v,
        session_status=ExamStatus.ACTIVE,
        warning_message=messages.get(count, "Violation recorded."),
    )


# Admin routes moved to admin_router.py (real DB-backed implementation)
