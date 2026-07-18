"""
Pydantic schemas matching the OpenAPI 3.0 specification exactly.
These will be reused across mock routers (Story 1.1) and real routers (Story 1.3+).
"""
from __future__ import annotations

import uuid
from pydantic import ConfigDict
from datetime import datetime
from enum import Enum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field


# ─────────────────────────────────────────────
# ENUMS
# ─────────────────────────────────────────────

class ExamStatus(str, Enum):
    SETUP = "SETUP"
    ACTIVE = "ACTIVE"
    COMPLETED = "COMPLETED"
    SUSPENDED = "SUSPENDED"


class ViolationType(str, Enum):
    TAB_SWITCH = "TAB_SWITCH"
    COPY_PASTE = "COPY_PASTE"
    DEV_TOOLS = "DEV_TOOLS"
    NO_FACE = "NO_FACE"
    MULTI_FACE = "MULTI_FACE"
    BACKGROUND_NOISE = "BACKGROUND_NOISE"
    FACE_MISMATCH = "FACE_MISMATCH"


class SeverityLevel(str, Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class NextAction(str, Enum):
    FOLLOW_UP = "FOLLOW_UP"
    NEXT_QUESTION = "NEXT_QUESTION"
    EXAM_COMPLETE = "EXAM_COMPLETE"


# ─────────────────────────────────────────────
# REQUEST BODIES
# ─────────────────────────────────────────────

class CreateSessionRequest(BaseModel):
    model_config = ConfigDict(json_schema_extra={
        "example": {
            "name": "Dhaval Patel",
            "email": "dhaval@example.com",
            "language": "Python",
            "experience_years": 3,
        }
    })

    name: str = Field(..., min_length=2, max_length=255)
    email: EmailStr
    language: str = Field(..., min_length=1, max_length=100,
                          description="The technology/language the candidate is being assessed on")
    experience_years: int = Field(..., ge=0, le=40,
                                  description="Candidate's self-reported years of experience")


class VerifySessionRequest(BaseModel):
    reference_photo: str = Field(
        ...,
        description="Base64 data URL of the candidate's portrait (e.g. data:image/jpeg;base64,...)",
    )


class SubmitAnswerRequest(BaseModel):
    question_id: uuid.UUID = Field(..., description="UUID of the question being answered")
    transcribed_text: str = Field(
        ...,
        min_length=1,
        max_length=5000,
        description="Browser-transcribed text of the candidate's verbal answer",
    )


class LogEventRequest(BaseModel):
    event_type: ViolationType
    severity: SeverityLevel
    snapshot: Optional[str] = Field(
        default=None,
        description="Optional base64 screenshot for MULTI_FACE or FACE_MISMATCH events",
    )


# ─────────────────────────────────────────────
# RESPONSE BODIES
# ─────────────────────────────────────────────

class CreateSessionResponse(BaseModel):
    session_id: uuid.UUID
    candidate_id: uuid.UUID
    status: ExamStatus
    message: str


class VerifySessionResponse(BaseModel):
    session_id: uuid.UUID
    status: ExamStatus
    message: str


class SessionDetail(BaseModel):
    session_id: uuid.UUID
    candidate_id: uuid.UUID
    candidate_name: str
    language: str
    experience_years: int
    status: ExamStatus
    violation_count: int
    risk_score: int
    created_at: datetime
    completed_at: Optional[datetime] = None


class QuestionResponse(BaseModel):
    question_id: uuid.UUID
    question_text: str
    sequence_number: int
    is_follow_up: bool
    main_question_number: int
    total_main_questions: int


class SubmitAnswerResponse(BaseModel):
    answer_id: uuid.UUID
    evaluation_score: int = Field(..., ge=0, le=10)
    evaluation_feedback: str
    next_action: NextAction


class LogEventResponse(BaseModel):
    violation_count: int
    max_violations: int
    session_status: ExamStatus
    warning_message: str


class ProctoringConfigResponse(BaseModel):
    proctoring_enabled: bool
    allow_toggle: bool


class AdminSessionSummary(BaseModel):
    session_id: uuid.UUID
    candidate_name: str
    candidate_email: str
    language: str
    experience_years: int
    status: ExamStatus
    violation_count: int
    risk_score: int
    created_at: datetime
    completed_at: Optional[datetime] = None


class AdminSessionListResponse(BaseModel):
    total: int
    page: int
    page_size: int
    sessions: List[AdminSessionSummary]


class ProctoringLogEntry(BaseModel):
    id: uuid.UUID
    event_type: ViolationType
    severity: SeverityLevel
    warning_number: Optional[int] = None
    timestamp: datetime
    snapshot: Optional[str] = None


class QAEntry(BaseModel):
    question_id: uuid.UUID
    question_text: str
    answer_text: Optional[str] = None
    is_follow_up: bool
    sequence_number: int
    evaluation_score: Optional[int] = None
    evaluation_feedback: Optional[str] = None
    created_at: datetime


class AdminSessionDetailResponse(BaseModel):
    session: SessionDetail
    qa_transcript: List[QAEntry]
    proctoring_logs: List[ProctoringLogEntry]


class ErrorResponse(BaseModel):
    error: str
    message: str
    details: Optional[dict] = None
