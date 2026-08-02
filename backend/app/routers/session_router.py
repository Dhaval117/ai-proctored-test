"""
session_router.py — Real DB-backed session endpoints.

Story 1.3: Replaces the mock session routes with full database persistence.
Implements:
  - POST /api/sessions/create
  - POST /api/sessions/{session_id}/verify
  - GET  /api/sessions/{session_id}

All other routes (exam, proctoring, admin) remain in mock_router.py
until their respective stories are implemented.
"""
from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.schemas import (
    CreateSessionRequest,
    CreateSessionResponse,
    ExamStatus,
    SessionDetail,
    VerifySessionRequest,
    VerifySessionResponse,
)

router = APIRouter(prefix="/api/sessions", tags=["sessions"])

# Reusable dependency alias for cleaner signatures
DbSession = Annotated[Session, Depends(get_db)]


# ─────────────────────────────────────────────
# Helper
# ─────────────────────────────────────────────

def _get_session_or_404(db: Session, session_id: uuid.UUID):
    """Fetch an ExamSession by ID, raising 404 if not found."""
    session = crud.get_session(db, str(session_id))
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": f"Session {session_id} not found."},
        )
    return session


def _orm_to_session_detail(session, candidate) -> SessionDetail:
    """Map ORM ExamSession + Candidate to the SessionDetail response schema."""
    return SessionDetail(
        session_id=uuid.UUID(session.id),
        candidate_id=uuid.UUID(session.candidate_id),
        candidate_name=candidate.name,
        language=session.language,
        experience_years=session.experience_years,
        status=ExamStatus(session.status),
        violation_count=session.violation_count,
        risk_score=session.risk_score,
        created_at=session.created_at,
        completed_at=session.completed_at,
    )


# ─────────────────────────────────────────────
# Removed Candidate Self-Registration (/create)
# Registration is now admin-only via admin_router.py
# ─────────────────────────────────────────────


# ─────────────────────────────────────────────
# POST /api/sessions/{session_id}/verify
# ─────────────────────────────────────────────

@router.post(
    "/{session_id}/verify",
    response_model=VerifySessionResponse,
    summary="Upload reference photo and activate session",
)
def verify_session(session_id: uuid.UUID, body: VerifySessionRequest, db: DbSession):
    """
    Save the candidate's reference portrait and transition the session
    from SETUP to ACTIVE status.

    - Returns 404 if the session does not exist.
    - Returns 409 if the session is not in SETUP status.
    """
    session = _get_session_or_404(db, session_id)

    try:
        session = crud.activate_session(db, session, reference_photo=body.reference_photo)
    except ValueError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail={"error": "INVALID_STATUS", "message": str(exc)},
        )

    db.commit()
    db.refresh(session)

    return VerifySessionResponse(
        session_id=uuid.UUID(session.id),
        status=ExamStatus(session.status),
        message="Identity verified. Exam is ready to begin.",
    )


# ─────────────────────────────────────────────
# GET /api/sessions/{session_id}
# ─────────────────────────────────────────────

@router.get(
    "/{session_id}",
    response_model=SessionDetail,
    summary="Get current session status",
)
def get_session(session_id: uuid.UUID, db: DbSession):
    """
    Fetch the current state of an exam session including
    violation count, risk score, and status.

    - Returns 404 if the session does not exist.
    """
    session = _get_session_or_404(db, session_id)
    return _orm_to_session_detail(session, session.candidate)
