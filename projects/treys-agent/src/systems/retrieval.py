from __future__ import annotations
import os
from pathlib import Path
import re

class Retriever:
    def __init__(self, context_dir: Path) -> None:
        self.context_dir = context_dir

    def get_relevant_context(self, query: str, limit: int = 3) -> str:
        """
        Scans all .md files in context_dir.
        Scores them based on keyword overlap with the query.
        Returns the content of the top 'limit' files.
        """
        query_words = set(query.lower().split())
        scored_files = []

        if not self.context_dir.exists():
            return "No context directory found."

        # Scan all Markdown files recursively
        for file_path in self.context_dir.rglob("*.md"):
            try:
                content = file_path.read_text(encoding="utf-8", errors="replace")
                score = 0
                
                # 1. Score Filename (High Priority)
                if any(word in file_path.name.lower() for word in query_words):
                    score += 10
                
                # 2. Score Content (Low Priority)
                # Count occurrences of query words in content
                content_lower = content.lower()
                for word in query_words:
                    if len(word) > 3: # Ignore small words like 'the', 'how'
                        score += content_lower.count(word)

                if score > 0:
                    scored_files.append((score, file_path, content))
            
            except Exception:
                continue # Skip unreadable files

        # Sort by score descending
        scored_files.sort(key=lambda x: x[0], reverse=True)

        # Take top N
        top_files = scored_files[:limit]

        if not top_files:
            return ""

        # Format output
        output = [f"--- RELEVANT CONTEXT (Top {len(top_files)}) ---"]
        for score, path, text in top_files:
            output.append(f"\nSOURCE: {path.name} (Relevance: {score})")
            output.append(text)
        
        return "\n".join(output)
