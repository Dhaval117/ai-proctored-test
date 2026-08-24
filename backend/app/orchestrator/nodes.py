import random
from .state import InterviewState


from .llm import get_llm, ProcessAnswerResult
from .prompts import (
    get_init_question_prompt,
    get_process_answer_prompt,
    get_generate_followup_prompt,
    get_generate_next_question_prompt
)

def get_difficulty(current_q_num: int, total_q: int) -> str:
    if total_q < 5:
        if total_q == 1:
            return "Medium"
        if total_q == 2:
            return "Easy" if current_q_num == 1 else "Medium"
        if total_q == 3:
            return ["Easy", "Medium", "Hard"][current_q_num - 1]
        if total_q == 4:
            return ["Easy", "Easy", "Medium", "Hard"][current_q_num - 1]
            
    easy_count = round(total_q * 0.6)
    medium_count = round(total_q * 0.2)
    
    if current_q_num <= easy_count:
        return "Easy"
    elif current_q_num <= easy_count + medium_count:
        return "Medium"
    else:
        return "Hard"

def init_question_node(state: InterviewState) -> dict:
    llm = get_llm()
    max_main_questions = state.get("num_questions", 5)
    prompt = get_init_question_prompt(
        experience=state.get("experience", 0),
        language=state.get("language", "programming"),
        difficulty=get_difficulty(1, max_main_questions),
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
    
    max_main_questions = state.get("num_questions", 5)
    max_follow_ups = state.get("follow_ups_per_question", 1)
    
    prompt = get_process_answer_prompt(
        current_q_num=current_q_num,
        max_main_questions=max_main_questions,
        followup_cnt=followup_cnt,
        max_follow_ups=max_follow_ups,
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
    
    if result.action == "followup" and state.get("followup_count", 0) < max_follow_ups:
        return {"current_topic": result.feedback, "last_score": score, "last_feedback": result.feedback}
    else:
        return {"current_topic": "next_question_requested", "last_score": score, "last_feedback": result.feedback}

def generate_followup_node(state: InterviewState) -> dict:
    llm = get_llm()
    history_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in state["messages"]])
    current_q_num = state.get("question_count", 1)
    followup_cnt = state.get("followup_count", 0)
    
    max_follow_ups = state.get("follow_ups_per_question", 1)
    
    prompt = get_generate_followup_prompt(
        current_q_num=current_q_num,
        history_text=history_text,
        followup_cnt=followup_cnt,
        max_follow_ups=max_follow_ups,
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
    
    current_q_num = state.get("question_count", 0) + 1
    max_main_questions = state.get("num_questions", 5)
    difficulty = get_difficulty(current_q_num, max_main_questions)
    
    prompt = get_generate_next_question_prompt(
        experience=state.get("experience", 0),
        language=state.get("language", "programming"),
        history_text=history_text,
        difficulty=difficulty,
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
