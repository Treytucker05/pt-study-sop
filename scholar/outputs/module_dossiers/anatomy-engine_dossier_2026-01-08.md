# Module Dossier - Anatomy Engine
- Path: sop/gpt-knowledge/anatomy-engine.md (canonical), sop/engines/anatomy-engine.md (reference)
- Phase: Engine
- Last Updated: 2026-01-08

## 1. Operational Contract
- Purpose: Guide regional anatomy learning using a visual-first, bone/landmark-first sequence before OIANA+ details.
- Triggers: Anatomy-specific session; user requests landmark, draw, mnemonic, or wrap commands.
- Required Inputs: Target region; source packet or lab objectives; time box; pre-test items; learner goal (review vs first-pass).
- Required Outputs: Landmark map, attachment table, OIANA+ details (including arterial supply), recall/quiz outcomes, cards for misses, glossary entries, next-review plan.
- Exit Criteria: Landmarks and attachments are stable; OIANA+ recall verified; wrap artifacts generated.
- Failure Modes / Drift Risks: Skipping the landmark-first order, introducing mnemonics before understanding, adding OIANA+ without source verification, omitting arterial supply, or overloading with lists before spatial grounding.

## 2. Pedagogy Mapping
(Evaluate using scholar/knowledge/pedagogy_audit.md categories)
- Retrieval Practice: PARTIAL - includes pre-test and recall/quiz cycles, but retrieval-before-explanation is not enforced for every chunk.
- Spacing/Interleaving: PARTIAL - wrap includes next-review scheduling, but interleaving and resurfacing prior errors are not explicit.
- Cognitive Load: PASS - strict sequencing, step-by-step landmark pass, and concise output guidance reduce extraneous load.
- Metacognition: PARTIAL - wrap recap and error logs exist, but no confidence ratings or explicit calibration prompts.

## 3. Evidence Map
- PMID 36259486: Can drawing instruction help students with low visuospatial ability in learning anatomy? (Anat Sci Educ, 2023) - supports drawing instruction as a scaffold for learners with lower spatial ability.
- PMID 27164484: Improvements in anatomy knowledge when utilizing a novel cyclical Observe-Reflect-Draw-Edit-Repeat learning process. (Anat Sci Educ, 2017) - supports iterative drawing cycles for anatomy learning gains.
- PMID 41267349: Showing the drawing hand of the teacher in an anatomy video lecture - effect on learning, motivation, and cognitive load. (Anat Sci Educ, 2025) - supports visual demonstration and cognitive load benefits.
- PMID 40723757: The Use of Retrieval Practice in the Health Professions: A State-of-the-Art Review. (Behavioral Sciences, 2025) - supports retrieval practice as an evidence-backed strategy.

## 4. Improvement Candidates (Rabbit Holes Allowed)
- Add explicit micro-checkpoints: one landmark retrieval prompt before each attachment list.
- Define a standard glossary storage path and required fields for region terms.
- Introduce a light interleaving step for neighboring regions or look-alike landmarks.

## 5. Promotion Candidates (MAX 3)
(Actionable, ONE-change-only)
1. Add a required landmark recall prompt before starting OIANA+ for each region.
2. Add a Wrap checklist item to record arterial supply misses as cards.
3. Add a minimal interleaving prompt that contrasts two adjacent landmarks per session.

## 6. Guardrails (What Must Not Change)
- Source-Lock: Prefer user-provided sources; mark outputs unverified if missing.
- Order enforcement: Bones -> landmarks -> attachments -> actions -> nerves -> arterial supply -> clinical.
- Mnemonics only after understanding; do not replace visual/spatial mapping.
- Rollback rule: if OIANA+ is shaky, return to landmarks and attachments.
