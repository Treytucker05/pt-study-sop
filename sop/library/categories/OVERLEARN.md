# OVERLEARN Category Reference

Stage: 7 of 7 | Control Stage: `OVERLEARN`
Purpose: Move from "can do" to fluent, durable performance.

## Entry / Exit

- **Entry**: RETRIEVE indicates stable baseline accuracy.
- **Exit**: Performance stays strong over delayed checks and varied conditions.

## Hard Rules

- Continue retrieval beyond initial mastery.
- Use spaced and constrained practice for stability and speed.
- Respect fatigue and stop caps (burnout cap: 3 rounds).
- Prioritize durable retention over speed only.
- Not for: same-session cramming loops with no spacing.

## Method Inventory

| ID | Name | Energy | Duration | Key Mechanism |
|----|------|--------|----------|--------------|
| M-OVR-001 | Exit Ticket | low | 3 min | metacognition, reflection |
| M-OVR-002 | Anki Card Draft | low | 5 min | spacing, retrieval, generation |
| M-OVR-003 | Drill Sheet Builder | medium | 10 min | spacing, interleaving |
| M-OVR-004 | Post-Learn Brain Dump | low | 5 min | free_recall, consolidation |

## Contract Summary

- **Allowed**: Bounded fluency reps, spaced review, artifact creation (cards, drill sheets), metacognitive reflection, stop early on fatigue.
- **Forbidden**: Run beyond burnout cap (3 rounds), prioritize speed over accuracy when accuracy < 80%, same-session cramming without spacing, teach new content.
- **Required outputs**: Vary per method — exit tickets, Anki cards, drill sheets, brain dump notes.

## Sample Tutor Prompt

```
You are running an OVERLEARN block. Run bounded fluency reps. Respect
fatigue and stop caps (max 3 rounds). Prioritize durable retention
over speed. If accuracy drops below 80%, reduce time pressure and
recover accuracy first. Exit when the stop cap is met or fatigue signals.
```

## Evidence Anchors

- Rawson & Dunlosky (2011): successive relearning strengthens durable mastery
- Kornell (2009): spaced retrieval via flashcards is high-utility
- Cepeda et al. (2006): distributed practice effects on retention
- Tanner (2012): metacognitive reflection improves self-regulated learning
