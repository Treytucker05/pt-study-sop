from __future__ import annotations
import sys
import os
from pathlib import Path

# Fix path for imports
current_dir = os.path.dirname(os.path.abspath(__file__))
project_root = os.path.dirname(os.path.dirname(current_dir))
if project_root not in sys.path:
    sys.path.append(project_root)

from src.agents.base import Agent
from src.systems.retrieval import Retriever

class Architect(Agent):
    def __init__(self, name: str) -> None:
        super().__init__(name)
        # Point to the 'context' directory at the repo root
        self.context_dir = Path(project_root) / "context"
        self.retriever = Retriever(self.context_dir)

    def think(self, user_input: str) -> str:
        # 1. Smart Search: Find only relevant files (e.g., "Milestone Plan")
        context_text = self.retriever.get_relevant_context(user_input, limit=5)
        
        if not context_text:
            context_text = "No specific SOPs found for this query. Answer based on general knowledge."

        # 2. Construct the focused prompt
        full_prompt = (
            f"CONTEXT FROM FILES:\n{context_text}\n\n"
            f"USER QUESTION: {user_input}"
        )
        
        # 3. Send to Codex
        return super().think(full_prompt)

if __name__ == "__main__":
    # Test block
    architect = Architect("Tester")
    print(architect.think("How do I use the 3-pass technique?"))
