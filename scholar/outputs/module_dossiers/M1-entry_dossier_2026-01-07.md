# Module Dossier - M1: Entry
- Path: `sop/gpt-knowledge/M1-entry.md`
- Phase: M1 Entry
- Last Updated: 2026-01-07

## 1. Operational Contract
- Purpose: Establish session state, choose mode, and load context before learning begins.
- Trigger(s): Session start after M0 planning; mode selection prompt.
- Required Inputs: Focus rating, energy/motivation rating, topic, materials, time available, resume/context (optional).
- Required Outputs: Mode selection (Core/Sprint/Drill), scoped session target, context load status.
- Exit Criteria: Mode locked; scope defined; ready to proceed to M2 (Prime) or mode-specific entry.
- Failure Modes / Drift Risks: Miscalibrated self-report leads to wrong mode; missing materials/time causes scope creep; context not loaded for resume flows.

## 2. Pedagogy Mapping
- Retrieval Practice: [PARTIAL] - M1 is pre-learning; could add a short readiness check.
- Spacing/Interleaving: [PASS] - Context load and time check support spacing decisions.
- Cognitive Load: [PASS] - Scope check reduces overload and sets realistic targets.
- Metacognition: [PASS] - Self-rating of focus/energy forces reflection on readiness.

## 3. Evidence Map
- KSS provides anchored 1-9 self-report ratings for alertness/sleepiness, offering a calibrated alternative to an unanchored 1-10 scale. (https://en.wikipedia.org/wiki/Karolinska_Sleepiness_Scale)
- KSS ratings track objective performance: higher sleepiness aligns with slower PVT reaction times in shift-working healthcare staff. (https://pubmed.ncbi.nlm.nih.gov/30874565/)

## 4. Improvement Candidates (Rabbit Holes Allowed)
- Add anchor labels to the focus/energy scale (map 1-10 to KSS-style descriptors) to standardize thresholds.
- Add a 60-second "readiness check" (1-2 recall items) before mode lock to validate self-report.

## 5. Promotion Candidates (MAX 3)
1. [Anchored Focus Scale] Replace the open 1-10 rating with KSS-style anchors and map low/high thresholds to mode suggestions.
2. [Micro-Check Gate] Insert a single quick retrieval prompt before mode lock; if missed, suggest Core or Drill.

## 6. Guardrails (What Must Not Change)
- Mode selection remains explicit and user-confirmed.
- Scope check (topic/materials/time) remains mandatory.
- Factual teaching remains blocked without a Source Packet (NotebookLM Bridge).
