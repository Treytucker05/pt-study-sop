# Tutor Owner Intent (Supporting Reference)

Date: 2026-02-22  
Owner: Trey  
Purpose: keep owner-specific Tutor lock-ins in one place so sessions do not drift.

Overall system canon now lives in `docs/root/TUTOR_STUDY_BUDDY_CANON.md`.
This file is a supporting owner-intent reference, not the top-level Study Buddy truth path.

## Core Intent
- Keep Trey’s Study System visibly organized around **Brain / Scholar / Tutor** rather than around a pile of pages.
- Make **Brain** identify how the learner learns best using evidence-backed profile claims and visible hybrid learner archetypes.
- Make **Scholar** a direct research partner that can ask the learner focused questions, research the web, and improve the system without becoming the teaching engine.
- Build a tutor that teaches any learner at any level and makes learning stick long-term.
- Prioritize durable learning and transfer, not short-term performance optics.

## Non-Negotiable Requirements
- The control plane remains category-first:
  - `PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`
- Model is `Category -> Method -> Knob -> Chain`.
- Library controls what Tutor teaches.
- Brain stores telemetry and fit signals, builds learner-profile claims, and exposes challengeable archetype summaries.
- Scholar is the layer that turns Brain outputs into research, learner questions, strategy recommendations, and system-improvement proposals.
- Brain must not directly steer Tutor. Any live adaptation must pass through Scholar in a bounded envelope.
- Scholar may ask the learner focused research/calibration questions and perform cited web research, but it must not teach course content.
- Obsidian is the main note home.
- Anki output is chain-conditional, not always-on.
- Tutor-generated Obsidian notes must include wiki links at creation time (not deferred cleanup).
- For Mind Map:
  - Method = `Mind Map`
  - Knobs include representation modes (for example `ASCII`, `Mermaid`, `Figma`)
  - Default knob for Mind Map = `ASCII` (project override)

## First-Exposure-First Operating Mode
- The default assumption is first exposure:
  - about 90% of sessions are on material not previously seen.
- PRIME must be tutor-led structuring and teaching, not blind testing.
- PRIME should not ask assessment questions.
- The tutor should not ask unsupported knowledge-check questions before giving enough structure to answer.
- CALIBRATE is where assessment questions begin (retrieval + confidence), after minimal primer.
- CALIBRATE should identify gaps without punitive framing.

## Anti-Drift Rules
- Keep the master canon, category definitions, and owner intent aligned.
- Do not reinterpret method/knob terms per session.
- Any new product preference from owner must be appended here with date and rationale.
- If a recommendation conflicts with the master canon on overall subsystem roles, the master canon wins.
- If a recommendation conflicts with this file on owner-specific Tutor lock-ins, this file wins unless owner explicitly changes it.

## Change Log
- 2026-03-11:
  - Locked the 3-part system identity: Brain = learner-model engine, Scholar = research partner, Tutor = live teacher.
  - Locked Brain learner archetypes as visible, challengeable, evidence-backed summaries rather than hidden labels.
  - Locked Scholar as learner-facing first with focused questions + cited web research, while keeping Tutor as the only live teaching engine.
  - Locked the no-direct-Brain-to-Tutor rule; live adaptation must pass through Scholar.
- 2026-03-06:
  - Clarified that Library controls content scope while SOP controls teaching behavior.
  - Clarified that Brain feeds Scholar for system improvement rather than directly steering Tutor pedagogy.
  - Clarified that Obsidian is the primary note home and Anki output is chain-conditional.
- 2026-02-22:
  - Added first-exposure-first requirement.
  - Locked behavior: PRIME teaches and structures before calibration pressure.
  - Locked boundary: PRIME has no scored/assessment questioning; CALIBRATE owns assessment probes.
  - Locked note policy: tutor outputs must include wiki links at generation time.
