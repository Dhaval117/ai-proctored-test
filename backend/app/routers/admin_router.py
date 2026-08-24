"""
admin_router.py — Real DB-backed admin endpoints.

Story 5.1: Admin Sessions List (view candidates list and risk summaries)
Story 5.2: Admin Exam Report Page (drill down into candidate transcripts and flag history)
"""
from __future__ import annotations

import uuid
from typing import Annotated, Optional
from datetime import datetime, timedelta, timezone
import io

from fastapi import APIRouter, Depends, HTTPException, Query, status, UploadFile, File
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload
from pypdf import PdfReader

from app import crud
from app.database import get_db
from app.models import ExamSession, Candidate, AdminUser
from app.auth import get_current_admin, verify_password, create_access_token, get_current_superadmin, get_password_hash
from app.config import MAX_MAIN_QUESTIONS
from app.orchestrator.llm import get_llm
from app.schemas import (
    AdminSessionDetailResponse,
    AdminSessionListResponse,
    AdminSessionSummary,
    ExamStatus,
    ProctoringLogEntry,
    QAEntry,
    SessionDetail,
    SeverityLevel,
    ViolationType,
    TokenResponse,
    CreateSessionRequest,
    CreateSessionResponse,
    ParseResumeResponse,
    AdminUserResponse,
    AdminUserListResponse,
    AdminCreateRequest,
    ChangePasswordRequest
)

router = APIRouter(prefix="/api/admin", tags=["admin"])

DbSession = Annotated[Session, Depends(get_db)]

@router.post("/login", response_model=TokenResponse)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    admin = crud.get_admin_by_email(db, form_data.username)
    if not admin or not verify_password(form_data.password, admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    access_token = create_access_token(data={"sub": admin.email})
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me")
def read_users_me(current_admin: AdminUser = Depends(get_current_admin)):
    return {"id": current_admin.id, "email": current_admin.email, "is_superadmin": current_admin.is_superadmin}

@router.put("/me/password")
def update_my_password(
    request: ChangePasswordRequest,
    db: DbSession,
    current_admin: AdminUser = Depends(get_current_admin)
):
    if not verify_password(request.current_password, current_admin.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Incorrect current password"
        )
    crud.update_admin_password(db, current_admin, get_password_hash(request.new_password))
    db.commit()
    return {"message": "Password updated successfully"}

@router.get("/managers", response_model=AdminUserListResponse)
def list_managers(
    db: DbSession,
    current_superadmin: AdminUser = Depends(get_current_superadmin)
):
    admins = crud.get_all_admins(db)
    return AdminUserListResponse(
        admins=[
            AdminUserResponse(
                id=uuid.UUID(admin.id),
                email=admin.email,
                is_superadmin=admin.is_superadmin,
                created_at=admin.created_at
            ) for admin in admins
        ]
    )

@router.post("/managers", response_model=AdminUserResponse)
def create_manager(
    request: AdminCreateRequest,
    db: DbSession,
    current_superadmin: AdminUser = Depends(get_current_superadmin)
):
    existing = crud.get_admin_by_email(db, request.email)
    if existing:
        raise HTTPException(status_code=400, detail="Admin with this email already exists")
    
    new_admin = crud.create_admin(
        db,
        email=request.email,
        hashed_password=get_password_hash(request.password),
        is_superadmin=request.is_superadmin
    )
    db.commit()
    db.refresh(new_admin)
    return AdminUserResponse(
        id=uuid.UUID(new_admin.id),
        email=new_admin.email,
        is_superadmin=new_admin.is_superadmin,
        created_at=new_admin.created_at
    )

@router.delete("/managers/{admin_id}")
def delete_manager(
    admin_id: str,
    db: DbSession,
    current_superadmin: AdminUser = Depends(get_current_superadmin)
):
    target_admin = db.get(AdminUser, admin_id)
    if not target_admin:
        raise HTTPException(status_code=404, detail="Admin not found")
    
    if target_admin.is_superadmin:
        raise HTTPException(status_code=400, detail="Cannot delete a superadmin")
        
    crud.delete_admin(db, admin_id)
    db.commit()
    return {"message": "Admin deleted successfully"}

@router.post("/parse-resume", response_model=ParseResumeResponse)
def parse_resume(file: UploadFile = File(...), current_admin: AdminUser = Depends(get_current_admin)):
    if not file.filename.lower().endswith('.pdf'):
        raise HTTPException(status_code=400, detail="Only PDF files are supported.")
    
    try:
        content = file.file.read()
        reader = PdfReader(io.BytesIO(content))
        text = ""
        for page in reader.pages:
            text += page.extract_text() + "\\n"
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Failed to parse PDF: {str(e)}")

    if not text.strip():
        raise HTTPException(status_code=400, detail="No text could be extracted from the PDF.")

    # Skip LLM summarization to return the complete raw PDF text
    return ParseResumeResponse(
        language="Resume Based",
        experience_years=0,
        projects_summary=text
    )

@router.post("/sessions", response_model=CreateSessionResponse)
def create_admin_session(
    request: CreateSessionRequest,
    db: DbSession,
    current_admin: AdminUser = Depends(get_current_admin)
):
    candidate = crud.get_or_create_candidate(db, name=request.name, email=request.email)
    
    expires_at = None
    if request.expires_in_hours:
        expires_at = datetime.now(timezone.utc) + timedelta(hours=request.expires_in_hours)

    session = crud.create_session(
        db,
        candidate_id=candidate.id,
        language=request.language,
        experience_years=request.experience_years,
        expires_at=expires_at,
        resume_text=request.resume_text,
        num_questions=request.num_questions,
        follow_ups_per_question=request.follow_ups_per_question
    )
    db.commit()
    db.refresh(session)
    
    return CreateSessionResponse(
        session_id=uuid.UUID(session.id),
        candidate_id=uuid.UUID(candidate.id),
        status=ExamStatus(session.status),
        message="Session created successfully by admin"
    )



@router.get("/sessions", response_model=AdminSessionListResponse)
def list_admin_sessions(
    db: DbSession,
    status_filter: Optional[ExamStatus] = Query(None, alias="status"),
    language: Optional[str] = Query(None),
    search: Optional[str] = Query(None, description="Search candidate name or email"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    current_admin: AdminUser = Depends(get_current_admin),
):
    """
    Story 5.1: Return paginated list of candidate exam sessions with risk summaries.
    Supports filtering by status, language, and name/email search.
    """
    stmt = select(ExamSession).join(Candidate).options(selectinload(ExamSession.questions))

    if status_filter:
        stmt = stmt.where(ExamSession.status == status_filter.value)
    if language:
        stmt = stmt.where(ExamSession.language.ilike(f"%{language}%"))
    if search:
        search_pattern = f"%{search}%"
        stmt = stmt.where(
            (Candidate.name.ilike(search_pattern)) | (Candidate.email.ilike(search_pattern))
        )

    stmt = stmt.order_by(ExamSession.created_at.desc())

    # Count total
    all_matching = db.scalars(stmt).all()
    total = len(all_matching)

    # Paginate
    sessions_page = all_matching[(page - 1) * page_size : page * page_size]

    summaries = [
        AdminSessionSummary(
            session_id=uuid.UUID(s.id),
            candidate_name=s.candidate.name,
            candidate_email=s.candidate.email,
            language=s.language,
            experience_years=s.experience_years,
            status=ExamStatus(s.status),
            violation_count=s.violation_count,
            average_score=round(sum([q.evaluation_score for q in s.questions if q.evaluation_score is not None]) / len([q for q in s.questions if q.evaluation_score is not None]), 1) if [q for q in s.questions if q.evaluation_score is not None] else None,
            created_at=s.created_at,
            completed_at=s.completed_at,
            expires_at=s.expires_at,
        )
        for s in sessions_page
    ]

    return AdminSessionListResponse(
        total=total,
        page=page,
        page_size=page_size,
        sessions=summaries,
    )


@router.get("/sessions/{session_id}", response_model=AdminSessionDetailResponse)
def get_admin_session_detail(
    session_id: uuid.UUID, 
    db: DbSession,
    current_admin: AdminUser = Depends(get_current_admin)
):
    """
    Story 5.2: Return full audit report for a session: candidate details, Q&A transcript,
    and proctoring log timeline.
    """
    session = crud.get_session(db, str(session_id))
    if not session:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail={"error": "NOT_FOUND", "message": f"Session {session_id} not found."},
        )

    session_detail = SessionDetail(
        session_id=uuid.UUID(session.id),
        candidate_id=uuid.UUID(session.candidate_id),
        candidate_name=session.candidate.name,
        language=session.language,
        experience_years=session.experience_years,
        status=ExamStatus(session.status),
        violation_count=session.violation_count,
        risk_score=session.risk_score,
        created_at=session.created_at,
        completed_at=session.completed_at,
        total_questions=session.num_questions,
        num_questions=session.num_questions,
        follow_ups_per_question=session.follow_ups_per_question,
    )

    qa_rows = crud.get_session_qa(db, str(session_id))
    log_rows = crud.get_session_logs(db, str(session_id))

    qa_transcript = [
        QAEntry(
            question_id=uuid.UUID(qa.id),
            question_text=qa.question_text,
            answer_text=qa.answer_text,
            is_follow_up=qa.is_follow_up,
            sequence_number=qa.sequence_number,
            evaluation_score=qa.evaluation_score,
            evaluation_feedback=qa.evaluation_feedback,
            created_at=qa.created_at,
        )
        for qa in qa_rows
    ]

    proctoring_logs = [
        ProctoringLogEntry(
            id=uuid.UUID(log.id),
            event_type=ViolationType(log.event_type),
            severity=SeverityLevel(log.severity),
            warning_number=log.warning_number,
            timestamp=log.timestamp,
            snapshot=log.snapshot,
        )
        for log in log_rows
    ]

    return AdminSessionDetailResponse(
        session=session_detail,
        qa_transcript=qa_transcript,
        proctoring_logs=proctoring_logs,
    )
