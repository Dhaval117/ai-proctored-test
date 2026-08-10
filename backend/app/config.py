"""
config.py — Centralized backend configuration settings.

Reads environment variables from .env or system environment with clean defaults.
"""
from __future__ import annotations

import os
from dotenv import load_dotenv

load_dotenv()

# App / Exam Settings
MAX_VIOLATIONS: int = int(os.getenv("MAX_VIOLATIONS", "3"))
MAX_MAIN_QUESTIONS: int = int(os.getenv("MAX_MAIN_QUESTIONS", "5"))
MAX_FOLLOW_UPS_PER_QUESTION: int = int(os.getenv("MAX_FOLLOW_UPS_PER_QUESTION", "1"))

# Proctoring Settings
# PROCTORING_ENABLED controls whether proctoring checks and violation telemetry are enforced.
PROCTORING_ENABLED: bool = os.getenv("PROCTORING_ENABLED", "true").lower() == "true"

# ALLOW_PROCTORING_TOGGLE controls whether the UI shows the button allowing pause/resume during development.
# In production deployments, this should remain False so candidates cannot disable proctoring.
ALLOW_PROCTORING_TOGGLE: bool = os.getenv("ALLOW_PROCTORING_TOGGLE", "false").lower() == "true"

# LIVE_TRANSCRIPTION_ENABLED controls whether interim/live transcripts are computed and sent to the UI
# while the user is speaking. If False, only finalized VAD silence transcripts are shown.
LIVE_TRANSCRIPTION_ENABLED: bool = os.getenv("LIVE_TRANSCRIPTION_ENABLED", "false").lower() == "true"
