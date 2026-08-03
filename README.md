# AI-Proctored Technical Assessment & Interview Platform

An enterprise-grade, AI-powered technical assessment platform combining adaptive technical interviewing (powered by **LangGraph** & **Google Gemini 3.1 Pro**) with real-time browser & webcam AI proctoring (**Face-API.js**, speech/tab-switching monitoring).

---

## 🚀 Quick Start: Run Anywhere (Docker Option with `uv` - Recommended)

To run the entire stack (FastAPI backend + Vite frontend) with a single command on **any machine** (Windows, Linux, macOS, or Cloud):

```bash
# 1. Copy environment template and set your Gemini API Key, Gemini Model and Database URL
cp backend/.env.example backend/.env
# (Edit backend/.env to insert your GOOGLE_API_KEY / GEMINI_API_KEY)

# 2. Launch all containers (the backend automatically uses multi-stage uv dependency caching and installation)
docker compose up --build
```

Once running, access the platform:
- **Frontend Application**: http://localhost:5173
- **Backend API & Docs (Swagger UI)**: http://localhost:8000/docs
- **Health Check Ping**: http://localhost:8000/health

---

## 1. Prerequisites & System Requirements

Before getting started with local development without Docker, ensure you have the following installed on your system:

- **Python**: `3.12` or higher
- **uv**: Installed via `python -m pip install uv` or official standalone installer (`curl -LsSf https://astral.sh/uv/install.sh | sh` / `irm https://astral.sh/uv/install.ps1 | iex`)
- **Docker & Docker Compose**: (Optional, required only if running containerized deployment via `docker-compose.yml`)
- **Node.js**: `v20.0.0` or higher (LTS v24 recommended)
- **npm**: `v9.0.0` or higher (bundled with Node.js)
- **API Key**: A valid [Google Gemini API Key](https://aistudio.google.com/app/apikey) (`GEMINI_API_KEY`)

---

## 2. Installation & Setup Instructions

### Backend Setup (Python / FastAPI with `uv`)

1. **Navigate to the `backend` directory**:
   ```bash
   cd backend
   ```

2. **Install Dependencies using `uv`**:
   If you don't have `uv` installed yet, install it first:
   - **Windows (PowerShell)**:
     ```powershell
     powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
     ```
   - **Linux / macOS**:
     ```bash
     curl -LsSf https://astral.sh/uv/install.sh | sh
     ```
   *(Note: After installing `uv`, **restart your terminal** or run `$env:PATH = "$HOME\.local\bin;$env:PATH"` in PowerShell so your shell recognizes the `uv` command.)*

   Then, sync all dependencies (including dev tools):
   ```bash
   uv sync --extra dev
   ```
   *(Note: `uv sync` will automatically create the `.venv` virtual environment and download the required Python version if needed.)*

3. **Configure Environment Variables**:
   Copy `.env.example` to `.env` and configure your Google Gemini API key:
   - **Windows (PowerShell)**:
     ```powershell
     Copy-Item .env.example .env
     ```
   - **Linux / macOS**:
     ```bash
     cp .env.example .env
     ```
   Open `backend/.env` and set your key:
   ```ini
   GEMINI_API_KEY="your_google_gemini_api_key_here"
   GEMINI_MODEL="gemini-3.1-flash-lite"
   DATABASE_URL="sqlite:///./dev.db" # Or postgresql://user:pass@host:5432/dbname
   ```

4. **Database Migrations**:
   The backend uses **SQLAlchemy** and **Alembic** to manage database schemas (`candidates`, `exam_sessions`, `exam_qa`, `proctoring_logs`).
   
   - **Run Alembic Migrations directly**:
     ```bash
     alembic upgrade head
     ```
   - **Create a New Migration after Model Changes**:
     ```bash
     alembic revision --autogenerate -m "Add new column or table"
     alembic upgrade head
     ```

5. **Create an Admin User**:
   To access the admin dashboard, you need to create an initial admin user account. You can use the provided script to do this:
   ```bash
   uv run python create_admin.py --email admin@example.com --password "your_secure_password"
   ```

---

### Frontend Setup (React / TypeScript / Vite)

1. **Navigate to the `frontend` directory**:
   ```bash
   cd frontend
   ```

2. **Install Node Dependencies**:
   ```bash
   npm install
   ```

3. **Verify ML Model Assets**:
   The client-side face detection models are stored under `frontend/public/models/`. If you need to re-fetch or update them:
   ```bash
   node download_models.cjs
   ```

---

## 3. Starting the Backend Server (Port `8000`)

To run the FastAPI backend server with hot-reloading enabled using `uv`:

```bash
cd backend
uv run uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```

Once running, access:
- **Backend API Docs (Swagger UI)**: http://127.0.0.1:8000/docs
- **Health Check Ping**: http://127.0.0.1:8000/api/ping

---

## 4. Starting the Frontend Server (Port `5173`)

To run the Vite frontend development server:

- **Windows / Linux / macOS**:
  ```bash
  cd frontend
  npm run dev
  ```

Once running, access the web interface at:
- **Frontend App**: http://localhost:5173

---

## 5. Running Automated Tests

### Backend Unit & Integration Tests (Pytest)
```bash
cd backend
uv run pytest tests/ -v
```

### Frontend Unit Tests (Vitest)
```bash
cd frontend
npm test -- --run
```
