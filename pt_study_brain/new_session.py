#!/usr/bin/env python3
"""Create a new session log from the template with todays date and a topic stub."""

from datetime import datetime
from pathlib import Path
import sys

BASE = Path(__file__).parent
TEMPLATE = BASE / "session_logs" / "template.md"
TARGET_DIR = BASE / "session_logs"


def main():
    if not TEMPLATE.exists():
        sys.exit("template.md not found; expected at session_logs/template.md")

    today = datetime.now().strftime("%Y-%m-%d")
    topic = "topic" if len(sys.argv) < 2 else sys.argv[1].replace(" ", "_").lower()
    filename = f"{today}_{topic}.md"
    target = TARGET_DIR / filename

    content = TEMPLATE.read_text(encoding="utf-8")
    content = content.replace("YYYY-MM-DD", today).replace("<topic>", topic.replace("_", " "))

    target.write_text(content, encoding="utf-8")
    print(f"Created {target}")
    print("Fill it out, then ingest with: python ingest_session.py session_logs/" + filename)


if __name__ == "__main__":
    main()
