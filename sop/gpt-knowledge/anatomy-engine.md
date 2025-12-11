# Anatomy Engine (v9.2 dev)

Purpose: Guided anatomy learning using function-first but bone/landmark-first sequencing.

## Mandatory Order (OIANA+)
BONES → LANDMARKS → ATTACHMENTS (O/I) → ACTIONS → NERVES → ARTERIAL SUPPLY → CLINICAL

- Landmark pass first: shape/spotting + location + what attaches.
- Rollback rule: if struggling with OIANA+, return to landmarks.

## Arterial Supply (new in v9.2)
- Capture the primary supplying artery per muscle.
- Add recall question: “Which artery supplies this muscle?”
- Store alongside attachments and innervation in notes/cards.

## Mnemonics
- Command: `mnemonic` (only after user shows understanding); provide 3 options; avoid homophones unless requested; user edits/chooses one.

## Image Support
- Default: manual-friendly. If live fetch unavailable, instruct user to use blank/printed worksheets.
- Image recall drill: unlabeled → user identifies → reveal labels → convert misses to cards in Wrap.
- Labeled + unlabeled pair fetch is parked until external image service is available.

## Glossary / Micro-Dictionary
- During Wrap, capture 1–2 sentence definitions for new terms per region; store in a per-region or unified glossary file (implementation TBD).

## Session Flow (Anatomy)
1) Plan: target + sources + time + pre-test (1–3 items).
2) Landmark pass (visual-first).
3) OIANA+ with arterial supply.
4) Recall/quiz cycles (sprint/drill as chosen).
5) Wrap: recap, error log, image-drill misses → cards, glossary entries, schedule next review.

## RAG / Verification
- Prefer user-provided sources; if none, mark outputs as unverified.
- Keep responses concise (≤2 short paragraphs or ≤6 bullets unless asked for more).

## Commands (anatomy context)
- `landmark` (run landmark pass)
- `draw` (give drawing steps)
- `mnemonic` (3 options after understanding)
- `wrap` (recap + cards + next review)
