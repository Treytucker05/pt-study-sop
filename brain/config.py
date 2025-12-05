#!/usr/bin/env python3
"""
Configuration settings for PT Study Brain v9.1.
"""

import os

# Version
VERSION = '9.1'

# Base paths
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATA_DIR = os.path.join(BASE_DIR, 'data')
SESSION_LOGS_DIR = os.path.join(BASE_DIR, 'session_logs')
OUTPUT_DIR = os.path.join(BASE_DIR, 'output')

# Database
DB_PATH = os.path.join(DATA_DIR, 'pt_study.db')

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
    for dir_path in [DATA_DIR, SESSION_LOGS_DIR, OUTPUT_DIR]:
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
