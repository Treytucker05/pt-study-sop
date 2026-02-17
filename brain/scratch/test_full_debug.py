#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Full debug of Brain Chat."""

import requests
import json

wrap = """## A) Obsidian Notes Pack

### 2026-01-24 - Debug Test - Core - 5 min

## B) Anki Cards

**1**

* Front: Debug test question
* Back: Debug test answer
* Tags: debug
* Source: test

## C) Spaced Retrieval Schedule

**R1:** 2026-01-25

## D) JSON Logs

```json
{"date": "2026-01-24", "topic": "Debug Test", "mode": "Core", "duration_min": 5}
```
"""

print("Sending to Brain Chat...")
resp = requests.post(
    'http://127.0.0.1:5000/api/brain/chat',
    json={'message': wrap, 'mode': 'anki'},
    timeout=120
)

print(f"\nStatus: {resp.status_code}")
print(f"\nFull response:")
print(json.dumps(resp.json(), indent=2, default=str))
