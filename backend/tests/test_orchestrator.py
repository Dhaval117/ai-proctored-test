import pytest
import uuid
from typing import Dict, Any

from app.orchestrator.state import InterviewState
from app.orchestrator.graph import exam_graph
from app.orchestrator.llm import ProcessAnswerResult
from langchain_core.messages import AIMessage

# We will mock the invoke method of ChatGoogleGenerativeAI
@pytest.fixture(autouse=True)
def mock_llm_invoke(monkeypatch):
    class MockChatGoogleGenerativeAI:
        def __init__(self, **kwargs):
            pass
            
        def invoke(self, prompt: str) -> AIMessage:
            return AIMessage(content="Mocked question text.")
            
        def with_structured_output(self, schema):
            # Return a mock object that evaluates the structured output
            class MockStructuredOutput:
                def invoke(self, prompt: str) -> ProcessAnswerResult:
                    # Determine response based on prompt contents
                    # We can hardcode it for tests
                    if "bad answer" in prompt.lower():
                        return ProcessAnswerResult(is_satisfactory=False, feedback="Needs detail", action="followup", score=5)
                    return ProcessAnswerResult(is_satisfactory=True, feedback="Good", action="next_question", score=8)
            return MockStructuredOutput()
            
    # Patch the get_llm function
    monkeypatch.setattr("app.orchestrator.nodes.get_llm", lambda: MockChatGoogleGenerativeAI())

def test_initialization():
    session_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": session_id}}
    
    # Run the graph
    initial_state: InterviewState = {
        "session_id": session_id,
        "language": "Python",
        "experience": 3,
        "question_count": 0,
        "followup_count": 0,
        "messages": [],
        "current_topic": "Init",
        "is_terminated": False
    }
    
    exam_graph.invoke(initial_state, config)
    
    # Fetch state
    state = exam_graph.get_state(config)
    
    assert state.values["question_count"] == 1
    assert state.values["followup_count"] == 0
    assert len(state.values["messages"]) == 1
    assert state.values["messages"][-1]["role"] == "ai"
    assert state.values["messages"][-1]["content"] == "Mocked question text."

def test_submit_good_answer():
    session_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": session_id}}
    
    # Run the graph
    initial_state: InterviewState = {
        "session_id": session_id,
        "language": "Python",
        "experience": 3,
        "question_count": 0,
        "followup_count": 0,
        "messages": [],
        "current_topic": "Init",
        "is_terminated": False
    }
    
    # 1. Init
    exam_graph.invoke(initial_state, config)
    
    # 2. Inject user answer
    exam_graph.update_state(config, {"messages": [{"role": "user", "content": "Good answer"}]})
    
    # 3. Resume
    exam_graph.invoke(None, config)
    
    # 4. Assert next state
    state = exam_graph.get_state(config)
    assert state.values["question_count"] == 2
    assert state.values["followup_count"] == 0
    assert len(state.values["messages"]) == 3 # AI (Init), User (Good Answer), AI (Next Question)

def test_submit_bad_answer_triggers_followup():
    session_id = str(uuid.uuid4())
    config = {"configurable": {"thread_id": session_id}}
    
    initial_state: InterviewState = {
        "session_id": session_id,
        "language": "Python",
        "experience": 3,
        "question_count": 0,
        "followup_count": 0,
        "messages": [],
        "current_topic": "Init",
        "is_terminated": False
    }
    
    # 1. Init
    exam_graph.invoke(initial_state, config)
    
    # 2. Inject bad answer
    exam_graph.update_state(config, {"messages": [{"role": "user", "content": "Bad answer"}]})
    
    # 3. Resume
    exam_graph.invoke(None, config)
    
    # 4. Assert next state
    state = exam_graph.get_state(config)
    assert state.values["question_count"] == 1
    assert state.values["followup_count"] == 1
    assert len(state.values["messages"]) == 3 # AI, User, AI (Followup)
