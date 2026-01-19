#!/usr/bin/env python3
"""
Configuration settings for PT Study Brain v9.3.
"""

import os

# Version
VERSION = '9.3'

# Load .env if present (lightweight, no external deps)
def load_env(override_env=True):
    """
    Load key=value pairs from .env into os.environ.

    By default override_env=True so the repo-local .env wins over any
    machine-level env var (prevents stale system OPENROUTER_API_KEY).
    """
    env_path = os.path.join(os.path.dirname(os.path.abspath(__file__)), ".env")
    loaded = {}
    if not os.path.exists(env_path):
        return loaded

    try:
        with open(env_path, "r", encoding="utf-8") as f:
            for raw in f:
                line = raw.strip()
                if not line or line.startswith("#") or "=" not in line:
                    continue
                key, val = line.split("=", 1)
                key = key.strip()
                val = val.strip().strip('"').strip("'")
                if key:
                    loaded[key] = val
                    if override_env or key not in os.environ:
                        os.environ[key] = val
    except Exception:
        pass

    return loaded

# Initialize environment variables from .env once at import time
_ENV_CACHE = load_env(override_env=True)

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
SESSION_LOGS_DIR = os.path.join(BASE_DIR, 'session_logs')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')

# Study RAG (drop files here; no upload needed)
_DEFAULT_STUDY_RAG_DIR = os.path.join(DATA_DIR, 'study_rag')

# Check api_config.json for saved study_rag_path first
def _load_study_rag_path():
    api_config_path = os.path.join(DATA_DIR, 'api_config.json')
    if os.path.exists(api_config_path):
        try:
            with open(api_config_path, 'r', encoding='utf-8') as f:
                cfg = __import__('json').load(f)
                if cfg.get('study_rag_path'):
                    return cfg['study_rag_path']
        except:
            pass
    # Fall back to env var or default
    return os.environ.get('PT_STUDY_RAG_DIR', _DEFAULT_STUDY_RAG_DIR)

STUDY_RAG_DIR = os.path.abspath(os.path.expanduser(os.path.expandvars(_load_study_rag_path())))

# Database
DB_PATH = os.path.join(DATA_DIR, 'pt_study.db')

# API Configuration
API_CONFIG_PATH = os.path.join(DATA_DIR, 'api_config.json')

# Study modes
STUDY_MODES = ['Sprint', 'Core', 'Drill']

# Score ranges
SCORE_MIN = 1
SCORE_MAX = 5

# Thresholds for analytics
WEAK_THRESHOLD = 3      # Scores <= 3 are considered weak areas
STRONG_THRESHOLD = 4    # Scores >= 4 are considered strong
STALE_DAYS = 14         # Topics not studied in 14+ days are stale
FRESH_DAYS = 7          # Topics studied within 7 days are fresh

# Display settings
RECENT_SESSIONS_COUNT = 10    # Number of recent sessions to include in resume
MAX_TOPICS_DISPLAY = 20       # Max topics to show in coverage
MAX_WEAK_AREAS = 5            # Max weak areas to highlight

# Anatomy regions for coverage tracking
ANATOMY_REGIONS = [
    'Pelvis',
    'Hip',
    'Anterior Thigh',
    'Posterior Thigh',
    'Medial Thigh',
    'Knee',
    'Anterior Leg',
    'Posterior Leg',
    'Lateral Leg',
    'Foot',
    'Shoulder',
    'Arm',
    'Forearm',
    'Hand',
    'Back',
    'Thorax',
    'Abdomen',
    'Head/Neck',
    'Spine'
]

# Frameworks list for validation
FRAMEWORKS = [
    'H1', 'H2',  # H-Series (Priming)
    'M2', 'M6', 'M8',  # M-Series (Encoding)
    'Y1'  # Generalist
]

# Calibration categories
CALIBRATION_OPTIONS = [
    'Overconfident',
    'Underconfident', 
    'Well-calibrated',
    'Uncertain'
]

# Readiness score weights
READINESS_WEIGHTS = {
    'topic_coverage': 0.40,    # 40% weight on topics covered
    'understanding': 0.30,      # 30% weight on understanding level
    'confidence': 0.30          # 30% weight on retention confidence
}

# Ensure directories exist
def ensure_directories():
    """Create required directories if they don't exist."""
    for dir_path in [DATA_DIR, SESSION_LOGS_DIR, OUTPUT_DIR, STUDY_RAG_DIR]:
        if not os.path.exists(dir_path):
            os.makedirs(dir_path)
            print(f"Created directory: {dir_path}")

if __name__ == '__main__':
    print(f"PT Study Brain v{VERSION} Configuration")
    print("=" * 40)
    print(f"Base Directory: {BASE_DIR}")
    print(f"Database: {DB_PATH}")
    print(f"Session Logs: {SESSION_LOGS_DIR}")
    print(f"Output: {OUTPUT_DIR}")
    print()
    ensure_directories()
    print("[OK] All directories verified")
