#!/usr/bin/env python3
# -*- coding: utf-8 -*-
"""Test with user's actual WRAP format."""

import requests

wrap = """## A) Obsidian Notes Pack (Markdown)

### 2026-01-23 — Neuroscience — LO1 Neuron Structure & Function — Core — 25 min

**Time:** 10:27 pm → 10:52 pm (America/Chicago)
**Target + scope:** LO1 — *Describe the basic structure and function of a neuron*
**Source-lock used:** Your pasted lecture/slide breakdown in chat (not an external file)

#### Map / buckets (covered)

* Neuron definition (electrical + chemical signaling)
* 4 primary structures + function

#### Key definition (from your packet)

* **Neuron:** specialized cell that **receives, processes, and transmits information** using **electrical signals (action potentials)** and **chemical signals (neurotransmitters)**.

## B) Anki Cards (only from what we covered)

**1**

* Front: Define a neuron (include electrical + chemical terms).
* Back: A neuron receives, processes, and transmits information using electrical signals (action potentials) and chemical signals (neurotransmitters).
* Tags: neuroscience;neurons;LO1
* Source: lecture/slide breakdown pasted in chat 2026-01-23

**2**

* Front: Dendrites — role in neuron signaling?
* Back: Input structures that receive signals from many neurons (100+ per packet) and carry information toward the soma.
* Tags: neuroscience;neurons;LO1;anatomy
* Source: lecture/slide breakdown pasted in chat 2026-01-23

**3**

* Front: Soma (cell body) — what does it do?
* Back: Metabolic center (nucleus + organelles) responsible for information processing.
* Tags: neuroscience;neurons;LO1;anatomy
* Source: lecture/slide breakdown pasted in chat 2026-01-23

## C) Spaced Retrieval Schedule (1–3–7–21)

**R1:** 2026-01-24
**R2:** 2026-01-26
**R3:** 2026-01-30
**R4:** 2026-02-13

## D) JSON Logs (v9.3)

### Tracker JSON

```json
{
  "schema_version": "9.3",
  "date": "2026-01-23",
  "topic": "Neuroscience LO1: Neuron basic structure and function",
  "mode": "Core",
  "duration_min": 25,
  "understanding": 4,
  "retention": 3
}
```
"""

print("Testing user's actual WRAP format via API...")
resp = requests.post(
    'http://127.0.0.1:5000/api/brain/chat',
    json={'message': wrap, 'mode': 'anki'},
    timeout=60
)

print(f"Status: {resp.status_code}")
data = resp.json()
print(f"Cards drafted: {data.get('cardsCreated')}")
print(f"Obsidian synced: {data.get('obsidianSynced')}")
print(f"Obsidian path: {data.get('obsidianPath')}")
