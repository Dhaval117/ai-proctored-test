"""
Mock data used by the mock API routers.
Simulates what real DB responses would look like.
Will be replaced by actual database queries in Story 1.2.
"""
import uuid
from datetime import datetime, timezone

# Shared timestamp for consistent mock responses
NOW = datetime.now(timezone.utc).isoformat()

SESSION_ID = "f47ac10b-58cc-4372-a567-0e02b2c3d479"
CANDIDATE_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
QUESTION_ID = "b3d1e9a0-1234-5678-9abc-def012345678"
ANSWER_ID = "d5f3g1c2-3456-7890-bcde-f01234567890"
LOG_ID = "e6a4b2d3-4567-8901-cdef-012345678901"

MOCK_SESSION = {
    "session_id": SESSION_ID,
    "candidate_id": CANDIDATE_ID,
    "candidate_name": "Dhaval Patel",
    "language": "Python",
    "experience_years": 3,
    "status": "SETUP",
    "violation_count": 0,
    "risk_score": 0,
    "created_at": NOW,
    "completed_at": None,
}

MOCK_QUESTION = {
    "question_id": QUESTION_ID,
    "question_text": "Can you explain the difference between a list and a tuple in Python?",
    "sequence_number": 2,
    "is_follow_up": False,
    "main_question_number": 2,
    "total_main_questions": 10,
}

MOCK_FOLLOW_UP_QUESTION = {
    "question_id": str(uuid.uuid4()),
    "question_text": "You mentioned immutability — can you give an example of when that would matter in a real project?",
    "sequence_number": 3,
    "is_follow_up": True,
    "main_question_number": 2,
    "total_main_questions": 10,
}

MOCK_QA_TRANSCRIPT = [
    {
        "question_id": str(uuid.uuid4()),
        "question_text": "Tell me about yourself and your Python experience.",
        "answer_text": "I have been working with Python for about 3 years, primarily in backend development using Django and FastAPI.",
        "is_follow_up": False,
        "sequence_number": 1,
        "evaluation_score": 7,
        "evaluation_feedback": "Good introduction but could be more technical.",
        "created_at": NOW,
    },
    {
        "question_id": QUESTION_ID,
        "question_text": "Can you explain the difference between a list and a tuple in Python?",
        "answer_text": "A list is mutable while a tuple is immutable. Lists use square brackets and tuples use parentheses.",
        "is_follow_up": False,
        "sequence_number": 2,
        "evaluation_score": 8,
        "evaluation_feedback": "Correct distinction. Follow-up asked to probe deeper understanding.",
        "created_at": NOW,
    },
]

MOCK_PROCTORING_LOGS = [
    {
        "id": LOG_ID,
        "event_type": "TAB_SWITCH",
        "severity": "MEDIUM",
        "warning_number": 1,
        "timestamp": NOW,
        "snapshot": None,
    }
]

MOCK_ADMIN_SESSIONS = [
    {
        "session_id": SESSION_ID,
        "candidate_name": "Dhaval Patel",
        "candidate_email": "dhaval@example.com",
        "language": "Python",
        "experience_years": 3,
        "status": "COMPLETED",
        "violation_count": 1,
        "risk_score": 10,
        "created_at": NOW,
        "completed_at": NOW,
    },
    {
        "session_id": str(uuid.uuid4()),
        "candidate_name": "Priya Sharma",
        "candidate_email": "priya@example.com",
        "language": "JavaScript",
        "experience_years": 2,
        "status": "SUSPENDED",
        "violation_count": 3,
        "risk_score": 95,
        "created_at": NOW,
        "completed_at": None,
    },
]
