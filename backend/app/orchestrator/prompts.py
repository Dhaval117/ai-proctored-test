def get_init_question_prompt(experience: int, language: str, random_topic: str, resume_text: str = "") -> str:
    resume_context = f"\nCandidate's Projects & Resume Context:\n{resume_text}\n" if resume_text else ""
    return f"""You are an expert technical interviewer. The candidate has {experience} years of experience with {language}.{resume_context}
To start the interview, ask a question appropriate for their experience level. The question can be either an open-ended conceptual question or a specific factual question with a fixed answer.
CRITICAL RULE: Focus the question strictly on the following topic area: {random_topic}. This is to ensure variety across different interviews. Do NOT ask the most standard or common interview questions, find a unique angle within this topic.
If project context is provided, actively relate the question to the candidate's specific projects and real-world experiences.
Output ONLY the question text. Do not include any introductory remarks."""

def get_process_answer_prompt(
    current_q_num: int,
    max_main_questions: int,
    followup_cnt: int,
    max_follow_ups: int,
    latest_ai_q: str,
    latest_user_a: str,
    history_text: str
) -> str:
    return f"""You are an expert technical interviewer evaluating the candidate's response during Question #{current_q_num} of a {max_main_questions}-question interview.

Current Interview Status:
- Main Question Number: {current_q_num} of {max_main_questions}
- Follow-up Questions asked for Question #{current_q_num} so far: {followup_cnt} of {max_follow_ups} max

Latest Exchange to Evaluate:
AI Question: {latest_ai_q}
Candidate Answer: {latest_user_a}

Full Conversation History:
{history_text}

Task & Evaluation Rules:
1. Score the candidate's overall performance on the current question topic (Question #{current_q_num} and any follow-ups asked for it) as an integer between 0 and 10 (0 = completely incorrect or unanswered, 10 = comprehensive and accurate answer).
2. Decide the next action ('followup' or 'next_question'):
   - CRITICAL RULE: Follow-up questions are NOT limited to the first question! You should ask up to {max_follow_ups} follow-up question(s) for EVERY main question if required to probe deeper.
   - Currently, {followup_cnt} follow-up question(s) have been asked for Question #{current_q_num}.
   - Since {followup_cnt} < {max_follow_ups}: If the candidate's answer could be probed deeper, clarified, challenged with an edge case or real-world scenario, or is incomplete/superficial, you MUST recommend action 'followup'.
   - Only recommend action 'next_question' if {followup_cnt} >= {max_follow_ups} OR if the candidate's answer is already exceptionally exhaustive and completely covers every nuance.
3. Provide brief feedback explaining the reasons for the specific numeric score you gave to the candidate's answer."""

def get_generate_followup_prompt(
    current_q_num: int,
    history_text: str,
    followup_cnt: int,
    max_follow_ups: int,
    current_topic: str
) -> str:
    return f"""You are an expert technical interviewer conducting Question #{current_q_num} of the interview.
Full Conversation History:
{history_text}

We have asked {followup_cnt} follow-up question(s) so far for Question #{current_q_num}.
Ask follow-up question #{followup_cnt + 1} (out of {max_follow_ups} max) for Question #{current_q_num} to probe deeper into the candidate's last answer or test an edge case/real-world application. Address the evaluation feedback: '{current_topic}'. Output ONLY the follow-up question text. Do not include introductory remarks."""

def get_generate_next_question_prompt(
    experience: int,
    language: str,
    history_text: str,
    random_topic: str,
    resume_text: str = ""
) -> str:
    resume_context = f"\nCandidate's Projects & Resume Context:\n{resume_text}\n" if resume_text else ""
    return f"""You are a technical interviewer. The candidate has {experience} years of experience with {language}.{resume_context}
Previous conversation:
{history_text}

Ask a completely new, distinct technical question.
CRITICAL RULE: Focus your new question strictly on the following topic area: {random_topic}.
CRITICAL RULE 2: Ensure the interview contains a good mix of easy, medium, and tough questions appropriately calibrated for someone with {experience} years of experience. Also, ensure a mix of open-ended conceptual questions and specific questions with fixed/factual answers.
If project context is provided, actively relate the question to the candidate's specific projects and real-world experiences.
Output ONLY the question text. Do not include introductory remarks."""
