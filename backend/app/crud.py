"""
crud.py — Database CRUD helper functions.

Provides a clean service layer between API routes and the ORM models.
All functions accept a SQLAlchemy Session and return ORM model instances
(or None). Raises no HTTP exceptions — that is left to the router layer.
"""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Optional
import uuid

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Candidate, ExamQA, ExamSession, ProctoringLog, AdminUser
from app.schemas import ExamStatus, SeverityLevel, ViolationType
from app.config import MAX_VIOLATIONS, PROCTORING_ENABLED


# ─────────────────────────────────────────────
# AdminUser CRUD
# ─────────────────────────────────────────────

def get_admin_by_email(db: Session, email: str) -> Optional[AdminUser]:
    return db.scalar(select(AdminUser).where(AdminUser.email == email))

def create_admin(db: Session, email: str, hashed_password: str, is_superadmin: bool = False) -> AdminUser:
    admin = AdminUser(email=email, hashed_password=hashed_password, is_superadmin=is_superadmin)
    db.add(admin)
    db.flush()
    return admin

def get_all_admins(db: Session) -> list[AdminUser]:
    return list(db.scalars(select(AdminUser)).all())

def delete_admin(db: Session, admin_id: str) -> bool:
    admin = db.get(AdminUser, admin_id)
    if not admin:
        return False
    db.delete(admin)
    db.flush()
    return True

def update_admin_password(db: Session, admin: AdminUser, hashed_password: str) -> AdminUser:
    admin.hashed_password = hashed_password
    db.flush()
    return admin

# ─────────────────────────────────────────────
# Candidate CRUD
# ─────────────────────────────────────────────

def get_candidate_by_email(db: Session, email: str) -> Optional[Candidate]:
    """Return a Candidate by email, or None if not found."""
    return db.scalar(select(Candidate).where(Candidate.email == email))


def create_candidate(db: Session, *, name: str, email: str) -> Candidate:
    """
    Create and persist a new Candidate.
    Caller is responsible for checking uniqueness first.
    """
    candidate = Candidate(name=name, email=email)
    db.add(candidate)
    db.flush()   # assigns .id without committing the transaction
    return candidate


def get_or_create_candidate(db: Session, *, name: str, email: str) -> Candidate:
    """Return existing Candidate by email, or create a new one."""
    existing = get_candidate_by_email(db, email)
    if existing:
        return existing
    return create_candidate(db, name=name, email=email)


# ─────────────────────────────────────────────
# ExamSession CRUD
# ─────────────────────────────────────────────

def create_session(
    db: Session,
    *,
    candidate_id: str,
    language: str,
    experience_years: int,
    expires_at: Optional[datetime] = None,
    resume_text: Optional[str] = None,
    num_questions: int = 5,
    follow_ups_per_question: int = 1,
) -> ExamSession:
    """Create a new exam session in SETUP status."""
    session = ExamSession(
        candidate_id=candidate_id,
        language=language,
        experience_years=experience_years,
        status=ExamStatus.SETUP.value,
        violation_count=0,
        risk_score=0,
        expires_at=expires_at,
        resume_text=resume_text,
        num_questions=num_questions,
        follow_ups_per_question=follow_ups_per_question,
    )
    db.add(session)
    db.flush()
    return session


def get_session(db: Session, session_id: str) -> Optional[ExamSession]:
    """Return an ExamSession by ID, or None."""
    return db.get(ExamSession, session_id)


def activate_session(db: Session, session: ExamSession, reference_photo: str) -> ExamSession:
    """
    Save the reference portrait and transition session from SETUP → ACTIVE.
    Raises ValueError if session is not in SETUP status.
    """
    if session.status != ExamStatus.SETUP.value:
        raise ValueError(
            f"Session {session.id} cannot be verified: current status is {session.status!r}."
        )
    session.reference_photo = reference_photo
    session.status = ExamStatus.ACTIVE.value
    session.exam_token = str(uuid.uuid4())
    db.flush()
    return session


def complete_session(db: Session, session: ExamSession) -> ExamSession:
    """Mark session as COMPLETED and record the completion timestamp."""
    session.status = ExamStatus.COMPLETED.value
    session.completed_at = datetime.now(timezone.utc)
    db.flush()
    return session


def suspend_session(db: Session, session: ExamSession) -> ExamSession:
    """Mark session as SUSPENDED (triggered on 3rd major violation)."""
    session.status = ExamStatus.SUSPENDED.value
    session.completed_at = datetime.now(timezone.utc)
    db.flush()
    return session


def get_all_sessions(
    db: Session,
    *,
    status: Optional[ExamStatus] = None,
    language: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
) -> tuple[int, list[ExamSession]]:
    """
    Return a (total_count, page_of_sessions) tuple.
    Optionally filter by status and/or language.
    """
    stmt = select(ExamSession)
    if status:
        stmt = stmt.where(ExamSession.status == status.value)
    if language:
        stmt = stmt.where(ExamSession.language.ilike(language))

    total = db.scalar(select(ExamSession).with_only_columns(ExamSession.id).where(
        *([ExamSession.status == status.value] if status else []),
        *([ExamSession.language.ilike(language)] if language else []),
    ).count()) or 0

    sessions = list(
        db.scalars(
            stmt.offset((page - 1) * page_size).limit(page_size)
        ).all()
    )
    return total, sessions


# ─────────────────────────────────────────────
# ExamQA CRUD
# ─────────────────────────────────────────────

def create_question(
    db: Session,
    *,
    session_id: str,
    question_text: str,
    sequence_number: int,
    is_follow_up: bool = False,
    parent_qa_id: Optional[str] = None,
) -> ExamQA:
    """Create a new question row (answer will be filled in later)."""
    qa = ExamQA(
        session_id=session_id,
        question_text=question_text,
        sequence_number=sequence_number,
        is_follow_up=is_follow_up,
        parent_qa_id=parent_qa_id,
    )
    db.add(qa)
    db.flush()
    return qa


def get_question(db: Session, question_id: str) -> Optional[ExamQA]:
    """Return an ExamQA row by ID."""
    return db.get(ExamQA, question_id)


def submit_answer(
    db: Session,
    qa: ExamQA,
    *,
    answer_text: str,
    evaluation_score: Optional[int],
    evaluation_feedback: str,
) -> ExamQA:
    """Attach the candidate's transcribed answer and AI evaluation to a question row."""
    qa.answer_text = answer_text
    qa.evaluation_score = evaluation_score
    qa.evaluation_feedback = evaluation_feedback
    db.flush()
    return qa


def get_session_qa(db: Session, session_id: str) -> list[ExamQA]:
    """Return all Q&A rows for a session, ordered by sequence number."""
    return list(
        db.scalars(
            select(ExamQA)
            .where(ExamQA.session_id == session_id)
            .order_by(ExamQA.sequence_number)
        ).all()
    )


# ─────────────────────────────────────────────
# ProctoringLog CRUD
# ─────────────────────────────────────────────

# Severity weight map for risk score calculation
_SEVERITY_WEIGHT: dict[str, int] = {
    SeverityLevel.LOW.value: 5,
    SeverityLevel.MEDIUM.value: 20,
    SeverityLevel.HIGH.value: 40,
}


def log_proctoring_event(
    db: Session,
    session: ExamSession,
    *,
    event_type: ViolationType,
    severity: SeverityLevel,
    snapshot: Optional[str] = None,
) -> tuple[ProctoringLog, ExamSession]:
    """
    Record a proctoring violation and update the session's violation count
    and risk score.

    Returns (log_entry, updated_session).
    The caller should commit the transaction after inspecting the result.

    Policy:
    - LOW severity: logged, risk score incremented, does NOT count toward the
      3-violation suspension limit.
    - MEDIUM / HIGH severity: also increments violation_count. When
      violation_count reaches MAX_VIOLATIONS (3), the session is suspended.
    """
    if not PROCTORING_ENABLED:
        log_entry = ProctoringLog(
            session_id=session.id,
            event_type=event_type.value,
            severity=SeverityLevel.LOW.value,
            warning_number=None,
            snapshot=snapshot,
        )
        db.add(log_entry)
        db.flush()
        return log_entry, session

    # Determine warning number for MEDIUM/HIGH events

    warning_number: Optional[int] = None
    if severity.value in (SeverityLevel.MEDIUM.value, SeverityLevel.HIGH.value):
        session.violation_count += 1
        warning_number = session.violation_count

    # Always update risk score
    session.risk_score += _SEVERITY_WEIGHT.get(severity.value, 0)

    log_entry = ProctoringLog(
        session_id=session.id,
        event_type=event_type.value,
        severity=severity.value,
        warning_number=warning_number,
        snapshot=snapshot,
    )
    db.add(log_entry)

    # Suspend if threshold reached
    if session.violation_count >= MAX_VIOLATIONS:
        session = suspend_session(db, session)

    db.flush()
    return log_entry, session


def get_session_logs(db: Session, session_id: str) -> list[ProctoringLog]:
    """Return all proctoring log entries for a session, ordered by timestamp."""
    return list(
        db.scalars(
            select(ProctoringLog)
            .where(ProctoringLog.session_id == session_id)
            .order_by(ProctoringLog.timestamp)
        ).all()
    )
