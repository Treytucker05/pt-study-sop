#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Debug the JSON parsing from LLM response."""

import json
import re

# Simulated LLM response with markdown code fence
llm_content = """```json
{
    "is_conversation": false,
    "summary": "Test session",
    "course": "General",
    "anki_cards": [
        {
            "front": "Test question one",
            "back": "Test answer one",
            "tags": "test",
            "card_type": "basic"
        },
        {
            "front": "Test question two",
            "back": "Test answer two",
            "tags": "test",
            "card_type": "basic"
        }
    ]
}
```"""

print("=== LLM Content ===")
print(llm_content[:200])

print("\n=== Try direct JSON parse ===")
try:
    parsed_data = json.loads(llm_content)
    print(f"Success: {parsed_data}")
except json.JSONDecodeError as e:
    print(f"Failed: {e}")

    print("\n=== Try regex extract ===")
    json_match = re.search(r'\{[\s\S]*\}', llm_content)
    if json_match:
        print(f"Regex matched: {json_match.group()[:100]}...")
        try:
            parsed_data = json.loads(json_match.group())
            print(f"Parsed successfully!")
            print(f"anki_cards: {parsed_data.get('anki_cards')}")
        except Exception as e2:
            print(f"Parse failed: {e2}")
    else:
        print("No regex match!")
