#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Debug WRAP parsing."""

from wrap_parser import parse_wrap

wrap = """## A) Obsidian Notes Pack (Markdown)

### 2026-01-24 - Test - Core - 5 min

## B) Anki Cards

**1**

* Front: Test card front
* Back: Test card back
* Tags: test
* Source: test

## C) Spaced Retrieval Schedule

**R1:** 2026-01-25

## D) JSON Logs

```json
{"date": "2026-01-24", "topic": "Test", "mode": "Core", "duration_min": 5}
```
"""

result = parse_wrap(wrap, use_llm=False)
print("section_b type:", type(result.get("section_b")))
print("section_b value:", result.get("section_b"))

cards = result.get("section_b") or []
print("\nCards list:", cards)
print("Cards count:", len(cards))

if cards:
    for card in cards:
        print(f"\nCard check:")
        print(f"  isinstance dict: {isinstance(card, dict)}")
        print(f"  has front: {card.get('front')}")
        print(f"  has back: {card.get('back')}")
