"""Add EXPIRED status

Revision ID: 7535d26ace68
Revises: a873690b0780
Create Date: 2026-08-17 21:56:47.376935

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '7535d26ace68'
down_revision: Union[str, None] = 'a873690b0780'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    with op.batch_alter_table('exam_sessions', schema=None) as batch_op:
        batch_op.alter_column('status',
               existing_type=sa.VARCHAR(length=9),
               type_=sa.Enum('SETUP', 'ACTIVE', 'COMPLETED', 'SUSPENDED', 'EXPIRED', name='exam_status', create_constraint=False),
               existing_nullable=False)


def downgrade() -> None:
    with op.batch_alter_table('exam_sessions', schema=None) as batch_op:
        batch_op.alter_column('status',
               existing_type=sa.Enum('SETUP', 'ACTIVE', 'COMPLETED', 'SUSPENDED', 'EXPIRED', name='exam_status', create_constraint=False),
               type_=sa.VARCHAR(length=9),
               existing_nullable=False)
