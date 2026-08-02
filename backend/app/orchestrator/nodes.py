import random
from .state import InterviewState

INTERVIEW_TOPICS = [
    "Memory Management and Garbage Collection",
    "Concurrency, Threading, and Async Programming",
    "Data Structures and Algorithms",
    "System Design and Architecture",
    "Performance Optimization and Profiling",
    "Security and Vulnerability Prevention",
    "Error Handling and Fault Tolerance",
    "Design Patterns and Best Practices",
    "Database Interactions and ORMs",
    "Testing, Mocking, and Debugging",
    "Functional Programming Concepts",
    "Object-Oriented Programming Principles",
    "Network Protocols and I/O Operations"
]
from .llm import get_llm, ProcessAnswerResult
from app.config import MAX_MAIN_QUESTIONS, MAX_FOLLOW_UPS_PER_QUESTION
from .prompts import (
    get_init_question_prompt,
    get_process_answer_prompt,
    get_generate_followup_prompt,
    get_generate_next_question_prompt
)
def init_question_node(state: InterviewState) -> dict:
    llm = get_llm()
    prompt = get_init_question_prompt(
        experience=state.get("experience", 0),
        language=state.get("language", "programming"),
        random_topic=random.choice(INTERVIEW_TOPICS),
        resume_text=state.get("resume_text", "")
    )
    
    response = llm.invoke(prompt)
    content = response.content
    if isinstance(content, list):
        content = content[0].get("text", "") if content else ""
    elif not isinstance(content, str):
        content = str(content)
        
    return {
        "messages": [{"role": "ai", "content": content}],
        "question_count": state.get("question_count", 0) + 1,
        "followup_count": 0,
        "current_topic": "Initial Setup"
    }

def process_answer_node(state: InterviewState) -> dict:
    llm = get_llm().with_structured_output(ProcessAnswerResult)
    
    # build history
    history_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in state["messages"]])
    current_q_num = state.get("question_count", 1)
    followup_cnt = state.get("followup_count", 0)
    
    ai_msgs = [m for m in state["messages"] if m["role"] == "ai"]
    user_msgs = [m for m in state["messages"] if m["role"] == "user"]
    latest_ai_q = ai_msgs[-1]["content"] if ai_msgs else ""
    latest_user_a = user_msgs[-1]["content"] if user_msgs else ""
    
    prompt = get_process_answer_prompt(
        current_q_num=current_q_num,
        max_main_questions=MAX_MAIN_QUESTIONS,
        followup_cnt=followup_cnt,
        max_follow_ups=MAX_FOLLOW_UPS_PER_QUESTION,
        latest_ai_q=latest_ai_q,
        latest_user_a=latest_user_a,
        history_text=history_text
    )

    result = llm.invoke(prompt)
    score = getattr(result, "score", 8)
    try:
        score = max(0, min(10, int(score)))
    except (ValueError, TypeError):
        score = 8
    
    if result.action == "followup" and state.get("followup_count", 0) < MAX_FOLLOW_UPS_PER_QUESTION:
        return {"current_topic": result.feedback, "last_score": score, "last_feedback": result.feedback}
    else:
        return {"current_topic": "next_question_requested", "last_score": score, "last_feedback": result.feedback}

def generate_followup_node(state: InterviewState) -> dict:
    llm = get_llm()
    history_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in state["messages"]])
    current_q_num = state.get("question_count", 1)
    followup_cnt = state.get("followup_count", 0)
    
    prompt = get_generate_followup_prompt(
        current_q_num=current_q_num,
        history_text=history_text,
        followup_cnt=followup_cnt,
        max_follow_ups=MAX_FOLLOW_UPS_PER_QUESTION,
        current_topic=state.get("current_topic", "")
    )

    response = llm.invoke(prompt)
    content = response.content
    if isinstance(content, list):
        content = content[0].get("text", "") if content else ""
    elif not isinstance(content, str):
        content = str(content)
        
    return {
        "messages": [{"role": "ai", "content": content}],
        "followup_count": state.get("followup_count", 0) + 1
    }

def generate_next_question_node(state: InterviewState) -> dict:
    llm = get_llm()
    history_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in state["messages"]])
    
    prompt = get_generate_next_question_prompt(
        experience=state.get("experience", 0),
        language=state.get("language", "programming"),
        history_text=history_text,
        random_topic=random.choice(INTERVIEW_TOPICS),
        resume_text=state.get("resume_text", "")
    )
    
    response = llm.invoke(prompt)
    content = response.content
    if isinstance(content, list):
        content = content[0].get("text", "") if content else ""
    elif not isinstance(content, str):
        content = str(content)
        
    return {
        "messages": [{"role": "ai", "content": content}],
        "question_count": state.get("question_count", 0) + 1,
        "followup_count": 0
    }
