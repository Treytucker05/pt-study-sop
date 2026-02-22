# Tutor Category Definitions (Canonical v1)

Date: 2026-02-22  
Scope: Categories only (no method or knob policy in this file)

## Purpose
This document defines the 6 tutor categories in plain language and in operational terms.
It is the category source-of-truth used before method/knob/chain design.
Default operating assumption: most sessions are first-exposure learning on unseen material.

## Category Order (Fixed)
`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`

## 1) PRIME
Plain meaning:
- Tutor-led orientation and first-pass teaching for unseen material.

System role:
- Build a simple topic scaffold the learner can follow.
- Introduce core terms and basic structure before heavy depth.
- Ask orientation prompts only (for example: what part feels most unfamiliar, what to cover first).

Entry criteria:
- New topic, especially when learner has not seen the material.
- Return to topic after a long gap with degraded context.

Exit criteria:
- Learner can restate the core structure in plain language.
- Learner has a first-pass baseline without blind guessing.

Not for:
- Grading performance.
- Deep instruction overload.
- Blind questioning on material the learner has not been introduced to.
- Knowledge-check questioning that scores correctness/confidence.

## 2) CALIBRATE
Plain meaning:
- Measure what the learner actually knows vs what they think they know.

System role:
- Run the first knowledge-check questions after PRIME has established baseline structure.
- Run quick retrieval probes with confidence tagging.
- Capture confidence and latency.
- Produce a priority set of weak points.

Entry criteria:
- PRIME complete with a minimally taught structure.
- Session needs re-check after drift or performance shift.

Exit criteria:
- Clear mismatch map exists (accuracy + confidence + error pattern).

Not for:
- Long lectures.
- Endless quizzing.
- Acting as the first step on truly unseen material with no primer.

Question boundary:
- PRIME questions are orientation/structuring prompts only and are non-scored.
- CALIBRATE questions are assessment probes and can be scored/logged.

## 3) ENCODE
Plain meaning:
- Build understanding deeply enough to be remembered and explained.

System role:
- Use active processing (explain, compare, map, trace).
- Convert weak/confused areas into coherent mental models.

Entry criteria:
- CALIBRATE identified what needs to be fixed/learned.

Exit criteria:
- Learner can explain the concept in their own words with correct structure.

Not for:
- Passive rereading as the primary activity.

## 4) REFERENCE
Plain meaning:
- Externalize targets and anchors so retrieval has clear goals.

System role:
- Define what will be retrieved later.
- Create compact artifacts (anchors/target banks/discriminator cues).

Entry criteria:
- ENCODE artifacts exist or a minimal structure exists.

Exit criteria:
- Explicit retrieval targets exist and are usable by the next stage.

Not for:
- Decorative notes with no retrieval purpose.

## 5) RETRIEVE
Plain meaning:
- Pull knowledge from memory to strengthen retention.

System role:
- Run active recall against explicit targets.
- Score errors and update learner state.

Entry criteria:
- REFERENCE targets must exist (hard dependency).

Exit criteria:
- Retrieval attempt completed with recorded performance and error typing.

Not for:
- Guessing without defined targets.

## 6) OVERLEARN
Plain meaning:
- Move from “can do” to fluent, durable performance.

System role:
- Continue retrieval beyond initial mastery.
- Use spaced and constrained practice for stability and speed.

Entry criteria:
- RETRIEVE indicates stable baseline accuracy.

Exit criteria:
- Performance stays strong over delayed checks and varied conditions.

Not for:
- Same-session cramming loops with no spacing.

## Hard Dependency Law
- No `RETRIEVE` without `REFERENCE` targets.

## Category Design Rules
- Each method belongs to exactly one category.
- Categories are fixed and non-overlapping.
- Category transitions are rule-driven, not ad hoc.

## First-Exposure Policy (Owner Requirement)
- Default assumption: the learner is seeing material for the first time in most sessions.
- PRIME must structure and teach before assessment pressure.
- CALIBRATE must not open the session with blind knowledge checks on unseen topics.

## Out of Scope (Handled Elsewhere)
- Method definitions and method evidence.
- Knob schemas and defaults.
- Chain templates and routing thresholds.
- Parser/security implementation details.
