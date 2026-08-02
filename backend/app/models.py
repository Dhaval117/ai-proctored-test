"""
models.py — SQLAlchemy ORM models.

Defines the four core tables matching the PostgreSQL schema from the TDD:
  - Candidate
  - ExamSession
  - ExamQA
  - ProctoringLog

All primary keys are UUIDs. Enums are stored as VARCHAR for SQLite compatibility
in tests, while Alembic migrations will create native PG ENUM types in production.
"""
from __future__ import annotations

import uuid
from datetime import datetime, timezone

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Integer,
    String,
    Text,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.schemas import ExamStatus, SeverityLevel, ViolationType


def _uuid() -> str:
    """Generate a new UUID string (used as default for PK columns)."""
    return str(uuid.uuid4())


def _now() -> datetime:
    """Return current UTC time."""
    return datetime.now(timezone.utc)


# ─────────────────────────────────────────────
# Candidate
# ─────────────────────────────────────────────
class Candidate(Base):
    """
    Represents a person who takes one or more exams.
    Email is unique — the same person can retake exams over time.
    """
    __tablename__ = "candidates"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # Relationships
    sessions: Mapped[list[ExamSession]] = relationship(
        "ExamSession", back_populates="candidate", cascade="all, delete-orphan"
    )

    def __repr__(self) -> str:
        return f"<Candidate id={self.id} email={self.email}>"


# ─────────────────────────────────────────────
# AdminUser
# ─────────────────────────────────────────────
class AdminUser(Base):
    """
    Platform administrator who can create candidates and exam sessions.
    """
    __tablename__ = "admin_users"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    email: Mapped[str] = mapped_column(String(255), unique=True, nullable=False, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    def __repr__(self) -> str:
        return f"<AdminUser id={self.id} email={self.email}>"



# ─────────────────────────────────────────────
# ExamSession
# ─────────────────────────────────────────────
class ExamSession(Base):
    """
    A single exam attempt by a candidate.
    Tracks the overall lifecycle: SETUP → ACTIVE → COMPLETED | SUSPENDED.
    """
    __tablename__ = "exam_sessions"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    candidate_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("candidates.id", ondelete="CASCADE"), nullable=False, index=True
    )
    language: Mapped[str] = mapped_column(String(100), nullable=False)
    experience_years: Mapped[int] = mapped_column(Integer, nullable=False)
    reference_photo: Mapped[str | None] = mapped_column(Text, nullable=True)  # Base64 data URL
    status: Mapped[str] = mapped_column(
        Enum(
            "SETUP", "ACTIVE", "COMPLETED", "SUSPENDED",
            name="exam_status",
            create_constraint=True,
        ),
        nullable=False,
        default=ExamStatus.SETUP.value,
        index=True,
    )
    violation_count: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    risk_score: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    resume_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    # Relationships
    candidate: Mapped[Candidate] = relationship("Candidate", back_populates="sessions")
    questions: Mapped[list[ExamQA]] = relationship(
        "ExamQA", back_populates="session", cascade="all, delete-orphan",
        order_by="ExamQA.sequence_number",
    )
    proctoring_logs: Mapped[list[ProctoringLog]] = relationship(
        "ProctoringLog", back_populates="session", cascade="all, delete-orphan",
        order_by="ProctoringLog.timestamp",
    )

    def __repr__(self) -> str:
        return f"<ExamSession id={self.id} candidate={self.candidate_id} status={self.status}>"


# ─────────────────────────────────────────────
# ExamQA (Question + Answer, combined)
# ─────────────────────────────────────────────
class ExamQA(Base):
    """
    Stores both the question text and the candidate's transcribed answer
    in the same row, along with AI evaluation results.

    A follow-up question references its parent via parent_qa_id.
    """
    __tablename__ = "exam_qa"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    question_text: Mapped[str] = mapped_column(Text, nullable=False)
    answer_text: Mapped[str | None] = mapped_column(Text, nullable=True)
    is_follow_up: Mapped[bool] = mapped_column(Boolean, nullable=False, default=False)
    parent_qa_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("exam_qa.id", ondelete="SET NULL"), nullable=True
    )
    sequence_number: Mapped[int] = mapped_column(Integer, nullable=False)
    evaluation_score: Mapped[int | None] = mapped_column(Integer, nullable=True)
    evaluation_feedback: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now)

    # Relationships
    session: Mapped[ExamSession] = relationship("ExamSession", back_populates="questions")
    follow_ups: Mapped[list[ExamQA]] = relationship("ExamQA", back_populates="parent")
    parent: Mapped[ExamQA | None] = relationship(
        "ExamQA", back_populates="follow_ups", remote_side="ExamQA.id"
    )

    def __repr__(self) -> str:
        return (
            f"<ExamQA id={self.id} seq={self.sequence_number} "
            f"follow_up={self.is_follow_up}>"
        )


# ─────────────────────────────────────────────
# ProctoringLog
# ─────────────────────────────────────────────
class ProctoringLog(Base):
    """
    A single proctoring violation event within an exam session.
    LOW-severity events are recorded but don't count toward the 3-warning limit.
    MEDIUM and HIGH severity events increment ExamSession.violation_count.
    """
    __tablename__ = "proctoring_logs"

    id: Mapped[str] = mapped_column(String(36), primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("exam_sessions.id", ondelete="CASCADE"), nullable=False, index=True
    )
    event_type: Mapped[str] = mapped_column(
        Enum(
            "TAB_SWITCH", "COPY_PASTE", "DEV_TOOLS",
            "NO_FACE", "MULTI_FACE", "BACKGROUND_NOISE", "FACE_MISMATCH",
            name="violation_type",
            create_constraint=True,
        ),
        nullable=False,
    )
    severity: Mapped[str] = mapped_column(
        Enum("LOW", "MEDIUM", "HIGH", name="severity_level", create_constraint=True),
        nullable=False,
    )
    warning_number: Mapped[int | None] = mapped_column(Integer, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=_now, index=True)
    snapshot: Mapped[str | None] = mapped_column(Text, nullable=True)  # Base64 screenshot

    # Relationships
    session: Mapped[ExamSession] = relationship("ExamSession", back_populates="proctoring_logs")

    def __repr__(self) -> str:
        return (
            f"<ProctoringLog id={self.id} type={self.event_type} "
            f"severity={self.severity} warning={self.warning_number}>"
        )
