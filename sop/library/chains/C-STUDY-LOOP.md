---
title: C-STUDY-LOOP — Study Loop (Finals)
created: 2026-04-19
updated: 2026-04-19
type: chain
tags: [chain, study-loop, finals, integrated-prompt]
---

# C-STUDY-LOOP — Study Loop (Finals)

Per-session study chain for finals prep. **Assumes PRIME notes already exist in Obsidian** (built once via C-PRIME-ONCE per topic). One ChatGPT chat, 35-45 min, ends with 3-5 staged Anki cards.

## When to Use
- After C-PRIME-ONCE has run for the topic and notes are in Obsidian
- One bounded topic per session
- You have 35-45 min and closed-note materials ready for the brain dump

## Method Stack (embodied inline in the prompt)
- M-TEA-001 Story Spine (default TEACH)
- M-TEA-006 Depth Ladder (TEACH fallback)
- M-HOOK-001 KWIK Hook (conditional ENCODE)
- M-CAL-001 Micro Check (CALIBRATE — gates advance)
- M-RET-001 Timed Brain Dump (RETRIEVE — gates cards)
- M-OVR-002 Anki Card Draft (OVERLEARN)

See [[C-STUDY-LOOP.yaml]] for the spec, gates, and failure actions.

## Workflow
1. Open a fresh ChatGPT chat
2. Confirm Custom Instructions are active (set in ChatGPT settings, not pasted)
3. Paste the prompt below
4. Replace `[TOPIC]` with the bounded topic for this session (e.g., `Shoulder Complex`)
5. When prompted in Step 0, paste your priming notes
6. Run through; save final cards to Anki

---

## Prompt

```
I'm a DPT student studying [TOPIC]. I already have priming notes in Obsidian (framework, key terms, learning objectives, structure). We're picking up at the teaching phase and going through to staged Anki cards. Total time budget: 35-45 minutes.

STEP 0 — CHECK IN (1 min)
I'll paste or describe my priming notes for [TOPIC]. Confirm you can see the framework, key terms, and learning objectives. If anything critical is missing, flag it now and I'll grab it. Do not proceed until I say "ready."

STEP 1 — TEACH via STORY SPINE (10-15 min)
Using my priming framework as the skeleton, walk [TOPIC] as a causal story — A leads to B leads to C. Include a clinical breakpoint (where does this matter for a patient?). Deliver ONE chunk at a time:
  a) Source facts (from standard PT curriculum, grounded in my notes)
  b) Plain interpretation (explain like I'm a classmate)
  c) Bridge move (analogy, metaphor, or clinical anchor)
  d) Application (how a DPT uses this on a patient)
  e) Anchor artifact (one line I should add to my Obsidian notes)

After each chunk, pause and ask if it landed before moving on.

FALLBACK — DEPTH LADDER: If the story approach isn't working (I say I'm lost or confused), switch to explaining the same concept at 4 levels: 4-year-old, 10-year-old, high schooler, DPT student. Then continue.

STEP 2 — MEMORY HOOK (conditional, 3-5 min)
ONLY run this if I understand the concept but am struggling to recall a specific term or sequence. If I'm fluent on the terms, skip this step entirely.

For the term I'm stuck on, run KWIK Hook:
  1. Sound — what does the term sound like?
  2. Meaning — what does it actually mean?
  3. Image — vivid mental picture linking sound to meaning
  4. Scene — put the image in a scenario
  5. Personalize — connect to something I already know
  6. Lock — test me once immediately

STEP 3 — MICRO CHECK (3 min)
Ask me 5 quick questions about what you just taught. For each:
  - I answer
  - You tell me correct/incorrect immediately (no hints — this is diagnostic, not teaching)
  - I rate my confidence: High, Medium, or Low
  - Note any miscalibrations (confident but wrong, unsure but right)

Calculate accuracy as (correct / total) × 100.

GATE — if accuracy < 80%:
  Do NOT advance. Do one of:
  (a) Activate Depth Ladder fallback and re-teach the missed concept(s), then re-run Micro Check
  (b) If multiple concepts missed, STOP the session and flag for re-PRIME (the framework itself may be shaky)

STEP 4 — TIMED BRAIN DUMP (5-7 min)
Closed-note retrieval pass.
  a) Tell me to close all materials. Wait for "notes closed."
  b) Set a 5-minute timer. Tell me: "Stream-of-consciousness dump everything you remember about [TOPIC]. Write '?' at any gap and keep moving."
  c) DO NOT interrupt, correct, or hint during the dump.
  d) When time's up (or I say "done"), stop.
  e) Now reference my priming notes / source. Mark each item in my dump:
     ✓ correct
     ✗ wrong
     ~ partial
  f) List items I missed entirely (in source, not in dump).
  g) List additions I made (in dump, not in source — flag right vs wrong).
  h) Calculate Recall Success Rate (RSR):
     RSR = (correct + partial × 0.5) / (correct + wrong + partial + missed)
     Round to nearest 5%.

GATE — if RSR < 70%:
  Do NOT advance to cards. Do one of:
  (a) Loop back to STEP 1 with the missed concepts as the new TEACH target
  (b) Stop session and re-PRIME the gap areas

STEP 5 — ANKI CARD DRAFT (5-7 min)
Convert today's wins into 3-5 review-ready Anki cards. Rules:
  - 3-5 cards max (no more, even if I want more)
  - One fact per card (no double-barreled "X and Y")
  - Cloze for vocabulary, definitions, single facts
  - Basic Q&A for cause/effect, mechanism, "why"
  - Every card must trace to source already studied (no new material)

Pick the 3-5 concepts to lock — I'll confirm or swap.

Format each card EXACTLY:

CARD <n>
Type: <cloze|basic>
Front: <text>
Back: <text>
Tags: topic::[TOPIC] source::[course] date::[YYYY-MM-DD]

For cloze cards: embed {{c1::answer}} in Front and leave Back empty.

After drafting, re-read each card. Flag any that:
  - test more than one fact
  - hide multiple cloze elements per card
  - fail to make sense out of context (no naked pronouns, no "this" references)
Rewrite as needed.

Print only the cleaned CARD blocks at the end, one per concept, in order. No prose between them.

STEP 6 — SESSION CLOSE (1 min)
Tell me:
  - Micro Check accuracy %
  - RSR %
  - Cards staged (count)
  - Any miscalibrations to remember (I was confident but wrong)
  - Next-session focus (anything that didn't land cleanly)

TIME CHECKS:
  - Tell me when we're at 30 minutes total so I can decide to wrap or push.
  - Hard cap at 45 minutes — if we're not at cards by then, save what we have and flag the gap.
```

---

## Test Results
_No live runs yet._

## Notes / Open Questions
- This prompt embodies the methods inline — it does NOT pull from the method YAMLs at runtime. When tightening a method (e.g., M-TEA-001 facilitation_prompt), check whether the change should be mirrored here.
- Track cumulative card count across sessions — Anki Card Draft caps at 5 per run, but you may want a per-topic cap (e.g., max 8-10 cards/topic across all sessions).
- See [[Notes & Tech Debt]] for the Option A integrated-prompt decision and long-term plan.

## Related
- [[C-STUDY-LOOP.yaml]] — spec / design intent
- [[../Notes & Tech Debt]] — decisions log
- [[00 - Custom Instructions]] — global tutor rules (set in ChatGPT settings)
- Methods embodied: [[M-TEA-001]], [[M-TEA-006]], [[M-HOOK-001]], [[M-CAL-001]], [[M-RET-001]], [[M-OVR-002]]
