"""
admin_router.py — Real DB-backed admin endpoints.

Story 5.1: Admin Sessions List (view candidates list and risk summaries)
Story 5.2: Admin Exam Report Page (drill down into candidate transcripts and flag history)
"""
from __future__ import annotations

import uuid
from typing import Annotated, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app import crud
from app.database import get_db
from app.models import ExamSession, Candidate
from app.schemas import (
    AdminSessionDetailResponse,
    AdminSessionListResponse,
    AdminSessionSummary,
    ExamStatus,
    ProctoringLogEntry,
    QAEntry,
    SessionDetail,
    SeverityLevel,
    ViolationType,
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

DbSession = Annotated[Session, Depends(get_db)]


@router.get("/sessions", response_model=AdminSessionListResponse)
def list_admin_sessions(
    db: DbSession,
    status_filter: Optional[ExamStatus] = Query(None, alias="status"),
    language: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Search candidate name or email"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
):
    """
    Story 5.1: Return paginated list of candidate exam sessions with risk summaries.
    Supports filtering by status, language, and name/email search.
    """
    stmt = select(ExamSession).join(Candidate)

    if status_filter:
        stmt = stmt.where(ExamSession.status == status_filter.value)
    if language:
        stmt = stmt.where(ExamSession.language.ilike(f"%{language}%"))
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            (Candidate.name.ilike(search_pattern)) | (Candidate.email.ilike(search_pattern))
        )

    stmt = stmt.order_by(ExamSession.created_at.desc())

    # Count total
    all_matching = db.scalars(stmt).all()
    total = len(all_matching)

    # Paginate
    sessions_page = all_matching[(page - 1) * page_size : page * page_size]

    summaries = [
        AdminSessionSummary(
            session_id=uuid.UUID(s.id),
            candidate_name=s.candidate.name,
            candidate_email=s.candidate.email,
            language=s.language,
            experience_years=s.experience_years,
            status=ExamStatus(s.status),
            violation_count=s.violation_count,
            risk_score=s.risk_score,
            created_at=s.created_at,
            completed_at=s.completed_at,
        )
        for s in sessions_page
    ]

    return AdminSessionListResponse(
        total=total,
        page=page,
        page_size=page_size,
        sessions=summaries,
    )


@router.get("/sessions/{session_id}", response_model=AdminSessionDetailResponse)
def get_admin_session_detail(session_id: uuid.UUID, db: DbSession):
    """
    Story 5.2: Return full audit report for a session: candidate details, Q&A transcript,
    and proctoring log timeline.
    """
    session = crud.get_session(db, str(session_id))
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": f"Session {session_id} not found."},
        )

    session_detail = SessionDetail(
        session_id=uuid.UUID(session.id),
        candidate_id=uuid.UUID(session.candidate_id),
        candidate_name=session.candidate.name,
        language=session.language,
        experience_years=session.experience_years,
        status=ExamStatus(session.status),
        violation_count=session.violation_count,
        risk_score=session.risk_score,
        created_at=session.created_at,
        completed_at=session.completed_at,
    )

    qa_rows = crud.get_session_qa(db, str(session_id))
    log_rows = crud.get_session_logs(db, str(session_id))

    qa_transcript = [
        QAEntry(
            question_id=uuid.UUID(qa.id),
            question_text=qa.question_text,
            answer_text=qa.answer_text,
            is_follow_up=qa.is_follow_up,
            sequence_number=qa.sequence_number,
            evaluation_score=qa.evaluation_score,
            evaluation_feedback=qa.evaluation_feedback,
            created_at=qa.created_at,
        )
        for qa in qa_rows
    ]

    proctoring_logs = [
        ProctoringLogEntry(
            id=uuid.UUID(log.id),
            event_type=ViolationType(log.event_type),
            severity=SeverityLevel(log.severity),
            warning_number=log.warning_number,
            timestamp=log.timestamp,
            snapshot=log.snapshot,
        )
        for log in log_rows
    ]

    return AdminSessionDetailResponse(
        session=session_detail,
        qa_transcript=qa_transcript,
        proctoring_logs=proctoring_logs,
    )
