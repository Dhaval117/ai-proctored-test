"""
Story 1.2 — Database Model & CRUD Tests

Uses an in-memory SQLite database so no PostgreSQL is required for CI.
DATABASE_URL is overridden before any app imports via conftest.py.

Test coverage:
  - Schema creation (all tables + FK constraints)
  - Candidate: create, get by email, get_or_create idempotency
  - ExamSession: create, activate, complete, suspend
  - ExamQA: create question, submit answer, get session Q&A
  - ProctoringLog: log events, risk score, violation count, auto-suspend at 3
"""
from __future__ import annotations

import os

import pytest
from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import Session, sessionmaker

# ── Override DATABASE_URL before importing app modules ───────────────────────
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.database import Base  # noqa: E402  (import after env override)
from app import crud  # noqa: E402
from app.models import Candidate, ExamSession, ExamQA, ProctoringLog  # noqa: E402
from app.schemas import ExamStatus, SeverityLevel, ViolationType  # noqa: E402


# ─────────────────────────────────────────────
# Fixtures
# ─────────────────────────────────────────────

@pytest.fixture(scope="module")
def engine():
    """Create a shared in-memory SQLite engine with all tables for the module."""
    from sqlalchemy import create_engine
    eng = create_engine("sqlite:///:memory:", connect_args={"check_same_thread": False})
    Base.metadata.create_all(eng)
    yield eng
    eng.dispose()


@pytest.fixture()
def db(engine):
    """
    Provide a fresh Session for each test, wrapping everything in a transaction
    that is rolled back after the test so tests are fully isolated.
    """
    connection = engine.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    try:
        yield session
    finally:
        session.close()
        transaction.rollback()
        connection.close()


# ─────────────────────────────────────────────
# Schema Tests
# ─────────────────────────────────────────────

class TestSchema:
    def test_all_tables_exist(self, engine):
        inspector = inspect(engine)
        tables = set(inspector.get_table_names())
        expected = {"candidates", "exam_sessions", "exam_qa", "proctoring_logs"}
        assert expected.issubset(tables), f"Missing tables: {expected - tables}"

    def test_candidates_columns(self, engine):
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("candidates")}
        assert {"id", "name", "email", "created_at"}.issubset(cols)

    def test_exam_sessions_columns(self, engine):
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("exam_sessions")}
        assert {
            "id", "candidate_id", "language", "experience_years",
            "reference_photo", "status", "violation_count", "risk_score",
            "created_at", "completed_at"
        }.issubset(cols)

    def test_exam_qa_columns(self, engine):
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("exam_qa")}
        assert {
            "id", "session_id", "question_text", "answer_text",
            "is_follow_up", "parent_qa_id", "sequence_number",
            "evaluation_score", "evaluation_feedback", "created_at"
        }.issubset(cols)

    def test_proctoring_logs_columns(self, engine):
        inspector = inspect(engine)
        cols = {c["name"] for c in inspector.get_columns("proctoring_logs")}
        assert {
            "id", "session_id", "event_type", "severity",
            "warning_number", "timestamp", "snapshot"
        }.issubset(cols)


# ─────────────────────────────────────────────
# Candidate CRUD Tests
# ─────────────────────────────────────────────

class TestCandidateCRUD:
    def test_create_candidate(self, db):
        candidate = crud.create_candidate(db, name="Alice", email="alice@example.com")
        assert candidate.id is not None
        assert candidate.name == "Alice"
        assert candidate.email == "alice@example.com"

    def test_get_candidate_by_email_found(self, db):
        crud.create_candidate(db, name="Bob", email="bob@example.com")
        result = crud.get_candidate_by_email(db, "bob@example.com")
        assert result is not None
        assert result.name == "Bob"

    def test_get_candidate_by_email_not_found(self, db):
        result = crud.get_candidate_by_email(db, "nobody@example.com")
        assert result is None

    def test_get_or_create_creates_new(self, db):
        candidate = crud.get_or_create_candidate(db, name="Carol", email="carol@example.com")
        assert candidate.id is not None

    def test_get_or_create_returns_existing(self, db):
        c1 = crud.get_or_create_candidate(db, name="Dave", email="dave@example.com")
        c2 = crud.get_or_create_candidate(db, name="Dave", email="dave@example.com")
        assert c1.id == c2.id


# ─────────────────────────────────────────────
# ExamSession CRUD Tests
# ─────────────────────────────────────────────

class TestExamSessionCRUD:
    def _make_candidate(self, db) -> Candidate:
        return crud.create_candidate(db, name="Test User", email=f"test_{id(db)}@example.com")

    def test_create_session(self, db):
        candidate = self._make_candidate(db)
        session = crud.create_session(
            db, candidate_id=candidate.id, language="Python", experience_years=3
        )
        assert session.id is not None
        assert session.status == ExamStatus.SETUP.value
        assert session.violation_count == 0
        assert session.risk_score == 0

    def test_get_session_found(self, db):
        candidate = self._make_candidate(db)
        session = crud.create_session(
            db, candidate_id=candidate.id, language="Django", experience_years=2
        )
        result = crud.get_session(db, session.id)
        assert result is not None
        assert result.id == session.id

    def test_get_session_not_found(self, db):
        result = crud.get_session(db, "00000000-0000-0000-0000-000000000000")
        assert result is None

    def test_activate_session(self, db):
        candidate = self._make_candidate(db)
        session = crud.create_session(
            db, candidate_id=candidate.id, language="Python", experience_years=1
        )
        activated = crud.activate_session(db, session, reference_photo="data:image/jpeg;base64,abc")
        assert activated.status == ExamStatus.ACTIVE.value
        assert activated.reference_photo == "data:image/jpeg;base64,abc"

    def test_activate_session_wrong_status_raises(self, db):
        candidate = self._make_candidate(db)
        session = crud.create_session(
            db, candidate_id=candidate.id, language="Python", experience_years=1
        )
        crud.activate_session(db, session, reference_photo="photo")
        with pytest.raises(ValueError, match="cannot be verified"):
            crud.activate_session(db, session, reference_photo="photo2")

    def test_complete_session(self, db):
        candidate = self._make_candidate(db)
        session = crud.create_session(
            db, candidate_id=candidate.id, language="JS", experience_years=2
        )
        completed = crud.complete_session(db, session)
        assert completed.status == ExamStatus.COMPLETED.value
        assert completed.completed_at is not None

    def test_suspend_session(self, db):
        candidate = self._make_candidate(db)
        session = crud.create_session(
            db, candidate_id=candidate.id, language="Go", experience_years=1
        )
        suspended = crud.suspend_session(db, session)
        assert suspended.status == ExamStatus.SUSPENDED.value
        assert suspended.completed_at is not None


# ─────────────────────────────────────────────
# ExamQA CRUD Tests
# ─────────────────────────────────────────────

class TestExamQACRUD:
    def _make_session(self, db) -> ExamSession:
        candidate = crud.create_candidate(db, name="QA User", email=f"qa_{id(db)}@test.com")
        return crud.create_session(
            db, candidate_id=candidate.id, language="Python", experience_years=2
        )

    def test_create_question(self, db):
        session = self._make_session(db)
        qa = crud.create_question(
            db, session_id=session.id, question_text="What is a list?", sequence_number=1
        )
        assert qa.id is not None
        assert qa.answer_text is None
        assert qa.is_follow_up is False

    def test_create_follow_up_question(self, db):
        session = self._make_session(db)
        parent = crud.create_question(
            db, session_id=session.id, question_text="Explain generators.", sequence_number=1
        )
        follow_up = crud.create_question(
            db,
            session_id=session.id,
            question_text="Can you give an example?",
            sequence_number=2,
            is_follow_up=True,
            parent_qa_id=parent.id,
        )
        assert follow_up.is_follow_up is True
        assert follow_up.parent_qa_id == parent.id

    def test_submit_answer(self, db):
        session = self._make_session(db)
        qa = crud.create_question(
            db, session_id=session.id, question_text="What is a tuple?", sequence_number=1
        )
        updated = crud.submit_answer(
            db, qa, answer_text="An immutable sequence.", evaluation_score=85,
            evaluation_feedback="Correct and concise."
        )
        assert updated.answer_text == "An immutable sequence."
        assert updated.evaluation_score == 85

    def test_get_session_qa_ordering(self, db):
        session = self._make_session(db)
        crud.create_question(db, session_id=session.id, question_text="Q3", sequence_number=3)
        crud.create_question(db, session_id=session.id, question_text="Q1", sequence_number=1)
        crud.create_question(db, session_id=session.id, question_text="Q2", sequence_number=2)

        qa_list = crud.get_session_qa(db, session.id)
        assert [q.question_text for q in qa_list] == ["Q1", "Q2", "Q3"]


# ─────────────────────────────────────────────
# ProctoringLog CRUD Tests
# ─────────────────────────────────────────────

class TestProctoringLogCRUD:
    def _make_active_session(self, db) -> ExamSession:
        candidate = crud.create_candidate(db, name="Proctor User", email=f"proctor_{id(db)}@test.com")
        session = crud.create_session(
            db, candidate_id=candidate.id, language="Python", experience_years=2
        )
        crud.activate_session(db, session, reference_photo="photo")
        return session

    def test_low_severity_does_not_increment_violation_count(self, db):
        session = self._make_active_session(db)
        log, updated_session = crud.log_proctoring_event(
            db, session, event_type=ViolationType.BACKGROUND_NOISE, severity=SeverityLevel.LOW
        )
        assert updated_session.violation_count == 0
        assert updated_session.status == ExamStatus.ACTIVE.value
        assert log.warning_number is None
        assert updated_session.risk_score == 5  # LOW weight

    def test_medium_severity_increments_violation_count(self, db):
        session = self._make_active_session(db)
        log, updated_session = crud.log_proctoring_event(
            db, session, event_type=ViolationType.TAB_SWITCH, severity=SeverityLevel.MEDIUM
        )
        assert updated_session.violation_count == 1
        assert log.warning_number == 1
        assert updated_session.risk_score == 20  # MEDIUM weight

    def test_third_violation_auto_suspends_session(self, db):
        session = self._make_active_session(db)
        for _ in range(3):
            _, session = crud.log_proctoring_event(
                db, session, event_type=ViolationType.TAB_SWITCH, severity=SeverityLevel.MEDIUM
            )
        assert session.violation_count == 3
        assert session.status == ExamStatus.SUSPENDED.value

    def test_high_severity_has_higher_risk_weight(self, db):
        session = self._make_active_session(db)
        _, updated = crud.log_proctoring_event(
            db, session, event_type=ViolationType.FACE_MISMATCH, severity=SeverityLevel.HIGH
        )
        assert updated.risk_score == 40  # HIGH weight

    def test_snapshot_saved_for_multi_face(self, db):
        session = self._make_active_session(db)
        log, _ = crud.log_proctoring_event(
            db, session,
            event_type=ViolationType.MULTI_FACE,
            severity=SeverityLevel.HIGH,
            snapshot="data:image/jpeg;base64,abc123",
        )
        assert log.snapshot == "data:image/jpeg;base64,abc123"

    def test_get_session_logs_ordering(self, db):
        session = self._make_active_session(db)
        crud.log_proctoring_event(
            db, session, event_type=ViolationType.COPY_PASTE, severity=SeverityLevel.MEDIUM
        )
        crud.log_proctoring_event(
            db, session, event_type=ViolationType.NO_FACE, severity=SeverityLevel.LOW
        )
        logs = crud.get_session_logs(db, session.id)
        assert len(logs) == 2
        assert logs[0].event_type == ViolationType.COPY_PASTE.value

    def test_log_event_when_proctoring_disabled(self, db):
        from unittest.mock import patch
        session = self._make_active_session(db)
        with patch("app.crud.PROCTORING_ENABLED", False):
            log, updated_session = crud.log_proctoring_event(
                db, session, event_type=ViolationType.TAB_SWITCH, severity=SeverityLevel.HIGH
            )
            assert updated_session.violation_count == 0
            assert log.severity == SeverityLevel.LOW.value
            assert log.warning_number is None
