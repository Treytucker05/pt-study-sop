# Change Proposal — Semantic-Lead KWIK Flow

- RFC ID: RFC-20260107-003
- Date: 2026-01-07
- Scope: `sop/gpt-knowledge/KWIK.md`
- Status: Draft

## 1. Goal Description

Reorder the KWIK encoding flow to prioritize "Semantic Function" over "Phonetic Sound-alike" to prevent shallow encoding gaps.

## 2. Evidence

- **Pedagogy Literature**: Semantic encoding (meaning/function) yields significantly higher recognition and recall rates than phonetic encoding (sounds) (Bartleby 2024, Decision Lab 2024).
- **Brain Telemetry**: Log 2025-12-11 shows "Recall Error" for landmarks where the sound-alike hook was remembered but the clinical relation was fuzzy.

## 3. Proposed Changes

- **Target File**: `sop/gpt-knowledge/KWIK.md`
- **Old Flow**: Sound -> Function -> Image -> Resilience -> Lock.
- **New Flow**: **Function -> Sound -> Image -> Resonance -> Lock.**
- **Logic**: Force the user to state the true clinical utility or action BEFORE they are allowed to create an auditory hook.

## 4. Risks & Guardrails

- **Risk**: Finding a sound-alike is sometimes easier *starting* with the word.
- **Mitigation**: AI can still provide the phonetic override if the user stalls on "Function."
- **Guardrail**: **Seed-Lock**. The user must still supply the initial hook.

## 5. Verification Plan

- See `experiment_semantic_kwik_2026-01-07.md`.
