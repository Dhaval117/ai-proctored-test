"""
Story 1.3 — Updated Contract Tests

Session endpoints (create / verify / get) now hit the real DB (SQLite in-memory).
Remaining endpoints (exam flow, proctoring, admin) still test against mock data.

The real DB is injected via FastAPI's dependency_overrides mechanism,
ensuring complete isolation between tests.
"""
from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, Session

# ── Set SQLite test DB before any app import ─────────────────────────────────
os.environ["DATABASE_URL"] = "sqlite:///:memory:"

from app.main import app  # noqa: E402
from app.database import Base, get_db  # noqa: E402
from app.mock_data import QUESTION_ID  # noqa: E402
from app.config import MAX_MAIN_QUESTIONS  # noqa: E402

# ─────────────────────────────────────────────
# Test DB Setup & Dependency Override
# ─────────────────────────────────────────────

TEST_ENGINE = create_engine(
    "sqlite:///:memory:",
    connect_args={"check_same_thread": False},
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=TEST_ENGINE)


@pytest.fixture(scope="session", autouse=True)
def create_test_tables():
    """Create all tables once for the full test session."""
    Base.metadata.create_all(TEST_ENGINE)
    yield
    Base.metadata.drop_all(TEST_ENGINE)


@pytest.fixture()
def db_session():
    """Provide a clean DB session per test, rolled back after each test."""
    connection = TEST_ENGINE.connect()
    transaction = connection.begin()
    session = Session(bind=connection)
    yield session
    session.close()
    transaction.rollback()
    connection.close()


@pytest.fixture()
def client(db_session):
    """
    Provide a TestClient with the real DB session injected.
    app.state.mock_violations is reset before each test.
    """
    def override_get_db():
        try:
            yield db_session
        finally:
            pass  # rollback handled by db_session fixture

    app.dependency_overrides[get_db] = override_get_db

    # Reset mock violation state
    if hasattr(app.state, "mock_violations"):
        app.state.mock_violations = {}

    with TestClient(app) as c:
        yield c

    app.dependency_overrides.clear()


# ─────────────────────────────────────────────
# Helper payloads
# ─────────────────────────────────────────────

VALID_CREATE_PAYLOAD = {
    "name": "Test Candidate",
    "email": "test@example.com",
    "language": "Python",
    "experience_years": 3,
}

VALID_VERIFY_PAYLOAD = {
    "reference_photo": "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQ==",
}

VALID_ANSWER_PAYLOAD = {
    "question_id": QUESTION_ID,
    "transcribed_text": "A list is mutable while a tuple is immutable.",
}

VALID_EVENT_PAYLOAD = {
    "event_type": "TAB_SWITCH",
    "severity": "MEDIUM",
    "snapshot": None,
}


# ─────────────────────────────────────────────
# Health
# ─────────────────────────────────────────────

class TestHealth:
    def test_health_returns_ok(self, client):
        r = client.get("/health")
        assert r.status_code == 200
        assert r.json()["status"] == "ok"


# ─────────────────────────────────────────────
# POST /api/sessions/create  (real DB)
# ─────────────────────────────────────────────

class TestCreateSession:
    def test_success_returns_201_with_uuids(self, client):
        r = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        assert r.status_code == 201
        body = r.json()
        # Must be a real UUID, not hardcoded mock
        assert len(body["session_id"]) == 36
        assert len(body["candidate_id"]) == 36
        assert body["status"] == "SETUP"
        assert "Session created" in body["message"]

    def test_same_email_reuses_candidate(self, client):
        r1 = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        r2 = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        assert r1.status_code == 201
        assert r2.status_code == 201
        # Same candidate, different session
        assert r1.json()["candidate_id"] == r2.json()["candidate_id"]
        assert r1.json()["session_id"] != r2.json()["session_id"]

    def test_missing_required_field_returns_422(self, client):
        payload = {k: v for k, v in VALID_CREATE_PAYLOAD.items() if k != "email"}
        r = client.post("/api/sessions/create", json=payload)
        assert r.status_code == 422

    def test_invalid_email_returns_422(self, client):
        r = client.post("/api/sessions/create", json={**VALID_CREATE_PAYLOAD, "email": "not-an-email"})
        assert r.status_code == 422

    def test_negative_experience_returns_422(self, client):
        r = client.post("/api/sessions/create", json={**VALID_CREATE_PAYLOAD, "experience_years": -1})
        assert r.status_code == 422


# ─────────────────────────────────────────────
# POST /api/sessions/{id}/verify  (real DB)
# ─────────────────────────────────────────────

class TestVerifySession:
    def _create_session(self, client) -> str:
        r = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        return r.json()["session_id"]

    def test_success_transitions_to_active(self, client):
        session_id = self._create_session(client)
        r = client.post(f"/api/sessions/{session_id}/verify", json=VALID_VERIFY_PAYLOAD)
        assert r.status_code == 200
        body = r.json()
        assert body["status"] == "ACTIVE"
        assert "verified" in body["message"].lower()

    def test_unknown_session_returns_404(self, client):
        fake_id = "00000000-0000-0000-0000-000000000000"
        r = client.post(f"/api/sessions/{fake_id}/verify", json=VALID_VERIFY_PAYLOAD)
        assert r.status_code == 404

    def test_double_verify_returns_409(self, client):
        """Verifying an already-ACTIVE session should return 409 CONFLICT."""
        session_id = self._create_session(client)
        client.post(f"/api/sessions/{session_id}/verify", json=VALID_VERIFY_PAYLOAD)
        r = client.post(f"/api/sessions/{session_id}/verify", json=VALID_VERIFY_PAYLOAD)
        assert r.status_code == 409

    def test_missing_photo_returns_422(self, client):
        session_id = self._create_session(client)
        r = client.post(f"/api/sessions/{session_id}/verify", json={})
        assert r.status_code == 422


# ─────────────────────────────────────────────
# GET /api/sessions/{id}  (real DB)
# ─────────────────────────────────────────────

class TestGetSession:
    def test_success_returns_full_detail(self, client):
        r_create = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        session_id = r_create.json()["session_id"]

        r = client.get(f"/api/sessions/{session_id}")
        assert r.status_code == 200
        body = r.json()
        assert body["session_id"] == session_id
        assert body["status"] == "SETUP"
        assert body["violation_count"] == 0
        assert body["risk_score"] == 0
        assert body["language"] == "Python"
        assert body["candidate_name"] == "Test Candidate"

    def test_status_updates_after_verify(self, client):
        """Session fetched after verify should show ACTIVE status."""
        r_create = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        session_id = r_create.json()["session_id"]
        client.post(f"/api/sessions/{session_id}/verify", json=VALID_VERIFY_PAYLOAD)

        r = client.get(f"/api/sessions/{session_id}")
        assert r.status_code == 200
        assert r.json()["status"] == "ACTIVE"

    def test_unknown_session_returns_404(self, client):
        r = client.get("/api/sessions/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404


# ─────────────────────────────────────────────
# Exam endpoints (still mocked)
# ─────────────────────────────────────────────

class TestGetNextQuestion:
    def test_success(self, client):
        r_create = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        session_id = r_create.json()["session_id"]
        r = client.get(f"/api/sessions/{session_id}/next-question")
        assert r.status_code == 200
        body = r.json()
        assert "question_id" in body
        assert "question_text" in body
        assert body["total_main_questions"] == MAX_MAIN_QUESTIONS

    def test_unknown_session_returns_404(self, client):
        r = client.get("/api/sessions/00000000-0000-0000-0000-000000000000/next-question")
        assert r.status_code == 404


class TestSubmitAnswer:
    def test_success(self, client):
        r_create = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        session_id = r_create.json()["session_id"]
        client.get(f"/api/sessions/{session_id}/next-question")
        r = client.post(f"/api/sessions/{session_id}/submit-answer", json=VALID_ANSWER_PAYLOAD)
        assert r.status_code == 200
        body = r.json()
        assert 0 <= body["evaluation_score"] <= 10
        assert body["next_action"] in ("FOLLOW_UP", "NEXT_QUESTION", "EXAM_COMPLETE")

    def test_empty_answer_rejected(self, client):
        r_create = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        session_id = r_create.json()["session_id"]
        r = client.post(
            f"/api/sessions/{session_id}/submit-answer",
            json={**VALID_ANSWER_PAYLOAD, "transcribed_text": ""},
        )
        assert r.status_code == 422


# ─────────────────────────────────────────────
# Proctoring endpoint (still mocked)
# ─────────────────────────────────────────────

class TestLogEvent:
    def _create_session(self, client) -> str:
        r_create = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        session_id = r_create.json()["session_id"]
        client.post(f"/api/sessions/{session_id}/verify", json=VALID_VERIFY_PAYLOAD)
        return session_id

    def test_first_violation_returns_active(self, client):
        session_id = self._create_session(client)
        r = client.post(f"/api/sessions/{session_id}/log-event", json=VALID_EVENT_PAYLOAD)
        assert r.status_code == 200
        body = r.json()
        assert body["violation_count"] == 1
        assert body["session_status"] == "ACTIVE"

    def test_third_violation_suspends_session(self, client):
        session_id = self._create_session(client)
        for _ in range(3):
            r = client.post(f"/api/sessions/{session_id}/log-event", json=VALID_EVENT_PAYLOAD)
        assert r.json()["session_status"] == "SUSPENDED"

    def test_low_severity_does_not_suspend(self, client):
        session_id = self._create_session(client)
        low_payload = {**VALID_EVENT_PAYLOAD, "severity": "LOW"}
        for _ in range(5):
            r = client.post(f"/api/sessions/{session_id}/log-event", json=low_payload)
        assert r.json()["session_status"] == "ACTIVE"

    def test_invalid_event_type_rejected(self, client):
        session_id = self._create_session(client)
        r = client.post(
            f"/api/sessions/{session_id}/log-event",
            json={**VALID_EVENT_PAYLOAD, "event_type": "INVALID_TYPE"},
        )
        assert r.status_code == 422


class TestProctoringConfig:
    def test_get_config_default(self, client):
        r = client.get("/api/proctoring/config")
        assert r.status_code == 200
        body = r.json()
        assert "proctoring_enabled" in body
        assert "allow_toggle" in body

    def test_log_event_when_disabled(self, client):
        from unittest.mock import patch
        r_create = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        session_id = r_create.json()["session_id"]
        client.post(f"/api/sessions/{session_id}/verify", json=VALID_VERIFY_PAYLOAD)
        
        with patch("app.routers.proctor_router.PROCTORING_ENABLED", False), \
             patch("app.crud.PROCTORING_ENABLED", False):
            r = client.post(f"/api/sessions/{session_id}/log-event", json=VALID_EVENT_PAYLOAD)
            assert r.status_code == 200
            body = r.json()
            assert body["violation_count"] == 0
            assert body["session_status"] == "ACTIVE"
            assert "disabled" in body["warning_message"].lower()


# ─────────────────────────────────────────────
# Admin endpoints (still mocked)
# ─────────────────────────────────────────────

class TestAdminSessionList:
    def test_returns_list(self, client):
        r = client.get("/api/admin/sessions")
        assert r.status_code == 200
        body = r.json()
        assert "sessions" in body
        assert isinstance(body["sessions"], list)

    def test_filter_by_status(self, client):
        r = client.get("/api/admin/sessions?status=COMPLETED")
        assert r.status_code == 200
        for s in r.json()["sessions"]:
            assert s["status"] == "COMPLETED"

    def test_filter_by_language(self, client):
        r = client.get("/api/admin/sessions?language=Python")
        assert r.status_code == 200
        for s in r.json()["sessions"]:
            assert s["language"].lower() == "python"

    def test_invalid_status_rejected(self, client):
        r = client.get("/api/admin/sessions?status=INVALID_STATUS")
        assert r.status_code == 422


class TestAdminSessionDetail:
    def test_success(self, client):
        r_create = client.post("/api/sessions/create", json=VALID_CREATE_PAYLOAD)
        session_id = r_create.json()["session_id"]
        r = client.get(f"/api/admin/sessions/{session_id}")
        assert r.status_code == 200
        body = r.json()
        assert "session" in body
        assert "qa_transcript" in body
        assert "proctoring_logs" in body

    def test_unknown_session_returns_404(self, client):
        r = client.get("/api/admin/sessions/00000000-0000-0000-0000-000000000000")
        assert r.status_code == 404
