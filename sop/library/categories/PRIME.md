# PRIME Category Reference

Stage: 1 of 7 | Control Stage: `PRIME`
Purpose: Build structure from the source material before detail so the learner has a stable mental frame.

## Entry / Exit

- **Entry**: New topic (unseen material) or fresh material slice that needs structure before teaching.
- **Exit**: The learner has a stable scaffold and the next stage can either teach or calibrate without drifting.

## Hard Rules

- Material-grounded structure only. No scoring, no confidence logging, no accuracy values.
- No learner-memory probes in PRIME; those live in CALIBRATE.
- Do not begin core instruction in PRIME; TEACH owns first-contact explanation.
- Must precede TEACH or CALIBRATE in first-exposure chains.

## Method Inventory

| ID | Name | Energy | Duration | Key Mechanism |
|----|------|--------|----------|--------------|
| M-PRE-002 | Overarching Pre-Question Set | low | 5 min | curiosity_priming |
| M-PRE-004 | Hierarchical Advance Organizer | medium | 8 min | advance_organizer |
| M-PRE-005 | Skeleton Concept Hierarchy | medium | 8 min | structural_scaffolding |
| M-PRE-006 | Structural Skimming + Pillar Mapping | medium | 8 min | structural_scaffolding |
| M-PRE-008 | Structural Extraction | medium | 10 min | structural_scaffolding |
| M-PRE-009 | Syntopical Big-Picture Synthesis | high | 15 min | cross_source_integration |
| M-PRE-010 | Learning Objectives Primer | low | 5 min | goal_setting |
| M-PRE-011 | Hand-Draw Map | medium | 5 min | spatial_encoding, generation |
| M-PRE-012 | Terminology Pretraining | low | 4 min | pretraining_principle |
| M-PRE-013 | Big-Picture Orientation Summary | low | 4 min | advance_organizer |
| M-PRE-014 | Ambiguity and Blind-Spot Scan | medium | 4 min | gap_detection |

## Contract Summary

All PRIME methods share these behavioral constraints:

- **Allowed**: Structure material, extract high-level organization, anchor objectives, terminology, and blind spots, ask non-scored orientation prompts anchored to the source.
- **Forbidden**: Check correctness, probe memory from prior knowledge, log confidence as score signal, produce accuracy values, run assessment probes, or deliver first-contact explanation.
- **Required outputs**: Vary per method (see individual YAML files).

## PRIME / TEACH Boundary

- `root-level understanding` is no longer a PRIME move.
- If the learner wants the root mechanism or organizing explanation first, route that intent to TEACH (for example `Mechanism Trace`) after PRIME finishes structural setup.
- PRIME may highlight unknowns, name key parts, and build a scaffold, but it must not replace TEACH.

## Sample Tutor Prompt

```
You are running a PRIME block. Your job is to build a simple topic scaffold
the learner can follow. Introduce core terms and basic structure before
depth. Ask orientation prompts only (non-scored). Do NOT quiz, grade,
or log confidence. Exit when the learner can restate the core structure.
```

## Evidence Anchors

- Ausubel (1968): advance organizers improve integration of new information
- Mayer (2009): pretraining key parts before explanation helps novices manage complex material
- Pan and Rivers (2023): bounded prequestions can potentiate downstream learning when paired with later instruction
