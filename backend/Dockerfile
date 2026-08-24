# Multi-stage/Production-ready Dockerfile for FastAPI Backend using uv
FROM python:3.12-slim

# Copy uv binary from official Astral image
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

# Set working directory inside container
WORKDIR /app

# Enable bytecode compilation, unbuffered stdout/stderr, and set virtual environment on PATH
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy \
    PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PYTHONPATH=/app \
    PATH="/app/.venv/bin:$PATH"

# Install required system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    libpq-dev \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Copy dependency files first to leverage Docker layer caching
COPY pyproject.toml uv.lock ./

# Install project dependencies without project itself or dev dependencies, including prod extra
RUN uv sync --frozen --no-install-project --extra dev

# Copy backend application code
COPY . .

# Sync the project itself
RUN uv sync --frozen --extra dev

RUN alembic upgrade head

# Expose FastAPI server port
EXPOSE 8000

# Health check to verify API responsiveness
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://127.0.0.1:8000/health || exit 1

# Start script: run database initialization/migration checks, then start Uvicorn
CMD ["sh", "-c", "alembic upgrade head && python create_admin.py --email ${ADMIN_EMAIL:-admin@proctorai.local} --password ${ADMIN_PASSWORD:-admin123} && uvicorn app.main:app --host 0.0.0.0 --port 8000"]
