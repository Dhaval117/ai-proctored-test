import operator
from typing import List, Annotated, TypedDict

class InterviewState(TypedDict):
    session_id: str
    language: str
    experience: int
    question_count: int
    followup_count: int
    messages: Annotated[List[dict], operator.add]
    current_topic: str
    is_terminated: bool
    last_score: int
    last_feedback: str
