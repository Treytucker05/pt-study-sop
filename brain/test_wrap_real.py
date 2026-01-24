#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test WRAP parser with real GPT output format."""

import sys
import io
sys.stdout = io.TextIOWrapper(sys.stdout.buffer, encoding='utf-8', errors='replace')

from wrap_parser import parse_wrap

wrap = """## A) Obsidian Notes Pack (Markdown)

### 2026-01-23 - Neuroscience - LO1 - Core - 25 min

**Target:** LO1

## B) Anki Cards

**1**

* Front: Define a neuron (include electrical + chemical terms).
* Back: A neuron receives, processes, and transmits information.
* Tags: neuroscience;neurons;LO1
* Source: lecture 2026-01-23

**2**

* Front: Dendrites - role in neuron signaling?
* Back: Input structures that receive signals.
* Tags: neuroscience;neurons;LO1;anatomy
* Source: lecture 2026-01-23

**3**

* Front: What is myelin?
* Back: Insulation that increases conduction velocity.
* Tags: neuroscience;myelin;LO1
* Source: lecture 2026-01-23

## C) Spaced Retrieval Schedule

**R1:** 2026-01-24
**R2:** 2026-01-26
**R3:** 2026-01-30
**R4:** 2026-02-13

## D) JSON Logs

```json
{"date": "2026-01-23", "topic": "Neuroscience LO1", "mode": "Core", "duration_min": 25}
```
"""

result = parse_wrap(wrap, use_llm=False)
print(f"Cards: {len(result.get('section_b', []))}")
for i, card in enumerate(result.get('section_b', [])):
    print(f"  {i+1}. Front: {card.get('front', '')[:50]}")
    print(f"     Back: {card.get('back', '')[:50]}")
print(f"Schedule: {result.get('section_c', {})}")
print(f"Topic: {result.get('metadata', {}).get('topic')}")
