"""
database.py — SQLAlchemy engine, session factory, and declarative Base.

Story 1.2: Sets up the database connection layer.
- Reads DATABASE_URL from environment (defaults to SQLite for testing).
- Provides a `get_db` dependency for FastAPI route injection.
- Exposes `Base` for model declarations and `engine` for migrations / tests.
"""
from __future__ import annotations

import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

# ─────────────────────────────────────────────
# Database URL
# ─────────────────────────────────────────────
# Production: postgresql://user:pass@host:5432/dbname  (from .env)
# Tests:      sqlite:///./test.db  (or sqlite:///:memory: via override)
DATABASE_URL: str = os.getenv(
    "DATABASE_URL",
    "sqlite:///./dev.db",  # safe local fallback for development
)

# PostgreSQL needs pool_pre_ping to handle stale connections.
# SQLite (used in tests) doesn't support pool args — detect and branch.
_is_sqlite = DATABASE_URL.startswith("sqlite")

connect_args = {"check_same_thread": False} if _is_sqlite else {}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    pool_pre_ping=not _is_sqlite,
    echo=os.getenv("DB_ECHO", "false").lower() == "true",
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)


# ─────────────────────────────────────────────
# Declarative Base
# ─────────────────────────────────────────────
class Base(DeclarativeBase):
    pass


# ─────────────────────────────────────────────
# FastAPI dependency
# ─────────────────────────────────────────────
def get_db():
    """
    Yields a SQLAlchemy session, ensuring it is always closed after the request.
    Use as a FastAPI Depends() dependency in route handlers.
    """
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
