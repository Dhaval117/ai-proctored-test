"""
sql_agent.py — LangChain SQL Agent for querying exam data.

Story: Natural Language Admin Chatbot
"""
import os
import logging
from langchain_community.utilities import SQLDatabase
from langchain_community.agent_toolkits import create_sql_agent
from langchain_google_genai import ChatGoogleGenerativeAI
from sqlalchemy import Engine

from app.config import SQL_AGENT_MODEL
from app.database import engine

logger = logging.getLogger(__name__)

# Only include the tables relevant to exams and candidates, explicitly excluding admin_users.
INCLUDED_TABLES = [
    "candidates",
    "exam_sessions",
    "exam_qa",
    "proctoring_logs"
]

TABLE_DESCRIPTIONS = {
    "candidates": (
        "Represents a person who takes one or more exams. "
        "Columns: "
        "- id: UUID, primary key. "
        "- name: Candidate's full name. "
        "- email: Unique email address. "
        "- created_at: Timestamp of registration."
    ),
    "exam_sessions": (
        "A single exam attempt by a candidate. "
        "Columns: "
        "- id: UUID, primary key. "
        "- candidate_id: Foreign key to candidates.id. "
        "- language: Programming language of the exam. "
        "- experience_years: Candidate's experience in years. "
        "- reference_photo: Base64 image of the candidate. "
        "- status: Enum ('SETUP', 'ACTIVE', 'COMPLETED', 'SUSPENDED', 'EXPIRED'). "
        "- violation_count: Number of MEDIUM/HIGH severity proctoring warnings (max 3 before suspension). "
        "- risk_score: Overall computed risk score for proctoring. "
        "- expires_at: Timestamp when the exam link expires. "
        "- resume_text: Text extracted from candidate's resume. "
        "- num_questions: Number of main questions in the exam. "
        "- follow_ups_per_question: Max follow-up questions per main question. "
        "- exam_token: Unique link token for accessing the exam. "
        "- created_at: Timestamp of session creation. "
        "- completed_at: Timestamp of session completion. "
        "Important Logic: "
        "1. EXPIRED: An exam is considered 'expired' if its `status` is 'EXPIRED' OR (its `status` is 'SETUP' AND its `expires_at` is less than CURRENT_TIMESTAMP). "
        "2. SCORE: The overall 'score' is calculated by averaging `evaluation_score` in `exam_qa` for this session."
    ),
    "exam_qa": (
        "Stores the question text and the candidate's transcribed answer for an exam session, along with AI evaluation results. "
        "Columns: "
        "- id: UUID, primary key. "
        "- session_id: Foreign key to exam_sessions.id. "
        "- question_text: The actual question asked. "
        "- answer_text: The candidate's transcribed answer. "
        "- is_follow_up: Boolean, True if this is a follow-up question. "
        "- parent_qa_id: Foreign key to another exam_qa.id if this is a follow-up. "
        "- sequence_number: Order in which questions were asked. "
        "- evaluation_score: Integer (0-10) scoring the answer. "
        "- evaluation_feedback: Text feedback from the AI evaluation. "
        "- created_at: Timestamp."
    ),
    "proctoring_logs": (
        "A single proctoring violation event within an exam session. "
        "Columns: "
        "- id: UUID, primary key. "
        "- session_id: Foreign key to exam_sessions.id. "
        "- event_type: Enum ('TAB_SWITCH', 'COPY_PASTE', 'DEV_TOOLS', 'NO_FACE', 'MULTI_FACE', 'BACKGROUND_NOISE', 'FACE_MISMATCH'). "
        "- severity: Enum ('LOW', 'MEDIUM', 'HIGH'). LOW severity events DO NOT increment the session's violation_count. "
        "- warning_number: The Nth warning for this session (only for MEDIUM/HIGH). "
        "- timestamp: When the violation occurred. "
        "- snapshot: Base64 image snapshot of the violation."
    )
}

_agent_executor = None

def get_sql_agent(db_engine: Engine | None = None):
    """
    Initializes and returns the LangChain SQL agent.
    We pass the SQLAlchemy engine directly to SQLDatabase.
    """
    global _agent_executor
    # Return the cached agent if it already exists and no custom engine was passed
    if _agent_executor is not None and db_engine is None:
        return _agent_executor

    if db_engine is None:
        db_engine = engine

    # Ensure api key is set (if missing, langchain will raise error, but let's handle gracefully)
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        logger.warning("GEMINI_API_KEY not set. SQL Agent may fail.")

    db = SQLDatabase(
        engine=db_engine,
        include_tables=INCLUDED_TABLES,
        sample_rows_in_table_info=3,
        custom_table_info=TABLE_DESCRIPTIONS
    )

    llm = ChatGoogleGenerativeAI(
        model=SQL_AGENT_MODEL,
        temperature=0,  # Keep it deterministic for SQL generation
        api_key=api_key,
        convert_system_message_to_human=True, # Fix for Gemini strict conversation role errors
    )

    agent_executor = create_sql_agent(
        llm=llm,
        db=db,
        agent_type="zero-shot-react-description", # Workaround for Gemini 3.7 strict tool history validation bug
        verbose=True,
        agent_executor_kwargs={"handle_parsing_errors": True}
    )
    
    # Cache the agent if we are using the default engine
    if db_engine is engine:
        _agent_executor = agent_executor
        
    return agent_executor

async def ask_sql_agent_async(question: str) -> str:
    """
    Runs the agent to answer a natural language question.
    """
    try:
        agent = get_sql_agent()
        
        # Inject query guidelines that apply to all interactions
        enhanced_question = (
            f"User Question: {question}\n\n"
            "--- QUERY GUIDELINES ---\n"
            "Please ensure that ALL string comparisons in your SQL queries (e.g. searching for names, languages, emails, etc.) "
            "are completely CASE-INSENSITIVE by using LOWER() or LIKE. For example: LOWER(language) = 'python'."
        )
        
        response = await agent.ainvoke({"input": enhanced_question})
        output = response.get("output", "I could not find an answer.")
        
        if isinstance(output, list):
            text_blocks = [block.get("text", "") for block in output if isinstance(block, dict) and "text" in block]
            if text_blocks:
                return "".join(text_blocks)
            return str(output)
            
        return str(output)
    except Exception as e:
        logger.error(f"SQL Agent error: {e}")
        return "Sorry, I encountered an error while querying the database. Please try rephrasing your question."
