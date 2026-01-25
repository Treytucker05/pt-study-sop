import sys
import os
from pathlib import Path

# Add root to path
repo_root = Path(__file__).parent.parent.resolve()
sys.path.insert(0, str(repo_root))
sys.path.insert(0, str(repo_root / "brain"))

from brain.dashboard.scholar import run_scholar_orchestrator

print("Triggering Scholar Run...")
try:
    result = run_scholar_orchestrator()
    print("Run triggered successfully.")
    print(result)
except Exception as e:
    print(f"Error triggering run: {e}")
