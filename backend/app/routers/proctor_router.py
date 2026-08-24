import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status, Header
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.schemas import (
    LogEventRequest,
    LogEventResponse,
    ProctoringConfigResponse,
)
from app.config import MAX_VIOLATIONS, PROCTORING_ENABLED, ALLOW_PROCTORING_TOGGLE

router = APIRouter(prefix="/api", tags=["proctoring"])

DbSession = Annotated[Session, Depends(get_db)]

@router.get("/proctoring/config", response_model=ProctoringConfigResponse)
def get_proctoring_config():
    """Return current server proctoring configuration settings."""
    return ProctoringConfigResponse(
        proctoring_enabled=PROCTORING_ENABLED,
        allow_toggle=ALLOW_PROCTORING_TOGGLE,
    )

@router.post("/sessions/{session_id}/log-event", response_model=LogEventResponse)
def log_proctoring_event(session_id: uuid.UUID, body: LogEventRequest, db: DbSession, x_exam_token: str | None = Header(None, alias="X-Exam-Token")):
    """Log a proctoring event to the database. Suspends session at 3 violations."""
    session = crud.get_session(db, str(session_id))
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Session not found")
        
    if not x_exam_token or session.exam_token != x_exam_token:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Invalid or missing exam token.")
        
    log_entry, updated_session = crud.log_proctoring_event(
        db,
        session,
        event_type=body.event_type,
        severity=body.severity,
        snapshot=body.snapshot,
    )
    db.commit()

    messages = {
        1: f"Warning 1 of {MAX_VIOLATIONS}: This activity is not permitted. Please return to the exam.",
        2: f"Warning 2 of {MAX_VIOLATIONS}: This is not permitted. One more violation will suspend your exam.",
    }
    
    warning_message = "Violation recorded."
    if updated_session.status == "SUSPENDED":
        warning_message = "Your exam has been suspended due to repeated violations."
    elif not PROCTORING_ENABLED:
        warning_message = "Proctoring checks are disabled on the server."
    elif updated_session.violation_count in messages:
        warning_message = messages[updated_session.violation_count]
        
    return LogEventResponse(
        violation_count=updated_session.violation_count,
        max_violations=MAX_VIOLATIONS,
        session_status=updated_session.status,
        warning_message=warning_message,
    )
