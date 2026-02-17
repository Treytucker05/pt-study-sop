#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test full WRAP pipeline via Brain Chat API."""

import requests
import json

wrap = """## A) Obsidian Notes Pack (Markdown)

### 2026-01-24 - Neuroscience - LO1 Pipeline Test - Core - 25 min

**Target:** Test the full pipeline

## B) Anki Cards

**1**

* Front: Pipeline test - does this card sync to Anki?
* Back: Yes, if the pipeline is working correctly.
* Tags: test;pipeline
* Source: test 2026-01-24

**2**

* Front: What components does the pipeline connect?
* Back: WRAP parser -> Database -> Anki + Obsidian
* Tags: test;pipeline
* Source: test 2026-01-24

## C) Spaced Retrieval Schedule

**R1:** 2026-01-25
**R2:** 2026-01-27

## D) JSON Logs

```json
{"date": "2026-01-24", "topic": "Pipeline Test", "mode": "Core", "duration_min": 5}
```
"""

print("Sending WRAP to Brain Chat API (mode=anki)...")
resp = requests.post(
    'http://127.0.0.1:5000/api/brain/chat',
    json={'message': wrap, 'mode': 'anki'},
    timeout=60
)

print(f"Status: {resp.status_code}")
data = resp.json()
print(f"Cards created: {data.get('cardsCreated')}")
print(f"Cards synced to Anki: {data.get('cardsSyncedToAnki')}")
print(f"Anki sync error: {data.get('ankiSyncError')}")
print(f"Obsidian synced: {data.get('obsidianSynced')}")
print(f"Obsidian path: {data.get('obsidianPath')}")
print(f"Session saved: {data.get('sessionSaved')}")
print(f"\nFull response: {data.get('response')}")
