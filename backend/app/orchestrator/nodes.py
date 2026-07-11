from .state import InterviewState
from .llm import get_llm, ProcessAnswerResult

def init_question_node(state: InterviewState) -> dict:
    llm = get_llm()
    prompt = f"You are an expert technical interviewer. The candidate has {state.get('experience', 0)} years of experience with {state.get('language', 'programming')}. Ask a challenging, open-ended conceptual question to start the interview. Output ONLY the question text. Do not include any introductory remarks."
    
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
    
    prompt = f"""You are an expert technical interviewer evaluating the candidate's response during Question #{current_q_num} of a 5-question interview.

Current Interview Status:
- Main Question Number: {current_q_num} of 5
- Follow-up Questions asked for Question #{current_q_num} so far: {followup_cnt} of 2 max

Latest Exchange to Evaluate:
AI Question: {latest_ai_q}
Candidate Answer: {latest_user_a}

Full Conversation History:
{history_text}

Task & Evaluation Rules:
1. Score the candidate's overall performance on the current question topic (Question #{current_q_num} and any follow-ups asked for it) as an integer between 0 and 10 (0 = completely incorrect or unanswered, 10 = comprehensive and accurate answer).
2. Decide the next action ('followup' or 'next_question'):
   - CRITICAL RULE: Follow-up questions are NOT limited to the first question! You should ask up to 2 follow-up questions for EVERY main question (#1, #2, #3, #4, and #5) if required to probe deeper.
   - Currently, {followup_cnt} follow-up question(s) have been asked for Question #{current_q_num}.
   - Since {followup_cnt} < 2: If the candidate's answer could be probed deeper, clarified, challenged with an edge case or real-world scenario, or is incomplete/superficial, you MUST recommend action 'followup'.
   - Only recommend action 'next_question' if {followup_cnt} >= 2 OR if the candidate's answer is already exceptionally exhaustive and completely covers every nuance.
3. Provide internal feedback on the candidate's answer and the numeric score (0 to 10)."""

    result = llm.invoke(prompt)
    score = getattr(result, "score", 8)
    try:
        score = max(0, min(10, int(score)))
    except (ValueError, TypeError):
        score = 8
    
    if result.action == "followup" and state.get("followup_count", 0) < 2:
        return {"current_topic": result.feedback, "last_score": score}
    else:
        return {"current_topic": "next_question_requested", "last_score": score}

def generate_followup_node(state: InterviewState) -> dict:
    llm = get_llm()
    history_text = "\n".join([f"{m['role'].upper()}: {m['content']}" for m in state["messages"]])
    current_q_num = state.get("question_count", 1)
    followup_cnt = state.get("followup_count", 0)
    
    prompt = f"""You are an expert technical interviewer conducting Question #{current_q_num} of the interview.
Full Conversation History:
{history_text}

We have asked {followup_cnt} follow-up question(s) so far for Question #{current_q_num}.
Ask follow-up question #{followup_cnt + 1} (out of 2 max) for Question #{current_q_num} to probe deeper into the candidate's last answer or test an edge case/real-world application. Address the evaluation feedback: '{state.get('current_topic', '')}'. Output ONLY the follow-up question text. Do not include introductory remarks."""

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
    
    prompt = f"""You are a technical interviewer. The candidate has {state.get('experience', 0)} years of experience with {state.get('language', 'programming')}.
Previous conversation:
{history_text}

Ask a completely new, distinct technical question on a different topic. Output ONLY the question. Do not include introductory remarks."""
    
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
