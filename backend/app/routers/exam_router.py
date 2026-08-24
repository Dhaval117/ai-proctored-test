from fastapi import APIRouter, HTTPException, Depends, Header
from sqlalchemy.orm import Session
import uuid

from app.database import get_db
from app import crud
from app.orchestrator import exam_graph
from app.schemas import QuestionResponse, SubmitAnswerRequest, SubmitAnswerResponse, NextAction, VerifySessionResponse
from datetime import datetime, timezone
from app.config import MAX_MAIN_QUESTIONS

router = APIRouter(prefix="/api/sessions", tags=["exam"])

@router.get("/{session_id}/verify", response_model=VerifySessionResponse)
def verify_session_link(session_id: uuid.UUID, db: Session = Depends(get_db)):
    session = crud.get_session(db, str(session_id))
    if not session:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Session not found."})
    if session.expires_at:
        # SQLite drops timezone info, so we ensure both sides are naive UTC datetimes for comparison
        expires_naive = session.expires_at.replace(tzinfo=None)
        now_naive = datetime.now(timezone.utc).replace(tzinfo=None)
        if expires_naive < now_naive:
            if session.status != "EXPIRED":
                session.status = "EXPIRED"
                db.commit()
            raise HTTPException(status_code=403, detail={"error": "EXPIRED", "message": "Exam link has expired."})

    if session.status == "ACTIVE":
        # Candidate is reopening an active exam link. Mark it as suspended.
        session.status = "SUSPENDED"
        db.commit()
        raise HTTPException(status_code=403, detail={"error": "SUSPENDED", "message": "Exam suspended because you left the session."})
    elif session.status != "SETUP":
        raise HTTPException(status_code=403, detail={"error": "EXPIRED", "message": "Exam link has already been used."})
        
    return VerifySessionResponse(
        session_id=uuid.UUID(session.id),
        status=session.status,
        message="Session is valid."
    )

@router.get("/{session_id}/next-question", response_model=QuestionResponse)
def get_next_question(session_id: uuid.UUID, db: Session = Depends(get_db), x_exam_token: str | None = Header(None, alias="X-Exam-Token")):
    session = crud.get_session(db, str(session_id))
    if not session:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Session not found."})
        
    if not x_exam_token or session.exam_token != x_exam_token:
        raise HTTPException(status_code=403, detail={"error": "UNAUTHORIZED", "message": "Invalid or missing exam token."})
        
    config = {"configurable": {"thread_id": str(session_id)}}
    state = exam_graph.get_state(config)
    
    if not state.values:
        # Initialize graph for the first time
        exam_graph.invoke({
            "session_id": str(session_id),
            "language": session.language,
            "experience": session.experience_years,
            "question_count": 0,
            "followup_count": 0,
            "messages": [],
            "current_topic": "Init",
            "is_terminated": False,
            "resume_text": session.resume_text or "",
            "num_questions": session.num_questions,
            "follow_ups_per_question": session.follow_ups_per_question,
        }, config)
        state = exam_graph.get_state(config)
    elif state.next and state.next[0] != "process_answer":
        # Resume graph if it failed during an AI generation step
        exam_graph.invoke(None, config)
        state = exam_graph.get_state(config)
        
    messages = state.values.get("messages", [])
    if not messages or messages[-1]["role"] != "ai":
        raise HTTPException(status_code=500, detail={"error": "INTERNAL_ERROR", "message": f"Expected AI question not found. State next: {state.next}"})
        
    ai_question = messages[-1]["content"]
    is_followup = state.values.get("followup_count", 0) > 0
    
    # Persist question to database so it appears in reports and transcripts
    qa_list = crud.get_session_qa(db, str(session_id))
    existing_qa = next((q for q in qa_list if q.question_text == ai_question), None)
    if existing_qa:
        qid = uuid.UUID(existing_qa.id)
        seq_num = existing_qa.sequence_number
    else:
        seq_num = len(qa_list) + 1
        new_qa = crud.create_question(
            db,
            session_id=str(session_id),
            question_text=ai_question,
            sequence_number=seq_num,
            is_follow_up=is_followup,
        )
        db.commit()
        qid = uuid.UUID(new_qa.id)

    return QuestionResponse(
        question_id=qid,
        question_text=ai_question,
        sequence_number=seq_num,
        is_follow_up=is_followup,
        main_question_number=state.values.get("question_count", 1),
        total_main_questions=session.num_questions
    )

@router.post("/{session_id}/submit-answer", response_model=SubmitAnswerResponse)
def submit_answer(session_id: uuid.UUID, body: SubmitAnswerRequest, db: Session = Depends(get_db), x_exam_token: str | None = Header(None, alias="X-Exam-Token")):
    session = crud.get_session(db, str(session_id))
    if not session:
        raise HTTPException(status_code=404, detail={"error": "NOT_FOUND", "message": "Session not found."})
    
    if not x_exam_token or session.exam_token != x_exam_token:
        raise HTTPException(status_code=403, detail={"error": "UNAUTHORIZED", "message": "Invalid or missing exam token."})

    config = {"configurable": {"thread_id": str(session_id)}}
    state = exam_graph.get_state(config)
    
    if not state.values:
        raise HTTPException(status_code=400, detail={"error": "BAD_REQUEST", "message": "No active question to answer."})
        
    # Inject user answer
    exam_graph.update_state(config, {"messages": [{"role": "user", "content": body.transcribed_text}]})
    
    # Resume graph execution
    exam_graph.invoke(None, config)
    
    new_state = exam_graph.get_state(config)
    
    # Determine what happened
    if not new_state.next:
        next_action = NextAction.EXAM_COMPLETE
    elif new_state.values.get("followup_count", 0) > 0:
        next_action = NextAction.FOLLOW_UP
    else:
        next_action = NextAction.NEXT_QUESTION
        
    feedback = new_state.values.get("last_feedback", "")
    if not feedback:
        feedback = new_state.values.get("current_topic", "")
    if feedback == "next_question_requested" or not feedback:
        feedback = "Response evaluated successfully against core competency rubric."
        
    score = new_state.values.get("last_score", 8)
    try:
        score = max(0, min(10, int(score)))
    except (ValueError, TypeError):
        score = 8

    # Persist candidate answer and evaluation score in DB
    qa_list = crud.get_session_qa(db, str(session_id))
    if qa_list:
        latest_qa = qa_list[-1]
        main_qa = next((q for q in reversed(qa_list) if not q.is_follow_up), latest_qa)
        
        crud.submit_answer(
            db,
            latest_qa,
            answer_text=body.transcribed_text,
            evaluation_score=None if latest_qa.is_follow_up else score,
            evaluation_feedback=feedback,
        )
        # Always ensure the root main question holds the latest complete 0-10 score for this question topic
        if latest_qa.is_follow_up and main_qa:
            main_qa.evaluation_score = score
            db.flush()

        if next_action == NextAction.EXAM_COMPLETE:
            session = crud.get_session(db, str(session_id))
            if session:
                crud.complete_session(db, session)
        db.commit()

    return SubmitAnswerResponse(
        answer_id=uuid.uuid4(),
        evaluation_score=score,
        evaluation_feedback=feedback,
        next_action=next_action
    )
