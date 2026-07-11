# AI-Proctored Technical Assessment & Interview Platform

An enterprise-grade, AI-powered technical assessment platform combining adaptive technical interviewing (powered by **LangGraph** & **Google Gemini 3.1 Pro**) with real-time browser & webcam AI proctoring (**Face-API.js**, speech/tab-switching monitoring).

---

## 1. Prerequisites & System Requirements

Before getting started, ensure you have the following installed on your system:

- **Python**: `3.10`, `3.11`, or `3.12` (Python 3.12 recommended)
- **Node.js**: `v18.0.0` or higher (LTS v20 recommended)
- **npm**: `v9.0.0` or higher (bundled with Node.js)
- **API Key**: A valid [Google Gemini API Key](https://aistudio.google.com/app/apikey) (`GEMINI_API_KEY`)

---

## 2. Installation & Setup Instructions

### Backend Setup (Python / FastAPI)

1. **Navigate to the `backend` directory**:
   ```bash
   cd backend
   ```

2. **Create a Python Virtual Environment**:
   - **Windows (PowerShell or CMD)**:
     ```powershell
     python -m venv .venv
     .\.venv\Scripts\activate
     ```
   - **Linux / macOS**:
     ```bash
     python3 -m venv .venv
     source .venv/bin/activate
     ```

3. **Install Dependencies**:
   ```bash
   pip install --upgrade pip
   pip install -r requirements.txt
   ```

4. **Configure Environment Variables**:
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

To run the FastAPI backend server with hot-reloading enabled:

- **Windows (PowerShell or CMD)**:
  ```powershell
  cd backend
  .\.venv\Scripts\uvicorn.exe app.main:app --host 127.0.0.1 --port 8000 --reload
  ```
- **Linux / macOS**:
  ```bash
  cd backend
  source .venv/bin/activate
  uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
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
# Windows:
.\.venv\Scripts\pytest.exe tests/ -v
# Linux / macOS:
pytest tests/ -v
```

### Frontend Unit Tests (Vitest)
```bash
cd frontend
npm test -- --run
```
