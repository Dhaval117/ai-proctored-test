"""Initial schema: Candidate, ExamSession, ExamQA, ProctoringLog

Revision ID: 20260715_01
Revises: 
Create Date: 2026-07-15 12:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "20260715_01"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. Candidates table ─────────────────────────────────────────
    op.create_table(
        "candidates",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("name", sa.String(length=255), nullable=False),
        sa.Column("email", sa.String(length=255), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("candidates", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_candidates_email"), ["email"], unique=True)

    # ── 2. Exam Sessions table ──────────────────────────────────────
    op.create_table(
        "exam_sessions",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("candidate_id", sa.String(length=36), nullable=False),
        sa.Column("language", sa.String(length=100), nullable=False),
        sa.Column("experience_years", sa.Integer(), nullable=False),
        sa.Column("reference_photo", sa.Text(), nullable=True),
        sa.Column("status", sa.String(length=50), nullable=False),
        sa.Column("violation_count", sa.Integer(), nullable=False),
        sa.Column("risk_score", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["candidate_id"], ["candidates.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("exam_sessions", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_exam_sessions_candidate_id"), ["candidate_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_exam_sessions_status"), ["status"], unique=False)

    # ── 3. Exam QA table ────────────────────────────────────────────
    op.create_table(
        "exam_qa",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("question_text", sa.Text(), nullable=False),
        sa.Column("answer_text", sa.Text(), nullable=True),
        sa.Column("is_follow_up", sa.Boolean(), nullable=False),
        sa.Column("parent_qa_id", sa.String(length=36), nullable=True),
        sa.Column("sequence_number", sa.Integer(), nullable=False),
        sa.Column("evaluation_score", sa.Integer(), nullable=True),
        sa.Column("evaluation_feedback", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["parent_qa_id"], ["exam_qa.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["session_id"], ["exam_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("exam_qa", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_exam_qa_session_id"), ["session_id"], unique=False)

    # ── 4. Proctoring Logs table ────────────────────────────────────
    op.create_table(
        "proctoring_logs",
        sa.Column("id", sa.String(length=36), nullable=False),
        sa.Column("session_id", sa.String(length=36), nullable=False),
        sa.Column("event_type", sa.String(length=100), nullable=False),
        sa.Column("severity", sa.String(length=50), nullable=False),
        sa.Column("warning_number", sa.Integer(), nullable=True),
        sa.Column("timestamp", sa.DateTime(timezone=True), nullable=True),
        sa.Column("snapshot", sa.Text(), nullable=True),
        sa.ForeignKeyConstraint(["session_id"], ["exam_sessions.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    with op.batch_alter_table("proctoring_logs", schema=None) as batch_op:
        batch_op.create_index(batch_op.f("ix_proctoring_logs_session_id"), ["session_id"], unique=False)
        batch_op.create_index(batch_op.f("ix_proctoring_logs_timestamp"), ["timestamp"], unique=False)


def downgrade() -> None:
    with op.batch_alter_table("proctoring_logs", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_proctoring_logs_timestamp"))
        batch_op.drop_index(batch_op.f("ix_proctoring_logs_session_id"))
    op.drop_table("proctoring_logs")

    with op.batch_alter_table("exam_qa", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_exam_qa_session_id"))
    op.drop_table("exam_qa")

    with op.batch_alter_table("exam_sessions", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_exam_sessions_status"))
        batch_op.drop_index(batch_op.f("ix_exam_sessions_candidate_id"))
    op.drop_table("exam_sessions")

    with op.batch_alter_table("candidates", schema=None) as batch_op:
        batch_op.drop_index(batch_op.f("ix_candidates_email"))
        batch_op.drop_table("candidates")
