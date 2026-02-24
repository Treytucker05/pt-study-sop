#!/usr/bin/env python3
"""
Configuration settings for PT Study Brain v9.4.
"""

import os

# Version
VERSION = '9.4'

# Load .env if present (lightweight, no external deps)
def load_env(override_env=True):
    """
    Load key=value pairs from .env into os.environ.

    By default override_env=True so the repo-local .env wins over any
    machine-level env var (prevents stale system env vars).
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

# Study modes (legacy - kept for backward compatibility)
STUDY_MODES_LEGACY = ['Sprint', 'Core', 'Drill']

# Enhanced study modes for PERRIO Protocol v6.4
STUDY_MODES = {
    'Prime': {
        'description': 'Initial exposure, overview',
        'typical_duration': '15-30 min',
        'purpose': 'Get familiar with new material'
    },
    'Encode': {
        'description': 'Deep learning, note-taking',
        'typical_duration': '45-90 min',
        'purpose': 'Actively process and understand material'
    },
    'Retrieve': {
        'description': 'Active recall, practice questions',
        'typical_duration': '20-40 min',
        'purpose': 'Test memory and reinforce learning'
    },
    'Reinforce': {
        'description': 'Spaced review, Anki',
        'typical_duration': '15-30 min',
        'purpose': 'Strengthen memory through repetition'
    },
    'Review': {
        'description': 'Pre-exam review',
        'typical_duration': '30-60 min',
        'purpose': 'Consolidate knowledge before assessment'
    },
    'Exam Prep': {
        'description': 'Focused exam preparation',
        'typical_duration': '60-120 min',
        'purpose': 'Intensive preparation for upcoming exam'
    }
}

# List of valid study mode names for validation
STUDY_MODE_NAMES = list(STUDY_MODES.keys())

# Session schema for study data capture
SESSION_SCHEMA = {
    # Core Metadata
    'course': {
        'type': 'string',
        'options': ['Evidence Based Practice', 'Exercise Physiology', 'Movement Science 1', 'Neuroscience', 'Therapeutic Intervention', 'General'],
        'description': 'Course name'
    },
    'study_mode': {
        'type': 'string',
        'options': STUDY_MODE_NAMES,
        'description': 'Study mode from PERRIO protocol'
    },
    'duration_minutes': {
        'type': 'integer',
        'description': 'Session duration in minutes'
    },
    'date': {
        'type': 'string',
        'format': 'YYYY-MM-DD',
        'description': 'Session date'
    },

    # Content Summary
    'summary': {
        'type': 'string',
        'description': '2-3 sentence overview of what was studied'
    },
    'topics_covered': {
        'type': 'array',
        'items': 'string',
        'description': 'List of main topics'
    },
    'key_concepts': {
        'type': 'array',
        'items': 'string',
        'description': 'Important concepts to remember'
    },

    # Performance Assessment
    'strengths': {
        'type': 'array',
        'items': 'string',
        'description': 'Things understood well'
    },
    'weaknesses': {
        'type': 'array',
        'items': 'string',
        'description': 'Areas needing more work'
    },
    'confidence_level': {
        'type': 'integer',
        'range': [1, 5],
        'description': 'Self-assessed understanding (1-5)'
    },
    'retention_estimate': {
        'type': 'integer',
        'range': [1, 5],
        'description': 'How well will this stick? (1-5)'
    },

    # Anki Cards
    'anki_cards': {
        'type': 'array',
        'items': {
            'front': 'string',
            'back': 'string',
            'tags': 'string',
            'card_type': ['basic', 'cloze', 'reverse']
        },
        'description': 'Flashcards for Anki'
    },

    # CustomGPT Tutor Feedback
    'tutor_mistakes': {
        'type': 'array',
        'items': 'string',
        'description': 'Any errors the CustomGPT tutor made'
    },
    'tutor_helpful': {
        'type': 'array',
        'items': 'string',
        'description': 'What the tutor did well'
    },
    'tutor_corrections_needed': {
        'type': 'array',
        'items': 'string',
        'description': 'Facts/concepts the tutor got wrong'
    },

    # Learning Style Insights
    'what_worked': {
        'type': 'array',
        'items': 'string',
        'description': 'Techniques that helped learning'
    },
    'what_didnt_work': {
        'type': 'array',
        'items': 'string',
        'description': 'Approaches that were not effective'
    },
    'inferred_learning_style': {
        'type': 'string',
        'options': ['visual', 'auditory', 'reading', 'kinesthetic', 'mixed'],
        'description': 'Inferred preferred learning style'
    },
    'optimal_session_length': {
        'type': 'string',
        'options': ['short (<30min)', 'medium (30-60min)', 'long (>60min)'],
        'description': 'Optimal session length based on performance'
    },
    'style_confidence': {
        'type': 'string',
        'options': ['low', 'medium', 'high'],
        'description': 'Confidence in learning style inference'
    },

    # Next Steps
    'follow_up_topics': {
        'type': 'array',
        'items': 'string',
        'description': 'Topics to revisit'
    },
    'questions_remaining': {
        'type': 'array',
        'items': 'string',
        'description': 'Unanswered questions'
    },
    'next_session_focus': {
        'type': 'string',
        'description': 'Recommended focus for next session'
    }
}

# Score ranges
SCORE_MIN = 1
SCORE_MAX = 5

# Thresholds for analytics
WEAK_THRESHOLD = 3      # Scores <= 3 are considered weak areas
STRONG_THRESHOLD = 4    # Scores >= 4 are considered strong
STALE_DAYS = 14         # Topics not studied in 14+ days are stale
FRESH_DAYS = 7          # Topics studied within 7 days are fresh

# Semester date ranges for filtering
SEMESTER_DATES = {
    1: {
        'start': '2025-08-25',
        'end': '2025-12-12',
        'name': 'Semester 1 (Fall 2025)'
    },
    2: {
        'start': '2026-01-05',
        'end': '2026-04-24',
        'name': 'Semester 2 (Spring 2026)'
    }
}

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

# Course to Obsidian folder mapping
# Maps course names from study wheel to their Obsidian vault paths
COURSE_FOLDERS = {
    "Evidence Based Practice": "School/Evidence Based Practice",
    "Exercise Physiology": "School/Exercise Physiology",
    "Movement Science 1": "School/Movement Science 1",
    "Neuroscience": "School/Neuroscience",
    "Therapeutic Intervention": "School/Therapeutic Intervention",
}

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
