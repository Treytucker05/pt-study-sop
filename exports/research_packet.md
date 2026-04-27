# Research Packet

This packet is generated from canonical YAML and markdown artifacts in `sop/library/`.
It is intended for external learning-science review without repository access.

## A) Executive Summary

The system implements a domain-agnostic Intelligent Tutoring System (ITS) control-plane.
The control-plane separates policy from content and enforces a fixed operational sequence:

`PRIME -> TEACH -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`

Key properties:
- deterministic stage gates
- explicit artifact contracts (e.g., OnePageAnchor, QuestionBankSeed, ErrorLog)
- error-driven adaptation mapping (ErrorType -> mandatory method overrides)
- chain-level knob routing (stage, energy, class_type, time_available, pass)

## B) Canonical Artifacts and Templates Overview

| canonical component | purpose | interpretation without repo |
| --- | --- | --- |
| Method YAML catalog | Defines atomic tutoring methods and metadata | Each method row below is executable policy + constraints |
| Chain YAML catalog | Defines ordered method compositions | Chain table below encodes default sequencing behavior |
| Control-plane spec | Defines stage gates + adaptation logic | Gates and ErrorLog semantics are summarized in this packet |
| Template bundle | Defines mandatory artifacts and CSV schemas | Templates table below is sufficient for offline review |

### Template Inventory

| artifact template | type | stage hint | summary |
| --- | --- | --- | --- |
| CalibrateItems.md | md | CALIBRATE | Calibrate Items Template |
| CalibrateResults.csv | csv | CALIBRATE | topic_id,item_id,response,confidence,time_to_answer,status,weakness_type |
| CoverageCheck.md | md | REFERENCE | Coverage Check Template |
| CrossSessionValidation.md | md | OVERLEARN | Cross-Session Validation Template |
| DrillSheet.md | md | OVERLEARN | Drill Sheet Template |
| ErrorLog.csv | csv | RETRIEVE | topic_id,item_id,error_type,stage_detected,confidence,time_to_answer,fix_applied,assessment_mode,chain_id,support_level,prior_exposure_band,selector_policy_version,dependency_fix_applied |
| GoalTargets.md | md | PRIME | Goal Targets Template |
| METHOD-TEMPLATE.yaml | yaml | MISSING | ============================================================================ |
| OnePageAnchor.md | md | REFERENCE | One-Page Anchor Template |
| Predictions.md | md | PRIME | Predictions Template |
| PrioritySet.md | md | CALIBRATE | Priority Set Template |
| QuestionBankSeed.md | md | REFERENCE | Question Bank Seed Template |
| session_log_template.yaml | yaml | OBSERVABILITY | Canonical logging fields for study sessions. |
| Spine.md | md | PRIME | Spine Template |
| topic.yaml | yaml | CONTROL PLANE | topic_id: T-EXAMPLE-001 |
| Unknowns.md | md | PRIME | Unknowns Template |

## C) Full Method Catalog

| method_id | current name | stage | purpose | inputs -> outputs | gates | error types remediated | knobs supported (acute variables) | facilitation prompt |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| M-CAL-001 | Micro Precheck | CALIBRATE | Run a short scored micro-calibrate baseline (2-5 minutes) at session opening to estimate readiness before EXPLAIN. | {'description': 'Active objective targets', 'required': True}; {'description': 'Calibrate item set aligned to scope', 'required': True}; {'description': 'objective_scope and focus objective context', 'required': True} -> {'name': 'CalibrateItemResults (per-item correctness, latency, confidence)', 'description': 'Per-item scored log capturing answer quality, latency, and confidence for the micro baseline.', 'format': 'structured log'}; {'name': 'ReadinessSnapshot (accuracy summary)', 'description': 'Short readiness summary of overall performance across the probe set.', 'format': 'short summary paragraph or bullets'}; {'name': 'CalibrationGapSummary (predicted vs actual gap)', 'description': 'Short comparison between learner confidence and actual performance.', 'format': 'short summary paragraph or bullets'}; {'name': 'DominantErrorSeed (highest-frequency error class)', 'description': 'Highest-frequency miss pattern that should shape the next routing decision.', 'format': 'bulleted or tabular list'}; {'name': 'MicroCalibrateSnapshot (opening readiness signal for TEACH routing)', 'description': 'Opening readiness signal that helps route the learner to the next stage without drifting into teaching.', 'format': 'short summary paragraph or bullets'} | MISSING | failure_mode:Learner asks for teaching before attempting; failure_mode:Probe is too broad to score cleanly; failure_mode:The block drifts into EXPLAIN | operational_stage=CALIBRATE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-CAL-001 (Micro Precheck) in the CALIBRATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: CalibrateItemResults, ReadinessSnapshot, CalibrationGapSummary, DominantErrorSeed, and MicroCalibrateSnapshot.
Run a short scored readiness check before EXPLAIN. Keep it diagnostic only, require one real attempt before any answer reveal, capture confidence before feedback, and stop at the item or time cap.
Preset behavior:
- exam_cram: one-shot; 2 items; terse score bullets; one-line readiness call.
- deep_mastery: interactive; 4-5 items; explicit per-item log; fuller calibration-gap summary before routing.
- quick_review: one-shot refresh; 2-3 items; compact score table plus one route decision.
- clinical_bridge: stepwise; use brief applied probes or mini-scenarios and summarize misses in a route-focused decision table.
If no preset is specified, use the default knobs. One-shot returns the full diagnostic artifact in one bounded reply; interactive or stepwise mode moves probe -> scoring -> snapshot and waits.
 |
| M-CAL-002 | Full Calibrate Probes | CALIBRATE | Run the FULL CALIBRATE probe set after a TEACH-close artifact to generate scored evidence for routing. | {'description': 'TEACH-close artifact (anchor/map/table/flow)', 'required': True}; {'description': 'Full-calibrate probe set aligned to objective scope', 'required': True}; {'description': 'Item correctness', 'required': True}; {'description': 'Item latency', 'required': True} -> {'name': 'FullCalibrateItemResults (per-item correctness, latency, confidence)', 'description': 'Per-item scored log for the fuller readiness probe set.', 'format': 'structured log'}; {'name': 'ConfidenceTaggedResults (per-item confidence + correctness)', 'description': 'Per-item confidence-tagged scoring view for calibration analysis.', 'format': 'structured log'}; {'name': 'HighConfidenceMisses (overconfidence items)', 'description': 'Items missed with high confidence that signal risky overestimation.', 'format': 'structured response'}; {'name': 'LowConfidenceHits (underconfidence items)', 'description': 'Correct items answered with low confidence that signal fragile mastery.', 'format': 'structured response'}; {'name': 'CalibrationRiskFlags (routing signals for downstream methods)', 'description': 'Route-relevant risk signals derived from the probe pattern.', 'format': 'structured response'}; {'name': 'FullCalibrateSnapshot (post-TEACH diagnostic summary)', 'description': 'Short post-probe summary used for downstream routing after the fuller calibrate block.', 'format': 'short summary paragraph or bullets'} | MISSING | failure_mode:Learner asks for teaching before attempting; failure_mode:Probe is too broad to score cleanly; failure_mode:The block drifts into EXPLAIN | operational_stage=CALIBRATE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-CAL-002 (Full Calibrate Probes) in the CALIBRATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: FullCalibrateItemResults, ConfidenceTaggedResults, HighConfidenceMisses, LowConfidenceHits, CalibrationRiskFlags, and FullCalibrateSnapshot.
Run a fuller scored readiness block after the TEACH-close artifact. Keep it diagnostic only, require one real attempt before any answer reveal, capture confidence before feedback on every item, and stop at the configured probe or time cap.
Preset behavior:
- exam_cram: one-shot; lower-end probe count; terse bullets; only the most decision-relevant risks and route call.
- deep_mastery: interactive; upper-end probe count; explicit per-item log; fuller bias readout before routing.
- quick_review: one-shot refresh; mid-range probe count; compact score-and-risk table plus one route decision.
- clinical_bridge: stepwise; use brief applied probes and summarize overconfidence or underconfidence signals in a routing matrix.
If no preset is specified, use the default knobs. One-shot returns the full diagnostic artifact in one bounded reply; interactive or stepwise mode moves probes -> risk patterning -> snapshot and waits.
 |
| M-CAL-003 | Full Calibrate Priority Set | CALIBRATE | Build a deterministic top-3 weakness set from FULL CALIBRATE telemetry to drive ENCODE method selection. | {'description': 'FullCalibrateItemResults', 'required': True}; {'description': 'FullCalibrateSnapshot', 'required': True}; {'description': 'Confidence-tagged results', 'required': True}; {'description': 'Error-type labels', 'required': True} -> {'name': 'FullCalibratePrioritySet (exactly 3 ranked weaknesses)', 'description': 'Deterministic top-3 ranked weakness set derived from full-calibrate telemetry.', 'format': 'structured response'}; {'name': 'WeaknessScoreTable (scoring breakdown per weakness)', 'description': 'Scoring breakdown that shows why each weakness made the ranked set.', 'format': 'structured table'}; {'name': 'EncodeRoutingSeed (one ENCODE method-family recommendation per weakness)', 'description': 'One method-family recommendation per ranked weakness for the next ENCODE move.', 'format': 'bulleted or tabular list'}; {'name': 'FullCalibrateHandoff (diagnostic-to-encode handoff contract)', 'description': 'Compact handoff contract from ranked diagnostic weaknesses into the next stage.', 'format': 'structured response'} | MISSING | failure_mode:Learner asks for teaching before attempting; failure_mode:Probe is too broad to score cleanly; failure_mode:The block drifts into EXPLAIN | operational_stage=CALIBRATE; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-CAL-003 (Full Calibrate Priority Set) in the CALIBRATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: FullCalibratePrioritySet, WeaknessScoreTable, EncodeRoutingSeed, and FullCalibrateHandoff.
Convert full-calibrate telemetry into exactly 3 ranked weaknesses. Keep the ranking deterministic, score frequency plus confidence-mismatch plus latency, and hand off one ENCODE method-family recommendation per weakness without teaching the content.
Preset behavior:
- exam_cram: one-shot; terse bullets; top 3 only; one-line ENCODE seeds.
- deep_mastery: interactive; labeled sections; explicit score table, tie-break logic, and richer routing rationale.
- quick_review: one-shot refresh; compact priority table with minimal narrative.
- clinical_bridge: stepwise; handoff matrix focused on likely downstream failure points and next applied ENCODE moves.
If no preset is specified, use the default knobs. One-shot returns the full ranking artifact in one bounded reply; interactive or stepwise mode moves scoring -> ranking -> handoff and waits.
 |
| M-CAL-004 | Story Confidence Tag | CALIBRATE | After receiving the big-picture narrative overview, rate your confidence in the story as a whole. Can you retell the narrative thread? Where does the story break down? Light-touch calibration that respects top-down learners — no item-level quizzing. | {'description': 'Completed narrative overview from PRIME or early ENCODE', 'required': True}; {'description': 'The story thread the learner just received', 'required': True} -> {'name': 'Story confidence rating (1-3 scale)', 'description': 'A calibrated diagnostic output that supports routing for a light-touch story-confidence check that audits whether the learner can retell the big-picture narrative thread.', 'format': 'structured response'}; {'name': 'Fuzzy zones list (narrative breakdown points)', 'description': 'A calibrated diagnostic output that supports routing for a light-touch story-confidence check that audits whether the learner can retell the big-picture narrative thread.', 'format': 'bulleted or tabular list'}; {'name': 'Priority encoding targets (focus areas for ENCODE phase)', 'description': 'A calibrated diagnostic output that supports routing for a light-touch story-confidence check that audits whether the learner can retell the big-picture narrative thread.', 'format': 'structured response'}; {'name': 'Optional probe seed suggestions for M-CAL-002', 'description': 'A tagged retrieval-question bank that can be reused later for practice or deck construction.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Learner asks for teaching before attempting; failure_mode:Probe is too broad to score cleanly; failure_mode:The block drifts into TEACH | operational_stage=CALIBRATE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-CAL-004 (Story Confidence Tag) in the CALIBRATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Story confidence rating, Fuzzy zones list, Priority encoding targets, and Optional probe seed suggestions.
Run a light-touch global calibration check. Ask for the 1-3 story confidence rating, locate where the narrative thread breaks, and convert those fuzzy zones into the next encoding or probing targets.
Preset behavior:
- exam_cram: one-shot; confidence tag, one fuzzy zone, one priority target.
- deep_mastery: interactive; confidence rating plus fuller retell check and richer routing handoff.
- quick_review: one-shot refresh; Confidence \| Story break \| Next target table.
- clinical_bridge: stepwise; applied routing grid from story-break point to next encoding or probe move.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves confidence tag -> fuzzy zone -> routing target and waits. |
| M-ENC-001 | KWIK Hook | ENCODE | Structured 6-step encoding protocol for new terms and concepts. Start by turning the word into something it sounds like, state the real meaning/function, create a picture for the meaning, link the sound-picture to the meaning-picture, personalize it so it sticks, then lock it as a reusable note/card. Each step is gated — do not skip ahead. | {'description': 'New term or concept to encode', 'required': True}; {'description': 'Definition or meaning from source material', 'required': True}; {'description': 'Blank note area for hook creation', 'required': True} -> {'name': 'KWIK hook (sound cue + meaning link scene)', 'description': 'KWIK hook (sound cue + meaning link scene)', 'format': 'short cue plus explanation'}; {'name': 'Anki card draft (optional)', 'description': 'Anki card draft (optional)', 'format': 'short, checkable artifact'}; {'name': 'Session log entry', 'description': 'Session log entry', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Image too abstract; failure_mode:Skipping steps; failure_mode:Sound cue forced; failure_mode:Sound cue never connects back to the actual meaning; failure_mode:Weak personal connection | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; mnemonic_tier=full; slot_policy=encode_deepening; evidence_raw=Paivio (1991); dual-coding theory — combining verbal + visual improves retention; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.', 'Require TEACH-close artifact to exist before running full KWIK.']; stipulations=["Confirm the learner understands the concept's function before building the hook.", 'Hooks support understanding; they do not replace explanation.', 'If a hook uses broader teaching knowledge or analogy, do not present it as if it came directly from source material.', 'This is full KWIK for deeper ENCODE work, not the lightweight live mnemonic slot between TEACH and FULL CALIBRATE.', 'If the chain declares a post-TEACH mnemonic slot, reserve that slot for KWIK Lite (separate method/runtime lane).']; logging_fields=['term_encoded', 'sound_cue', 'meaning_link_confirmed', 'resonance_confirmed', 'card_created']; artifact_type=notes | You are running M-ENC-001 (KWIK Hook) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Create a compact memory cue that links a term or concept to a vivid sound, image, or body-based anchor without losing the real meaning.
Scope: Structured 6-step encoding protocol for new terms and concepts. Start by turning the word into something it sounds like, state the real meaning/function, create a picture for the meaning, link the sound-picture to the meaning-picture, personalize it so it sticks, then lock it as a reusable note/card. Each step is gated — do not skip ahead.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Use the full KWIK workflow only — Prevents collapsing the method into a lighter mnemonic lane that serves a different purpose.
- Confirm the learner understands the concept's function before building the hook. — Keeps the method honest and prevents a common misuse described in the source file.
- Not for: This is not for teaching the whole concept from scratch, replacing source truth, or turning a mnemonic into a false fact claim.
Inputs:
- New term or concept to encode (required)
- Definition or meaning from source material (required)
- Blank note area for hook creation (required)
Required outputs:
- KWIK hook (sound cue + meaning link scene): KWIK hook (sound cue + meaning link scene) [short cue plus explanation]
- Anki card draft (optional): Anki card draft (optional) [short, checkable artifact]
- Session log entry: Session log entry [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. Word Sound
   Tutor does: Guide the learner to Word Sound: Turn the word into something it sounds like. Keep in mind: Find a phonetic cue, rhyme, or sound-alike proxy. Example: 'Sartorius' sounds like 'sartorial'.
   Learner does: Supplies the target term or concept, then reacts to the cue and confirms whether it clicks.
   Example: Example: Find a phonetic cue, rhyme, or sound-alike proxy. Example: 'Sartorius' sounds like 'sartorial'.
   Check: Does the learner have the right term and true meaning before the cue is built?
   Then STOP and wait for the learner.
2. Real Meaning
   Tutor does: Guide the learner to Real Meaning: State the true meaning or function in one sentence. Keep in mind: Must come from source material (Source-Lock)
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Must come from source material (Source-Lock)
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Meaning Picture
   Tutor does: Guide the learner to Meaning Picture: Create a vivid picture that shows what the term means or does. Keep in mind: Build a concrete picture for the real meaning before linking it to the sound cue
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Build a concrete picture for the real meaning before linking it to the sound cue
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Link
   Tutor does: Guide the learner to Link: Connect the sound-picture to the meaning-picture in one vivid scene. Keep in mind: Make the scene active so the word-sound naturally points back to the real meaning
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Make the scene active so the word-sound naturally points back to the real meaning
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Personalize
   Tutor does: Guide the learner to Personalize: Add emotion, absurdity, or personal relevance and say why it clicks. Keep in mind: Say: 'This clicks because...' and make the linked scene memorable to YOU
   Learner does: Supplies the target term or concept, then reacts to the cue and confirms whether it clicks.
   Example: Example: Say: 'This clicks because...' and make the linked scene memorable to YOU
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
6. Lock
   Tutor does: Guide the learner to Lock: Record the hook as an Anki card or session log entry. Keep in mind: Capture for spaced repetition
   Learner does: Supplies the target term or concept, then reacts to the cue and confirms whether it clicks.
   Example: Example: Capture for spaced repetition
   Check: Is the final artifact captured and ready to keep or review?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: KWIK hook (sound cue + meaning link scene), Session log entry.
- The method reaches its stop condition: All 6 steps completed; Hook feels "locked" (resonance confirmed).
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Shrink to one term, restate the real meaning in plain language, then try a simpler sound cue, image cue, or body cue. If the cue still does not click, switch to a lighter mnemonic lane or ask for one concrete example.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts.

Flow contract:
- Walk the learner through word sound -> real meaning -> meaning picture -> linked scene -> personalize -> lock.
- Close with one sound cue + meaning link scene that anchors the item. |
| M-ENC-002 | Seed-Lock Generation | ENCODE | Learner generates their own encoding hook BEFORE the AI offers help. Start with your own association, metaphor, or mnemonic. AI only assists if you're stuck. Enforces active generation over passive reception. | {'description': 'New term or concept to encode', 'required': True}; {'description': 'Definition from source material', 'required': True}; {'description': '90-second timer', 'required': True} -> {'name': 'Learner-generated Seed (primary hook attempt)', 'description': 'Learner-generated Seed (primary hook attempt)', 'format': 'short cue plus explanation'}; {'name': 'Final locked hook', 'description': 'Final locked hook', 'format': 'short cue plus explanation'}; {'name': 'Generation success flag (self vs AI-assisted)', 'description': 'Generation success flag (self vs AI-assisted)', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Asking AI immediately; failure_mode:Giving up too fast; failure_mode:Over-relying on AI hooks | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; evidence_raw=Slamecka & Graf (1978); generation effect — self-generated items remembered better than read items; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; logging_fields=['generation_type', 'seed_attempted', 'ai_assist_used', 'time_to_seed']; artifact_type=notes | You are running M-ENC-002 (Seed-Lock Generation) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Force the learner to actively generate, explain, sequence, or transform the material so encoding is deeper than passive review.
Scope: Learner generates their own encoding hook BEFORE the AI offers help. Start with your own association, metaphor, or mnemonic. AI only assists if you're stuck. Enforces active generation over passive reception.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Force active processing (explain, transform, or map), not passive reading. — This gating rule is part of the method’s execution contract.
- Keep output scoped to mapped objectives only. — This gating rule is part of the method’s execution contract.
- Not for: This is not for passive reading, copying answers, or letting the tutor do the cognitive work for the learner.
Inputs:
- New term or concept to encode (required)
- Definition from source material (required)
- 90-second timer (required)
Required outputs:
- Learner-generated Seed (primary hook attempt): Learner-generated Seed (primary hook attempt) [short cue plus explanation]
- Final locked hook: Final locked hook [short cue plus explanation]
- Generation success flag (self vs AI-assisted): Generation success flag (self vs AI-assisted) [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. Read The Term And Its
   Tutor does: Guide the learner to Read the term and its definition. Keep in mind: Understand what you're encoding before generating
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Understand what you're encoding before generating
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. Timer For 90 Seconds
   Tutor does: Guide the learner to Set timer for 90 seconds. Keep in mind: Time pressure forces retrieval attempt
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Time pressure forces retrieval attempt
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Generate Your Own Hook Association
   Tutor does: Guide the learner to Generate your OWN hook — association, metaphor, mnemonic, or image. Keep in mind: This is the "Seed" — your first attempt
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: This is the "Seed" — your first attempt
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Down Your Seed Even If
   Tutor does: Guide the learner to Write down your Seed even if imperfect. Keep in mind: Any attempt is better than waiting for AI
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Any attempt is better than waiting for AI
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. If Stuck After 90S Ask
   Tutor does: Guide the learner to If stuck after 90s, ask Tutor for a suggestion. Keep in mind: AI provides only if you've tried first
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: AI provides only if you've tried first
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
6. Lock The Final Hook Yours
   Tutor does: Guide the learner to Lock the final hook (yours or AI-assisted). Keep in mind: Record for spaced repetition
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Record for spaced repetition
   Check: Is the final artifact captured and ready to keep or review?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Learner-generated Seed (primary hook attempt), Final locked hook, Generation success flag (self vs AI-assisted).
- The method reaches its stop condition: Hook generated (self or AI-assisted); 90-second attempt completed.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Offer one smaller hint, one simpler example, or one step back in the chain; then require the learner to continue actively.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-003 | Draw-Label | ENCODE | Sketch the structure (anatomy, pathway, concept map) and label from memory. Fill gaps with source material. | {'description': 'Structure to draw (anatomy, pathway, diagram)', 'required': True}; {'description': 'Blank paper or drawing surface', 'required': True}; {'description': 'Source material for gap-filling', 'required': True} -> {'name': 'Completed labeled diagram', 'description': 'Completed labeled diagram', 'format': 'labeled visual structure'}; {'name': 'Gap list (what was missing)', 'description': 'Gap list (what was missing)', 'format': 'short, checkable artifact'}; {'name': 'Accuracy percentage', 'description': 'Accuracy percentage', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Focusing on artistic quality; failure_mode:Looking at source while drawing; failure_mode:Not tracking gaps | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; evidence_raw=Wammes et al. (2016); drawing effect — drawing produces superior memory compared to writing; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; logging_fields=['structure_drawn', 'labels_recalled', 'labels_missed', 'gap_percentage', 'redraw_count']; artifact_type=notes | You are running M-ENC-003 (Draw-Label) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Organize the material into a visible structure so relationships, sequence, contrast, or hierarchy become easier to remember and explain.
Scope: Sketch the structure (anatomy, pathway, concept map) and label from memory. Fill gaps with source material.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Force active processing (explain, transform, or map), not passive reading. — This gating rule is part of the method’s execution contract.
- Keep output scoped to mapped objectives only. — This gating rule is part of the method’s execution contract.
- Not for: This is not for isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.
Inputs:
- Structure to draw (anatomy, pathway, diagram) (required)
- Blank paper or drawing surface (required)
- Source material for gap-filling (required)
Required outputs:
- Completed labeled diagram: Completed labeled diagram [labeled visual structure]
- Gap list (what was missing): Gap list (what was missing) [short, checkable artifact]
- Accuracy percentage: Accuracy percentage [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. Or Cover Source Material
   Tutor does: Guide the learner to Close or cover source material. Keep in mind: Drawing from memory is the key mechanism
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Drawing from memory is the key mechanism
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. Sketch The Basic Structure Outline
   Tutor does: Guide the learner to Sketch the basic structure/outline from memory. Keep in mind: Rough is fine — focus on spatial relationships
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Rough is fine — focus on spatial relationships
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Label As Many Parts As
   Tutor does: Guide the learner to Label as many parts as you can recall. Keep in mind: Leave blank where uncertain
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Leave blank where uncertain
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Source Material For Gaps
   Tutor does: Guide the learner to Check source material for gaps. Keep in mind: Note which labels you missed
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Note which labels you missed
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. In Missing Labels With A
   Tutor does: Guide the learner to Fill in missing labels with a different color. Keep in mind: Different color highlights gaps for review
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Different color highlights gaps for review
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
6. Redraw From Memory If 30
   Tutor does: Guide the learner to Redraw from memory if >30% gaps. Keep in mind: Repeat until <30% gaps
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Repeat until <30% gaps
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Completed labeled diagram, Gap list (what was missing), Accuracy percentage.
- The method reaches its stop condition: Diagram complete with all labels; Gap rate <30%.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Reduce the scope to fewer nodes or rows, restate the parts in plain language, and then rebuild the structure one relationship at a time. If needed, switch to a simpler map or flowchart.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-004 | Teach-Back | ENCODE | Explain the concept aloud as if teaching a classmate. Identify points where explanation breaks down. | {'description': 'Concept to teach', 'required': True}; {'description': 'Imaginary student (or real one)', 'required': True}; {'description': 'Recording device (optional)', 'required': False} -> {'name': 'Verbal explanation (recorded or noted)', 'description': 'Verbal explanation (recorded or noted)', 'format': 'concise prose bullets or short paragraph'}; {'name': 'Breakdown points list', 'description': 'Breakdown points list', 'format': 'short, checkable artifact'}; {'name': 'Targeted review areas', 'description': 'Targeted review areas', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Not identifying breakdowns; failure_mode:Reading instead of explaining; failure_mode:Skipping "dumb" questions | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; evidence_raw=Nestojko et al. (2014); expecting to teach enhances encoding and organization; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; stipulations=['Teach-back is a guided explanation block, not a surprise graded evaluation.', 'Use learner breakdowns to steer targeted review rather than to judge performance harshly.']; logging_fields=['concept_taught', 'breakdown_count', 'fluency_rating', 'targeted_review_items']; artifact_type=notes | You are running M-ENC-004 (Teach-Back) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Force the learner to actively generate, explain, sequence, or transform the material so encoding is deeper than passive review.
Scope: Explain the concept aloud as if teaching a classmate. Identify points where explanation breaks down.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Teach-back is a guided explanation block, not a surprise graded evaluation. — Keeps the method honest and prevents a common misuse described in the source file.
- Use learner breakdowns to steer targeted review rather than to judge performance harshly. — Keeps the method honest and prevents a common misuse described in the source file.
- Not for: This is not for passive reading, copying answers, or letting the tutor do the cognitive work for the learner.
Inputs:
- Concept to teach (required)
- Imaginary student (or real one) (required)
- Recording device (optional) (optional)
Required outputs:
- Verbal explanation (recorded or noted): Verbal explanation (recorded or noted) [concise prose bullets or short paragraph]
- Breakdown points list: Breakdown points list [short, checkable artifact]
- Targeted review areas: Targeted review areas [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. The Concept You Will Teach
   Tutor does: Guide the learner to State the concept you will teach. Keep in mind: Be specific about scope
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Be specific about scope
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. The Concept Aloud As If
   Tutor does: Guide the learner to Explain the concept aloud as if to a first-year student. Keep in mind: Use simple language; avoid jargon
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Use simple language; avoid jargon
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Note Any Points Where You
   Tutor does: Guide the learner to Note any points where you stumble or hesitate. Keep in mind: These are knowledge gaps
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: These are knowledge gaps
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Answer The Imaginary Student S
   Tutor does: Guide the learner to Answer the imaginary student's "why?" and "how?" questions. Keep in mind: Force yourself to go deeper
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Force yourself to go deeper
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Breakdown Points
   Tutor does: Guide the learner to Identify breakdown points. Keep in mind: Where did the explanation fail?
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Where did the explanation fail?
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
6. To Source For Breakdown Areas
   Tutor does: Guide the learner to Return to source for breakdown areas only. Keep in mind: Targeted review, not full re-read
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Targeted review, not full re-read
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Verbal explanation (recorded or noted), Breakdown points list, Targeted review areas.
- The method reaches its stop condition: Full explanation delivered; Breakdown points identified.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Offer one smaller hint, one simpler example, or one step back in the chain; then require the learner to continue actively.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-005 | Why-Chain | ENCODE | Ask 'why?' 3-5 times in succession about a concept to build causal depth. Each answer becomes the premise for the next question. Based on elaborative interrogation (Dunlosky et al.). | {'description': 'Initial statement or fact to interrogate', 'required': True}; {'description': 'Source material for verification', 'required': True} -> {'name': 'Why-chain document (3-5 linked explanations)', 'description': 'Why-chain document (3-5 linked explanations)', 'format': 'concise prose bullets or short paragraph'}; {'name': 'Depth level reached', 'description': 'Depth level reached', 'format': 'short, checkable artifact'}; {'name': 'Verification status', 'description': 'Verification status', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Circular reasoning; failure_mode:Making up explanations; failure_mode:Stopping too early | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; evidence_raw=Dunlosky et al. (2013); elaborative interrogation rated moderate utility for learning; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; logging_fields=['initial_statement', 'chain_depth', 'verification_status', 'bedrock_reached']; artifact_type=notes | You are running M-ENC-005 (Why-Chain) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Force the learner to actively generate, explain, sequence, or transform the material so encoding is deeper than passive review.
Scope: Ask 'why?' 3-5 times in succession about a concept to build causal depth. Each answer becomes the premise for the next question. Based on elaborative interrogation (Dunlosky et al.).
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Force active processing (explain, transform, or map), not passive reading. — This gating rule is part of the method’s execution contract.
- Keep output scoped to mapped objectives only. — This gating rule is part of the method’s execution contract.
- Not for: This is not for passive reading, copying answers, or letting the tutor do the cognitive work for the learner.
Inputs:
- Initial statement or fact to interrogate (required)
- Source material for verification (required)
Required outputs:
- Why-chain document (3-5 linked explanations): Why-chain document (3-5 linked explanations) [concise prose bullets or short paragraph]
- Depth level reached: Depth level reached [short, checkable artifact]
- Verification status: Verification status [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. The Initial Statement Fact
   Tutor does: Guide the learner to Write the initial statement/fact. Keep in mind: Example: 'ACE inhibitors cause cough'
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: 'ACE inhibitors cause cough
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. Ask
   Tutor does: Guide the learner to Ask: 'Why is this true?'. Keep in mind: Write the answer as a new statement
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Write the answer as a new statement
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Why About Your Answer
   Tutor does: Guide the learner to Ask 'why?' about your answer. Keep in mind: Go one level deeper
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Go one level deeper
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Repeat Until You Hit 3
   Tutor does: Guide the learner to Repeat until you hit 3-5 levels or bedrock knowledge. Keep in mind: Bedrock = can't explain further without new learning
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Bedrock = can't explain further without new learning
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Chain Accuracy With Source Material
   Tutor does: Guide the learner to Verify chain accuracy with source material. Keep in mind: Flag any errors for correction
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Flag any errors for correction
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Why-chain document (3-5 linked explanations), Depth level reached, Verification status.
- The method reaches its stop condition: 3-5 why levels completed; Hit bedrock knowledge.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Offer one smaller hint, one simpler example, or one step back in the chain; then require the learner to continue actively.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-007 | Self-Explanation Protocol | ENCODE | After reading each paragraph or concept, pause and explain WHY each step follows from the previous one. Supports silent, spoken, or written verbalization modes. Focus on reasoning, not restating facts. Merges Think-Aloud Protocol (formerly M-ENC-006). | {'description': 'Text passage or concept sequence', 'required': True}; {'description': 'Note-taking area (written mode) or quiet environment (spoken mode)', 'required': True}; {'description': 'Timer (optional)', 'required': False} -> {'name': 'Self-explanation notes or think-aloud log (per paragraph)', 'description': 'Self-explanation notes or think-aloud log (per paragraph)', 'format': 'concise prose bullets or short paragraph'}; {'name': 'Inference gap list', 'description': 'Inference gap list', 'format': 'short, checkable artifact'}; {'name': 'Confusion points flagged', 'description': 'Confusion points flagged', 'format': 'short, checkable artifact'}; {'name': 'Comprehension checkpoints', 'description': 'Comprehension checkpoints', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Just restating facts; failure_mode:Not writing explanations (in written mode); failure_mode:Silent reading without explaining (in spoken mode); failure_mode:Skipping "obvious" sections; failure_mode:Skipping prediction step | operational_stage=ENCODE; verbalization_mode=written; guidance_level=medium; output_format=bullets; evidence_raw=Chi et al. (1994); Dunlosky et al. (2013); self-explanation rated moderate-high utility across domains. Think-aloud verbalization (Ericsson & Simon, 1993) exposes reasoning gaps that silent processing misses.; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; logging_fields=['paragraphs_processed', 'explanations_generated', 'gaps_flagged', 'confusion_points', 'verbalization_mode_used', 'time_per_unit']; artifact_type=notes | You are running M-ENC-007 (Self-Explanation Protocol) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Force the learner to actively generate, explain, sequence, or transform the material so encoding is deeper than passive review.
Scope: After reading each paragraph or concept, pause and explain WHY each step follows from the previous one. Supports silent, spoken, or written verbalization modes. Focus on reasoning, not restating facts. Merges Think-Aloud Protocol (formerly M-ENC-006).
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Force active processing (explain, transform, or map), not passive reading. — This gating rule is part of the method’s execution contract.
- Keep output scoped to mapped objectives only. — This gating rule is part of the method’s execution contract.
- Not for: This is not for passive reading, copying answers, or letting the tutor do the cognitive work for the learner.
Inputs:
- Text passage or concept sequence (required)
- Note-taking area (written mode) or quiet environment (spoken mode) (required)
- Timer (optional) (optional)
Required outputs:
- Self-explanation notes or think-aloud log (per paragraph): Self-explanation notes or think-aloud log (per paragraph) [concise prose bullets or short paragraph]
- Inference gap list: Inference gap list [short, checkable artifact]
- Confusion points flagged: Confusion points flagged [short, checkable artifact]
- Comprehension checkpoints: Comprehension checkpoints [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. Read One Paragraph Or Concept
   Tutor does: Guide the learner to Read one paragraph or concept unit. Keep in mind: One unit at a time — don't batch
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: One unit at a time — don't batch
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. Stop And Explain Why This
   Tutor does: Guide the learner to Stop and explain WHY this follows from the previous content. Keep in mind: Ask: 'Why does this make sense given what came before?'
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Ask: 'Why does this make sense given what came before?
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Predict What Comes Next Before
   Tutor does: Guide the learner to Predict what comes next before reading on. Keep in mind: Prediction forces active engagement and exposes assumptions
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Prediction forces active engagement and exposes assumptions
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Express Your Explanation In Your
   Tutor does: Guide the learner to Express your explanation in your chosen verbalization mode. Keep in mind: Written forces precision; spoken exposes hesitation; silent is fastest but least accountable
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Written forces precision; spoken exposes hesitation; silent is fastest but least accountable
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Any Inference Gaps Or Confusion
   Tutor does: Guide the learner to Identify any inference gaps or confusion points. Keep in mind: Where are you assuming knowledge you don't have? Note confusion aloud if in spoken mode
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Where are you assuming knowledge you don't have? Note confusion aloud if in spoken mode
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
6. Flag Gaps For Follow Up
   Tutor does: Guide the learner to Flag gaps for follow-up. Keep in mind: These become targeted study items
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: These become targeted study items
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
7. Move To Next Unit And
   Tutor does: Guide the learner to Move to next unit and repeat. Keep in mind: Continue through entire passage
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Continue through entire passage
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Self-explanation notes or think-aloud log (per paragraph), Inference gap list, Confusion points flagged, Comprehension checkpoints.
- The method reaches its stop condition: All paragraphs processed; Major gaps and confusion points flagged.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Offer one smaller hint, one simpler example, or one step back in the chain; then require the learner to continue actively.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-008 | Mechanism Trace | ENCODE | Trace the causal mechanism step-by-step: what triggers what, and why. Build a cause→effect chain from input to output. Especially useful for pathophysiology and physiological pathways. | {'description': 'Pathway or mechanism to trace', 'required': True}; {'description': 'Source material with mechanism details', 'required': True}; {'description': 'Flowchart template or blank paper', 'required': True} -> {'name': 'Complete mechanism chain (trigger to outcome)', 'description': 'Complete mechanism chain (trigger to outcome)', 'format': 'short, checkable artifact'}; {'name': 'Because statements for each step', 'description': 'Because statements for each step', 'format': 'short, checkable artifact'}; {'name': 'Branch points identified', 'description': 'Branch points identified', 'format': 'short, checkable artifact'}; {'name': 'Verification status', 'description': 'Verification status', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Linear thinking only; failure_mode:Skipping intermediate steps; failure_mode:Vague "because" statements | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; evidence_raw=Kulasegaram et al. (2013); causal reasoning with biomedical mechanisms supports diagnostic transfer; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; logging_fields=['mechanism_traced', 'chain_length', 'branch_points', 'verification_errors']; artifact_type=notes | You are running M-ENC-008 (Mechanism Trace) in TEACH stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Force the learner to actively generate, explain, sequence, or transform the material so encoding is deeper than passive review.
Scope: Trace the causal mechanism step-by-step: what triggers what, and why. Build a cause→effect chain from input to output. Especially useful for pathophysiology and physiological pathways.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Force active processing (explain, transform, or map), not passive reading. — This gating rule is part of the method’s execution contract.
- Keep output scoped to mapped objectives only. — This gating rule is part of the method’s execution contract.
- Not for: This is not for passive reading, copying answers, or letting the tutor do the cognitive work for the learner.
Inputs:
- Pathway or mechanism to trace (required)
- Source material with mechanism details (required)
- Flowchart template or blank paper (required)
Required outputs:
- Complete mechanism chain (trigger to outcome): Complete mechanism chain (trigger to outcome) [short, checkable artifact]
- Because statements for each step: Because statements for each step [short, checkable artifact]
- Branch points identified: Branch points identified [short, checkable artifact]
- Verification status: Verification status [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. The Trigger Initial Cause Or
   Tutor does: Guide the learner to Identify the trigger (initial cause or stimulus). Keep in mind: Example: 'ACE inhibitor blocks ACE enzyme'
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: 'ACE inhibitor blocks ACE enzyme
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. Ask
   Tutor does: Guide the learner to Ask: 'What happens next as a direct result?'. Keep in mind: Write the immediate downstream effect
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Write the immediate downstream effect
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Repeat Step 2 Until You
   Tutor does: Guide the learner to Repeat step 2 until you reach the final outcome. Keep in mind: Each step must cause the next
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Each step must cause the next
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Add Because Statements At Each
   Tutor does: Guide the learner to Add "because" statements at each arrow. Keep in mind: Why does A cause B? Fill in the mechanism.
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Why does A cause B? Fill in the mechanism.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Chain Against Source Material
   Tutor does: Guide the learner to Verify chain against source material. Keep in mind: Flag any errors or gaps
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Flag any errors or gaps
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
6. Note Branch Points Where Mechanisms
   Tutor does: Guide the learner to Note branch points where mechanisms diverge. Keep in mind: Real pathways often have multiple effects
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Real pathways often have multiple effects
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Complete mechanism chain (trigger to outcome), Because statements for each step, Branch points identified, Verification status.
- The method reaches its stop condition: Chain reaches final outcome; All "because" statements filled.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Offer one smaller hint, one simpler example, or one step back in the chain; then require the learner to continue actively.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts.

Non-assessment guard:
- This is a TEACH chunk, not an assessment.
- Do not score or quiz the learner during this block; no scored output, no grading. |
| M-ENC-009 | Concept Map | ENCODE | Generate a learner-usable concept map that captures core nodes and labeled links for objective-scoped encoding. | {'description': 'Target concept from objective map', 'required': True}; {'description': 'Current misconception or gap signal', 'required': True} -> {'name': 'Learner-generated explanation or structured encoding artifact', 'description': 'Learner-generated explanation or structured encoding artifact', 'format': 'labeled visual structure'} | MISSING | failure_mode:Overload; failure_mode:Passive repetition | operational_stage=ENCODE; diagram_format=mermaid; has_steps=Y; has_outputs_or_artifacts=Y; outputs_summary=Concept map (nodes + labeled links); Mermaid code; guidance_level=medium; evidence_raw=Novak & Canas (2008); concept mapping promotes meaningful learning through explicit relationship encoding; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; stipulations=['The concept map must be learner-usable, not decorative.', 'The learner must be able to explain the map structure after it is built.', 'Start with a short top-down verbal frame before drawing the map.', 'Treat generated structure as teaching support, not source evidence, unless specific sources are cited.']; artifact_type=concept-map | You are running M-ENC-009 (Concept Map) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Organize the material into a visible structure so relationships, sequence, contrast, or hierarchy become easier to remember and explain.
Scope: Generate a learner-usable concept map that captures core nodes and labeled links for objective-scoped encoding.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- The concept map must be learner-usable, not decorative. — Keeps the method honest and prevents a common misuse described in the source file.
- The learner must be able to explain the map structure after it is built. — Keeps the method honest and prevents a common misuse described in the source file.
- Not for: This is not for isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.
Inputs:
- Target concept from objective map (required)
- Current misconception or gap signal (required)
Required outputs:
- Learner-generated explanation or structured encoding artifact: Learner-generated explanation or structured encoding artifact [labeled visual structure]
Steps: run one step at a time and wait after each step before advancing.
1. Start Encode Protocol Within Scope
   Tutor does: Guide the learner to Start ENCODE protocol within scope. Keep in mind: Respect stage boundaries.
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Respect stage boundaries.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. Execute Method Actions In Order
   Tutor does: Guide the learner to Execute method actions in order. Keep in mind: Capture required telemetry/artifacts.
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Capture required telemetry/artifacts.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Emit Required Outputs And Handoff
   Tutor does: Guide the learner to Emit required outputs and handoff. Keep in mind: Do not drift into another stage.
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Do not drift into another stage.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Learner-generated explanation or structured encoding artifact, Concept map with nodes and labeled links.
- The method reaches its stop condition: Learner can explain concept in own words with minimal support.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Reduce the scope to fewer nodes or rows, restate the parts in plain language, and then rebuild the structure one relationship at a time. If needed, switch to a simpler map or flowchart.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-010 | Comparison Table | ENCODE | Create a side-by-side table comparing 2-4 confusable concepts across shared features. Highlight discriminating features. Builds differential diagnosis skill. | {'description': '2-4 confusable concepts to compare', 'required': True}; {'description': 'List of comparison dimensions/features', 'required': True}; {'description': 'Source material for accuracy', 'required': True} -> {'name': 'Completed comparison table', 'description': 'Completed comparison table', 'format': '2-column or multi-row table'}; {'name': 'Discriminating features highlighted', 'description': 'Discriminating features highlighted', 'format': 'short, checkable artifact'}; {'name': 'Differential rules (1-2 per comparison)', 'description': 'Differential rules (1-2 per comparison)', 'format': '2-column or multi-row table'}; {'name': 'Error list from initial attempt', 'description': 'Error list from initial attempt', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Looking up before trying; failure_mode:No discriminators identified; failure_mode:Too many comparison dimensions | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; required_when_confusable=True; evidence_raw=Alfieri et al. (2013); comparison improves discrimination and concept formation; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; logging_fields=['concepts_compared', 'dimensions_used', 'discriminators_found', 'rules_generated', 'cells_corrected']; artifact_type=table | You are running M-ENC-010 (Comparison Table) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Organize the material into a visible structure so relationships, sequence, contrast, or hierarchy become easier to remember and explain.
Scope: Create a side-by-side table comparing 2-4 confusable concepts across shared features. Highlight discriminating features. Builds differential diagnosis skill.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Force active processing (explain, transform, or map), not passive reading. — This gating rule is part of the method’s execution contract.
- Keep output scoped to mapped objectives only. — This gating rule is part of the method’s execution contract.
- Not for: This is not for isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.
Inputs:
- 2-4 confusable concepts to compare (required)
- List of comparison dimensions/features (required)
- Source material for accuracy (required)
Required outputs:
- Completed comparison table: Completed comparison table [2-column or multi-row table]
- Discriminating features highlighted: Discriminating features highlighted [short, checkable artifact]
- Differential rules (1-2 per comparison): Differential rules (1-2 per comparison) [2-column or multi-row table]
- Error list from initial attempt: Error list from initial attempt [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. Table With Concepts As Columns
   Tutor does: Guide the learner to Create table with concepts as columns. Keep in mind: 2-4 concepts optimal; more gets unwieldy
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: 2-4 concepts optimal; more gets unwieldy
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. List Comparison Dimensions As Rows
   Tutor does: Guide the learner to List comparison dimensions as rows. Keep in mind: Common dimensions: mechanism, presentation, treatment, prognosis
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Common dimensions: mechanism, presentation, treatment, prognosis
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Each Cell From Memory First
   Tutor does: Guide the learner to Fill each cell from memory first. Keep in mind: Retrieval before lookup
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Retrieval before lookup
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Source Material And Correct Errors
   Tutor does: Guide the learner to Check source material and correct errors. Keep in mind: Note which cells you got wrong
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Note which cells you got wrong
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Highlight The Discriminating Features
   Tutor does: Guide the learner to Highlight the discriminating features. Keep in mind: These are the key differentiators
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: These are the key differentiators
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
6. Generate 1 2 If Then
   Tutor does: Guide the learner to Generate 1-2 "If...then" rules from discriminators. Keep in mind: Example: 'If painless jaundice → think pancreatic head cancer'
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: 'If painless jaundice → think pancreatic head cancer
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Completed comparison table, Discriminating features highlighted, Differential rules (1-2 per comparison), Error list from initial attempt.
- The method reaches its stop condition: All cells filled; Discriminators identified.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Reduce the scope to fewer nodes or rows, restate the parts in plain language, and then rebuild the structure one relationship at a time. If needed, switch to a simpler map or flowchart.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-011 | Process Flowchart | ENCODE | Draw a sequential diagram showing a process, pathway, or algorithm. Include decision points where applicable. Use Mermaid graph TD syntax for dashboard editor. | {'description': 'Process or algorithm to diagram', 'required': True}; {'description': 'Source material with step sequence', 'required': True}; {'description': 'Mermaid editor or blank paper', 'required': True} -> {'name': 'Completed flowchart', 'description': 'Completed flowchart', 'format': 'labeled visual structure'}; {'name': 'Mermaid code (if using dashboard)', 'description': 'Mermaid code (if using dashboard)', 'format': 'short, checkable artifact'}; {'name': 'Decision point list', 'description': 'Decision point list', 'format': 'short, checkable artifact'}; {'name': 'Loop/feedback points identified', 'description': 'Loop/feedback points identified', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Linear-only thinking; failure_mode:Missing decision branches; failure_mode:Too complex single diagram | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; evidence_raw=Winn (1991); spatial-sequential diagrams improve procedural understanding; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; logging_fields=['process_charted', 'step_count', 'decision_count', 'loop_count', 'verification_status']; artifact_type=flowchart | You are running M-ENC-011 (Process Flowchart) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Organize the material into a visible structure so relationships, sequence, contrast, or hierarchy become easier to remember and explain.
Scope: Draw a sequential diagram showing a process, pathway, or algorithm. Include decision points where applicable. Use Mermaid graph TD syntax for dashboard editor.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Force active processing (explain, transform, or map), not passive reading. — This gating rule is part of the method’s execution contract.
- Keep output scoped to mapped objectives only. — This gating rule is part of the method’s execution contract.
- Not for: This is not for isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.
Inputs:
- Process or algorithm to diagram (required)
- Source material with step sequence (required)
- Mermaid editor or blank paper (required)
Required outputs:
- Completed flowchart: Completed flowchart [labeled visual structure]
- Mermaid code (if using dashboard): Mermaid code (if using dashboard) [short, checkable artifact]
- Decision point list: Decision point list [short, checkable artifact]
- Loop/feedback points identified: Loop/feedback points identified [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. The Start Point Input Trigger
   Tutor does: Guide the learner to Identify the start point (input/trigger). Keep in mind: What initiates this process?
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: What initiates this process?
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. List All Steps In Sequential
   Tutor does: Guide the learner to List all steps in sequential order. Keep in mind: Include every decision point
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Include every decision point
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Boxes For Steps Diamonds For
   Tutor does: Guide the learner to Draw boxes for steps, diamonds for decisions. Keep in mind: Standard flowchart conventions
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Standard flowchart conventions
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. With Arrows Showing Flow Direction
   Tutor does: Guide the learner to Connect with arrows showing flow direction. Keep in mind: Label decision branches (Yes/No, High/Low)
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Label decision branches (Yes/No, High/Low)
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Loops And Feedback Points
   Tutor does: Guide the learner to Identify loops and feedback points. Keep in mind: Where does the process repeat or reset?
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Where does the process repeat or reset?
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
6. Against Source Material
   Tutor does: Guide the learner to Verify against source material. Keep in mind: Flag any missing or incorrect steps
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Flag any missing or incorrect steps
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Completed flowchart, Decision point list, Loop/feedback points identified.
- The method reaches its stop condition: All steps included; All decisions branched correctly.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Reduce the scope to fewer nodes or rows, restate the parts in plain language, and then rebuild the structure one relationship at a time. If needed, switch to a simpler map or flowchart.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-012 | Clinical Decision Tree | ENCODE | Build a branching decision diagram: presentation → key findings → differential → tests → diagnosis. Scaffolds clinical reasoning into explicit decision points. | {'description': 'Clinical presentation or chief complaint', 'required': True}; {'description': 'Differential diagnosis list', 'required': True}; {'description': 'Source material with diagnostic criteria', 'required': True} -> {'name': 'Clinical decision tree', 'description': 'Clinical decision tree', 'format': 'labeled visual structure'}; {'name': 'Red flag list', 'description': 'Red flag list', 'format': 'short, checkable artifact'}; {'name': 'Confirmatory test per diagnosis', 'description': 'Confirmatory test per diagnosis', 'format': 'short, checkable artifact'}; {'name': 'Mermaid code (if using dashboard)', 'description': 'Mermaid code (if using dashboard)', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Missing red flags; failure_mode:Non-discriminating questions; failure_mode:Too many branches at one node | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; evidence_raw=Charlin et al. (2000); decision trees scaffold clinical reasoning; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; logging_fields=['presentation_type', 'diagnoses_included', 'decision_depth', 'red_flags_count', 'verification_status']; artifact_type=decision-tree | You are running M-ENC-012 (Clinical Decision Tree) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Organize the material into a visible structure so relationships, sequence, contrast, or hierarchy become easier to remember and explain.
Scope: Build a branching decision diagram: presentation → key findings → differential → tests → diagnosis. Scaffolds clinical reasoning into explicit decision points.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Force active processing (explain, transform, or map), not passive reading. — This gating rule is part of the method’s execution contract.
- Keep output scoped to mapped objectives only. — This gating rule is part of the method’s execution contract.
- Not for: This is not for isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.
Inputs:
- Clinical presentation or chief complaint (required)
- Differential diagnosis list (required)
- Source material with diagnostic criteria (required)
Required outputs:
- Clinical decision tree: Clinical decision tree [labeled visual structure]
- Red flag list: Red flag list [short, checkable artifact]
- Confirmatory test per diagnosis: Confirmatory test per diagnosis [short, checkable artifact]
- Mermaid code (if using dashboard): Mermaid code (if using dashboard) [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. Start With The Chief Complaint
   Tutor does: Guide the learner to Start with the chief complaint at top. Keep in mind: Example: 'Chest Pain'
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: 'Chest Pain
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. Branch By Key Discriminating Questions
   Tutor does: Guide the learner to Branch by key discriminating questions. Keep in mind: What single question best splits the differential?
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: What single question best splits the differential?
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. At Each Branch Add The
   Tutor does: Guide the learner to At each branch, add the most likely diagnoses. Keep in mind: Narrow the differential with each decision point
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Narrow the differential with each decision point
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Add The Confirmatory Test Or
   Tutor does: Guide the learner to Add the confirmatory test or finding for each diagnosis. Keep in mind: What clinches the diagnosis?
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: What clinches the diagnosis?
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Each Branch Against Clinical Guidelines
   Tutor does: Guide the learner to Verify each branch against clinical guidelines. Keep in mind: Use Source-Lock for accuracy
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Use Source-Lock for accuracy
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
6. Add Red Flags That Skip
   Tutor does: Guide the learner to Add "red flags" that skip the tree (emergencies). Keep in mind: Safety-critical findings that override the algorithm
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Safety-critical findings that override the algorithm
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Clinical decision tree, Red flag list, Confirmatory test per diagnosis.
- The method reaches its stop condition: All major diagnoses included; Decision points are truly discriminating.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Reduce the scope to fewer nodes or rows, restate the parts in plain language, and then rebuild the structure one relationship at a time. If needed, switch to a simpler map or flowchart.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-013 | Memory Palace | ENCODE | Use spatial memory to encode ordered sequences by associating items with familiar locations. Based on the ancient Method of Loci used by Greek orators and memory champions. | {'description': 'List of items to memorize (5-10 optimal)', 'required': True}; {'description': 'Familiar location (home, route, etc.)', 'required': True}; {'description': 'Imagination for vivid imagery', 'required': True} -> {'name': 'Mental palace with placed items', 'description': 'Mental palace with placed items', 'format': 'labeled visual structure'}; {'name': 'Retrieval accuracy check', 'description': 'Retrieval accuracy check', 'format': 'short, checkable artifact'}; {'name': 'Weak links identified', 'description': 'Weak links identified', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Images not vivid/absurd; failure_mode:Locations not familiar; failure_mode:Too many items | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; evidence_raw=Dresler et al. (2017); fMRI shows Method of Loci training rewires functional connectivity and improves recall. Historical roots in Yates (1966), The Art of Memory.; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; logging_fields=['items_memorized', 'locations_used', 'retrieval_accuracy', 'time_to_build']; artifact_type=notes | You are running M-ENC-013 (Memory Palace) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Create a compact memory cue that links a term or concept to a vivid sound, image, or body-based anchor without losing the real meaning.
Scope: Use spatial memory to encode ordered sequences by associating items with familiar locations. Based on the ancient Method of Loci used by Greek orators and memory champions.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Force active processing (explain, transform, or map), not passive reading. — This gating rule is part of the method’s execution contract.
- Keep output scoped to mapped objectives only. — This gating rule is part of the method’s execution contract.
- Not for: This is not for teaching the whole concept from scratch, replacing source truth, or turning a mnemonic into a false fact claim.
Inputs:
- List of items to memorize (5-10 optimal) (required)
- Familiar location (home, route, etc.) (required)
- Imagination for vivid imagery (required)
Required outputs:
- Mental palace with placed items: Mental palace with placed items [labeled visual structure]
- Retrieval accuracy check: Retrieval accuracy check [short, checkable artifact]
- Weak links identified: Weak links identified [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. A Familiar Location
   Tutor does: Guide the learner to Choose a familiar location. Keep in mind: Must be deeply familiar (your home, daily route)
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Must be deeply familiar (your home, daily route)
   Check: Does the learner have the right term and true meaning before the cue is built?
   Then STOP and wait for the learner.
2. 5 10 Specific Spots In
   Tutor does: Guide the learner to Identify 5-10 specific spots in order. Keep in mind: Door, couch, kitchen sink, bed, etc.
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Door, couch, kitchen sink, bed, etc.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Vivid Absurd Image For Item
   Tutor does: Guide the learner to Create vivid absurd image for item 1. Keep in mind: Exaggerated, emotional, bizarre
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Exaggerated, emotional, bizarre
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Place Image At Location 1
   Tutor does: Guide the learner to Place image at location 1. Keep in mind: Mentally "stick" it there
   Learner does: Supplies the target term or concept, then reacts to the cue and confirms whether it clicks.
   Example: Example: Mentally "stick" it there
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Continue For All Items
   Tutor does: Guide the learner to Continue for all items. Keep in mind: One item per location
   Learner does: Supplies the target term or concept, then reacts to the cue and confirms whether it clicks.
   Example: Example: One item per location
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
6. Walk Through Palace Mentally
   Tutor does: Guide the learner to Walk through palace mentally. Keep in mind: Retrieve items in order
   Learner does: Supplies the target term or concept, then reacts to the cue and confirms whether it clicks.
   Example: Example: Retrieve items in order
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Mental palace with placed items, Retrieval accuracy check, Weak links identified.
- The method reaches its stop condition: All items placed; Can retrieve forward and backward.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Shrink to one term, restate the real meaning in plain language, then try a simpler sound cue, image cue, or body cue. If the cue still does not click, switch to a lighter mnemonic lane or ask for one concrete example.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-014 | Chain Linking | ENCODE | Create a bizarre narrative story connecting unrelated items. The absurdity makes it memorable without spatial locations. | {'description': 'List of items to memorize in order', 'required': True}; {'description': 'Creativity for bizarre connections', 'required': True} -> {'name': 'Bizarre story narrative', 'description': 'Bizarre story narrative', 'format': 'concise prose bullets or short paragraph'}; {'name': 'Retrieval success rate', 'description': 'Retrieval success rate', 'format': 'short, checkable artifact'}; {'name': 'Weak links (breaks in chain)', 'description': 'Weak links (breaks in chain)', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Chain too long; failure_mode:Story too logical; failure_mode:Weak links | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; logging_fields=['items_linked', 'story_length', 'retrieval_accuracy', 'chain_breaks']; artifact_type=notes | You are running M-ENC-014 (Chain Linking) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Create a compact memory cue that links a term or concept to a vivid sound, image, or body-based anchor without losing the real meaning.
Scope: Create a bizarre narrative story connecting unrelated items. The absurdity makes it memorable without spatial locations.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Force active processing (explain, transform, or map), not passive reading. — This gating rule is part of the method’s execution contract.
- Keep output scoped to mapped objectives only. — This gating rule is part of the method’s execution contract.
- Not for: This is not for teaching the whole concept from scratch, replacing source truth, or turning a mnemonic into a false fact claim.
Inputs:
- List of items to memorize in order (required)
- Creativity for bizarre connections (required)
Required outputs:
- Bizarre story narrative: Bizarre story narrative [concise prose bullets or short paragraph]
- Retrieval success rate: Retrieval success rate [short, checkable artifact]
- Weak links (breaks in chain): Weak links (breaks in chain) [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. List Items In Order
   Tutor does: Guide the learner to List items in order. Keep in mind: 5-8 items optimal for one chain
   Learner does: Supplies the target term or concept, then reacts to the cue and confirms whether it clicks.
   Example: Example: 5-8 items optimal for one chain
   Check: Does the learner have the right term and true meaning before the cue is built?
   Then STOP and wait for the learner.
2. Vivid Image For Item 1
   Tutor does: Guide the learner to Create vivid image for item 1. Keep in mind: See it clearly
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: See it clearly
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Item 1 To 2 With
   Tutor does: Guide the learner to Connect item 1 to 2 with absurd interaction. Keep in mind: The more bizarre, the better
   Learner does: Supplies the target term or concept, then reacts to the cue and confirms whether it clicks.
   Example: Example: The more bizarre, the better
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Continue Linking Each Item
   Tutor does: Guide the learner to Continue linking each item. Keep in mind: Each interacts with the next
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Each interacts with the next
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Walk Through The Story
   Tutor does: Guide the learner to Walk through the story. Keep in mind: Replay the narrative
   Learner does: Supplies the target term or concept, then reacts to the cue and confirms whether it clicks.
   Example: Example: Replay the narrative
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
6. Retrieval By Pulling The Chain
   Tutor does: Guide the learner to Test retrieval by "pulling the chain". Keep in mind: Start anywhere, follow links
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Start anywhere, follow links
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Bizarre story narrative, Retrieval success rate, Weak links (breaks in chain).
- The method reaches its stop condition: Story complete with all items; Can retrieve entire sequence.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Shrink to one term, restate the real meaning in plain language, then try a simpler sound cue, image cue, or body cue. If the cue still does not click, switch to a lighter mnemonic lane or ask for one concrete example.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-015 | Hand-Draw Map | ENCODE | Hand-draw a spatial mind map of the topic structure using own words, simple pictures, colors, and spatial positioning. Close eyes afterward to recall layout — positions trigger details. Max 5 minutes, never full rewrite. | {'description': 'Structural overview or H1 map from prior PRIME block', 'required': True}; {'description': 'Blank paper and colored pens/markers', 'required': True}; {'description': 'Timer set to 5 minutes', 'required': True} -> {'name': 'Hand-drawn spatial mind map (physical artifact)', 'description': 'Hand-drawn spatial mind map (physical artifact)', 'format': 'labeled visual structure'}; {'name': 'Spatial recall confidence (can you see the layout with eyes closed?)', 'description': 'Spatial recall confidence (can you see the layout with eyes closed?)', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Copying verbatim from source; failure_mode:Drawing too many branches (overload); failure_mode:Skipping the eyes-closed recall step; failure_mode:Spending too long on drawing quality | operational_stage=ENCODE; map_format=ascii_tree; node_count_cap=5; confidence_scale=HML; evidence_strength=high; primary_citations=['Wammes et al. (2016)', 'Fan (2023)', 'Van der Weel & Van der Meer (2024)']; guidance_level=medium; evidence_raw=Wammes et al. (2016); drawing effect — 45% vs 20% recall; Fan (2023) drawing as cognitive tool; Van der Weel (2024) handwriting brain connectivity; gating_rules=['Do not assess or score the learner in ENCODE.', 'Stay at encoding level — this is active production, not retrieval.']; stipulations=['Own words only — never copy verbatim from source', 'Simple pictures and colors, not artistic drawings', 'Max 5 minutes per block, max 1-2 hand-draws per session', 'Purpose is spatial encoding, not note-taking', 'When branch count is capped, each branch must be a broad umbrella category that helps cover the full structural overview rather than a cherry-picked detail']; logging_fields=['branch_points', 'node_count', 'average_confidence', 'total_time']; artifact_type=notes | You are running M-ENC-015 (Hand-Draw Map) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Organize the material into a visible structure so relationships, sequence, contrast, or hierarchy become easier to remember and explain.
Scope: Hand-draw a spatial mind map of the topic structure using own words, simple pictures, colors, and spatial positioning. Close eyes afterward to recall layout — positions trigger details. Max 5 minutes, never full rewrite.
Rules:
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Stay within the target scope — Prevents drift and keeps the artifact useful.
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Time cap minutes — Preserves the source constraint: 5.
- Max per session — Preserves the source constraint: 2.
- Not for: This is not for isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.
Inputs:
- Structural overview or H1 map from prior PRIME block (required)
- Blank paper and colored pens/markers (required)
- Timer set to 5 minutes (required)
Required outputs:
- Hand-drawn spatial mind map (physical artifact): Hand-drawn spatial mind map (physical artifact) [labeled visual structure]
- Spatial recall confidence (can you see the layout with eyes closed?): Spatial recall confidence (can you see the layout with eyes closed?) [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. Review The Structural Overview From
   Tutor does: Guide the learner to Review the structural overview from the previous block. Keep in mind: Spend 30 seconds scanning — do NOT start drawing yet
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Spend 30 seconds scanning — do NOT start drawing yet
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. Place The Central Concept In
   Tutor does: Guide the learner to Place the central concept in the middle of the page. Keep in mind: Use your own words, not the textbook label
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Use your own words, not the textbook label
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. 3 5 Main Branches Using
   Tutor does: Guide the learner to Draw 3-5 main branches using different colors. Keep in mind: Each branch = one broad pillar or major category so the 3-5 branches still cover the full overview
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Each branch = one broad pillar or major category so the 3-5 branches still cover the full overview
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Add Simple Pictures Or Icons
   Tutor does: Guide the learner to Add simple pictures or icons to anchor key concepts. Keep in mind: Stick figures, arrows, symbols — not art. Speed over beauty
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Stick figures, arrows, symbols — not art. Speed over beauty
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Eyes And Mentally Walk Through
   Tutor does: Guide the learner to Close eyes and mentally walk through the map layout. Keep in mind: Can you see the positions? Colors? Pictures? This is the spatial recall test
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: Can you see the positions? Colors? Pictures? This is the spatial recall test
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Hand-drawn spatial mind map (physical artifact, confirmed by learner), Spatial recall confidence (can learner see layout with eyes closed?), Time spent confirmation (within 5-minute cap).
- The method reaches its stop condition: 5-minute timer ends (hard stop); Map has central concept + 3-5 broad branches that cover the full overview with at least 1 picture each.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Reduce the scope to fewer nodes or rows, restate the parts in plain language, and then rebuild the structure one relationship at a time. If needed, switch to a simpler map or flowchart.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ENC-016 | Embodied Walkthrough | ENCODE | Use safe body movement, gesture, or positioning to act out a process, spatial relation, or clinical sequence, then map each movement back to the real structure or mechanism. | {'description': 'Target process, spatial relation, or procedure slice', 'required': True}; {'description': '2-5 key steps, landmarks, or transitions to embody', 'required': True}; {'description': 'Enough open space for safe small movements or hand gestures', 'required': True} -> {'name': 'MovementMap', 'description': 'MovementMap', 'format': 'labeled visual structure'}; {'name': 'EmbodiedRunthrough', 'description': 'EmbodiedRunthrough', 'format': 'short, checkable artifact'}; {'name': 'TransitionNotes', 'description': 'TransitionNotes', 'format': 'short, checkable artifact'}; {'name': 'MapBackExplanation', 'description': 'MapBackExplanation', 'format': 'labeled visual structure'}; {'name': 'SafetyBoundaryNote', 'description': 'SafetyBoundaryNote', 'format': 'short, checkable artifact'} | MISSING | failure_mode:The activity drifts into full skill performance coaching; failure_mode:The learner performs gestures without saying what they mean; failure_mode:The movements become random charades with no concept mapping; failure_mode:The walkthrough uses unsafe, painful, or oversized motions | operational_stage=ENCODE; guidance_level=medium; output_format=bullets; evidence_raw=Kontra et al. (2015); embodied interaction supports deeper conceptual learning by tying abstract ideas to sensorimotor experience.; gating_rules=['Require learner movement or gesture, not passive watching.', 'Keep all motions safe, simplified, and inside objective scope.', 'Map every gesture back to the real concept in words.', 'End with a non-movement artifact or explanation.']; stipulations=['The learner must do the movement; tutor narration alone does not count.', 'Every gesture or position must map back to the real structure, cue, or mechanism in plain language.', 'Keep the movement safe, simplified, and low-load; never force painful or risky motions.', 'Use this to encode structure or sequence, not to perform full skill training or graded technique.']; artifact_type=notes | You are running M-ENC-016 (Embodied Walkthrough) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Force the learner to actively generate, explain, sequence, or transform the material so encoding is deeper than passive review.
Scope: Use safe body movement, gesture, or positioning to act out a process, spatial relation, or clinical sequence, then map each movement back to the real structure or mechanism.
Rules:
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- The learner must do the movement; tutor narration alone does not count. — Keeps the method honest and prevents a common misuse described in the source file.
- Every gesture or position must map back to the real structure, cue, or mechanism in plain language. — Keeps the method honest and prevents a common misuse described in the source file.
- Not for: This is not for passive reading, copying answers, or letting the tutor do the cognitive work for the learner.
Inputs:
- Target process, spatial relation, or procedure slice (required)
- 2-5 key steps, landmarks, or transitions to embody (required)
- Enough open space for safe small movements or hand gestures (required)
Required outputs:
- MovementMap: MovementMap [labeled visual structure]
- EmbodiedRunthrough: EmbodiedRunthrough [short, checkable artifact]
- TransitionNotes: TransitionNotes [short, checkable artifact]
- MapBackExplanation: MapBackExplanation [labeled visual structure]
- SafetyBoundaryNote: SafetyBoundaryNote [short, checkable artifact]
Steps: run one step at a time and wait after each step before advancing.
1. Define The 2 5 Key
   Tutor does: Guide the learner to Define the 2-5 key landmarks or steps. Keep in mind: Pick only the core sequence or spatial anchors worth embodying.
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Pick only the core sequence or spatial anchors worth embodying.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. Assign One Safe Movement Or
   Tutor does: Guide the learner to Assign one safe movement or gesture to each landmark. Keep in mind: Keep each cue simple enough to remember and specific enough to mean something real.
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Keep each cue simple enough to remember and specific enough to mean something real.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Run The Walkthrough Slowly With
   Tutor does: Guide the learner to Run the walkthrough slowly with live narration. Keep in mind: The learner performs each gesture and says what it stands for in real terminology.
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: The learner performs each gesture and says what it stands for in real terminology.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
4. Freeze At Transition Points And
   Tutor does: Guide the learner to Freeze at transition points and name what changes. Keep in mind: Call out the key shift, decision point, or anatomical relationship at each handoff.
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Call out the key shift, decision point, or anatomical relationship at each handoff.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
5. Re Run From Memory And
   Tutor does: Guide the learner to Re-run from memory and translate back into words or a sketch. Keep in mind: The movement is the cue, but the exit product is a mapped-back explanation, list, or diagram.
   Learner does: Performs the requested cognitive move and shares the result before moving on.
   Example: Example: The movement is the cue, but the exit product is a mapped-back explanation, list, or diagram.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: MovementMap, EmbodiedRunthrough, TransitionNotes, MapBackExplanation, SafetyBoundaryNote.
- The method reaches its stop condition: The learner performs one full safe walkthrough with explicit narration.; Each movement is mapped back to the real concept or mechanism..
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Offer one smaller hint, one simpler example, or one step back in the chain; then require the learner to continue actively.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts.

Embodied contract:
- The learner must do the movement or gesture, not just watch it described.
- Every movement must be translated back into the real structure, mechanism, or sequence.
- End with a map-back explanation, list, or sketch rather than movement alone. |
| M-GEN-001 | Seed-Lock Generation | MISSING | Force the learner to generate their own first encoding hook before any tutor help, then lock the strongest cue for later reuse. | {'description': 'New term or concept to encode', 'required': True}; {'description': 'Definition from source material', 'required': True}; {'description': '90-second timer', 'required': True} -> {'name': 'Learner-generated Seed (primary hook attempt)', 'description': 'First learner-made hook attempt captured before tutor assistance.', 'format': 'short cue plus explanation'}; {'name': 'Final locked hook', 'description': 'Final cue selected for later reuse after comparing the seed with any allowed assistance.', 'format': 'short cue plus explanation'}; {'name': 'Generation success flag (self vs AI-assisted)', 'description': 'Short flag showing whether the final hook was fully self-generated or required tutor support.', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Asking AI immediately; failure_mode:Giving up too fast; failure_mode:Over-relying on AI hooks | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-GEN-001 (Seed-Lock Generation) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Learner-generated Seed, Final locked hook, and Generation success flag.
Force the learner to create the first hook. Read the term and source definition, require a real 90-second seed attempt, capture that seed even if imperfect, and only then allow one bounded tutor suggestion if the learner is still stuck. End by locking the strongest hook and marking whether it stayed self-generated or needed assistance.
Preset behavior:
- exam_cram: one-shot; one seed, one lock, one status line.
- deep_mastery: interactive; preserve seed, compare against one bounded assist if needed, and add a fuller lock note.
- quick_review: one-shot refresh; compact seed-lock table.
- clinical_bridge: stepwise; cue-to-meaning-to-action grid for clinical concepts.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves definition -> seed -> assist if needed -> lock and waits.
 |
| M-GEN-002 | Teach-Back | MISSING | Have the learner explain one concept aloud as if teaching a novice, surface the breakdowns, and route review only to the points where the explanation fails. | {'description': 'Concept to teach', 'required': True}; {'description': 'Imaginary student (or real one)', 'required': True}; {'description': 'Recording device (optional)', 'required': False} -> {'name': 'Verbal explanation (recorded or noted)', 'description': 'Learner-produced explanation in simple language, captured in a reusable form.', 'format': 'concise prose bullets or short paragraph'}; {'name': 'Breakdown points list', 'description': 'Specific places where the explanation stalled, became vague, or failed under why/how pressure.', 'format': 'bulleted or tabular list'}; {'name': 'Targeted review areas', 'description': 'Short list of source areas to review based only on the identified breakdowns.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Not identifying breakdowns; failure_mode:Reading instead of explaining; failure_mode:Skipping why and how questions | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-GEN-002 (Teach-Back) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Verbal explanation, Breakdown points list, and Targeted review areas.
Have the learner explain one bounded concept aloud as if teaching a novice. Push with why and how questions, capture every stumble or vague leap as a breakdown, and send review only to those failure points. Do not explain the concept for the learner and do not allow a full reread during the teach-back.
Preset behavior:
- exam_cram: one-shot; short novice explanation; two breakdown bullets; one repair target.
- deep_mastery: interactive; full explanation plus why/how follow-ups and explicit breakdown logging.
- quick_review: one-shot refresh; compact explanation-gap-repair table.
- clinical_bridge: stepwise; junior-clinician or patient-facing teach-back with a claim -> why -> implication -> gap grid.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves scope -> explanation -> why/how -> breakdowns -> targeted review and waits.
 |
| M-GEN-003 | Draw-Label | MISSING | Sketch the structure from memory, label it, inspect the gaps against the source, and redraw if the gap rate is still too high. | {'description': 'Structure to draw (anatomy, pathway, diagram)', 'required': True}; {'description': 'Blank paper or drawing surface', 'required': True}; {'description': 'Source material for gap-filling', 'required': True} -> {'name': 'Completed labeled diagram', 'description': 'Learner-generated diagram or map reconstructed from memory and then completed after gap-checking.', 'format': 'labeled visual structure'}; {'name': 'Gap list (what was missing)', 'description': 'Specific missing labels, links, or spatial relationships identified during source check.', 'format': 'bulleted or tabular list'}; {'name': 'Accuracy percentage', 'description': 'Estimated proportion of labels or required parts recalled before gap-filling.', 'format': 'short summary line or numeric score'} | MISSING | failure_mode:Focusing on artistic quality; failure_mode:Looking at source while drawing; failure_mode:Not tracking gaps | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-GEN-003 (Draw-Label) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Completed labeled diagram, Gap list, and Accuracy percentage.
Have the learner sketch one bounded structure from memory, label as many parts as possible, compare against the source only after the attempt, and visibly mark every repaired label or link. If more than 30 percent of the needed labels were missing, run one redraw of the same structure. Do not draw for the learner and do not let the first pass turn into copying.
Preset behavior:
- exam_cram: one-shot; rough labeled outline; short miss list; redraw only if clearly needed.
- deep_mastery: interactive; separate sketch, label, gap, repair, and redraw sections.
- quick_review: one-shot refresh; compact label-gap-status table.
- clinical_bridge: stepwise; applied anatomy or pathway grid with function or significance notes.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves cover source -> sketch -> label -> gap check -> repair -> redraw decision and waits.
 |
| M-GEN-004 | Hand-Draw Map | MISSING | Hand-draw a short spatial mind map in your own words with simple pictures, colors, and branch placement, then test whether you can still walk the layout with eyes closed. | {'description': 'Structural overview or H1 map from prior PRIME block', 'required': True}; {'description': 'Blank paper and colored pens or markers', 'required': True}; {'description': 'Timer set to 5 minutes', 'required': True} -> {'name': 'Hand-drawn spatial mind map (physical artifact)', 'description': 'Learner-produced spatial map with a central concept, broad branches, own-word labels, and simple visual anchors.', 'format': 'labeled visual structure'}; {'name': 'Spatial recall confidence (can you see the layout with eyes closed?)', 'description': 'Short self-report of whether the learner can mentally walk the positions, colors, and images in the completed map.', 'format': 'short summary paragraph or bullets'}; {'name': 'Time spent confirmation (within 5-minute cap)', 'description': 'Confirmation that the map stayed inside the hard 5-minute limit.', 'format': 'short summary line'} | MISSING | failure_mode:Copying verbatim from source; failure_mode:Drawing too many branches; failure_mode:Skipping the eyes-closed recall step; failure_mode:Spending too long on drawing quality | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-GEN-004 (Hand-Draw Map) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Hand-drawn spatial mind map, Spatial recall confidence, and Time spent confirmation.
Have the learner turn one structural overview into a brief hand-drawn map with a center label, 3-5 broad branches, own-word labels, simple pictures, and color or placement cues. Keep the block inside 5 minutes, do not allow copied text, and finish with an eyes-closed walk-through of the layout. Do not draw the map for the learner and do not let the task become full note rewriting.
Preset behavior:
- exam_cram: one-shot; center label, 3 branches, one icon each, and one short recall line.
- deep_mastery: interactive; separate sections for branch logic, icons, time-cap check, and spatial recall walk-through.
- quick_review: one-shot refresh; compact branch-color-icon-recall table.
- clinical_bridge: stepwise; applied overview grid with branch, sign or mechanism, icon, and placement note.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves review -> center -> branches -> icons -> recall check and waits.
 |
| M-GEN-005 | Why-Chain | MISSING | Ask why 3-5 times in succession about one bounded fact or claim so each answer becomes the premise for the next, then verify the chain against the source. | {'description': 'Initial statement or fact to interrogate', 'required': True}; {'description': 'Source material for verification', 'required': True} -> {'name': 'Why-chain document (3-5 linked explanations)', 'description': 'Linked sequence of why-explanations showing the learner’s causal depth across 3-5 levels.', 'format': 'concise prose bullets or short paragraph'}; {'name': 'Depth level reached', 'description': 'Final why level completed before bedrock or the configured stop point.', 'format': 'short summary line'}; {'name': 'Verification status', 'description': 'Whether the completed chain checked out against the source and where corrections were needed.', 'format': 'short summary paragraph or bullets'} | MISSING | failure_mode:Circular reasoning; failure_mode:Making up explanations; failure_mode:Stopping too early | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-GEN-005 (Why-Chain) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Why-chain document, Depth level reached, and Verification status.
Have the learner start with one bounded statement, ask why 3-5 times in succession, and turn each answer into the next premise. Reject circular answers, stop only after at least 3 levels or clear bedrock knowledge, and verify every link against the source before closing. Do not answer the why questions for the learner.
Preset behavior:
- exam_cram: one-shot; 3 why links; one bedrock or uncertainty line; one verification line.
- deep_mastery: interactive; separate sections for claim, why levels, gap notes, bedrock decision, and verification.
- quick_review: one-shot refresh; compact premise-why-verification table.
- clinical_bridge: stepwise; applied fact -> why -> deeper why -> implication -> source-check table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves claim -> why layers -> bedrock decision -> verification and waits.
 |
| M-GEN-006 | Self-Explanation Protocol | MISSING | After each paragraph or concept unit, stop and explain why it follows from what came before, predict what comes next, and log the inference gaps before moving on. | {'description': 'Text passage or concept sequence', 'required': True}; {'description': 'Note-taking area (written mode) or quiet environment (spoken mode)', 'required': True}; {'description': 'Timer (optional)', 'required': False} -> {'name': 'Self-explanation notes or think-aloud log (per paragraph)', 'description': 'Unit-by-unit explanation record showing how each section was interpreted and linked to prior content.', 'format': 'concise prose bullets or short paragraph'}; {'name': 'Inference gap list', 'description': 'Specific places where the learner could not justify a link, assumption, or transition.', 'format': 'bulleted or tabular list'}; {'name': 'Confusion points flagged', 'description': 'Points of uncertainty or contradiction that need later clarification.', 'format': 'bulleted or tabular list'}; {'name': 'Comprehension checkpoints', 'description': 'Short checkpoints showing whether the learner could explain and predict at each unit.', 'format': 'short summary paragraph or bullets'} | MISSING | failure_mode:Just restating facts; failure_mode:Not writing explanations in written mode; failure_mode:Silent reading without explaining in spoken mode; failure_mode:Skipping obvious sections; failure_mode:Skipping prediction step | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-GEN-006 (Self-Explanation Protocol) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Self-explanation notes or think-aloud log, Inference gap list, Confusion points flagged, and Comprehension checkpoints.
Have the learner process one paragraph or concept unit at a time, explain why it follows from the previous content, predict what comes next, and flag any missing inference or confusion before moving on. Do not explain the reasoning for the learner, do not batch units, and do not allow pure restatement of the text.
Preset behavior:
- exam_cram: one-shot; terse per-unit explanation bullets, one prediction, one gap note.
- deep_mastery: interactive; separate explanation, prediction, gap, confusion, and checkpoint sections.
- quick_review: one-shot refresh; compact unit-by-unit explanation-prediction-gap table.
- clinical_bridge: stepwise; applied unit -> why -> next -> gap -> checkpoint table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves unit read -> explanation -> prediction -> gap flag -> checkpoint and waits.
 |
| M-GEN-007 | Mechanism Trace | MISSING | Trace one mechanism step by step from trigger to outcome, add explicit because-links between steps, and mark where the pathway branches. | {'description': 'Pathway or mechanism to trace', 'required': True}; {'description': 'Source material with mechanism details', 'required': True}; {'description': 'Flowchart template or blank paper', 'required': True} -> {'name': 'Complete mechanism chain (trigger to outcome)', 'description': 'Ordered mechanism sequence from the initiating trigger to the final outcome.', 'format': 'short, checkable artifact'}; {'name': 'Because statements for each step', 'description': 'Explicit causal explanations for the arrows linking each mechanism step.', 'format': 'short, checkable artifact'}; {'name': 'Branch points identified', 'description': 'Points where the pathway diverges into parallel, conditional, or alternative downstream effects.', 'format': 'short, checkable artifact'}; {'name': 'Verification status', 'description': 'Whether the completed trace is fully source-supported or contains flagged gaps.', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Linear thinking only; failure_mode:Skipping intermediate steps; failure_mode:Vague because statements | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-GEN-007 (Mechanism Trace) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Complete mechanism chain, Because statements for each step, Branch points identified, and Verification status.
Have the learner trace one bounded mechanism from trigger to outcome one direct step at a time, explain each arrow with a because statement, verify every link against the source, and mark where the pathway branches. Do not let the learner skip intermediate steps, use vague because language, or flatten real divergence into one straight line.
Preset behavior:
- exam_cram: one-shot; one traced chain, because lines, branch note, verification line.
- deep_mastery: interactive; separate trigger, chain, because, branch, and verification sections.
- quick_review: one-shot refresh; compact step-next-because-verification table.
- clinical_bridge: stepwise; trigger -> path step -> because -> clinical consequence -> branch table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves trigger -> next effects -> because links -> verification -> branch points and waits.
 |
| M-GEN-008 | Embodied Walkthrough | MISSING | Use safe body movement, gesture, or positioning to act out a process, spatial relation, or clinical sequence, then map each movement back to the real structure or mechanism. | {'description': 'Target process, spatial relation, or procedure slice', 'required': True}; {'description': '2-5 key steps, landmarks, or transitions to embody', 'required': True}; {'description': 'Enough open space for safe small movements or hand gestures', 'required': True} -> {'name': 'MovementMap', 'description': 'Step-by-step map from landmark to safe gesture to real meaning.', 'format': 'bulleted or tabular list'}; {'name': 'EmbodiedRunthrough', 'description': 'Short record showing the learner performed the sequence with live narration.', 'format': 'short summary paragraph or bullets'}; {'name': 'TransitionNotes', 'description': 'Named changes at each handoff, transition, or decision point in the walkthrough.', 'format': 'bulleted or tabular list'}; {'name': 'MapBackExplanation', 'description': 'Verbal or sketched translation of the movement sequence back into canonical terms.', 'format': 'short summary paragraph or bullets'}; {'name': 'SafetyBoundaryNote', 'description': 'Explicit note keeping the run within safe, simplified, low-load movement boundaries.', 'format': 'short summary paragraph or bullets'} | MISSING | failure_mode:The activity drifts into full skill performance coaching; failure_mode:The learner performs gestures without saying what they mean; failure_mode:The movements become random charades with no concept mapping; failure_mode:The walkthrough uses unsafe, painful, or oversized motions | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-GEN-008 (Embodied Walkthrough) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: MovementMap, EmbodiedRunthrough, TransitionNotes, MapBackExplanation, and SafetyBoundaryNote.
Have the learner embody 2-5 key landmarks with safe small gestures, narrate what each gesture means, freeze at transition points to name what changes, and then rerun from memory and translate the motion back into words or a sketch. Keep it low-load and concept-focused; do not let the tutor do the gestures for the learner, do not drift into physical coaching, and do not end with movement alone.
Preset behavior:
- exam_cram: one-shot; 2-3 gestures; terse step -> gesture -> meaning bullets plus one transition note and one short map-back.
- deep_mastery: interactive; labeled sections for movement map, live runthrough, transition notes, map-back, and safety boundaries.
- quick_review: one-shot refresh; compact step-gesture-meaning-transition table plus brief map-back note.
- clinical_bridge: stepwise; applied table with landmark, gesture, what changes, cue or risk, and map-back line.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves landmark selection -> gesture assignment -> narrated walkthrough -> transition freeze -> map-back and waits.
 |
| M-GEN-009 | Palpation Anchor | MISSING | Pair a deep anatomical structure with a visible or palpable surface landmark on your own body, physically locate it, and link that landmark to the structure's real clinical function. | {'description': 'Target anatomical structure name', 'required': True}; {'description': 'Surface landmark location (or request to identify one)', 'required': True}; {'description': 'Clinical function or relevance', 'required': True} -> {'name': 'StructureName', 'description': 'Structure name paired with its true clinical function.', 'format': 'short summary paragraph or bullets'}; {'name': 'SurfaceLandmark', 'description': 'Specific visible or palpable landmark used to find the structure.', 'format': 'short summary paragraph or bullets'}; {'name': 'PalpationNote (what you felt)', 'description': 'Brief note describing what the learner actually felt at the landmark.', 'format': 'short summary paragraph or bullets'}; {'name': 'ClinicalLink', 'description': 'One concrete patient-facing or exam-facing use of the landmark.', 'format': 'short summary paragraph or bullets'}; {'name': 'AnchorLine (one-line summary)', 'description': 'One-line anchor that preserves structure, landmark, feel, and clinical relevance.', 'format': 'single-line study cue'} | MISSING | failure_mode:Learner only reads about the landmark without palpating; failure_mode:Structure has no reliable surface landmark; failure_mode:Unsafe palpation | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-GEN-009 (Palpation Anchor) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: StructureName, SurfaceLandmark, PalpationNote, ClinicalLink, and AnchorLine.
Have the learner name one anatomical structure and function, identify one reliable surface landmark, lightly palpate it on their own body, say what they feel, tie it to one clinical use, and compress the result into one reviewable anchor line. Do not fake tactile findings, do not force the method when no safe landmark exists, and do not allow verbal-only completion.
Preset behavior:
- exam_cram: one-shot; terse bullets for one structure, landmark, feel, clinical use, and final anchor line.
- deep_mastery: interactive; labeled sections for structure, landmark, palpation note, clinical link, anchor line, and safety.
- quick_review: one-shot refresh; compact structure-landmark-feel-use-anchor table.
- clinical_bridge: stepwise; clinic-facing table with structure, landmark, palpation cue, patient use, and safety boundary.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves structure/function -> landmark -> palpation -> feel/map -> clinical link -> anchor line and waits.
 |
| M-HOOK-001 | KWIK Hook | MISSING | Structured 6-step encoding protocol for new terms and concepts. Start by turning the word into something it sounds like, state the real meaning/function, create a picture for the meaning, link the sound-picture to the meaning-picture, personalize it so it sticks, then lock it as a reusable note/card. Each step is gated — do not skip ahead. | {'description': 'New term or concept to encode', 'required': True}; {'description': 'Definition or meaning from source material', 'required': True}; {'description': 'Blank note area for hook creation', 'required': True} -> {'name': 'KWIK hook (sound cue + meaning link scene)', 'description': 'KWIK hook (sound cue + meaning link scene)', 'format': 'short cue plus explanation'}; {'name': 'Anki card draft (optional)', 'description': 'Anki card draft (optional)', 'format': 'short, checkable artifact'}; {'name': 'Session log entry', 'description': 'Session log entry', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Image too abstract; failure_mode:Skipping steps; failure_mode:Sound cue forced; failure_mode:Sound cue never connects back to the actual meaning; failure_mode:Weak personal connection | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-HOOK-001 (KWIK Hook) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: KWIK hook, optional Anki card draft if requested, and Session log entry.
Build one full mnemonic by getting a learner-made sound cue first, stating the real meaning, creating a meaning picture, linking the sound and meaning scenes, personalizing the hook, and locking it with a distortion guard.
Preset behavior:
- exam_cram: one-shot; one clean hook block plus one-line distortion guard.
- deep_mastery: interactive; full six-step build with explicit learner ownership and optional card lock.
- quick_review: one-shot refresh; compact Sound \| Meaning \| Link \| Lock table.
- clinical_bridge: stepwise; cue-to-action or red-flag hook tied back to correct use.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves sound cue -> meaning -> link scene -> lock and waits. |
| M-HOOK-002 | KWIK Lite | MISSING | 60-second lightweight mnemonic slot. One system-seeded cue plus one learner personalization. If the learner cannot land a hook within 60 seconds, escalate to M-HOOK-001 (full KWIK Hook) for that concept. | {'description': 'TEACH close artifact', 'required': True}; {'description': 'Target term or concept to compress', 'required': True}; {'description': 'Short meaning/function statement', 'required': True} -> {'name': 'KWIKLiteSeed', 'description': 'KWIKLiteSeed', 'format': 'short, checkable artifact'}; {'name': 'LearnerOwnershipAction', 'description': 'LearnerOwnershipAction', 'format': 'short, checkable artifact'}; {'name': 'FinalHook', 'description': 'FinalHook', 'format': 'short cue plus explanation'}; {'name': 'DistortionGuard', 'description': 'DistortionGuard', 'format': 'short, checkable artifact'}; {'name': 'EscalationFlag (if needed)', 'description': 'EscalationFlag (if needed)', 'format': 'short, checkable artifact'} | MISSING | failure_mode:60s passes without a clean hook; failure_mode:Hook distorts clinical reasoning; failure_mode:Hook grows too elaborate; failure_mode:Slot runs before meaning is clear | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-HOOK-002 (KWIK Lite) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: KWIKLiteSeed, LearnerOwnershipAction, FinalHook, DistortionGuard, and EscalationFlag if needed.
Build one lightweight hook only after meaning is stable. Seed one cue, require one learner personalization move, record the final hook with a distortion guard, and escalate if no clean hook lands inside the 60-second cap.
Preset behavior:
- exam_cram: one-shot; seed, tweak, final hook, distortion guard, escalation call.
- deep_mastery: interactive; guided lite build with explicit 60-second escalation logic.
- quick_review: one-shot refresh; Seed \| Learner tweak \| Final hook \| Escalate? table.
- clinical_bridge: stepwise; cue-risk-action grid tied back to correct applied meaning.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves seed -> learner tweak -> guard/escalation and waits. |
| M-HOOK-003 | Jingle / Rhyme Hook | MISSING | Compress a fixed ordered list or stable sequence into a short jingle or rhyme. Learner must attempt their own compression BEFORE the AI offers one. Check for interference with existing hooks before finalizing. | {'description': 'Fixed sequence or ordered list', 'required': True}; {'description': 'Plain-language meaning of each step', 'required': True}; {'description': 'List of existing hooks for interference check (if any)', 'required': True} -> {'name': 'SequenceStatement', 'description': 'SequenceStatement', 'format': 'short, checkable artifact'}; {'name': 'LearnerAttempt', 'description': 'LearnerAttempt', 'format': 'short, checkable artifact'}; {'name': 'FinalJingleOrRhyme', 'description': 'FinalJingleOrRhyme', 'format': 'short cue plus explanation'}; {'name': 'HookSequenceMap', 'description': 'HookSequenceMap', 'format': 'labeled visual structure'}; {'name': 'InterferenceCheck', 'description': 'InterferenceCheck', 'format': 'short, checkable artifact'}; {'name': 'DistortionWarning', 'description': 'DistortionWarning', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Hook built before meaning is clear; failure_mode:Hook distorts order or content; failure_mode:Hook interferes with an existing hook for a different sequence; failure_mode:Learner skips generation and just receives the AI's version | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-HOOK-003 (Jingle / Rhyme Hook) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: SequenceStatement, LearnerAttempt, FinalJingleOrRhyme, HookSequenceMap, InterferenceCheck, and DistortionWarning.
Compress one fixed ordered list into a short repeatable cadence. Require a learner attempt first, offer one scaffold only if needed, map every phrase fragment back to the real sequence, and check for interference before locking the hook.
Preset behavior:
- exam_cram: one-shot; one short cadence, hook map, and interference warning.
- deep_mastery: interactive; learner attempt first, refined cadence, explicit interference and distortion check.
- quick_review: one-shot refresh; Sequence item \| Jingle fragment \| Real meaning table.
- clinical_bridge: stepwise; cadence-to-action grid for applied sequences.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves sequence -> learner attempt -> map -> interference check and waits. |
| M-HOOK-004 | Memory Palace | MISSING | Use spatial memory to encode ordered sequences by associating items with familiar locations. Based on the ancient Method of Loci used by Greek orators and memory champions. | {'description': 'List of items to memorize (5-10 optimal)', 'required': True}; {'description': 'Familiar location (home, route, etc.)', 'required': True}; {'description': 'Imagination for vivid imagery', 'required': True} -> {'name': 'Mental palace with placed items', 'description': 'Mental palace with placed items', 'format': 'labeled visual structure'}; {'name': 'Retrieval accuracy check', 'description': 'Retrieval accuracy check', 'format': 'short, checkable artifact'}; {'name': 'Weak links identified', 'description': 'Weak links identified', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Images not vivid/absurd; failure_mode:Locations not familiar; failure_mode:Too many items | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-HOOK-004 (Memory Palace) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Mental palace with placed items, Retrieval accuracy check, and Weak links identified.
Encode one ordered sequence with a fixed familiar route, one vivid image per locus, and a final retrieval walk that exposes weak placements before the palace is locked.
Preset behavior:
- exam_cram: one-shot; 5-locus micro-palace and one quick retrieval walk.
- deep_mastery: interactive; 8-10 loci, refined images, fuller retrieval walk, weak-link repair notes.
- quick_review: one-shot refresh; Locus \| Image \| Item \| Weak link? table.
- clinical_bridge: stepwise; route-to-action grid for applied ordered steps or red flags.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves route -> placements -> retrieval walk and waits. |
| M-HOOK-005 | Chain Linking | MISSING | Create a bizarre narrative story connecting unrelated items. The absurdity makes it memorable without spatial locations. | {'description': 'List of items to memorize in order', 'required': True}; {'description': 'Creativity for bizarre connections', 'required': True} -> {'name': 'Bizarre story narrative', 'description': 'Bizarre story narrative', 'format': 'concise prose bullets or short paragraph'}; {'name': 'Retrieval success rate', 'description': 'Retrieval success rate', 'format': 'short, checkable artifact'}; {'name': 'Weak links (breaks in chain)', 'description': 'Weak links (breaks in chain)', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Chain too long; failure_mode:Story too logical; failure_mode:Weak links | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-HOOK-005 (Chain Linking) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Bizarre story narrative, Retrieval success rate, and Weak links.
Encode one ordered set by linking each item to the next through a vivid absurd interaction, then walk the story to find and record any breaks in the chain.
Preset behavior:
- exam_cram: one-shot; concise bizarre story, one retrieval pass, one weak-link note.
- deep_mastery: interactive; link-by-link build, story walk, weak-transition repair.
- quick_review: one-shot refresh; Item \| Link scene \| Retrieval cue table.
- clinical_bridge: stepwise; story-to-action chain for applied sequences or consequences.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves list -> link build -> story walk and waits. |
| M-INT-001 | Analogy Bridge | ENCODE | Create an analogy linking the concept to something familiar, map the structure explicitly, and test where the analogy breaks. | {'description': 'Concept to analogize', 'required': True}; {'description': 'Familiar domain for comparison', 'required': True} -> {'name': 'Analogy statement (A is to B as X is to Y)', 'description': 'One source-grounded analogy statement that frames the bridge cleanly.', 'format': 'short summary paragraph or bullets'}; {'name': 'Mapping table (3+ correspondences)', 'description': 'Explicit mapping of at least three structural correspondences between the concept and the familiar domain.', 'format': '2-column or multi-row table'}; {'name': 'Breakdown points (where analogy fails and what that teaches)', 'description': 'Limits of the analogy plus what those limits reveal about the real concept.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Analogy too superficial; failure_mode:Familiar domain not actually familiar; failure_mode:Ignoring breakdown points | operational_stage=ENCODE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-INT-001 (Analogy Bridge) in the INTERROGATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Analogy statement, Mapping table, and Breakdown points.
Build one analogy for an already-encoded concept, map at least 3 structural correspondences, test where the analogy fails, and return to the real concept without turning the run into a lecture or quiz.
Preset behavior:
- exam_cram: one-shot; 1 tight analogy; 3 mappings; 1 breakdown; terse bullets.
- deep_mastery: interactive; 4-6 correspondences; 2 breakdowns; explicit return-to-concept section.
- quick_review: one-shot refresh; compact mapping table with minimal prose.
- clinical_bridge: stepwise; cue-focused analogy table with practical breakdown warnings.
If no preset is specified, use the default knobs. One-shot returns the full bridge artifact in one bounded reply; interactive or stepwise mode moves concept -> source domain -> mapping -> breakdown -> takeaway and waits.
 |
| M-INT-002 | Clinical Application | ENCODE | Apply an already-encoded concept to a concrete clinical scenario and work through how it would present, what you would test, and how you would intervene. | {'description': 'Concept to apply clinically', 'required': True}; {'description': 'Clinical scenario or patient type', 'required': True}; {'description': 'Source material for verification', 'required': True} -> {'name': 'Clinical application narrative', 'description': 'Patient-specific application narrative showing how the concept plays out in context.', 'format': 'concise prose bullets or short paragraph'}; {'name': 'Presentation, testing, intervention summary', 'description': 'Concise present-test-treat summary anchored to the selected patient.', 'format': 'short summary paragraph, bullets, or table'}; {'name': 'Verification notes', 'description': 'Short verification pass that flags errors, omissions, or corrections against source material.', 'format': 'short summary paragraph or bullets'} | MISSING | failure_mode:Generic application; failure_mode:Skipping assessment phase; failure_mode:Treatment without rationale | operational_stage=ENCODE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-INT-002 (Clinical Application) in the INTERROGATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Clinical application narrative, Presentation/testing/intervention summary, and Verification notes.
Apply one already-encoded concept to a concrete patient scenario, work through how it would present, what you would test, and how you would intervene, then verify the reasoning against source without turning the run into a lecture.
Preset behavior:
- exam_cram: one-shot; short vignette; terse present-test-treat bullets; one correction note.
- deep_mastery: interactive; richer case with constraint or comorbidity; separate reasoning and verification sections.
- quick_review: one-shot refresh; compact clinical reasoning table.
- clinical_bridge: stepwise; realistic vignette with red flags or confounders and a prioritization grid.
If no preset is specified, use the default knobs. One-shot returns the full case artifact in one bounded reply; interactive or stepwise mode moves scenario -> presentation -> testing -> intervention -> verification and waits.
 |
| M-INT-003 | Cross-Topic Link | ENCODE | Identify 2-3 meaningful links between the current topic and topics from other courses, then name the shared principle behind each link. | {'description': 'Current topic', 'required': True}; {'description': 'Access to previous course notes', 'required': False} -> {'name': 'Cross-topic connection list (2-3 connections)', 'description': 'Two or three concrete cross-topic links worth carrying forward.', 'format': 'bulleted or tabular list'}; {'name': 'Explanatory sentences (each with a because clause)', 'description': 'One explanatory sentence for each connection using an explicit because-clause.', 'format': 'bulleted list or short paragraph set'}; {'name': 'Shared principles identified for each connection', 'description': 'General rule, mechanism, or structure that explains why the connection holds.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Connections too vague; failure_mode:Listing without explaining; failure_mode:Only within-course connections | operational_stage=ENCODE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-INT-003 (Cross-Topic Link) in the INTERROGATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Cross-topic connection list, Explanatory sentences, and Shared principles.
Build 2-3 meaningful links between the current topic and other domains, explain each one with a because-clause, and name the shared principle without turning the run into a lecture or a loose brainstorm.
Preset behavior:
- exam_cram: one-shot; 2 terse links; because-sentences; principle bullets.
- deep_mastery: interactive; 3 fuller links with a dedicated shared-principle section.
- quick_review: one-shot refresh; compact connection table.
- clinical_bridge: stepwise; cross-domain links tied to patient care or clinical reasoning.
If no preset is specified, use the default knobs. One-shot returns the full linkage artifact in one bounded reply; interactive or stepwise mode moves topic -> candidates -> links -> principles and waits.
 |
| M-INT-004 | Side-by-Side Comparison | ENCODE | Place two confusable concepts in a comparison table, fill the key rows from memory first, then verify against source and mark the discriminators. | {'description': 'Two confusable concepts', 'required': True}; {'description': 'Comparison dimensions (features to compare)', 'required': True}; {'description': 'Source material for accuracy', 'required': True} -> {'name': 'Side-by-side comparison table', 'description': 'Completed comparison table with both concepts contrasted across the key dimensions.', 'format': '2-column or multi-row table'}; {'name': 'Discriminating features highlighted', 'description': 'Highest-yield differentiators that separate the two concepts under pressure.', 'format': 'bulleted or tabular list'}; {'name': 'Error list from initial attempt', 'description': 'Rows or cells that required correction after source verification.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Features too similar across concepts; failure_mode:Looking up before trying; failure_mode:Not identifying discriminators | operational_stage=ENCODE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-INT-004 (Side-by-Side Comparison) in the INTERROGATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Side-by-side comparison table, Discriminating features highlighted, and Error list from initial attempt.
Compare two confusable concepts by building a memory-first table, correcting it against source, and ending with the clearest differentiators. Do not turn the run into a lecture or fill the table for the learner.
Preset behavior:
- exam_cram: one-shot; 5-row sprint table; 2-3 discriminator bullets; minimal correction list.
- deep_mastery: interactive; 7-row table; ranked discriminators; fuller correction notes.
- quick_review: one-shot refresh; compact comparison table plus short correction list.
- clinical_bridge: stepwise; differential-style table weighted toward presentation, testing, treatment, and prognosis.
If no preset is specified, use the default knobs. One-shot returns the full comparison artifact in one bounded reply; interactive or stepwise mode moves pair -> rows -> table -> discriminators and waits.
 |
| M-INT-005 | Case Walkthrough | ENCODE | Walk through one realistic case to retrieve reasoning steps, identify gaps, and reinforce application accuracy before moving to the next probe. | {'description': 'Reference targets or question bank', 'required': True}; {'description': 'Scoring rubric and confidence capture', 'required': True} -> {'name': 'LearnerCaseResponse', 'description': 'Attempt-first case reasoning showing how the learner interpreted the case before correction.', 'format': 'concise prose bullets or short paragraph'}; {'name': 'ErrorTags', 'description': 'Typed classification of reasoning errors, omissions, or premature closure in the case response.', 'format': 'bulleted or tabular list'}; {'name': 'ConfidenceTag', 'description': 'Short confidence label captured before corrective feedback.', 'format': 'concise prose bullets or short paragraph'}; {'name': 'CorrectiveFeedback', 'description': 'Post-attempt corrective feedback naming what was right, what was missing, and what source detail changes the reasoning.', 'format': 'short summary paragraph or bullets'}; {'name': 'NextTargetedProbe', 'description': 'Follow-up probe aimed directly at the gap exposed in the current case.', 'format': 'concise prose bullets or short paragraph'} | MISSING | failure_mode:Answer leakage; failure_mode:Repeated misses | operational_stage=ENCODE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-INT-005 (Case Walkthrough) in the INTERROGATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: LearnerCaseResponse, ErrorTags, ConfidenceTag, CorrectiveFeedback, and NextTargetedProbe.
Run one realistic case from memory. Require a closed-note first-pass interpretation before feedback, walk the learner through differential, workup, and management as needed, tag the specific reasoning gap, capture confidence before correction, and end with one targeted next probe.
Preset behavior:
- exam_cram: one-shot; short case; terse bullets; one correction note; one next probe.
- deep_mastery: interactive; staged disclosure; explicit rationale, error tags, and fuller source check.
- quick_review: one-shot refresh; compact case reasoning table.
- clinical_bridge: stepwise; handoff-style case with red flags, prioritization, and a decision grid.
If no preset is specified, use the default knobs. One-shot returns the full case artifact in one bounded reply; interactive or stepwise mode moves case -> response -> correction -> next probe and waits.
 |
| M-INT-006 | Illness Script Builder | ENCODE | For a condition, build the illness script by naming enabling conditions, the pathophysiological fault, and the clinical consequences, then compare it against source and add differentiators. | {'description': 'Condition or disease to script', 'required': True}; {'description': 'Source material with pathophysiology', 'required': True}; {'description': 'Illness script template', 'required': True} -> {'name': 'Complete illness script (3 parts)', 'description': 'Completed illness script covering enabling conditions, pathophysiological fault, and clinical consequences.', 'format': 'concise prose bullets or short paragraph'}; {'name': 'Causal chain diagram', 'description': 'Short causal chain connecting enabling conditions to fault to consequences.', 'format': 'labeled visual structure'}; {'name': 'Comparison to textbook', 'description': 'Comparison against source showing what was missing, wrong, or incomplete.', 'format': '2-column or multi-row table'}; {'name': 'Discriminating features', 'description': 'Features that separate this illness script from similar or confusable conditions.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Consequences without mechanism; failure_mode:Generic enabling conditions; failure_mode:Not discriminating from similar conditions | operational_stage=ENCODE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-INT-006 (Illness Script Builder) in the INTERROGATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Complete illness script, Causal chain diagram, Comparison to textbook, and Discriminating features.
Build one illness script by naming enabling conditions, the pathophysiological fault, and the clinical consequences, then compare it against source and separate it from look-alikes. Do not turn the run into a lecture or write the script for the learner before an attempt.
Preset behavior:
- exam_cram: one-shot; terse three-part script; one arrow chain; short gap list; one discriminator.
- deep_mastery: interactive; fuller three-part script; detailed source comparison; two look-alike contrasts.
- quick_review: one-shot refresh; compact script table plus brief gap table.
- clinical_bridge: stepwise; patient-facing script with risk profile, mechanism-linked findings, red flags, and next-move differentiators.
If no preset is specified, use the default knobs. One-shot returns the full illness-script artifact in one bounded reply; interactive or stepwise mode moves script -> chain -> source check -> discriminators and waits.
 |
| M-ORG-001 | Concept Map | MISSING | Generate a learner-usable concept map that captures core nodes and labeled links for objective-scoped encoding. | {'description': 'Target concept from objective map', 'required': True}; {'description': 'Current misconception or gap signal', 'required': True} -> {'name': 'Learner-generated explanation or structured encoding artifact', 'description': 'Learner-generated explanation or structured encoding artifact', 'format': 'labeled visual structure'} | MISSING | failure_mode:Overload; failure_mode:Passive repetition | operational_stage=MISSING; diagram_format=mermaid; has_steps=Y; has_outputs_or_artifacts=Y; outputs_summary=Concept map (nodes + labeled links); Mermaid code; guidance_level=medium; evidence_raw=Novak & Canas (2008); concept mapping promotes meaningful learning through explicit relationship encoding; gating_rules=['Force active processing (explain, transform, or map), not passive reading.', 'Keep output scoped to mapped objectives only.']; stipulations=['The concept map must be learner-usable, not decorative.', 'The learner must be able to explain the map structure after it is built.', 'Start with a short top-down verbal frame before drawing the map.', 'Treat generated structure as teaching support, not source evidence, unless specific sources are cited.']; artifact_type=concept-map | You are running M-ORG-001 (Concept Map) in ENCODE stage.
Role: you are the tutor running the method exactly as written, with no hidden assumptions.
Objective: Organize the material into a visible structure so relationships, sequence, contrast, or hierarchy become easier to remember and explain.
Scope: Generate a learner-usable concept map that captures core nodes and labeled links for objective-scoped encoding.
Rules:
- Require active learner processing — The method depends on the learner generating, mapping, explaining, or transforming the material rather than passively reading.
- Stay within objective scope — Prevents drift into unrelated material and keeps the method auditable.
- Do not turn this into a passive answer dump or scoring event — This method is designed for guided learning, not one-shot lecture or formal grading.
- The concept map must be learner-usable, not decorative. — Keeps the method honest and prevents a common misuse described in the source file.
- The learner must be able to explain the map structure after it is built. — Keeps the method honest and prevents a common misuse described in the source file.
- Not for: This is not for isolated trivia, free-form brainstorming, or content that has no meaningful structure to map.
Inputs:
- Target concept from objective map (required)
- Current misconception or gap signal (required)
Required outputs:
- Learner-generated explanation or structured encoding artifact: Learner-generated explanation or structured encoding artifact [labeled visual structure]
Steps: run one step at a time and wait after each step before advancing.
1. Start Encode Protocol Within Scope
   Tutor does: Guide the learner to Start ENCODE protocol within scope. Keep in mind: Respect stage boundaries.
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Respect stage boundaries.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
2. Execute Method Actions In Order
   Tutor does: Guide the learner to Execute method actions in order. Keep in mind: Capture required telemetry/artifacts.
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Capture required telemetry/artifacts.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
3. Emit Required Outputs And Handoff
   Tutor does: Guide the learner to Emit required outputs and handoff. Keep in mind: Do not drift into another stage.
   Learner does: Reads the prompt, does the thinking step, and returns the artifact or answer.
   Example: Example: Do not drift into another stage.
   Check: Is this step complete and ready for the next move?
   Then STOP and wait for the learner.
Stop conditions:
- All required outputs are present and checkable: Learner-generated explanation or structured encoding artifact, Concept map with nodes and labeled links.
- The method reaches its stop condition: Learner can explain concept in own words with minimal support.
- The learner stays active and the tutor does not give away the answer before the required attempt or transformation.
If stuck: Reduce the scope to fewer nodes or rows, restate the parts in plain language, and then rebuild the structure one relationship at a time. If needed, switch to a simpler map or flowchart.
Do not skip steps, do not solve the whole task at once, and do not present source claims as mnemonic or analogy artifacts. |
| M-ORG-002 | Comparison Table | MISSING | Create a side-by-side table comparing 2-4 confusable concepts across shared features. Highlight discriminating features. Builds differential diagnosis skill. | {'description': '2-4 confusable concepts to compare', 'required': True}; {'description': 'List of comparison dimensions/features', 'required': True}; {'description': 'Source material for accuracy', 'required': True} -> {'name': 'Completed comparison table', 'description': 'Completed comparison table', 'format': '2-column or multi-row table'}; {'name': 'Discriminating features highlighted', 'description': 'Discriminating features highlighted', 'format': 'short, checkable artifact'}; {'name': 'Differential rules (1-2 per comparison)', 'description': 'Differential rules (1-2 per comparison)', 'format': '2-column or multi-row table'}; {'name': 'Error list from initial attempt', 'description': 'Error list from initial attempt', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Looking up before trying; failure_mode:No discriminators identified; failure_mode:Too many comparison dimensions | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-ORG-002 (Comparison Table) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Completed comparison table, Discriminating features highlighted, Differential rules, and Error list from initial attempt.
Build a side-by-side table for 2-4 confusable concepts. Fill it from memory first, verify against the source, highlight the real discriminators, and finish with short if-then rules.
Preset behavior:
- exam_cram: one-shot; smallest useful table plus one if-then rule per comparison.
- deep_mastery: interactive; dimension-by-dimension fill with explicit error correction and fuller rules.
- quick_review: one-shot refresh; compact discriminator table plus one rule block.
- clinical_bridge: stepwise; applied differential grid with clue, likely confusion, and confirming feature columns.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves table -> correction -> discriminator rules and waits. |
| M-ORG-003 | Process Flowchart | MISSING | Draw a sequential diagram showing a process, pathway, or algorithm. Include decision points where applicable. Use Mermaid graph TD syntax for dashboard editor. | {'description': 'Process or algorithm to diagram', 'required': True}; {'description': 'Source material with step sequence', 'required': True}; {'description': 'Mermaid editor or blank paper', 'required': True} -> {'name': 'Completed flowchart', 'description': 'Completed flowchart', 'format': 'labeled visual structure'}; {'name': 'Mermaid code (if using dashboard)', 'description': 'Mermaid code (if using dashboard)', 'format': 'short, checkable artifact'}; {'name': 'Decision point list', 'description': 'Decision point list', 'format': 'short, checkable artifact'}; {'name': 'Loop/feedback points identified', 'description': 'Loop/feedback points identified', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Linear-only thinking; failure_mode:Missing decision branches; failure_mode:Too complex single diagram | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-ORG-003 (Process Flowchart) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Completed flowchart, Decision point list, and Loop or feedback points identified.
Draw a sequential process diagram from the real source pathway. Make the start point explicit, list all steps in order, mark decision points and loops, and verify the finished structure against the source.
Preset behavior:
- exam_cram: one-shot; lean step sequence plus separate decision and loop notes.
- deep_mastery: interactive; node-by-node build with explicit decisions and loop annotations.
- quick_review: one-shot refresh; compact Step \| Decision? \| Next state table plus loop list.
- clinical_bridge: stepwise; applied pathway grid with trigger, branch, confirm, and loop columns.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves steps -> decisions -> loops -> verification and waits. |
| M-ORG-004 | Clinical Decision Tree | MISSING | Build a branching decision diagram: presentation → key findings → differential → tests → diagnosis. Scaffolds clinical reasoning into explicit decision points. | {'description': 'Clinical presentation or chief complaint', 'required': True}; {'description': 'Differential diagnosis list', 'required': True}; {'description': 'Source material with diagnostic criteria', 'required': True} -> {'name': 'Clinical decision tree', 'description': 'Clinical decision tree', 'format': 'labeled visual structure'}; {'name': 'Red flag list', 'description': 'Red flag list', 'format': 'short, checkable artifact'}; {'name': 'Confirmatory test per diagnosis', 'description': 'Confirmatory test per diagnosis', 'format': 'short, checkable artifact'}; {'name': 'Mermaid code (if using dashboard)', 'description': 'Mermaid code (if using dashboard)', 'format': 'short, checkable artifact'} | MISSING | failure_mode:Missing red flags; failure_mode:Non-discriminating questions; failure_mode:Too many branches at one node | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-ORG-004 (Clinical Decision Tree) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Clinical decision tree, Red flag list, and Confirmatory test per diagnosis.
Build a branching decision artifact from presentation to likely diagnoses. Branch only on meaningful discriminators, attach confirmatory checks to each branch, and surface red flags that bypass the tree.
Preset behavior:
- exam_cram: one-shot; smallest safe tree plus separate red flags.
- deep_mastery: interactive; stepwise branching with visible justification and confirmatory checks.
- quick_review: one-shot refresh; Branch cue \| Likely diagnosis \| Confirm test table plus red flags.
- clinical_bridge: stepwise; applied decision matrix with presentation, discriminator, differential, confirmatory test, and bypass columns.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves presentation -> branches -> confirmatory checks -> red flags and waits. |
| M-OVR-001 | Exit Ticket | OVERLEARN | Answer three questions: (1) What did I learn? (2) What's still muddy? (3) What's my next action? | {'description': 'Completed study session', 'required': True}; {'description': 'Exit ticket template (3 questions)', 'required': True}; {'description': 'Session notes or artifacts for reference', 'required': True} -> {'name': 'Exit ticket (all 3 questions answered)', 'description': 'A short session-closure artifact that captures takeaways, muddy points, and next actions.', 'format': 'free-response text'}; {'name': 'Key takeaways list (3-5 specific items)', 'description': 'Structured list of the main session takeaways worth carrying forward.', 'format': 'bulleted or tabular list'}; {'name': 'Muddy points or weak anchors identified', 'description': 'Specific confusions, weak anchors, or unstable ideas that still need attention.', 'format': 'bulleted or tabular list'}; {'name': 'Next action commitment (specific and actionable)', 'description': 'Concrete next step that can be acted on without vague follow-through language.', 'format': 'structured response'}; {'name': 'Questions for next session', 'description': 'Specific follow-up questions converted from muddy points for the next pass.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Fluency collapses from fatigue; failure_mode:The output becomes bloated; failure_mode:The session turns into new teaching | operational_stage=OVERLEARN; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-OVR-001 (Exit Ticket) in the OVERLEARN stage.
Use only the loaded source and session context. Ask only for missing required inputs.
Produce: Exit ticket, Key takeaways list, Muddy points or weak anchors identified, Next action commitment, and Questions for next session.
Close the session with the three mandatory questions: what did I learn, what's still muddy, and what's my next action. Keep the ticket brief, specific, and source-grounded; verify the next action passes the 15-minute test; convert muddy points into next-session questions; do not drift into new teaching.
Preset behavior:
- exam_cram: one-shot; terse bullets; 3 takeaways, 1 muddy point, 1 next action, 1 next-session question.
- deep_mastery: interactive; labeled sections; walk each question in sequence, verify against notes, and end with a fuller handoff.
- quick_review: one-shot refresh; compact Learned-Muddy-Next table plus one short follow-up question block.
- clinical_bridge: stepwise; handoff matrix with takeaway, risk if missed, next action, and next-session question.
If no preset is specified, use the default knobs. One-shot returns the full closure artifact in one bounded reply; interactive or stepwise mode moves ticket -> review -> next-session questions and waits.
 |
| M-OVR-002 | Anki Card Draft | OVERLEARN | Draft 3-5 Anki cards for the session's key concepts. Use cloze or basic format. Brain syncs to Anki. | {'description': 'Session notes and key concepts', 'required': True}; {'description': 'Anki card template (cloze or basic)', 'required': True}; {'description': 'Card draft staging area (Brain or text file)', 'required': True}; {'description': 'Target deck name', 'required': True} -> {'name': '3-5 drafted Anki cards in canonical CARD block format', 'description': 'A draft card set for later Anki import or refinement.', 'format': 'formatted study artifact'}; {'name': 'Each card tagged by topic and source', 'description': 'Tag-clean card metadata for filtering, source tracing, and later study organization.', 'format': 'formatted study artifact'}; {'name': 'Cards staged in Brain for Anki sync', 'description': 'Staged card artifact ready for later sync into Anki.', 'format': 'formatted study artifact'}; {'name': 'Card count logged to session record', 'description': 'Short log showing the final number of drafted cards for the session.', 'format': 'structured log'} | MISSING | failure_mode:Fluency collapses from fatigue; failure_mode:The output becomes bloated; failure_mode:The session turns into new teaching | operational_stage=OVERLEARN; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-OVR-002 (Anki Card Draft) in the OVERLEARN stage.
Use only the loaded source and learner context. Ask only for missing required inputs.
Produce: drafted Anki cards, card tags, staged cards, and card count log.
Draft 3-5 review-ready cards from already-understood material. Keep cards source-grounded, atomic, and format-clean; use cloze for tight facts and vocabulary, basic Q&A for why, mechanism, or process; output final cards only as canonical CARD blocks with Type, Front, Back, and Tags lines; do not drift into new teaching.
Preset behavior:
- exam_cram: one-shot; 3 ultra-lean cards; mostly cloze or direct fact locks; minimal commentary.
- deep_mastery: interactive; 5 cards; mixed cloze and basic; include a brief atomicity check before finalizing.
- quick_review: one-shot refresh; 3-4 highest-yield cards; compact concept-to-format table, then final CARD blocks.
- clinical_bridge: stepwise; 3-5 applied cue-to-action or discriminator cards; favor basic over cloze when action or consequence matters.
If no preset is specified, use the default knobs. One-shot returns the full card artifact in one bounded reply; interactive or stepwise mode moves concept selection -> format choice -> card draft -> final check and waits.
 |
| M-OVR-003 | Drill Sheet Builder | OVERLEARN | Build an interleaved drill sheet (30-60 timed items) and define cross-session validation checks. | {'description': 'Question Bank Seed', 'required': True}; {'description': 'ErrorLog trends', 'required': True} -> {'name': 'DrillSheet (30-60 interleaved items, objective-tagged)', 'description': 'Interleaved timed drill sheet with objective tags and weak-point coverage for later practice.', 'format': 'formatted study artifact'}; {'name': 'CrossSessionValidation checklist (two-session pass criteria)', 'description': 'Validation checklist that defines what counts as a stable pass across sessions.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Fluency collapses from fatigue; failure_mode:The output becomes bloated; failure_mode:The session turns into new teaching | operational_stage=OVERLEARN; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-OVR-003 (Drill Sheet Builder) in the OVERLEARN stage.
Use only the loaded source and learner context. Ask only for missing required inputs.
Produce: DrillSheet and CrossSessionValidation checklist.
Build a 30-60 item interleaved timed drill sheet from already-encoded objectives. Mix weak objectives with prior misses, attach objective IDs to every item, and define what counts as passing the same objective across two sessions. Do not teach new content while building the sheet.
Preset behavior:
- exam_cram: one-shot; 30-item sprint sheet; terse bullets; minimal validation checklist.
- deep_mastery: interactive; 60-item full sheet; labeled sections; explicit rounds and richer validation contract.
- quick_review: one-shot refresh; 30-36 item compact drill table plus short validation table.
- clinical_bridge: stepwise; 30-45 item applied drill matrix mixing discriminators, cue-to-action items, and mechanism checks.
If no preset is specified, use the default knobs. One-shot returns the full drill artifact in one bounded reply; interactive or stepwise mode moves build -> validation -> handoff and waits.
 |
| M-OVR-004 | Post-Learn Brain Dump | OVERLEARN | Close all materials. Write everything you remember from the session — stories, connections, details, anything. Then open materials, compare, identify gaps, and fill them in. Different from Free Recall Blurt: this is comprehensive session-level closure, not topic-level retrieval practice. | {'description': 'Completed study session (all blocks done)', 'required': True}; {'description': 'Blank paper or text area', 'required': True}; {'description': 'Timer (5 min dump + 2 min gap-fill)', 'required': True}; {'description': 'Session materials (closed during dump, opened for gap-fill)', 'required': True} -> {'name': 'Brain dump text (raw recall output)', 'description': 'A raw recall transcript with gaps marked, followed by comparison notes and gap repair.', 'format': 'free-response text'}; {'name': 'Gap list (what was missing or wrong)', 'description': 'A structured output for a comprehensive post-learn brain dump that captures the session story, compares against source material, and fills gaps.', 'format': 'bulleted or tabular list'}; {'name': 'Gap-fill annotations (one-line corrections)', 'description': 'A structured output for a comprehensive post-learn brain dump that captures the session story, compares against source material, and fills gaps.', 'format': 'structured response'}; {'name': 'Session retention estimate (percentage of material recalled)', 'description': 'A structured output for a comprehensive post-learn brain dump that captures the session story, compares against source material, and fills gaps.', 'format': 'structured response'} | MISSING | failure_mode:Fluency collapses from fatigue; failure_mode:The output becomes bloated; failure_mode:The session turns into new teaching | operational_stage=OVERLEARN; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-OVR-004 (Post-Learn Brain Dump) in the OVERLEARN stage.
Use only the loaded source and session context. Ask only for missing required inputs.
Produce: Brain dump text, Gap list, Gap-fill annotations, and Session retention estimate.
Run one comprehensive closed-note session dump before any comparison. Keep the first pass broad and attempt-first, then compare against the session materials and patch only the biggest gaps with brief corrections.
Preset behavior:
- exam_cram: one-shot; 5-minute dump; terse gap bullets; one concrete fill target.
- deep_mastery: interactive; full narrative dump; careful compare-against-source and richer gap-fill handoff.
- quick_review: one-shot refresh; compact Learned-Missed-Fill table plus quick retention estimate.
- clinical_bridge: stepwise; applied handoff matrix with recalled actions, missed risks, gap fills, and next practical target.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves dump -> compare -> gap fill and waits. |
| M-PLAN-001 | Session Planning | MISSING | Choose scope and horizon, build a session or week plan, match methods to the learner goal preset, and schedule reviews before execution starts. | {'description': 'Learner goal or active preset target', 'required': True}; {'description': 'Objective scope or target content set', 'required': True}; {'description': 'Time horizon (single session or one-week plan)', 'required': True}; {'description': 'Time and logistics constraints (minutes, days, exam date, duty context, energy)', 'required': True} -> {'name': 'ScopeAndHorizonDecision', 'description': 'A bounded planning decision that states what will be covered, what will be excluded, and whether the plan is for one session or one week.', 'format': 'paragraph or bullets'}; {'name': 'SessionOrWeekPlan', 'description': 'An ordered plan showing the planned blocks, their duration, and the intended method flow.', 'format': 'table'}; {'name': 'MethodSelectionMap', 'description': 'A method-choice map that explains which methods are selected for this preset and why they fit the learner goal.', 'format': 'table'}; {'name': 'ReviewSchedule', 'description': 'A review schedule with timing, review type, and stop or escalation cues.', 'format': 'table'}; {'name': 'PlanningGuardrails', 'description': 'The constraints, cut lines, and carry-forward rules that keep the plan realistic.', 'format': 'bulleted list'} | MISSING | failure_mode:Preset and plan shape do not match; failure_mode:Review schedule is not realistic; failure_mode:Scope is too broad for the horizon | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PLAN-001 (Session Planning) in the PLAN stage.
Use only the loaded source and ask only for missing required inputs.
Produce: ScopeAndHorizonDecision, SessionOrWeekPlan, MethodSelectionMap, ReviewSchedule, and PlanningGuardrails.
Build a bounded session or one-week plan by choosing the horizon, cutting the scope, selecting methods that match the learner goal preset, and scheduling review before execution starts. Do not drift into teaching.
Preset behavior:
- exam_cram: one-shot; compressed single-session plan; minimal chain; one or two short scheduled reviews.
- deep_mastery: interactive; one-week plan; richer stage mix; explicit calibration and spaced review points.
- quick_review: one-shot refresh; compact table for already-seen material with one retrieval review and one carry-forward check.
- clinical_bridge: stepwise; applied planning matrix built around case work, decision cues, and safety-critical reviews.
If no preset is specified, use the default knobs. One-shot returns the full plan in one bounded reply; interactive or stepwise mode moves scope -> method mix -> schedule -> guardrails and waits.
 |
| M-PLAN-002 | Weekly & Long-term Planning | MISSING | Build a weekly or multi-week study plan that tracks mastery, schedules spaced reviews, and adjusts around deadlines, exams, and progress signals. | {'description': 'Learner goal or active preset target', 'required': True}; {'description': 'Objective set or content domains to cover', 'required': True}; {'description': 'Planning horizon (one week or multi-week to deadline)', 'required': True}; {'description': 'Deadline and logistics constraints (exam dates, project dates, duty schedule, fixed commitments)', 'required': True}; {'description': 'Current progress signal or mastery estimate', 'required': True} -> {'name': 'HorizonAndPriorityPlan', 'description': 'A bounded planning decision that defines the horizon, top priorities, and what will not be covered in this cycle.', 'format': 'paragraph or bullets'}; {'name': 'WeeklyOrLongRangePlan', 'description': 'An ordered week-by-week or block-by-block plan with planned work sessions and objective coverage.', 'format': 'table'}; {'name': 'MasteryTrackingMap', 'description': 'A mastery-tracking view showing objective status, evidence source, and next planned action.', 'format': 'table'}; {'name': 'SpacedReviewSchedule', 'description': 'A spaced review schedule with review timing, review type, and escalation or stop cues.', 'format': 'table'}; {'name': 'DeadlineAdjustmentRules', 'description': 'Explicit rules for compressing, expanding, or rerouting the plan when progress or deadlines change.', 'format': 'bulleted list'} | MISSING | failure_mode:Priority stack is too broad; failure_mode:Progress signals do not change the plan; failure_mode:Review schedule is too ambitious | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PLAN-002 (Weekly & Long-term Planning) in the PLAN stage.
Use only the loaded source and ask only for missing required inputs.
Produce: HorizonAndPriorityPlan, WeeklyOrLongRangePlan, MasteryTrackingMap, SpacedReviewSchedule, and DeadlineAdjustmentRules.
Build a weekly or multi-week plan by setting the horizon, ranking priorities, assigning real work blocks, tracking mastery, scheduling spaced reviews, and stating how the plan changes when progress or deadlines shift. Do not drift into teaching.
Preset behavior:
- exam_cram: one-shot; short countdown plan to the next deadline; aggressive cuts; minimal viable spaced reviews.
- deep_mastery: interactive; multi-week mastery plan with milestones, recurring tracking, and fuller review spacing.
- quick_review: one-shot refresh; compact weekly maintenance table with one main block, one retrieval review, and one progress check.
- clinical_bridge: stepwise; applied weekly or multi-week matrix built around cases, shifts, safety-critical topics, and deadline-sensitive reviews.
If no preset is specified, use the default knobs. One-shot returns the full plan in one bounded reply; interactive or stepwise mode moves horizon -> priorities -> schedule -> reviews -> adjustment rules and waits.
 |
| M-PRE-001 | Brain Dump | PRIME | Run a short orientation-only recall pass over existing notes or context to surface strong anchors, obvious gaps, and next-pass targets before deeper work. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'StrongConnections', 'description': 'Top-level anchors the learner already has tied to the topic.', 'format': 'bulleted or tabular list'}; {'name': 'MissingNodes', 'description': 'Important anchors or gaps that should be revisited next.', 'format': 'bulleted or tabular list'}; {'name': 'FollowUpTargets', 'description': 'Next-pass targets for study or clarification.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Learner treats it like a quiz; failure_mode:No prior context exists | operational_stage=PRIME; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-001 (Brain Dump) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: StrongConnections, MissingNodes, and FollowUpTargets.
Have the learner do a brief free write on what they already remember, extract only the top-level anchors that align with the active topic or objective, and mark obvious gaps as follow-up nodes. Keep it orientation-only, non-assessive, and source-grounded; do not teach, score, or correct the dump as if it were a quiz.
Preset behavior:
- exam_cram: one-shot; terse bullets with 3 strong anchors, up to 2 gaps, and 1-2 next targets.
- deep_mastery: interactive; labeled sections grouping anchors and gaps by objective or theme.
- quick_review: one-shot refresh; compact known-anchor / objective-tie / missing-node / next-target table.
- clinical_bridge: stepwise; clinic-facing cue / why-it-matters / missing-node / follow-up-target table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves free write -> anchor extraction -> missing-node routing and waits.
 |
| M-PRE-002 | Overarching Pre-Question Set | PRIME | Generate 3-5 broad why, how, or where-fit questions that jointly cover the full selected scope before deep study so the learner has conceptual hooks to look for. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'PreQuestionSet', 'description': 'Three to five broad why, how, or where-fit prompts that cover the selected scope.', 'format': 'numbered question list'}; {'name': 'PriorityPrompts', 'description': 'One or two highest-leverage prompts to carry into the next study move.', 'format': 'bulleted or tabular list'}; {'name': 'FollowUpTargets', 'description': 'Unresolved prompts or clusters that should drive the next pass.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Learner anxiety rises from open prompts; failure_mode:Prompts become detailed quiz items | operational_stage=PRIME; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-002 (Overarching Pre-Question Set) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: PreQuestionSet, PriorityPrompts, and FollowUpTargets.
Inventory the selected scope, compress it into 3-5 broad why, how, or where-fit questions that cover the whole slice, rank the highest-leverage prompts, and record unresolved ones as follow-up targets. Keep it orientation-only, non-assessive, and source-grounded; do not teach the answers and do not turn the questions into quiz items.
Preset behavior:
- exam_cram: one-shot; 3 broad questions, 1 priority prompt, and 1-2 follow-up targets as terse bullets.
- deep_mastery: interactive; labeled sections for scope inventory, question set, priority prompts, and unresolved follow-up targets.
- quick_review: one-shot refresh; compact question / covered-cluster / leverage-rank / follow-up-use table.
- clinical_bridge: stepwise; clinic-facing broad-question / patient-relevance / missing-node / downstream-target table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves scope inventory -> question compression -> leverage ranking -> follow-up capture and waits.
 |
| M-PRE-003 | Prior Knowledge Scan | PRIME | Map a new topic to 3-5 related concepts the learner already knows so the strongest prior schema and prerequisite gaps are visible before deeper work. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'Connection map (topic + related concepts)', 'description': 'Structured map showing the new topic, related known concepts, and labeled relationship types.', 'format': 'structured map or nested bullets'}; {'name': 'Primary anchoring schema identified', 'description': 'Strongest known concept or schema to use as the main anchor for the new topic.', 'format': 'bulleted or tabular list'}; {'name': 'Prerequisite gap list', 'description': 'Weak or missing prerequisite links that should be reviewed before deeper study.', 'format': 'bulleted or tabular list'}; {'name': 'Optional follow_up_targets list for unresolved prerequisite gaps', 'description': 'Downstream targets created from unresolved weak links or missing prerequisites.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:No connections found; failure_mode:No prior context available | operational_stage=PRIME; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-003 (Prior Knowledge Scan) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Connection map, Primary anchoring schema identified, Prerequisite gap list, and optional follow_up_targets.
Put the new topic at the center, list 3-5 related concepts the learner already knows, label how each one connects to the new topic, choose the strongest anchor schema, and flag weak prerequisite links for follow-up. Keep it orientation-only, non-assessive, and source-grounded; do not correct the map as if it were a graded concept check and do not teach the new topic while scanning.
Preset behavior:
- exam_cram: one-shot; 3 related concepts, one strongest anchor, and 1-2 gaps as terse bullets.
- deep_mastery: interactive; labeled sections for connection map, relationship labels, anchor schema, gaps, and follow-up targets.
- quick_review: one-shot refresh; compact known-concept / relationship / anchor-strength / gap table.
- clinical_bridge: stepwise; clinic-facing known-concept / relevance / relationship / missing-prerequisite table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves topic hub -> related concepts -> relationship labels -> strongest anchor -> gap flags and waits.
 |
| M-PRE-004 | Hierarchical Advance Organizer | PRIME | Present a high-abstraction top-down framework as an ASCII concept map plus Obsidian-friendly hierarchy that covers the selected scope before detail study. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'AsciiConceptMap', 'description': 'ASCII concept map showing the parent concept, 3-5 pillars, and one representative branch per pillar.', 'format': 'structured map or nested bullets'}; {'name': 'ObsidianHierarchy', 'description': 'Obsidian-friendly nested hierarchy of the same organizer for later note reuse.', 'format': 'ASCII tree or nested bullets'}; {'name': 'CarryForwardGaps', 'description': 'Short list of missing nodes, thin pillars, or next-study targets exposed by the organizer.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Orientation drifts into assessment; failure_mode:Pillar cap causes scope loss | operational_stage=PRIME; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_format=text; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-004 (Hierarchical Advance Organizer) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: AsciiConceptMap, ObsidianHierarchy, and CarryForwardGaps.
Build a top-down organizer by naming the most inclusive parent concept, compressing the selected scope into 3-5 pillars, adding one representative branch per pillar, and rendering the result as both an ASCII concept map and an Obsidian-friendly hierarchy. Keep it orientation-only, non-assessive, and coverage-first; do not turn it into a lecture, quiz, or detail dump.
Output mode:
- If output_format is text, keep the current text-first artifact shape.
- If output_format is map, render a clean hierarchical map using indentation, labeled sections, or simple ASCII structure.
Preset behavior:
- exam_cram: one-shot; parent concept, 3 terse pillars, one branch each, and a one-line gap note.
- deep_mastery: interactive; labeled sections for parent concept, pillars, branches, final maps, and carry-forward gaps.
- quick_review: one-shot refresh; compact level / node / role / carry-forward table plus final tree view.
- clinical_bridge: stepwise; clinic-facing organizer table with pillar, branch, why-it-matters, and missing-node columns.
- visual_map: one-shot; same organizer logic, but force a clean hierarchical map output.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves parent concept -> pillars -> representative branches -> final maps and waits.
 |
| M-PRE-005 | Skeleton Concept Hierarchy | PRIME | Generate a bare concept hierarchy (topic core -> 4-6 umbrella categories -> short descriptors) that still covers the full selected scope without deep explanations. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'SkeletonMap', 'description': 'Bare concept hierarchy showing the topic core, first-ring categories, and descriptor tokens.', 'format': 'structured map or nested bullets'}; {'name': 'CategoryLabels', 'description': 'Short category and descriptor label set extracted from the hierarchy.', 'format': 'bulleted or tabular list'}; {'name': 'CrossLinks', 'description': 'Short labeled cross-links between categories where relationships need to stay visible.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Map turns into paragraph notes; failure_mode:Too many nodes causing overload | operational_stage=PRIME; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-005 (Skeleton Concept Hierarchy) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: SkeletonMap, CategoryLabels, and CrossLinks.
Build a bare hierarchy by setting one topic core, inventorying the full selected scope, compressing it into 4-6 first-ring categories, attaching 1-2 descriptor tokens under each category, and adding short cross-links where needed. Keep it orientation-only, non-assessive, and descriptor-first; do not turn the hierarchy into paragraph notes or a mini-lecture.
Preset behavior:
- exam_cram: one-shot; topic core, 4 terse categories, 1 descriptor each, and minimal cross-links.
- deep_mastery: interactive; labeled sections for topic core, categories, descriptors, cross-links, and carry-forward notes.
- quick_review: one-shot refresh; compact category / descriptors / cross-links table plus final tree view.
- clinical_bridge: stepwise; clinic-facing category / cue descriptor / related category / practical meaning table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves topic core -> categories -> descriptor tokens -> cross-links and waits.
 |
| M-PRE-006 | Structural Skimming + Pillar Mapping | PRIME | Rapidly skim headings and visual cues across the selected scope, then compress the structure into an ASCII concept map plus Obsidian-friendly hierarchy before deep reading. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'AsciiConceptMap', 'description': 'Structural map showing the 3-5 umbrella pillars extracted from the skimmed source.', 'format': 'structured map or nested bullets'}; {'name': 'ObsidianHierarchy', 'description': 'Obsidian-friendly nested hierarchy of the skimmed and compressed structure.', 'format': 'ASCII tree or nested bullets'} | MISSING | failure_mode:LLM drifts into paragraph summarization; failure_mode:Too many pillars | operational_stage=PRIME; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_format=text; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-006 (Structural Skimming + Pillar Mapping) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: AsciiConceptMap and ObsidianHierarchy.
Skim headings and visual cues across the selected scope, inventory the major supported sections, compress the inventory into 3-5 umbrella pillars, and render the result as both an ASCII concept map and an Obsidian-friendly hierarchy. Keep it orientation-only, non-assessive, and structural; do not turn the skim into a paragraph summary or a topic explanation.
Output mode:
- If output_format is text, keep the current text-first artifact shape.
- If output_format is map, render a clean hierarchical pillar map using labeled sections, indentation, or simple ASCII structure.
Preset behavior:
- exam_cram: one-shot; 3 terse pillars from headings and visual cues plus a compact final map.
- deep_mastery: interactive; labeled sections for structural cues, inventory, pillars, final map, and final hierarchy.
- quick_review: one-shot refresh; compact cue / section / pillar / note table plus final hierarchy.
- clinical_bridge: stepwise; clinic-facing cue / pillar / why-it-matters / follow-up-note table.
- visual_map: one-shot; same skim and compression flow, but force a clean hierarchical map output.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves skim cues -> inventory -> pillars -> final maps and waits.
 |
| M-PRE-007 | Pre-Test | PRIME | Attempt to answer questions on the topic before studying it. Wrong answers, guesses, and confidence ratings create encoding hooks for later learning. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'Pre-test answers (with confidence ratings)', 'description': 'Short pre-study question set with guessed answers and confidence for each item.', 'format': 'prompt set with brief answers'}; {'name': 'Encoding priming for correct answers', 'description': 'Short list of what the learner should watch for during study based on the questions attempted.', 'format': 'bulleted or tabular list'}; {'name': 'Calibration baseline', 'description': 'Low-stakes baseline comparing answer attempts with confidence levels before answer checking.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Checking answers immediately; failure_mode:Refusing to guess | operational_stage=PRIME; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-007 (Pre-Test) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Pre-test answers (with confidence ratings), Encoding priming for correct answers, and Calibration baseline.
Build a short pre-study question set, require an answer attempt for every item, capture confidence for each answer, and keep the questions visible for later answer checking during study. Keep it low-stakes, non-summative, and priming-focused; do not reveal correct answers yet and do not drift into explanation.
Preset behavior:
- exam_cram: one-shot; 3 questions, terse guesses with confidence, and one watch-for cue per item.
- deep_mastery: interactive; 4-5 questions, explicit answer attempts, calibration notes, and a richer study watchlist.
- quick_review: one-shot refresh; compact question / guess / confidence / what-to-watch table plus short calibration note.
- clinical_bridge: stepwise; short case-based guess / confidence / study-watch matrix.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves questions -> answer attempts -> confidence -> watchlist and waits.
 |
| M-PRE-008 | Structural Extraction | PRIME | Extract a compact structural spine from source material before detail work. Build high-signal nodes and link every node to at least one objective. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'StructuralSpine', 'description': 'Compact ordered spine of high-signal nodes extracted from the source.', 'format': 'ordered bullets'}; {'name': 'Objective linkage map', 'description': 'Map linking each retained node to at least one objective ID or objective phrase.', 'format': 'structured map or nested bullets'}; {'name': 'UnknownNodeList', 'description': 'List of nodes that remain weak, missing, or low-confidence after extraction.', 'format': 'bulleted or tabular list'}; {'name': 'PriorityNodes', 'description': 'Highest-priority nodes for the next study pass based on objective relevance and uncertainty.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Drift into testing; failure_mode:Scope too broad | operational_stage=PRIME; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-008 (Structural Extraction) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: StructuralSpine, Objective linkage map, UnknownNodeList, and PriorityNodes.
Resolve the active objective scope, extract a compact high-signal structural spine, link every retained node to at least one objective, and mark unknown nodes for later study. Keep it orientation-only, non-assessive, and objective-linked; do not turn the output into prose explanation or retain nodes that do not matter for the active objectives.
Preset behavior:
- exam_cram: one-shot; 5-node spine, short objective tags, and terse unknown-node list.
- deep_mastery: interactive; labeled sections for scope resolution, spine, linkage map, unknown nodes, and priorities.
- quick_review: one-shot refresh; compact node / linked-objective / uncertainty / priority table plus final spine.
- clinical_bridge: stepwise; clinic-facing node / clinical-objective / uncertainty / priority table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves scope -> spine -> objective links -> unknown nodes and waits.
 |
| M-PRE-009 | Syntopical Big-Picture Synthesis | PRIME | Synthesize top-level structure across 2-3 sources into one module-level hierarchy with cross-links. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'UnifiedTopDownTree', 'description': 'Unified high-level hierarchy synthesized across the selected sources.', 'format': 'bulleted or nested hierarchy'}; {'name': 'CrossSourceLinks', 'description': 'Short list of where major concepts align, overlap, or bridge across sources.', 'format': 'bulleted or tabular list'}; {'name': 'ConflictFlags', 'description': 'Source-grounded contradictions, mismatches, or unresolved differences that need later clarification.', 'format': 'bulleted or tabular list'}; {'name': 'FollowUpTargets', 'description': 'Next-pass targets created from conflict flags, thin bridges, or unresolved cross-source gaps.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Drift into testing; failure_mode:Scope too broad | operational_stage=PRIME; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-009 (Syntopical Big-Picture Synthesis) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: UnifiedTopDownTree, CrossSourceLinks, ConflictFlags, and FollowUpTargets.
Extract top-level pillars from 2-3 sources, merge overlaps into one unified hierarchy, add cross-source links, and flag unresolved conflicts for later study. Keep it orientation-only, non-assessive, and top-level; do not drift into paragraph summaries or source-by-source explanation.
Preset behavior:
- exam_cram: one-shot; terse unified tree, 2-3 cross-source links, and only the highest-yield conflict flags.
- deep_mastery: interactive; labeled sections for source pillars, unified tree, links, conflicts, and follow-up targets.
- quick_review: one-shot refresh; compact source / shared-pillar / link / conflict table plus final tree.
- clinical_bridge: stepwise; clinic-facing source / unified-pillar / practical-overlap / conflict-risk table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves source pillars -> unified tree -> links and conflicts and waits.
 |
| M-PRE-010 | Learning Objectives Primer | PRIME | Build the study-target objective list for the current topic by accounting for all provided files first, then merging the objective signals into one clean set of learning targets. Also extract any explicit instructor objective statements found verbatim in the provided source material. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'SourceCoverageTable', 'description': 'File-by-file table showing what was scanned, what was relevant, and what objective signals were found.', 'format': 'table or tightly grouped bullets'}; {'name': 'CandidateObjectivesByFile', 'description': 'Objective candidates preserved at file level before merging.', 'format': 'bulleted or tabular list'}; {'name': 'FinalLearningObjectives', 'description': 'Clean merged list of study-target objectives for the current topic.', 'format': 'bulleted or tabular list'}; {'name': 'ExplicitInstructorObjectives', 'description': 'Verbatim objective statements explicitly stated in the source material.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Files skipped during accounting; failure_mode:Objectives become invented or over-merged | operational_stage=PRIME; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-010 (Learning Objectives Primer) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: SourceCoverageTable, CandidateObjectivesByFile, FinalLearningObjectives, and ExplicitInstructorObjectives.
Account for every provided file, extract candidate objective signals by file, preserve explicit instructor objectives verbatim, and merge the remaining signals into one clean study-target list. Keep it source-grounded, non-assessive, and non-instructional; do not skip files, invent objectives, or start teaching the topic.
Preset behavior:
- exam_cram: one-shot; terse coverage table, short candidate bullets by file, and compact final objectives.
- deep_mastery: interactive; labeled sections for coverage, candidates by file, merged objectives, and explicit instructor objectives.
- quick_review: one-shot refresh; compact file / objective-signal / merge-result / explicit-status table plus final list.
- clinical_bridge: stepwise; clinic-facing file / candidate objective / practical focus / merged-target table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves file accounting -> candidate objectives -> final merge and waits.
 |
| M-PRE-012 | Terminology Pretraining | PRIME | Extract the minimum high-yield terms, abbreviations, and short definitions needed to read the topic without getting lost, plus the most important confusable distinctions. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'TerminologyList', 'description': 'Vocabulary or terminology support for terminology pretraining.', 'format': 'bulleted artifact'}; {'name': 'ConfusableTermFlags', 'description': 'Vocabulary or terminology support for terminology pretraining.', 'format': 'bulleted artifact'} | MISSING | failure_mode:Definitions become mini-lessons; failure_mode:Too many low-value terms | operational_stage=PRIME; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-012 (Terminology Pretraining) in the ORIENT stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: TerminologyList and ConfusableTermFlags.
Select the smallest sufficient set of high-yield terms and indispensable abbreviations. For each term, give a concise definition plus one function, state, or context cue. Flag only the few confusable distinctions most likely to derail reading.
Stay source-grounded, non-assessive, and stop before mechanism teaching.
Preset behavior:
- exam_cram: one-shot; bullets; keep only the most test-relevant bottleneck terms; use terse cues and 2-3 critical contrasts.
- deep_mastery: interactive; labeled sections; group terms lightly, allow richer functional cues, and ask one short check before ConfusableTermFlags.
- quick_review: one-shot refresh; assume prior exposure; keep only shaky, easily confused, or easily forgotten terms and skip beginner-level glosses.
- clinical_bridge: stepwise; use a table or tightly labeled sections and tie cues or contrasts to applied relevance, chart language, exam findings, or bedside distinctions.
If no preset is specified, use the default knobs. One-shot returns both outputs in one bounded reply; interactive or stepwise mode moves section by section and waits.
 |
| M-PRE-013 | Big-Picture Orientation Summary | PRIME | Generate a short source-grounded big-picture organizer that states what the material is about, why it matters, and the main organizing idea without crossing into full explanation. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Learner goal for this session (test prep / first exposure / review)', 'required': True}; {'description': 'Prior notes, prior framing line, or prior-session context', 'required': False} -> {'name': 'FrameLine', 'description': 'One-sentence framing artifact that says what the topic is really about and what kind of question it helps answer.', 'format': 'bulleted artifact'}; {'name': 'BigPictureSummary', 'description': 'Short labeled organizer covering what it is, why it matters, and the main organizing idea.', 'format': 'bulleted artifact'}; {'name': 'TeachTargets', 'description': 'One to three next-step concepts or contrasts to teach next.', 'format': 'bulleted artifact'} | MISSING | failure_mode:Overview becomes too explanatory; failure_mode:Overview becomes too vague | operational_stage=PRIME; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-013 (Big-Picture Orientation Summary) in the ORIENT stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: FrameLine, BigPictureSummary, and TeachTargets.
Stay source-grounded, non-assessive, and stop before mechanism teaching.
Preset behavior:
- exam_cram: one-shot; bullets; 1-line FrameLine; 2 summary bullets; close with the likely test angle or confusable boundary.
- deep_mastery: interactive; labeled sections; 3-4 summary lines plus one why-this-structure-matters line; ask one short check before TeachTargets.
- quick_review: one-shot refresh; assume prior exposure; compress the FrameLine and focus on what to reopen, refresh, or re-anchor.
- clinical_bridge: stepwise; use an applied cue table or tightly labeled sections and frame the summary around practical stakes or decision context.
If no preset is specified, use the default knobs. One-shot returns all three outputs in one bounded reply; interactive or stepwise mode moves section by section and waits.
 |
| M-PRE-014 | Ambiguity and Blind-Spot Scan | PRIME | Scan the selected source for the most important ambiguities, unsupported jumps, misconceptions, or traps that TEACH should repair later. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target topic or objective scope', 'required': True}; {'description': 'Prior notes, North Star, or prior-session context', 'required': False} -> {'name': 'BlindSpotList', 'description': 'Short list of source-grounded ambiguities, traps, compressed leaps, or likely misconceptions.', 'format': 'bulleted or tabular list'}; {'name': 'FollowUpTargets', 'description': 'TEACH-facing follow-up targets translated from the blind spots.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Findings become vague complaints; failure_mode:Scan turns into diagnosis of the learner | operational_stage=PRIME; guidance_level=medium; delivery_mode=one_shot; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-PRE-014 (Ambiguity and Blind-Spot Scan) in the PRIME stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: BlindSpotList and FollowUpTargets.
Scan the source for compressed leaps, unclear transitions, likely misconceptions, or traps; select the 2-4 highest-yield ones; and translate them into TEACH-facing follow-up targets. Keep it source-grounded, non-assessive, and non-diagnostic; do not resolve the blind spots yet and do not turn the scan into vague complaints.
Preset behavior:
- exam_cram: one-shot; 2 blind spots and one terse follow-up target for each.
- deep_mastery: interactive; labeled sections for blind spots, why each is risky, and follow-up targets.
- quick_review: one-shot refresh; compact blind-spot / source-cue / follow-up-target table.
- clinical_bridge: stepwise; clinic-facing trap / clinical-risk / follow-up-target table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves blind spots -> follow-up targets and waits.
 |
| M-REF-001 | Error Autopsy | REFERENCE | Review recent retrieval misses in a four-column autopsy: what I said, what is correct, why I confused it, and what cue will prevent the error next time. | {'description': 'List of errors from recent retrieval practice', 'required': True}; {'description': 'Correct answers for each error', 'required': True}; {'description': 'Reference materials for deep understanding', 'required': True}; {'description': 'Error autopsy template (4-column format)', 'required': True} -> {'name': 'Completed error autopsy table (all 4 columns for every error)', 'description': 'Four-column analysis of what was said, what is correct, why the confusion happened, and what cue prevents recurrence.', 'format': 'structured table'}; {'name': 'Root cause analysis for each error (Column 3 filled with specific conceptual confusion)', 'description': 'Specific explanation of the misconception, interference pattern, or reasoning failure behind each miss.', 'format': 'structured response'}; {'name': 'Discrimination cues created (Column 4 with actionable prevention strategy)', 'description': 'Specific prevention cues that can be reused in later retrieval or review.', 'format': 'structured response'}; {'name': 'Anki card candidates identified from high-value errors', 'description': 'Draft card candidates generated from the most reusable or exam-relevant autopsies.', 'format': 'formatted study artifact'} | MISSING | failure_mode:Artifact becomes a loose discussion transcript; failure_mode:Source language gets lost; failure_mode:The learner tries to use the block as a quiz | operational_stage=REFERENCE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-REF-001 (Error Autopsy) in the REFERENCE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Completed error autopsy table, Root cause analysis, Discrimination cues, and Anki card candidates.
Turn recent misses into a 4-column autopsy that preserves the wrong answer, records the correct answer, explains the confusion, and ends with a concrete prevention cue. Keep it artifact-first and do not turn the block into a quiz or lecture.
Preset behavior:
- exam_cram: one-shot; compact table for the top 2-3 errors; terse cue lines; one card candidate.
- deep_mastery: interactive; full table; cross-error pattern summary; multiple card candidates.
- quick_review: one-shot refresh; compact table plus short pattern list.
- clinical_bridge: stepwise; prevention cues phrased as clinical discriminators and wrong-move prevention.
If no preset is specified, use the default knobs. One-shot returns the full autopsy artifact in one bounded reply; interactive or stepwise mode moves errors -> table -> cues -> cards and waits.
 |
| M-REF-002 | Mastery Loop | REFERENCE | Re-study items missed during retrieval, then immediately re-test them in short successive relearning loops until the misses are closed or clearly flagged for more work. | {'description': 'List of missed items from retrieval practice', 'required': True}; {'description': 'Source materials for re-study', 'required': True}; {'description': 'Testing mechanism (flashcards, quiz, or tutor)', 'required': True}; {'description': 'Loop tracker (to count iterations)', 'required': True} -> {'name': 'Mastery achieved on all targeted items (or partial progress with time noted)', 'description': 'Restudy-and-retest log showing which missed items were repaired and which still need another pass.', 'format': 'structured response'}; {'name': 'Loop count per item (difficulty metric)', 'description': 'Per-item loop counts that show how much relearning effort each target required.', 'format': 'structured response'}; {'name': 'Weak anchor list (items needing 3+ loops)', 'description': 'Compact list of items that remained weak enough to justify earlier or denser review.', 'format': 'bulleted or tabular list'}; {'name': 'Updated spacing recommendations based on loop performance', 'description': 'Next-review recommendations derived from the observed loop counts and weak-anchor flags.', 'format': 'structured response'} | MISSING | failure_mode:Artifact becomes a loose discussion transcript; failure_mode:Source language gets lost; failure_mode:The learner tries to use the block as a quiz | operational_stage=REFERENCE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-REF-002 (Mastery Loop) in the REFERENCE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Mastery achieved, Loop count per item, Weak anchor list, and Updated spacing recommendations.
Run a successive relearning loop on recent misses by restudying briefly, re-testing immediately, and tracking how many loops each item needs. Keep the output reusable and do not turn the block into a lecture.
Preset behavior:
- exam_cram: one-shot; terse loop log; focus on top misses; one early-review recommendation.
- deep_mastery: interactive; fuller loop ledger; repeated-success check for weak items; richer spacing guidance.
- quick_review: one-shot refresh; compact per-item mastery table.
- clinical_bridge: stepwise; weak anchors framed around clinically dangerous or action-relevant misses.
If no preset is specified, use the default knobs. One-shot returns the full mastery artifact in one bounded reply; interactive or stepwise mode moves misses -> loops -> weak anchors -> spacing and waits.
 |
| M-REF-003 | One-Page Anchor | REFERENCE | Build a single-page reference anchor containing minimal definitions, decision rules, canonical examples, near-misses, and traps. | {'description': 'PrioritySet', 'required': True}; {'description': 'Source-grounded notes', 'required': True} -> {'name': 'One-Page Anchor (definitions, decision rules, examples, near-misses, traps — all present)', 'description': 'A compact reference artifact with the minimum definitions, rules, examples, near-misses, and traps needed for later retrieval.', 'format': 'formatted study artifact'}; {'name': 'Trap list and near-miss set (3 canonical + 3 near-miss examples minimum)', 'description': 'A reusable reference artifact that supports later retrieval for a one-page anchor that compresses definitions, decision rules, canonical examples, near-misses, and traps into one reference artifact.', 'format': 'bulleted or tabular list'} | MISSING | failure_mode:Artifact becomes a loose discussion transcript; failure_mode:Source language gets lost; failure_mode:The learner tries to use the block as a quiz | operational_stage=REFERENCE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=table; explanation_density=focused | You are running M-REF-003 (One-Page Anchor) in the CONSOLIDATE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: One-Page Anchor and Trap list with near-misses.
Build one compact, reusable artifact with minimal definitions, decision rules, 3 canonical examples, 3 near-misses, and trap notes. Keep the structure deterministic, preserve source wording when it is the cue, and do not drift into teaching or quizzing.
Preset behavior:
- exam_cram: one-shot; terse bullets; one-line rules and definitions; minimal trap list for last-minute scan.
- deep_mastery: interactive; labeled sections; slightly richer cue wording and explicit section-by-section confirmation.
- quick_review: one-shot refresh; keep only shaky rules, confusable items, and the highest-yield traps.
- clinical_bridge: stepwise; use a compact cue table with rule, example, near-miss, and consequence language.
If no preset is specified, use the default knobs. One-shot returns the full anchor in one bounded reply; interactive or stepwise mode moves through definitions, rules, and examples in order and waits.
 |
| M-REF-004 | Question Bank Seed | REFERENCE | Generate a mode-tagged seed bank of 10-20 retrieval questions from objectives and anchor artifacts. | {'description': 'Objectives', 'required': True}; {'description': 'One-Page Anchor', 'required': True}; {'description': 'Assessment mode selector', 'required': True} -> {'name': 'Question Bank Seed (10-20 items, each mode-tagged and objective-tagged)', 'description': 'A tagged retrieval-question bank that can be reused later for practice or deck construction.', 'format': 'bulleted or tabular list'}; {'name': 'Coverage check draft (confirming all objectives have at least one question)', 'description': 'Coverage check showing whether every objective received at least one tagged question.', 'format': 'structured response'} | MISSING | failure_mode:Artifact becomes a loose discussion transcript; failure_mode:Source language gets lost; failure_mode:The learner tries to use the block as a quiz | operational_stage=REFERENCE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=table; explanation_density=focused | You are running M-REF-004 (Question Bank Seed) in the CONSOLIDATE stage.
Use only the loaded source and learner context. Ask only for missing required inputs.
Produce: Question Bank Seed and Coverage check draft.
Build a 10-20 item mode-tagged, objective-tagged question bank from the current objectives and anchor artifacts. Keep it source-grounded, reusable, and deterministic; include some application or confusable items, preserve source wording where it helps retrieval, and do not turn generation into live quizzing.
Preset behavior:
- exam_cram: one-shot; 10-12 terse bullet items; minimal coverage check.
- deep_mastery: interactive; 16-20 mixed-depth items; explicit objective-by-objective coverage review.
- quick_review: one-shot refresh; 10-14 compact table rows focused on shaky or high-yield objectives.
- clinical_bridge: stepwise; 12-16 applied or confusable questions with a coverage table emphasizing real-world discriminators.
If no preset is specified, use the default knobs. One-shot returns the full seed artifact in one bounded reply; interactive or stepwise mode moves draft -> tag -> coverage check and waits.
 |
| M-RET-001 | Timed Brain Dump | RETRIEVE | Close materials. Set timer. Write everything you remember about the topic. No peeking. Compare after. Timed constraint adds desirable difficulty. | {'description': 'Topic or concept to recall', 'required': True}; {'description': 'Blank paper or text area', 'required': True}; {'description': 'Timer (5 min recommended)', 'required': True}; {'description': 'Reference materials (closed during recall, opened for comparison)', 'required': True} -> {'name': 'Free recall dump with gaps marked', 'description': 'A raw recall transcript with gaps marked, followed by comparison notes and gap repair.', 'format': 'free-response text'}; {'name': 'Accuracy assessment (correct vs incorrect items)', 'description': 'A structured output for a timed free-recall dump that exposes what the learner can retrieve cold and what still needs repair.', 'format': 'structured response'}; {'name': 'Gap list (missing items identified)', 'description': 'A structured output for a timed free-recall dump that exposes what the learner can retrieve cold and what still needs repair.', 'format': 'bulleted or tabular list'}; {'name': 'RSR percentage estimate', 'description': 'A structured output for a timed free-recall dump that exposes what the learner can retrieve cold and what still needs repair.', 'format': 'structured response'} | MISSING | failure_mode:Comparison happens too early; failure_mode:Materials are open during recall; failure_mode:No attempt is made | operational_stage=RETRIEVE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-RET-001 (Timed Brain Dump) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Free recall dump with gaps marked, Accuracy assessment, Gap list, and RSR percentage estimate.
Run one timed closed-note dump before any comparison. Keep the attempt window clean, mark gaps instead of teaching through them, then compare against the source only after the timer ends.
Preset behavior:
- exam_cram: one-shot; 3-minute dump; terse bullets; one repair target.
- deep_mastery: interactive; full-cap dump; verbatim recall plus fuller comparison and ranked repair list.
- quick_review: one-shot refresh; compact dump plus correct-partial-missed table and quick RSR.
- clinical_bridge: stepwise; applied recall focused on signs, actions, and discriminators with a handoff-style miss table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves dump -> compare -> repair and waits. |
| M-RET-002 | Sprint Quiz | RETRIEVE | Rapid-fire Q&A with Tutor. 10-15 questions in 5 min. Track accuracy for RSR. | {'description': 'Topic or concept set for quiz', 'required': True}; {'description': 'Tutor AI (or pre-made question set)', 'required': True}; {'description': 'Timer (5 min recommended)', 'required': True}; {'description': 'Scoring tracker (correct/incorrect tally)', 'required': True} -> {'name': 'RSR percentage (correct/total)', 'description': 'A structured output for a sprint quiz that pressures short-answer retrieval and records accuracy plus latency for RSR tracking.', 'format': 'structured response'}; {'name': 'List of missed questions with correct answers', 'description': 'A structured output for a sprint quiz that pressures short-answer retrieval and records accuracy plus latency for RSR tracking.', 'format': 'bulleted or tabular list'}; {'name': 'Weak anchor flags (uncertain but correct items)', 'description': 'A compact reference artifact with the minimum definitions, rules, examples, near-misses, and traps needed for later retrieval.', 'format': 'formatted study artifact'}; {'name': 'Topics needing re-encoding', 'description': 'A structured output for a sprint quiz that pressures short-answer retrieval and records accuracy plus latency for RSR tracking.', 'format': 'structured response'} | MISSING | failure_mode:Comparison happens too early; failure_mode:Materials are open during recall; failure_mode:No attempt is made | operational_stage=RETRIEVE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-RET-002 (Sprint Quiz) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: RSR percentage, List of missed questions with correct answers, Weak anchor flags, and Topics needing re-encoding.
Run a short closed-note quiz with attempt-first answers, then score it cleanly and route from the pattern. Keep it fast, do not teach during the quiz, and flag uncertain correct answers separately from stable wins.
Preset behavior:
- exam_cram: one-shot; 10 questions; terse bullets; only the biggest misses and weak anchors.
- deep_mastery: interactive; 15 questions; fuller per-item trace and richer routing analysis.
- quick_review: one-shot refresh; 10-12 questions; compact score table plus one route call.
- clinical_bridge: stepwise; applied prompts or mini-scenarios with misses and route decisions in a short table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves quiz -> scoring -> routing and waits. |
| M-RET-003 | Fill-in-Blank | RETRIEVE | Review notes with key terms blanked out. Fill from memory. Targets specific vocabulary recall. | {'description': 'Notes or text with key terms identified', 'required': True}; {'description': 'Cloze deletion tool (or manually blanked printout)', 'required': True}; {'description': 'Answer key for verification', 'required': True} -> {'name': 'Completed cloze exercise', 'description': 'A cloze response set showing which blanks were filled correctly and which need another pass.', 'format': 'structured response'}; {'name': 'Accuracy count (correct/total blanks)', 'description': 'A structured output for a fill-in-the-blank recall block that targets exact vocabulary and small but important wording gaps.', 'format': 'structured response'}; {'name': 'Miss list for targeted review', 'description': 'A structured output for a fill-in-the-blank recall block that targets exact vocabulary and small but important wording gaps.', 'format': 'bulleted or tabular list'}; {'name': 'Second-pass improvement rate', 'description': 'A structured output for a fill-in-the-blank recall block that targets exact vocabulary and small but important wording gaps.', 'format': 'structured response'} | MISSING | failure_mode:Comparison happens too early; failure_mode:Materials are open during recall; failure_mode:No attempt is made | operational_stage=RETRIEVE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-RET-003 (Fill-in-Blank) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Completed cloze exercise, Accuracy count, Miss list, and Second-pass improvement rate.
Run a closed-note cloze pass that forces an answer before any check. Keep each blank atomic, check only after the attempt, and use the second pass to see whether the miss was repaired.
Preset behavior:
- exam_cram: one-shot; 8-10 blanks; terse bullets; short miss list.
- deep_mastery: interactive; 12-15 blanks; explicit first-pass and second-pass scoring plus fuller improvement readout.
- quick_review: one-shot refresh; compact cloze table with first-pass, second-pass, and carry-forward columns.
- clinical_bridge: stepwise; applied cue-to-action blanks with misses organized in a short finding-to-fix table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves first pass -> check -> second pass and waits. |
| M-RET-004 | Mixed Practice | RETRIEVE | Interleave questions from 2-3 different topics in a single retrieval block. Builds discrimination and prevents blocked-practice illusion. Based on interleaving research (Rohrer et al.). | {'description': '2-3 different topics for interleaving', 'required': True}; {'description': 'Question bank or Tutor AI covering all topics', 'required': True}; {'description': 'Timer (10 min recommended)', 'required': True}; {'description': 'Randomization method (shuffle cards, AI random selection)', 'required': True} -> {'name': 'Overall accuracy across all topics', 'description': 'A structured output for mixed retrieval practice that interleaves two or three topics to build discrimination and reduce blocked-practice illusion.', 'format': 'structured response'}; {'name': 'Per-topic accuracy breakdown', 'description': 'A structured output for mixed retrieval practice that interleaves two or three topics to build discrimination and reduce blocked-practice illusion.', 'format': 'structured response'}; {'name': 'Confusion matrix (which topics got mixed up)', 'description': 'A structured output for mixed retrieval practice that interleaves two or three topics to build discrimination and reduce blocked-practice illusion.', 'format': 'structured response'}; {'name': 'Discrimination insights (cues that distinguish topics)', 'description': 'A structured output for mixed retrieval practice that interleaves two or three topics to build discrimination and reduce blocked-practice illusion.', 'format': 'structured response'} | MISSING | failure_mode:Comparison happens too early; failure_mode:Materials are open during recall; failure_mode:No attempt is made | operational_stage=RETRIEVE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-RET-004 (Mixed Practice) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Overall accuracy, Per-topic accuracy breakdown, Confusion matrix, and Discrimination insights.
Run an interleaved closed-note retrieval block across 2-3 topics. Score both the answer and the topic classification, then use the confusion pattern to decide what needs repair.
Preset behavior:
- exam_cram: one-shot; 2 topics; short mixed set; terse bullets and one confusion cue.
- deep_mastery: interactive; 3 topics; longer mixed set; fuller confusion matrix and topic-level insights.
- quick_review: one-shot refresh; compact item-by-item confusion table.
- clinical_bridge: stepwise; applied scenarios from confusable domains with a short routing matrix.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves set -> scoring -> confusion review and waits. |
| M-RET-005 | Variable Retrieval | RETRIEVE | Retrieve the same concept in 3 different formats: (1) free recall, (2) application question, (3) compare/contrast. Varied retrieval contexts build more flexible memory traces. | {'description': 'Single concept or topic to retrieve', 'required': True}; {'description': 'Three retrieval format prompts (free recall, application, compare/contrast)', 'required': True}; {'description': 'Reference materials for verification (closed during retrieval)', 'required': True} -> {'name': 'Three retrieval outputs (free recall, application, compare/contrast)', 'description': 'A structured output for variable retrieval that asks for the same concept in multiple formats so memory traces become more flexible.', 'format': 'structured response'}; {'name': 'Accuracy assessment for each format', 'description': 'A structured output for variable retrieval that asks for the same concept in multiple formats so memory traces become more flexible.', 'format': 'structured response'}; {'name': 'Difficulty ranking of formats', 'description': 'A structured output for variable retrieval that asks for the same concept in multiple formats so memory traces become more flexible.', 'format': 'structured response'}; {'name': 'Flexibility gap identification', 'description': 'A structured output for variable retrieval that asks for the same concept in multiple formats so memory traces become more flexible.', 'format': 'structured response'} | MISSING | failure_mode:Comparison happens too early; failure_mode:Materials are open during recall; failure_mode:No attempt is made | operational_stage=RETRIEVE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-RET-005 (Variable Retrieval) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Three retrieval outputs, Accuracy assessment for each format, Difficulty ranking of formats, and Flexibility gap identification.
Run the same concept through multiple retrieval formats without teaching between them. Hold the target concept steady, vary the prompt form, and use the pattern to find brittle knowledge.
Preset behavior:
- exam_cram: one-shot; one concept; three short formats; terse bullets and hardest-format callout.
- deep_mastery: interactive; one or two concepts; explicit three-format comparison plus fuller repair targets.
- quick_review: one-shot refresh; compact side-by-side format table.
- clinical_bridge: stepwise; recall, applied decision, and contrast prompts with failures organized in a short handoff table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves format 1 -> format 2 -> format 3 -> comparison and waits. |
| M-RET-006 | Adversarial Drill | RETRIEVE | Run near-miss adversarial prompts that force distinction between confusable concepts under low support. | {'description': 'Confusable pairs from Spine or ErrorLog', 'required': True}; {'description': 'Question Bank Seed', 'required': True} -> {'name': 'Adversarial near-miss results with discrimination accuracy', 'description': 'A structured output for an adversarial drill that uses near-miss prompts to force distinctions between confusable concepts under low support.', 'format': 'structured log'}; {'name': 'ErrorLog updates (error_type and fix_applied per miss)', 'description': 'A structured output for an adversarial drill that uses near-miss prompts to force distinctions between confusable concepts under low support.', 'format': 'structured log'} | MISSING | failure_mode:Comparison happens too early; failure_mode:Materials are open during recall; failure_mode:No attempt is made | operational_stage=RETRIEVE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-RET-006 (Adversarial Drill) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Adversarial near-miss results with discrimination accuracy and ErrorLog updates.
Run a low-support near-miss drill that forces the learner to name the discriminator before any feedback. Keep it diagnostic, log misses cleanly, and do not rescue the attempt with teaching.
Preset behavior:
- exam_cram: one-shot; 5 pairs; terse bullets; only the most dangerous confusions and fix tags.
- deep_mastery: interactive; larger confusable set; explicit per-pair outcomes and fuller ErrorLog-ready table.
- quick_review: one-shot refresh; compact confusion grid.
- clinical_bridge: stepwise; clinical or action-level near misses organized in a short risk-and-fix matrix.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves pairs -> scoring -> logging and waits. |
| M-RET-007 | Timed Sprint Sets | RETRIEVE | Execute timed retrieval sprints and record latency per item to expose speed bottlenecks. | {'description': 'Question Bank Seed', 'required': True}; {'description': 'Timer', 'required': True} -> {'name': 'Timed sprint result set with per-item accuracy', 'description': 'A timed practice log that pairs accuracy with item latency and speed bottlenecks.', 'format': 'structured response'}; {'name': 'Latency log (time_to_answer per item)', 'description': 'A structured output for timed retrieval sprints that surface speed bottlenecks and item-level latency patterns.', 'format': 'structured log'}; {'name': 'ErrorLog updates (misses and speed failures tagged)', 'description': 'A structured output for timed retrieval sprints that surface speed bottlenecks and item-level latency patterns.', 'format': 'structured log'} | MISSING | failure_mode:Comparison happens too early; failure_mode:Materials are open during recall; failure_mode:No attempt is made | operational_stage=RETRIEVE; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-RET-007 (Timed Sprint Sets) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Timed sprint result set with per-item accuracy, Latency log, and ErrorLog updates.
Run short timed retrieval rounds that capture both correctness and response speed. Keep the rounds brief, force an answer before feedback, and log slow answers as fluency problems rather than hiding them inside accuracy totals.
Preset behavior:
- exam_cram: one-shot; two short rounds; terse bullets; only the biggest speed failures and misses.
- deep_mastery: interactive; three rounds; explicit per-item latency and fuller fluency-risk readout.
- quick_review: one-shot refresh; compact round table with accuracy, latency, and failure tags.
- clinical_bridge: stepwise; quick applied prompts with misses and slow answers in a short triage matrix.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves round -> scoring -> logging and waits. |
| M-TEA-001 | Story Spine | MISSING | Teach a sequence or pathway as a compact story with a beginning state, trigger, causal progression, consequence, and application breakpoint. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target concept, process, or comparison to teach', 'required': True}; {'description': 'Learner familiarity signal or prerequisite anchor', 'required': False} -> {'name': 'Story spine', 'description': 'Structured artifact that captures the key story spine relationships.', 'format': 'ordered bullets'}; {'name': 'Ordered step list', 'description': 'Learner-facing teaching artifact for story spine.', 'format': 'bulleted artifact'}; {'name': 'Clinical breakpoint', 'description': 'Learner-facing teaching artifact for story spine.', 'format': 'bulleted artifact'}; {'name': 'Source-backed mechanism restatement', 'description': 'Learner-facing teaching artifact for story spine.', 'format': 'bulleted artifact'} | MISSING | failure_mode:Learner remembers story but not real terms; failure_mode:Story becomes decorative and loses the mechanism | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-TEA-001 (Story Spine) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Story spine, Ordered step list, Clinical breakpoint, and Source-backed mechanism restatement.
Teach one bounded pathway by stating the beginning state and trigger, walking the causal progression, naming the consequence, adding one breakpoint, and translating back to source terms.
Preset behavior:
- exam_cram: one-shot; terse story beats plus one breakpoint and one formal restatement.
- deep_mastery: interactive; labeled sections with explicit causal transitions before the final formal restatement.
- quick_review: one-shot refresh; compact Beat \| Why it leads \| Formal term table.
- clinical_bridge: stepwise; applied sequence grid with trigger, consequence, breakpoint, and practical implication.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves start state -> sequence -> breakpoint -> formal restatement and waits. |
| M-TEA-002 | Confusable Contrast Teach | MISSING | Teach two confusable concepts side-by-side by naming the shared bucket, the key difference, the signature clue, and the classic trap. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target concept, process, or comparison to teach', 'required': True}; {'description': 'Learner familiarity signal or prerequisite anchor', 'required': False} -> {'name': 'Shared bucket statement', 'description': 'Learner-facing teaching artifact for confusable contrast teach.', 'format': 'bulleted artifact'}; {'name': 'Key difference statement', 'description': 'Learner-facing teaching artifact for confusable contrast teach.', 'format': 'bulleted artifact'}; {'name': 'Signature clues', 'description': 'Learner-facing teaching artifact for confusable contrast teach.', 'format': 'bulleted artifact'}; {'name': 'Classic trap', 'description': 'Learner-facing teaching artifact for confusable contrast teach.', 'format': 'bulleted artifact'}; {'name': 'Mini application contrast', 'description': 'Learner-facing teaching artifact for confusable contrast teach.', 'format': 'two-column table or tightly grouped bullets'} | MISSING | failure_mode:Contrast stays too abstract; failure_mode:Too many differences create noise | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-TEA-002 (Confusable Contrast Teach) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Shared bucket statement, Key difference statement, Signature clues, Classic trap, and Mini application contrast.
Teach two confusable concepts by naming the shared bucket, isolating one real discriminator, attaching one signature clue to each side, killing one classic trap, and ending with a short application contrast.
Preset behavior:
- exam_cram: one-shot; terse bullets with one clue per side and one trap.
- deep_mastery: interactive; labeled sections with fuller clue, trap, and application handling.
- quick_review: one-shot refresh; compact discriminator table plus one carry-forward cue.
- clinical_bridge: stepwise; applied contrast grid with cue, likely mistake, and confirming clue columns.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves shared bucket -> discriminator -> clues/trap -> application contrast and waits. |
| M-TEA-003 | Clinical Anchor Mini-Case | MISSING | Use one tiny example scene to show why the concept matters practically without turning the block into a full case drill. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target concept, process, or comparison to teach', 'required': True}; {'description': 'Learner familiarity signal or prerequisite anchor', 'required': False} -> {'name': 'Mini-case scene', 'description': 'Short clinical scenario that anchors the target concept.', 'format': 'short vignette plus takeaways'}; {'name': 'Concept-to-case link', 'description': 'Learner-facing teaching artifact for clinical anchor mini-case.', 'format': 'short vignette plus takeaways'}; {'name': 'Clinical significance statement', 'description': 'Learner-facing teaching artifact for clinical anchor mini-case.', 'format': 'bulleted artifact'}; {'name': 'Overgeneralization boundary', 'description': 'Learner-facing teaching artifact for clinical anchor mini-case.', 'format': 'bulleted artifact'} | MISSING | failure_mode:Case feels detached from the concept; failure_mode:Case is too big and becomes a full reasoning drill | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-TEA-003 (Clinical Anchor Mini-Case) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Mini-case scene, Concept-to-case link, Clinical significance statement, and Overgeneralization boundary.
Teach one bounded concept with one compact clinically relevant scene. State the concept plainly, show one tiny case, tie the scene back to what the concept changes in noticing or action, and end with one boundary on overgeneralizing.
Preset behavior:
- exam_cram: one-shot; 2-3 sentence scene; one-line link, significance, and boundary.
- deep_mastery: interactive; labeled sections; add one brief cue-to-concept-to-action line and pause after the scene before the tie-back.
- quick_review: one-shot refresh; compress the scene to a cue sketch and focus on the link plus the boundary.
- clinical_bridge: stepwise; use a compact cue table with finding, implication, action, and limit language.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves scene -> tie-back -> boundary and waits.
 |
| M-TEA-004 | Modality Switch | MISSING | Choose the best first representation for the concept and switch the explanation into that modality before overload sets in. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target concept, process, or comparison to teach', 'required': True}; {'description': 'Learner familiarity signal or prerequisite anchor', 'required': False} -> {'name': 'Concept type', 'description': 'Learner-facing teaching artifact for modality switch.', 'format': 'bulleted artifact'}; {'name': 'Chosen modality', 'description': 'Learner-facing teaching artifact for modality switch.', 'format': 'bulleted artifact'}; {'name': 'Re-expressed teaching chunk', 'description': 'Learner-facing teaching artifact for modality switch.', 'format': 'bulleted artifact'}; {'name': 'Modality rationale', 'description': 'Learner-facing teaching artifact for modality switch.', 'format': 'bulleted artifact'} | MISSING | failure_mode:Too many modalities at once; failure_mode:Wrong modality chosen for the concept | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=minimal; output_layout=labeled_sections; explanation_density=focused | You are running M-TEA-004 (Modality Switch) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Concept type, Chosen modality, Re-expressed teaching chunk, and Modality rationale.
Teach one bounded concept by identifying its type, choosing the lowest-friction lead representation, re-expressing the chunk in that modality, and stating why the switch helps. Keep one modality dominant and add a second only if it resolves a real bottleneck.
Preset behavior:
- exam_cram: one-shot; choose one dominant representation only; output terse bullets, a mini flow, or a two-column table plus a one-line rationale.
- deep_mastery: interactive; use labeled sections; start with one lead modality, pause after the first switch, and add one complementary second representation only if needed.
- quick_review: one-shot refresh; compress concept typing and rationale and convert the chunk into the fastest discriminating format, usually a table or terse procedure bullets.
- clinical_bridge: stepwise; use a cue table or finding-to-action grid, with optional one-line scene-setting, so the switch is tied to noticing or action.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves concept type -> modality choice -> re-expression -> rationale and waits.
 |
| M-TEA-005 | Jingle / Rhyme Hook | MISSING | Compress a fixed ordered list or stable sequence into a short jingle or rhyme after the learner understands the meaning of the items. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target concept, process, or comparison to teach', 'required': True}; {'description': 'Learner familiarity signal or prerequisite anchor', 'required': False} -> {'name': 'Sequence statement', 'description': 'Learner-facing teaching artifact for jingle / rhyme hook.', 'format': 'bulleted artifact'}; {'name': 'Jingle or rhyme hook', 'description': 'Learner-facing teaching artifact for jingle / rhyme hook.', 'format': 'one-line hook plus recall cue'}; {'name': 'Hook-to-sequence map', 'description': 'Structured artifact that captures the key jingle / rhyme hook relationships.', 'format': 'structured map or nested bullets'}; {'name': 'Distortion warning', 'description': 'Learner-facing teaching artifact for jingle / rhyme hook.', 'format': 'bulleted artifact'} | MISSING | failure_mode:Hook comes before meaning; failure_mode:Hook distorts the order or content | operational_stage=MISSING; output_format=bullets; guidance_level=medium; artifact_type=notes | You are a study tutor running M-TEA-005 (Jingle / Rhyme Hook) in the TEACH stage.
ROLE: You are a careful, supportive tutor. Your job is to run Jingle / Rhyme Hook exactly as specified and keep the output faithful, bounded, and useful.
OBJECTIVE: Compress a fixed ordered list or stable sequence into a short jingle or rhyme after the learner understands the meaning of the items. Use it to teach one bounded concept by turning the source into a learner-facing bridge that preserves the real mechanism.
SCOPE: Compress a fixed ordered list or stable sequence into a short jingle or rhyme after the learner understands the meaning of the items.
RULES:
- Do not turn the method into a test or quiz — because TEACH methods should build understanding, not create avoidable performance pressure.
- Stay faithful to the source and keep the chunk bounded — because The learner needs a clear bridge, not an unbounded lecture.
- Do not assess or score the learner — because This method is for orientation and teaching, not grading.
- Require the relevant objective or context before running — because The method needs a bounded target to stay useful.

OUTPUTS TO PRODUCE:
1. Sequence statement — Learner-facing teaching artifact for jingle / rhyme hook. (bulleted artifact)
2. Jingle or rhyme hook — Learner-facing teaching artifact for jingle / rhyme hook. (one-line hook plus recall cue)
3. Hook-to-sequence map — Structured artifact that captures the key jingle / rhyme hook relationships. (structured map or nested bullets)
4. Distortion warning — Learner-facing teaching artifact for jingle / rhyme hook. (bulleted artifact)

RUN THE METHOD ONE STEP AT A TIME. Wait for my response before moving to the next step.
STEP 1 — Sequence
- Tutor does: State the sequence and what each step means. Confirm meaning before compression
- Learner does: Listens, tracks the explanation, and responds with the requested cue or check-in.
- Example: Example: "Sequence: State the sequence and what each step means"
- Check: What part feels clearest, and what part still needs one more example?
Then stop and wait.
STEP 2 — Mnemonic Hook
- Tutor does: Build a short rhyme, cadence, or jingle. Keep it brief enough to repeat easily
- Learner does: Listens, tracks the explanation, and responds with the requested cue or check-in.
- Example: Example: "Mnemonic Hook: Build a short rhyme, cadence, or jingle"
- Check: What part feels clearest, and what part still needs one more example?
Then stop and wait.
STEP 3 — Sequence
- Tutor does: Map the hook back to the real sequence. Make the correspondence explicit
- Learner does: Listens, tracks the explanation, and responds with the requested cue or check-in.
- Example: Example: "Sequence: Map the hook back to the real sequence"
- Check: What part feels clearest, and what part still needs one more example?
Then stop and wait.
STEP 4 — Step 4
- Tutor does: Name one distortion risk or simplification limit. Prevent mnemonic drift
- Learner does: Shares the final check-in signal or says what clicked, what is fuzzy, and what should be carried forward.
- Example: Example: "Step 4: Name one distortion risk or simplification limit"
- Check: What part feels clearest, and what part still needs one more example?
Then stop and wait.

STOP CONDITIONS:
- The learner-facing explanation artifact is faithful to Jingle / Rhyme Hook and stays bounded.
- The method includes a concrete bridge, example, or discriminating cue that makes the idea easier to hold.
- The output ends with a clear carry-forward signal instead of drifting into a full lecture.

IF YOU GET STUCK:
If the learner stalls, shrink the chunk, switch to a simpler example or contrast, and then return to the same method. For TEACH, fall back to M-TEA-004 or M-TEA-006.
If the learner is still stuck after one rescue move, shrink the chunk, switch modality, or fall back to the listed fallback method.

GOOD OUTPUT EXAMPLE:
- Sequence statement: a concise, source-faithful artifact that matches the method purpose and stays within scope.
- Keep the response bounded, concrete, and non-assessive unless the method explicitly requires retrieval practice.

DONE WHEN:
You have produced every required output, satisfied the stop conditions, and given a clear carry-forward or next-step cue.

Non-assessment guard:
- This is a TEACH chunk, not an assessment.
- Do not score or quiz the learner during this block; no scored output, no grading. |
| M-TEA-006 | Depth Ladder | MISSING | Explain the same concept in four deliberate passes: like the learner is 4 years old, 10 years old, in high school, and finally at expert/training-level precision. Each rung must preserve the same underlying idea while increasing mechanism, terminology, and precision. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target concept, process, or comparison to teach', 'required': True}; {'description': 'Learner familiarity signal or prerequisite anchor', 'required': False} -> {'name': 'Age4Explanation', 'description': 'Very simple explanation in kid-language using a labeled-section layout, with a tiny story or analogy.', 'format': 'bulleted artifact'}; {'name': 'Age10Explanation', 'description': 'Simpler child-level explanation with basic cause-effect using the same labeled-section layout.', 'format': 'bulleted artifact'}; {'name': 'HighSchoolExplanation', 'description': 'Intermediate explanation with the first real mechanism terms using the same labeled-section layout.', 'format': 'bulleted artifact'}; {'name': 'ExpertLevelExplanation', 'description': 'Domain-appropriate explanation at expert/training-level precision using the same labeled-section layout.', 'format': 'bulleted artifact'}; {'name': 'LadderCarryForwardNotes', 'description': 'What stayed constant and what got more precise across rungs.', 'format': 'ordered bullets'}; {'name': 'RungCheckSignal', 'description': 'Which rung clicked or where the learner started to lose the thread.', 'format': 'bulleted artifact'} | MISSING | failure_mode:A rung has the right content but the wrong layout; failure_mode:Each rung sounds like the same paraphrase with no increase in precision; failure_mode:The Age 4 rung reads like a dense, simplified textbook paragraph; failure_mode:The ladder skips a rung or jumps straight to expert-level explanation | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=adaptive_light; output_layout=labeled_sections; explanation_density=focused | You are running M-TEA-006 (Depth Ladder) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Age4Explanation, Age10Explanation, HighSchoolExplanation, ExpertLevelExplanation, LadderCarryForwardNotes, and RungCheckSignal.
Explain one bounded concept across four rungs. Preserve the same underlying idea while increasing mechanism, terminology, and precision. Every rung must use short labeled sections, and the Age 4 rung must sound like real child-directed language with one tiny story or analogy.
Stay source-faithful, bounded, and non-assessive.
Preset behavior:
- exam_cram: one-shot; keep each rung to 2-3 labeled sections; make LadderCarryForwardNotes terse and test-oriented.
- deep_mastery: interactive; use the fullest 3-5 section rungs; pause after each rung for a short learner check before continuing.
- quick_review: one-shot refresh; compress Age 4 and Age 10 into micro-rungs and put most of the precision into the High School and Expert rungs.
- clinical_bridge: stepwise; keep the same ladder order but make the higher rungs emphasize discriminators, edge cases, and clinical implications in a note-card or table-like layout.
If no preset is specified, use the default knobs. One-shot returns the full ladder in one bounded reply; interactive or stepwise mode moves rung by rung and waits.
 |
| M-TEA-007 | KWIK Lite | MISSING | Run the lightweight live mnemonic slot after the TEACH close artifact and before FULL CALIBRATE using one system-seeded cue plus one learner ownership action. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target concept, process, or comparison to teach', 'required': True}; {'description': 'Learner familiarity signal or prerequisite anchor', 'required': False} -> {'name': 'KWIKLiteSeed', 'description': 'Learner-facing teaching artifact for kwik lite.', 'format': 'bulleted artifact'}; {'name': 'LearnerOwnershipAction', 'description': 'Learner-facing teaching artifact for kwik lite.', 'format': 'bulleted artifact'}; {'name': 'FinalHook', 'description': 'Learner-facing teaching artifact for kwik lite.', 'format': 'one-line hook plus recall cue'}; {'name': 'DistortionGuard', 'description': 'Learner-facing teaching artifact for kwik lite.', 'format': 'bulleted artifact'} | MISSING | failure_mode:Hook becomes too elaborate and turns into full KWIK; failure_mode:Slot is used before meaning is clear | operational_stage=MISSING; output_format=bullets; guidance_level=medium; artifact_type=notes; mnemonic_tier=lite; slot_policy=post_teach_pre_full_calibrate | You are a study tutor running M-TEA-007 (KWIK Lite) in the TEACH stage.
ROLE: You are a careful, supportive tutor. Your job is to run KWIK Lite exactly as specified and keep the output faithful, bounded, and useful.
OBJECTIVE: Run the lightweight live mnemonic slot after the TEACH close artifact and before FULL CALIBRATE using one system-seeded cue plus one learner ownership action. Use it to teach one bounded concept by turning the source into a learner-facing bridge that preserves the real mechanism.
SCOPE: Run the lightweight live mnemonic slot after the TEACH close artifact and before FULL CALIBRATE using one system-seeded cue plus one learner ownership action.
RULES:
- Do not turn the method into a test or quiz — because TEACH methods should build understanding, not create avoidable performance pressure.
- Stay faithful to the source and keep the chunk bounded — because The learner needs a clear bridge, not an unbounded lecture.
- Do not assess or score the learner — because This method is for orientation and teaching, not grading.
- Require the relevant objective or context before running — because The method needs a bounded target to stay useful.

OUTPUTS TO PRODUCE:
1. KWIKLiteSeed — Learner-facing teaching artifact for kwik lite. (bulleted artifact)
2. LearnerOwnershipAction — Learner-facing teaching artifact for kwik lite. (bulleted artifact)
3. FinalHook — Learner-facing teaching artifact for kwik lite. (one-line hook plus recall cue)
4. DistortionGuard — Learner-facing teaching artifact for kwik lite. (bulleted artifact)

RUN THE METHOD ONE STEP AT A TIME. Wait for my response before moving to the next step.
STEP 1 — Opening Step
- Tutor does: Confirm the TEACH close artifact and concept meaning are in place. Do not run this slot if meaning is still unstable
- Learner does: Listens, tracks the explanation, and responds with the requested cue or check-in.
- Example: Example: "Opening Step: Confirm the TEACH close artifact and concept meaning are in place"
- Check: What part feels clearest, and what part still needs one more example?
Then stop and wait.
STEP 2 — Step 2
- Tutor does: Seed one lightweight cue. Use a concise sound, image, phrase, or compression line tied to function
- Learner does: Listens, tracks the explanation, and responds with the requested cue or check-in.
- Example: Example: "Step 2: Seed one lightweight cue"
- Check: What part feels clearest, and what part still needs one more example?
Then stop and wait.
STEP 3 — Step 3
- Tutor does: Capture one learner ownership action. Learner must personalize, tweak, choose, or restate the cue
- Learner does: Listens, tracks the explanation, and responds with the requested cue or check-in.
- Example: Example: "Step 3: Capture one learner ownership action"
- Check: What part feels clearest, and what part still needs one more example?
Then stop and wait.
STEP 4 — Mnemonic Hook
- Tutor does: Record the final hook and one distortion guard. State what the cue helps remember and what it should not distort
- Learner does: Shares the final check-in signal or says what clicked, what is fuzzy, and what should be carried forward.
- Example: Example: "Mnemonic Hook: Record the final hook and one distortion guard"
- Check: What part feels clearest, and what part still needs one more example?
Then stop and wait.

STOP CONDITIONS:
- The learner-facing explanation artifact is faithful to KWIK Lite and stays bounded.
- The method includes a concrete bridge, example, or discriminating cue that makes the idea easier to hold.
- The output ends with a clear carry-forward signal instead of drifting into a full lecture.

IF YOU GET STUCK:
If the learner stalls, shrink the chunk, switch to a simpler example or contrast, and then return to the same method. For TEACH, fall back to M-TEA-004 or M-TEA-006.
If the learner is still stuck after one rescue move, shrink the chunk, switch modality, or fall back to the listed fallback method.

GOOD OUTPUT EXAMPLE:
- KWIKLiteSeed: a concise, source-faithful artifact that matches the method purpose and stays within scope.
- Keep the response bounded, concrete, and non-assessive unless the method explicitly requires retrieval practice.

DONE WHEN:
You have produced every required output, satisfied the stop conditions, and given a clear carry-forward or next-step cue.

Non-assessment guard:
- This is a TEACH chunk, not an assessment.
- Do not score or quiz the learner during this block; no scored output, no grading. |
| M-TEA-008 | Worked Example -> Completion Fade | MISSING | Model one full example or worked solution, then reuse the same task structure with a few steps omitted so the learner fills the missing pieces before full independence. | {'description': 'Source material loaded in chat', 'required': True}; {'description': 'Target concept, process, or comparison to teach', 'required': True}; {'description': 'Learner familiarity signal or prerequisite anchor', 'required': False} -> {'name': 'FullyWorkedExample', 'description': 'Fully worked example that shows the concept in action.', 'format': 'worked example with brief annotations'}; {'name': 'FadePoints', 'description': 'Learner-facing teaching artifact for worked example to completion fade.', 'format': 'bulleted artifact'}; {'name': 'CompletionPrompt', 'description': 'Learner-facing teaching artifact for worked example to completion fade.', 'format': 'bulleted artifact'}; {'name': 'LearnerFilledSteps', 'description': 'Learner-facing teaching artifact for worked example to completion fade.', 'format': 'bulleted artifact'}; {'name': 'FadeDecision', 'description': 'Learner-facing teaching artifact for worked example to completion fade.', 'format': 'bulleted artifact'}; {'name': 'CarryForwardWeakPoint', 'description': 'Learner-facing teaching artifact for worked example to completion fade.', 'format': 'bulleted artifact'} | MISSING | failure_mode:The completion task changes the problem type instead of reusing the same family; failure_mode:The tutor fades too much too early | operational_stage=MISSING; guidance_level=medium; delivery_mode=stepwise; fade_intensity=adaptive_light; output_layout=labeled_sections; explanation_density=focused | You are running M-TEA-008 (Worked Example -> Completion Fade) in the EXPLAIN stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: FullyWorkedExample, FadePoints, CompletionPrompt, LearnerFilledSteps, FadeDecision, and CarryForwardWeakPoint.
Teach one bounded task by showing one full example, marking the critical decision points, fading 1-2 steps in a near-match example, having the learner fill the gaps with brief why-cues, and then deciding whether to deepen the fade or hold scaffold. Stay in the same problem family, remain source-faithful, and do not turn the first fade into a quiz.
Preset behavior:
- exam_cram: one-shot; lean worked example, one omitted late step, terse cue bullets, and a one-line fade decision.
- deep_mastery: interactive; fuller annotations, usually two omitted steps, brief why-cues for each learner-filled step, and an explicit next-fade recommendation.
- quick_review: one-shot refresh; compress the worked example to a skeleton and focus most of the space on FadePoints, CompletionPrompt, and CarryForwardWeakPoint.
- clinical_bridge: stepwise; use a short applied case, frame decision points as discriminators or consequences, and tie FadeDecision to the next practical move.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode stops between phases and waits.
 |

## D) Full Chain Catalog

| chain_id | category | method sequence | default knobs | gates and failure actions |
| --- | --- | --- | --- | --- |
| C-AD-001 | First Exposure | M-PRE-010 -> M-PRE-003 -> M-PRE-006 -> M-GEN-003 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-OVR-002 | class_type=anatomy; stage=first_exposure; energy=high; time_available=40 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-CI-001 | First Exposure | M-PRE-010 -> M-PRE-007 -> M-INT-006 -> M-INT-004 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-OVR-002 | class_type=clinical; stage=first_exposure; energy=high; time_available=45 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-CR-001 | Exam Ramp | M-PRE-010 -> M-PRE-003 -> M-PRE-006 -> M-INT-005 -> M-INT-004 -> M-REF-001 -> M-OVR-002 | class_type=clinical; stage=exam_prep; energy=high; time_available=45 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-DA-001 | First Exposure | M-PRE-010 -> M-PRE-007 -> M-GEN-003 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-HOOK-001 -> M-OVR-002 | class_type=anatomy; stage=first_exposure; energy=high; time_available=40 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-DP-001 | First Exposure | M-PRE-010 -> M-PRE-007 -> M-GEN-005 -> M-GEN-006 -> M-INT-002 -> M-REF-003 -> M-REF-004 -> M-RET-005 -> M-REF-001 -> M-OVR-002 | stage=first_exposure; pass=depth; energy=high; time_available=45 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-EP-001 | Exam Ramp | M-PRE-002 -> M-REF-003 -> M-REF-004 -> M-RET-004 -> M-INT-004 -> M-REF-001 -> M-OVR-002 | stage=exam_prep; energy=high; time_available=35 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-FE-001 | First Exposure | M-PRE-010 -> M-PRE-008 -> M-PRE-009 -> M-CAL-001 -> M-INT-001 -> M-REF-003 -> M-CAL-002 -> M-CAL-003 -> M-HOOK-001 -> M-REF-004 -> M-RET-001 -> M-RET-006 -> M-RET-007 -> M-OVR-002 -> M-OVR-003 | stage=first_exposure; energy=high; time_available=55 | Gates=prime_artifacts_present; micro_calibrate_before_teach; teach_chunk_delivered_when_present; teach_close_artifact_ready; full_calibrate_after_teach; mnemonic_after_teach_close_artifact_only; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-FE-MIN | First Exposure | M-PRE-010 -> M-PRE-008 -> M-CAL-001 -> M-TEA-004 -> M-REF-003 -> M-CAL-002 -> M-CAL-003 -> M-RET-001 -> M-OVR-001 | energy=low; retrieval_support=minimal; time_available_min=20; timed=off | Gates=micro_calibrate_before_teach; teach_close_artifact_ready; full_calibrate_after_teach; rsr_accuracy_ge_0.80; FailureActions=inject_reference_targets_before_retrieve; re_run_retrieval_gate_after_insertion |
| C-FE-PRO | First Exposure | M-PRE-010 -> M-PRE-008 -> M-CAL-001 -> M-TEA-001 -> M-ORG-003 -> M-CAL-002 -> M-CAL-003 -> M-REF-003 -> M-INT-005 -> M-RET-007 | energy=high; assessment_mode=procedure; near_miss_intensity=high | Gates=micro_calibrate_before_teach; teach_chunk_delivered_when_present; teach_close_artifact_ready; full_calibrate_after_teach; cascade_misses_eq_0; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-FE-STD | Maintenance | M-PRE-010 -> M-PRE-008 -> M-CAL-001 -> M-GEN-007 -> M-REF-003 -> M-CAL-002 -> M-CAL-003 -> M-ORG-002 -> M-HOOK-001 -> M-REF-004 -> M-RET-007 | energy=medium; near_miss_intensity=low; time_available_min=35; timed=soft | Gates=micro_calibrate_before_teach; teach_chunk_delivered_when_present; teach_close_artifact_ready; full_calibrate_after_teach; mnemonic_after_teach_close_artifact_only; tie_breakers_complete; rsr_accuracy_ge_0.85; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-FINALS-PREP | Exam Ramp | M-PRE-012 -> M-PRE-013 -> M-PRE-010 -> M-TEA-006 -> M-RET-001 -> M-HOOK-002 -> M-OVR-002 | MISSING | Gates=step1_terminology_done; step2_northstar_done; step3_objectives_done; G1_prime_complete; G2_teach_complete; G3_retrieve_pass; G4_encode_complete; G5_overlearn_complete; FailureActions=warn_short_termlist={'kind': 'warn_continue', 'reason': 'Terminology may be too thin; advance but flag in ledger.'}; warn_missing_northstar={'kind': 'warn_continue', 'reason': 'BigPictureSummary present but north-star missing; advance with warning.'}; halt_prime_incomplete={'kind': 'halt', 'reason': 'PRIME composite gate failed — cannot enter TEACH without all three priming artifacts.'}; loop_back_to_prime={'kind': 'loop_to_step', 'target_step': 1, 'max_loops': 1, 'reason': 'TEACH did not land — re-do PRIME for the concept then retry TEACH.'}; loop_back_to_teach={'kind': 'loop_to_step', 'target_step': 4, 'max_loops': 2, 'reason': 'Hard rule from C-FINALS-PREP: RSR < 70% (or HOOK without meaning) routes back to TEACH.'}; warn_card_underflow={'kind': 'warn_continue', 'reason': 'Fewer than 3 atomic cards staged; revisit OVR-002 inputs.'} |
| C-LE-001 | Maintenance | M-PRE-010 -> M-PRE-001 -> M-PRE-004 -> M-REF-003 -> M-REF-004 -> M-RET-003 -> M-OVR-001 | energy=low; time_available=15 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-MR-001 | Consolidation | M-REF-003 -> M-REF-004 -> M-RET-001 -> M-REF-001 -> M-REF-002 -> M-OVR-002 | stage=consolidation; energy=medium; time_available=30 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-PI-001 | First Exposure | M-PRE-010 -> M-PRE-007 -> M-GEN-006 -> M-PRE-005 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-REF-001 | class_type=pathology; stage=first_exposure; energy=high; time_available=45 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-PRIME-ONCE | Maintenance | M-PRE-010 -> M-PRE-012 -> M-PRE-004 -> M-PRE-006 -> M-PRE-013 -> M-PRE-014 | MISSING | Gates={'id': 'materials_complete', 'description': 'All source files listed with full local paths before objective synthesis', 'after_block': 'STEP_0_MATERIALS', 'failure': 'Stop. Get the missing paths or mark [PATH UNKNOWN] explicitly. Do not invent paths.'}; {'id': 'coverage_consistent', 'description': 'SourceCoverageTable rows are internally consistent (no scanned=no with objective signals=yes)', 'after_block': 'M-PRE-010', 'failure': 'Repair coverage rows before continuing'}; {'id': 'terminology_capped', 'description': 'Term list is 8-15 items, lean — not a glossary dump', 'after_block': 'M-PRE-012', 'failure': 'Cut to high-yield only; flag dropped terms'}; {'id': 'map_atomic', 'description': 'Concept map has 3-5 top-level pillars max with clear parent → child structure', 'after_block': 'M-PRE-004', 'failure': 'Compress; do not exceed 5 pillars'}; {'id': 'handoff_complete', 'description': 'Vault handoff includes all 4 sections: instructor objectives, source manifest, image manifest, coverage gaps', 'after_block': 'STEP_8_HANDOFF'}; FailureActions={'condition': 'Coverage table internally inconsistent', 'action': 'Force repair before objective synthesis'}; {'condition': 'More than 15 terms surface', 'action': 'Force cut to 8-15 high-yield; list dropped terms separately'}; {'condition': 'Map exceeds 5 top-level pillars', 'action': 'Re-cluster until 3-5 pillars hold the structure'}; {'condition': 'Source has no explicit instructor objectives', 'action': "Write 'No explicit objectives found in source material' verbatim — do not invent"}; {'condition': 'File path unknown', 'action': 'Write [PATH UNKNOWN] — do not guess'} |
| C-QD-001 | Maintenance | M-PRE-010 -> M-PRE-001 -> M-REF-003 -> M-REF-004 -> M-RET-002 -> M-OVR-001 | stage=review; energy=medium; time_available=15 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-QF-001 | First Exposure | M-PRE-010 -> M-PRE-007 -> M-PRE-004 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-OVR-001 | stage=first_exposure; energy=medium; time_available=20 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-RS-001 | Maintenance | M-PRE-002 -> M-REF-003 -> M-REF-004 -> M-RET-002 -> M-INT-002 -> M-OVR-001 | stage=review; energy=medium; time_available=25 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-STUDY-LOOP | Maintenance | M-TEA-001 -> M-TEA-006 -> M-HOOK-001 -> M-CAL-001 -> M-RET-001 -> M-OVR-002 | MISSING | Gates={'id': 'priming_check', 'description': 'Priming notes visible and complete before TEACH', 'after_block': 'STEP_0_CHECK_IN', 'failure': 'Stop session; complete C-PRIME-ONCE first'}; {'id': 'micro_check_pass', 'description': 'Micro Check accuracy >= 80%', 'after_block': 'M-CAL-001', 'threshold': 80, 'failure': 'Switch to Depth Ladder fallback and re-teach OR re-PRIME if multiple concepts shaky'}; {'id': 'retrieve_pass', 'description': 'RSR >= 70%', 'after_block': 'M-RET-001', 'threshold': 70, 'failure': 'Loop back to TEACH with missed concepts as new target'}; {'id': 'cards_staged', 'description': '3-5 atomic Anki cards drafted', 'after_block': 'M-OVR-002'}; FailureActions={'condition': 'Micro Check accuracy < 80%', 'action': 'Activate Depth Ladder (M-TEA-006) for missed concept; re-run Micro Check'}; {'condition': 'Micro Check < 80% twice', 'action': 'Stop. Re-PRIME the topic with C-PRIME-ONCE (gaps in framework).'}; {'condition': 'RSR < 70%', 'action': 'Loop back to STEP 1 with missed concepts as new TEACH target'}; {'condition': 'Learner cannot recall terms despite understanding', 'action': 'Activate KWIK Hook (M-HOOK-001)'} |
| C-SW-001 | First Exposure | M-PRE-005 -> M-ORG-001 -> M-ORG-002 -> M-REF-003 -> M-REF-004 -> M-RET-002 -> M-OVR-002 | stage=first_exposure; pass=sweep; energy=medium; time_available=30 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-TRY-001 | First Exposure | M-PRE-004 -> M-CAL-001 -> M-TEA-001 -> M-INT-001 -> M-REF-003 -> M-CAL-002 -> M-CAL-003 -> M-GEN-004 -> M-HOOK-001 -> M-ORG-001 -> M-RET-001 -> M-OVR-004 | stage=first_exposure; energy=medium; time_available=45; learner_style=top_down_narrative | Gates=prime_artifacts_present; micro_calibrate_before_teach; teach_chunk_delivered_when_present; teach_close_artifact_ready; full_calibrate_after_teach; mnemonic_after_teach_close_artifact_only; retrieve_after_reference_only; FailureActions=if_micro_calibrate_unstable_reduce_teach_chunk_size; if_full_calibrate_poor_route_to_targeted_encode; substitute_by_error_type_mapping |
| C-TRY-002 | First Exposure | M-PRE-004 -> M-CAL-001 -> M-GEN-007 -> M-INT-001 -> M-REF-003 -> M-CAL-002 -> M-CAL-003 -> M-GEN-004 -> M-HOOK-001 -> M-ORG-001 -> M-RET-001 -> M-OVR-004 | energy=medium; near_miss_intensity=low; time_available_min=50; timed=soft | Gates=prime_artifacts_present; micro_calibrate_before_teach; teach_chunk_delivered_when_present; teach_close_artifact_ready; full_calibrate_after_teach; mnemonic_after_teach_close_artifact_only; retrieve_after_reference_only; tier_exit_allowed; FailureActions=if_micro_calibrate_unstable_reduce_initial_chunk; if_full_calibrate_poor_route_to_targeted_encode; substitute_by_error_type_mapping |
| C-VE-001 | First Exposure | M-PRE-010 -> M-PRE-001 -> M-ORG-001 -> M-ORG-002 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-OVR-001 | stage=first_exposure; energy=high; time_available=40 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |

## E) Knob Dictionary

| knob | allowed values | default | semantics |
| --- | --- | --- | --- |
| artifact_depth | compact; standard; detailed | MISSING | Depth of generated reference artifacts. |
| artifact_type | concept-map; decision-tree; flowchart; notes; table | MISSING | Concrete artifact produced by the method. |
| assessment_mode | classification; mechanism; computation; definition; procedure; spatial; recognition; synthesis | procedure | Target assessment mode for chain routing. |
| best_stage | first_exposure; review; exam_prep; consolidation; session_opening; weekly_reset; any | MISSING | Best learning stage to run the method. |
| class_type | anatomy; physiology; pathology; pharmacology; clinical; general | anatomy | Domain type for chain routing. |
| cognitive_depth | foundational_recall; conceptual_understanding; clinical_application | MISSING | Target cognitive depth for learning objectives. |
| complexity_level | epitome_only; intermediate_outline | MISSING | Complexity of structural output. |
| confidence_scale | HML; h_m_l; one_to_five | MISSING | Scale used for confidence judgments. |
| default_duration_min | range: 1..60 | MISSING | Default duration (minutes) for a method block. |
| delivery_style | direct_statement; inquiry_based_preview | MISSING | How learning objectives are presented. |
| diagram_format | mermaid; ascii; markdown_list | MISSING | Format for generated diagrams. |
| difficulty | low; medium; high | MISSING | Difficulty level for retrieval and interrogation tasks. |
| energy | low; medium; high | high | Expected learner energy for chain matching. |
| energy_cost | low; medium; high | MISSING | Expected learner energy cost to run the method. |
| feedback_style | supportive_synthesis; strict_gap_analysis | MISSING | Style of feedback delivery during priming. |
| feedback_timing | immediate; after_attempt | MISSING | When feedback is given during retrieval practice. |
| guidance_level | low; light; medium; high; case_prompt_only; partial_scaffold; targeted_hint | MISSING | Amount of scaffolding provided during encoding. |
| intensity | low; medium; high | MISSING | Intensity level for overlearning drills. |
| item_count | range: 3..10 | MISSING | Number of items in a calibration or quiz set. |
| learner_style | top_down_narrative; top_down_structured | top_down_narrative | Chain-level learner preference profile used for specialized routing. |
| link_density | low; medium; high | MISSING | Density of cross-links in reference artifacts. |
| map_format | ascii_tree; mermaid; nested_bullets | MISSING | Output format for concept maps. |
| max_duration_min | range: 2..5 | MISSING | Maximum duration in minutes for a calibration task. |
| miscalibration_threshold | range: 0.1..0.4 | MISSING | Threshold for flagging confidence miscalibration. |
| near_miss_intensity | low; high | low | Intensity of near-miss distractors in retrieval. |
| node_cap | range: 6..12 | MISSING | Maximum nodes in a structural extraction output. |
| node_count_cap | range: 4..8 | MISSING | Maximum node count for concept maps. |
| objective_link_required | boolean | MISSING | Whether output must link back to learning objectives. |
| objective_scope | module_all; single_focus | MISSING | Scope of learning objectives coverage. |
| operational_stage | PLAN; ORIENT; PRIME; TEACH; EXPLAIN; CALIBRATE; ENCODE; INTERROGATE; REFERENCE; RETRIEVE; OVERLEARN; CONSOLIDATE | MISSING | Control-plane operational stage. |
| output_format | ascii; ascii_tree; bulleted_spine; bullets; map; markdown_table; table; text | MISSING | Format for method output artifacts. |
| output_mode | nested_list; numbered_spine; markdown_table | MISSING | Output mode for structural methods. |
| pass | sweep; depth | depth | Sweep/depth pass selection. |
| pillar_count | range: 3..5 | MISSING | Number of structural pillars in an outline. |
| priming_depth_mode | basic; schema | MISSING | Depth mode for priming structural extraction. |
| priming_scope | module_all; single_focus | MISSING | Scope of priming questions. |
| probe_count | range: 1..5 | MISSING | Number of probe questions in calibration. |
| representation_format | markdown_tree; mermaid | MISSING | Format for structural representations. |
| retrieval_support | minimal; moderate; full | minimal | Level of retrieval support provided. |
| source_cap | range: 2..3 | MISSING | Maximum number of source references to synthesize. |
| speed_pressure | False; soft; hard | MISSING | Time pressure applied during overlearning drills. |
| stage | first_exposure; review; exam_prep; consolidation | first_exposure | Learning-stage context tag used for chain matching. |
| synthesis_format | hierarchy; comparison_table; hybrid | MISSING | Format for cross-source synthesis output. |
| time_available | range: 5..180 | 45 | Estimated minutes available for chain completion. |
| time_available_min | range: 5..180 | 20 | Estimated minutes available (chain-level override). |
| timed | off; soft; hard | soft | Whether time pressure is applied to retrieval. |
| top_k | range: 3..10 | MISSING | Number of top-priority items to select. |
| verbalization_mode | silent; spoken; written | MISSING | Verbalization channel for self-explanation or think-aloud protocols. |
| weighting_profile | balanced; confidence_heavy; latency_heavy | MISSING | Weighting profile for priority scoring. |

## F) Telemetry Specification

### ErrorLog.csv Schema

| field | type | allowed values | semantics |
| --- | --- | --- | --- |
| topic_id | string | non-empty | Topic identifier for the assessed scope. |
| item_id | string | non-empty | Question or item identifier from assessment artifacts. |
| error_type | enum | Recall; Confusion; Rule; Representation; Procedure; Computation; Speed | Error taxonomy enum (Recall/Confusion/Rule/Representation/Procedure/Computation/Speed). |
| stage_detected | string | non-empty | Control-plane stage where the miss was detected. |
| confidence | enum | H; M; L | Learner confidence tag at attempt time (H/M/L). |
| time_to_answer | number | >= 0 | Observed response latency in seconds. |
| fix_applied | string | non-empty | Mandatory override or remediation action logged after miss. |
| assessment_mode | string | non-empty | Active assessment mode at miss time. |
| chain_id | string | non-empty | Selected chain identifier used for deterministic routing. |
| support_level | enum | high; medium; low | Prompting/scaffold level in effect (high/medium/low). |
| prior_exposure_band | enum | new; intermediate; advanced | Learner prior exposure band (new/intermediate/advanced). |
| selector_policy_version | string | non-empty | Deterministic selector policy version for A/B partitioning and replay. |
| dependency_fix_applied | integer | 0; 1 | 0/1 marker for runtime dependency auto-heal insertion before retrieval. |

### Metric Formulas

| metric | formula | notes |
| --- | --- | --- |
| low-support accuracy | `1 - (low_support_error_count / low_support_attempt_count)` | Attempt count comes from mixed low-support retrieval items; ErrorLog supplies error_count. |
| adversarial accuracy | `1 - (adversarial_error_count / adversarial_attempt_count)` | Adversarial items are mode-tagged in retrieval artifacts (QuestionBankSeed/CoverageCheck). |
| median latency | `median(time_to_answer)` | Computed over retrieve-stage rows in ErrorLog. |
| high-confidence wrong rate | `count(confidence='H') / count(confidence in {'H','M','L'})` | Uses ErrorLog misses; reflects confident errors among logged misses. |
| dependency-fix rate | `sum(dependency_fix_applied) / count(*)` | Share of miss rows that required runtime dependency auto-heal; should trend toward 0 after authoring fixes. |
| expertise-reversal delta | `miss_rate(advanced,high_support) - miss_rate(advanced,low_support)` | Requires attempt-level denominator by support band; positive values indicate over-scaffolding risk for advanced learners. |

## G) Evidence Ledger

| method_id | mechanism | citation(s) | DOI | evidence strength |
| --- | --- | --- | --- | --- |
| M-CAL-001 | calibration; retrieval; metacognitive_monitoring; formative_assessment; diagnostic_pretesting; readiness_signaling | Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Soderstrom and Bjork (2023); Amos and Yao (2024); Pan, Wang, and Zhu (2024) | MISSING | medium |
| M-CAL-002 | metacognitive_monitoring; calibration; formative_assessment; diagnostic_assessment; readiness_signaling; probe_based_routing | Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Amos and Yao (2024); Pan, Wang, and Zhu (2024); Ebrahim, Antink, Andargie, and Barke (2024) | MISSING | medium |
| M-CAL-003 | adaptive_sequencing; error_localization; actionable_feedback; diagnostic_routing; prioritization; triage | Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Clark, Kobrin, Karvonen, and Hirt (2023); Pan, Wang, and Zhu (2024); Bez, Burkart, Tomasik, and Merk (2025) | MISSING | medium |
| M-CAL-004 | metacognitive_monitoring; calibration; schema_assessment | Metcalfe (2017); Rhodes (2019); Confidence judgments in real classroom settings (2011); Cho (2024) | MISSING | medium |
| M-ENC-001 | dual_coding; elaboration; generation; emotional_encoding | Paivio (1991) | MISSING | medium |
| M-ENC-002 | generation; elaboration; desirable_difficulty | Slamecka & Graf (1978) | MISSING | medium |
| M-ENC-003 | dual_coding; retrieval; generation | Wammes et al. (2016) | MISSING | medium |
| M-ENC-004 | generation; elaboration; calibration | Nestojko et al. (2014) | MISSING | medium |
| M-ENC-005 | elaboration; generation | Dunlosky et al. (2013) | MISSING | medium |
| M-ENC-007 | elaboration; generation; calibration; feedback | Chi et al. (1994) | MISSING | medium |
| M-ENC-008 | elaboration; transfer; generation | Kulasegaram et al. (2013) | MISSING | medium |
| M-ENC-009 | MISSING | Novak & Canas (2008) | MISSING | medium |
| M-ENC-010 | discrimination; elaboration; dual_coding | Alfieri et al. (2013) | MISSING | medium |
| M-ENC-011 | elaboration; dual_coding; generation | Winn (1991) | MISSING | medium |
| M-ENC-012 | elaboration; discrimination; transfer | Charlin et al. (2000) | MISSING | medium |
| M-ENC-013 | dual_coding; elaboration; visualization; generation | Dresler et al. (2017) | MISSING | medium |
| M-ENC-014 | elaboration; narrative_encoding; generation | Bower & Winzenz (1970) | MISSING | medium |
| M-ENC-015 | dual_coding; generation; spatial_encoding; motor_encoding | Wammes et al. (2016) | MISSING | medium |
| M-ENC-016 | embodied_cognition; motor_encoding; dual_coding; generation | Kontra et al. (2015) | MISSING | medium |
| M-GEN-001 | generation_effect; elaboration; desirable_difficulty; cue_generation; metacognitive_selection; retrieval_support | Slamecka and Graf (1978); Bertsch, Pesta, Wiscott, and McDaniel (2007); McCurdy, Viechtbauer, Sklenar, Frankenstein, and Leshikar (2020); Tullis and Finley (2018); Tullis and Fraundorf (2022); Mocko, Wagler, and Lesser (2024) | MISSING | medium |
| M-GEN-002 | learning_by_teaching; self_explanation; elaboration; metacognitive_monitoring; retrieval_support; knowledge_building | Roscoe and Chi (2007); Roscoe and Chi (2008); Nestojko, Bui, Kornell, and Bjork (2014); Fiorella and Mayer (2014); Wang, Huang, Zhang, Zhu, and Leng (2024); Cheng (2025) | MISSING | medium |
| M-GEN-003 | learner_generated_drawing; dual_coding; retrieval; generative_learning; spatial_organization; error_highlighting | Van Meter and Garner (2005); Wammes, Meade, and Fernandes (2016); Wammes, Meade, and Fernandes (2018); Wang, Yang, and Kyle Jr. (2023); Xie and Deng (2023); Dechamps, Leopold, and Leutner (2025) | MISSING | medium |
| M-GEN-004 | learner_generated_mapping; dual_coding; spatial_encoding; generative_learning; motor_support; visual_anchoring | Van Meter and Garner (2005); Wammes, Meade, and Fernandes (2016); Wang, Yang, and Kyle Jr. (2023); Van der Weel and Van der Meer (2024); Anastasiou, Wirngo, and Bagos (2024); Hsu and López Ricoy (2025) | MISSING | medium |
| M-GEN-005 | elaborative_interrogation; generation; causal_elaboration; self_explanation; verification; metacognitive_monitoring | Pressley, McDaniel, Turnure, Wood, and Ahmad (1987); Pressley, Symons, McDaniel, Snyder, and Turnure (1988); O'Reilly, Symons, and MacLatchy-Gaudet (1998); Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013); Novak, Bailey, Blinsky, Soffe, Patterson, Ockey, and Jensen (2022); Jáñez, Parra-Domínguez, Gajate Bajo, and Guzmán-Ordaz (2025) | MISSING | medium |
| M-GEN-006 | self_explanation; elaboration; generation; prediction; calibration; metacognitive_monitoring | Chi, De Leeuw, Chiu, and LaVancher (1994); Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013); Bisra, Liu, Nesbit, Salimi, and Winne (2018); Ryan and Koppenhofer (2024); Zhang and Fiorella (2024); Beege and Ploetzner (2025) | MISSING | medium |
| M-GEN-007 | causal_self_explanation; generation; causal_model_building; cognitive_integration; verification; branch_tracking | Kulasegaram, Martimianakis, Mylopoulos, Whitehead, and Woods (2013); Kulasegaram, Manzone, Ku, Skye, Wadey, and Woods (2015); Lisk, Agur, and Woods (2016); Woods, Neville, Levinson, Howey, Oczkowski, and Norman (2006); Woods, Brooks, and Norman (2007); Chamberland and Mamede (2015) | MISSING | medium |
| M-GEN-008 | embodied_cognition; gesture_grounding; enactment; dual_coding; generation; transfer | Kontra, Lyons, Fischer, and Beilock (2015); Alibali and Nathan (2012); Schmidt, Benzing, Wallman-Jones, Mavilidi, Lubans, and Paas (2019); Novack and Goldin-Meadow (2024); Kwon, Brush, Kim, and Seo (2025); Gómez Franco, Badilla-Quintana, Walker, Restrepo, and Glenberg (2025) | MISSING | medium |
| M-GEN-009 | haptic_exploration; embodied_cognition; motor_encoding; dual_coding; generation; contextual_cueing | Lederman and Klatzky (1987); Alibali and Nathan (2012); Rabattu, Debarnot, and Hoyek (2023); Walrod, Boucher, Conroy, McCamey, Hartz, Way, Jonesco, Albrechta, Bockbrader, and Bahner (2019); Koch, Gassner, Gerlach, Festl-Wietek, Hirt, Joos, and Shiozawa (2025); Liu, Zuo, Zhao, and Lu (2025) | MISSING | medium |
| M-HOOK-001 | dual_coding; elaboration; generation; emotional_encoding | Bellezza (1981); Pressley, Levin, and Delaney (1982); Chiu and Hawkins (2023); Mocko, Wagler, and Lesser (2024) | MISSING | medium |
| M-HOOK-002 | dual_coding; elaboration; generation | Bellezza (1981); Pressley, Levin, and Delaney (1982); Chiu and Hawkins (2023); Mocko, Wagler, and Lesser (2024) | MISSING | medium |
| M-HOOK-003 | dual_coding; elaboration; generation | Wallace (1994); Rainey and Larsen (2002); Ludke, Ferreira, and Overy (2014) | MISSING | medium |
| M-HOOK-004 | dual_coding; elaboration; visualization; generation | Bellezza (1981); Dresler et al. (2017); Gross, Rebok, Unverzagt, Willis, and Brandt (2014); Wagner et al. (2021) | MISSING | medium |
| M-HOOK-005 | elaboration; narrative_encoding; generation | Bower and Clark (1969); Santa, Ruskin, and Yio (1973); Hill, Allen, and Gregory (1991); Chong, Proctor, Li, and Blocki (2019) | MISSING | medium |
| M-INT-001 | structure_mapping; analogical_reasoning; transfer; elaboration; relational_reasoning; generation | Gentner (1983); Harrison and Treagust (1993); Richland and McDonough (2010); Alfieri, Nokes-Malach, and Schunn (2013); Richland and Simms (2015) | MISSING | medium |
| M-INT-002 | illness_script_formation; clinical_reasoning; transfer; elaboration; generation; case_based_reasoning | Schmidt and Rikers (2007); Charlin, Boshuizen, Custers, and Feltovich (2007); Keemink, Custers, van Dijk, and ten Cate (2018); Lubarsky, Dory, Audétat, Custers, and Charlin (2020); Delavari, Monajemi, Baradaran, Myint, Yaghmae, and Soltani Arabshahi (2020) | MISSING | medium |
| M-INT-003 | transfer; knowledge_integration; elaboration; analogical_reasoning; schema_abstraction; relational_reasoning | Barnett and Ceci (2002); Richland and Simms (2015); Lehmann, Rott, and Schmidt-Borcherding (2019); Fries, Son, Givvin, et al. (2021); Lehmann (2022) | MISSING | medium |
| M-INT-004 | comparison; discrimination; contrasting_cases; structural_alignment; retrieval_practice; error_correction | Alfieri, Nokes-Malach, and Schunn (2013); Richland and McDonough (2010); Richland and Simms (2015); Loibl, Tillema, Rummel, and van Gog (2020); Blair, Banes, and Martin (2024) | MISSING | medium |
| M-INT-005 | case_based_reasoning; illness_script_formation; diagnostic_reasoning; progressive_disclosure; error_correction; transfer | Schmidt and Rikers (2007); Charlin, Boshuizen, Custers, and Feltovich (2007); Moghadami, Amini, Moghadami, Dalal, and Charlin (2021); Chen (2024); Wang, Jiang, Fu, Gou, Sun, Li, Zhang, Nie, Wang, Zhao, and Zhang (2025); Elhassan, Sieben, Köhler, Joosten-ten Brinke, and Dolmans (2025) | MISSING | medium |
| M-INT-006 | illness_scripts; causal_reasoning; elaboration; knowledge_organization; differential_diagnosis; error_correction | Schmidt and Rikers (2007); Charlin, Boshuizen, Custers, and Feltovich (2007); Keemink, Custers, van Dijk, and ten Cate (2018); Lubarsky, Dory, Audétat, Custers, and Charlin (2020); Delavari, Monajemi, Baradaran, Myint, Yaghmae, and Soltani Arabshahi (2020) | MISSING | medium |
| M-ORG-001 | MISSING | Novak & Canas (2008) | MISSING | medium |
| M-ORG-002 | discrimination; elaboration; dual_coding | Alfieri, Nokes-Malach, and Schunn (2013); Richland and McDonough (2010); Richland and Simms (2015); Loibl, Tillema, Rummel, and van Gog (2020); Blair, Banes, and Martin (2024) | MISSING | medium |
| M-ORG-003 | elaboration; dual_coding; generation | Winn (1991); How the design and complexity of concept maps influence cognitive learning processes (2022); How can procedural flowcharts support the development of mathematics problem-solving skills? (2024); Hsu and Lopez Ricoy (2025) | MISSING | medium |
| M-ORG-004 | elaboration; discrimination; transfer | How to improve the teaching of clinical reasoning: a narrative review and a proposal (2015); Teaching clinical reasoning by making thinking visible (2014); Empirical comparison of three assessment instruments of clinical reasoning capability (2020); Clinical reasoning process with decision justification study (2024) | MISSING | medium |
| M-OVR-001 | formative_assessment; reflection; metacognition; feedback; calibration; action_planning | Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Rodriguez, le Roux, and Melville (2024); MacDermott, Mornah, and MacDermott (2024); Pai (2024) | MISSING | medium |
| M-OVR-002 | distributed_practice; retrieval_practice; generative_encoding; self_testing; cue_design; knowledge_organization | Cepeda, Pashler, Vul, Wixted, and Rohrer (2006); Rohrer and Pashler (2007); Schmidmaier, Ebersbach, Schiller, Hege, Holzer, and Fischer (2011); Lin, McDaniel, and Miyatsu (2018); Pan, Zung, Imundo, Zhang, and Qiu (2023); Wothe, Wanberg, Hohle, Sakher, Bosacker, Khan, Olson, and Satin (2023); Gilbert, Frommeyer, Brittain, Stewart, Turner, Stolfi, and Parmelee (2023) | MISSING | medium |
| M-OVR-003 | distributed_practice; interleaving; retrieval_practice; mixed_problem_selection; scheduling; validation | Cepeda, Pashler, Vul, Wixted, and Rohrer (2006); Rohrer and Pashler (2007); Agarwal, Nunes, and Blunt (2021); Rohrer, Dedrick, Hartwig, and Cheung (2020); Lyle, Bego, Ralston, and Immekus (2022); Bego, Lyle, Ralston, Immekus, Chastain, Haynes, Hoyt, Pigg, Rabin, Scobee, and Starr (2024); Braithwaite and Hall (2024) | MISSING | medium |
| M-OVR-004 | retrieval; generation; metacognition; consolidation; error_detection | Roediger and Karpicke (2006); Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); Carter and Agarwal (2025) | MISSING | medium |
| M-PLAN-001 | goal_setting; self_regulated_learning; strategic_planning; implementation_intentions; spacing; time_management | Locke and Latham (2002); Zimmerman (2002); Panadero (2017); Cepeda, Pashler, Vul, Wixted, and Rohrer (2006); Xu, Li, and Yang (2024) | MISSING | medium |
| M-PLAN-002 | goal_setting; self_regulated_learning; strategic_planning; implementation_intentions; spacing; adaptive_regulation; time_management | Locke and Latham (2002); Zimmerman (2002); Panadero (2017); Cepeda, Pashler, Vul, Wixted, and Rohrer (2006); Kitsantas, Winsler, and Huie (2008); Wirth, Fahr, and Seifried (2024) | MISSING | medium |
| M-PRE-001 | prior_knowledge_activation; schema_activation; organization; readiness_signaling; generative_recall | Dochy, Segers, and Buehl (1999); Hattan, Alexander, and Lupo (2024); van Kesteren, Krabbendam, and Meeter (2018); Brand, Loibl, and Rummel (2025a); Brand, Loibl, and Rummel (2025b) | MISSING | medium |
| M-PRE-002 | prequestioning; prior_knowledge_activation; generation; elaboration; organization; readiness_signaling | Carpenter and Toftness (2017); Pressley, Wood, Woloshyn, Martin, King, and Menke (1990); Pan and Sana (2024); Chan, Lee, and Jia (2024); Hattan, Alexander, and Lupo (2024) | MISSING | medium |
| M-PRE-003 | prior_knowledge_activation; schema_activation; transfer; elaboration; scaffolding; organization | Dochy, Segers, and Buehl (1999); Hattan, Alexander, and Lupo (2024); van Kesteren, Krabbendam, and Meeter (2018); Brand, Loibl, and Rummel (2025a); Brand, Loibl, and Rummel (2025b) | MISSING | medium |
| M-PRE-004 | schema_activation; subsumption; scaffolding; prior_knowledge_activation; organization; text_structure_support | Ausubel (1960); Luiten, Ames, and Ackerson (1980); Hebert, Bohaty, Nelson, and Brown (2016); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2024) | MISSING | medium |
| M-PRE-005 | elaboration; discrimination; scaffolding; prior_knowledge_activation; organization; concept_mapping | Novak and Gowin (1984); Hebert, Bohaty, Nelson, and Brown (2016); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Izci and Acikgoz Akkoc (2024); Hsu and Lopez Ricoy (2025) | MISSING | medium |
| M-PRE-006 | schema_activation; chunking; scaffolding; prior_knowledge_activation; organization; structural_preview | Ausubel (1960); Luiten, Ames, and Ackerson (1980); Voros, Rouet, and Pleh (2011); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2024) | MISSING | medium |
| M-PRE-007 | pretesting; retrieval_attempt; errorful_generation; metacognitive_monitoring; encoding_priming; calibration | Richland, Kornell, and Kao (2009); Glass, Brill, and Ingate (2008); Little and Bjork (2016); Pan and Carpenter (2024); Mera, Dianova, and Marin-Garcia (2025) | MISSING | medium |
| M-PRE-008 | schema_activation; chunking; scaffolding; prior_knowledge_activation; organization; selective_attention | Ausubel (1968); van Kesteren, Krabbendam, and Meeter (2018); Hattan, Alexander, and Lupo (2024); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020); Mehring and Kraft (2024) | MISSING | medium |
| M-PRE-009 | schema_activation; integration; scaffolding; prior_knowledge_activation; organization; multiple_text_comprehension | Alexander and List (2017); Yukhymenko-Lescroart, Goldman, Lawless, Pellegrino, and Shanahan (2022); Espinas and Wanzek (2024); Schallert, List, and Alexander (2025) | MISSING | medium |
| M-PRE-010 | goal_orientation; constructive_alignment; selective_attention; organization; prior_knowledge_activation; scope_control | Biggs (1996); Tong and Chin (2020); Jung, Kim, Yoon, Park, and Oakley (2018); Tobiason (2022); Mehring and Kraft (2024) | MISSING | medium |
| M-PRE-012 | pretraining_principle; vocabulary_grounding; schema_construction; scaffolding; prerequisite_knowledge_building; selection_and_signaling_of_central_terms; cognitive_load_management; active_processing; semantic_integration; metacognitive_calibration | Mayer (2009); Stahl and Nagy (2006); Wright and Cervetti (2017); Cervetti, Fitzgerald, Hiebert, and Hebert (2023); Hattan, Alexander, and Lupo (2024) | MISSING | medium |
| M-PRE-013 | advance_organizer; orientation; schema_activation; scaffolding; prior_knowledge_activation; organization | Ausubel (1960); Mayer (1979); Hattan and Alexander (2020); Hattan, Alexander, and Lupo (2024) | MISSING | medium |
| M-PRE-014 | gap_detection; attention_guidance; misconception_awareness; scaffolding; prior_knowledge_activation; organization | Hattan, Alexander, and Lupo (2024); Qian and Lehman (2019); Pieschl, Budd, Thomm, and Archer (2021); Craig, Wilcox, Makarenko, and MacMaster (2021) | MISSING | medium |
| M-REF-001 | error_correction; metacognitive_monitoring; elaboration; discrimination; corrective_feedback; self_explanation | Metcalfe (2017); Metcalfe, Xu, Vuorre, Siegler, Wiliam, and Bjork (2024); Zhang and Fiorella (2024); Clark, Kaw, and Guldiken (2023) | MISSING | medium |
| M-REF-002 | retrieval_practice; spacing; successive_relearning; mastery_learning; corrective_feedback; relearning_to_criterion | Rawson and Dunlosky (2011); Rawson, Dunlosky, and Sciartelli (2013); Rawson and Dunlosky (2022); Higham, Zengel, Bartlett, and Hadwin (2022); Janes, Dunlosky, Rawson, and Jasnow (2020) | MISSING | medium |
| M-REF-003 | elaboration; discrimination | Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013); Bjork, Dunlosky, and Kornell (2013); Francis, Wieth, Zabel, and Carr (2020); Lechuga, Ortega-Tudela, and Gomez-Ariza (2024); Hsu and Lopez Ricoy (2025) | MISSING | medium |
| M-REF-004 | retrieval_practice; transfer; question_generation; generative_encoding; discrimination; coverage_mapping | Roediger and Karpicke (2006); Bugg and McDaniel (2012); Agarwal, Nunes, and Blunt (2021); Lin, Sun, and Zhang (2021); Ortega-Tudela, Lechuga, Bermúdez-Sierra, and Gómez-Ariza (2021); Causey and Spencer (2024) | MISSING | medium |
| M-RET-001 | retrieval; generation; calibration | Roediger and Karpicke (2006); Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021) | MISSING | medium |
| M-RET-002 | retrieval; testing; calibration; spacing | Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); Little and McDaniel (2015); Walsh and Horgan (2024) | MISSING | medium |
| M-RET-003 | retrieval; cued_recall; vocabulary_encoding | Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013); Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); McDermott, Agarwal, D’Antonio, Roediger, and McDaniel (2021) | MISSING | medium |
| M-RET-004 | retrieval; interleaving; discrimination; transfer | Kang and Pashler (2012); Rohrer, Dedrick, Hartwig, and Cheung (2020); Brunmair and Richter (2019); Carvalho and Goldstone (2023) | MISSING | medium |
| M-RET-005 | retrieval; transfer; elaboration; varied_practice | Bjork, Dunlosky, and Kornell (2013); Yang, Luo, Vadillo, Yu, and Shanks (2021); McDermott, Agarwal, D’Antonio, Roediger, and McDaniel (2021); Uesaka and Manalo (2025) | MISSING | medium |
| M-RET-006 | discrimination; retrieval | Ahn and Bjork (2018); Kang and Pashler (2012); Brunmair and Richter (2019); Rohrer, Dedrick, Hartwig, and Cheung (2020) | MISSING | medium |
| M-RET-007 | retrieval; desirable_difficulty | Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); Mielicki and Wiley (2019); Barenberg and Dutke (2021) | MISSING | medium |
| M-TEA-001 | narrative_coding; causal_coherence; schema_abstraction; structure_signaling; elaboration; transfer | van den Broek (1981); Reiser, Novak, McGill, and Penuel (2021); Chen and Bornstein (2024) | MISSING | medium |
| M-TEA-002 | discrimination; scaffolding; transfer; elaboration | Alfieri, Nokes-Malach, and Schunn (2013); Richland and McDonough (2010); Richland and Simms (2015); Kendeou, Walsh, Smith, and O'Brien (2014); Loibl, Tillema, Rummel, and van Gog (2020) | MISSING | medium |
| M-TEA-003 | guided_elaboration; near_transfer_preparation; scaffolding; contextualization; relevance_signaling | The Cognition and Technology Group at Vanderbilt (1990); Thistlethwaite, Davies, Ekeocha, Kidd, Macdougall, Matthews, Purkis, and Clay (2012); Moghadami, Amini, Moghadami, Dalal, and Charlin (2021); Xu, Ang, Soh, and Ponnamperuma (2021); Wark, Drovandi, McGee, Alele, Mwangi, and Malau-Aduli (2025) | MISSING | medium |
| M-TEA-004 | multimedia_learning; modality_effect; dual_coding; cognitive_load_management; scaffolding; transfer | Mayer and Moreno (2003); Ginns (2005); Low and Sweller (2014); Liu, Lin, Gao, and Paas (2019); Haavisto, Jaakkola, and Lepola (2023); Cromley and Chen (2025) | MISSING | medium |
| M-TEA-005 | dual_coding; elaboration; generation; scaffolding; transfer; cueing | Paivio (1991) | MISSING | medium |
| M-TEA-006 | scaffolding; segmenting; progressive_precision; transfer; elaboration; progressive_elaboration | Renkl and Atkinson (2003); Kalyuga, Ayres, Chandler, and Sweller (2003); Belland, Walker, Kim, and Lefler (2017); Fyfe, McNeil, Son, and Goldstone (2014); Tetzlaff, Simonsmeier, Peters, and Brod (2025); Dominguez and Svihla (2023) | MISSING | medium |
| M-TEA-007 | dual_coding; elaboration; generation; scaffolding; transfer; cueing | Paivio (1991) | MISSING | medium |
| M-TEA-008 | worked_examples; guidance_fading; schema_formation; self_explanation; scaffolding; elaboration; transfer | Renkl and Atkinson (2003); Atkinson, Renkl, and Merrill (2003); Salden, Aleven, Schwonke, and Renkl (2010); McGinn, Young, Huyghe, and Booth (2023); Miller-Cotto and Auxter (2021); Bisra, Liu, Nesbit, Salimi, and Winne (2018) | MISSING | medium |

## H) Open Gaps List

### Missing metadata fields
- methods missing explicit `stage`: 81 (examples: M-CAL-001, M-CAL-002, M-CAL-003, M-CAL-004, M-ENC-001, M-ENC-002, M-ENC-003, M-ENC-004)
- methods missing method-specific `knobs`: 0
- methods with no explicit gates (`gating_rules` or `stop_criteria`): 81
- chains missing chain-specific `gates`: 0
- chains missing chain-specific `failure_actions`: 0

### Unclear gates
- Most chains rely on global stage gates from the control-plane rather than chain-local gate definitions.
- Most methods use stop criteria as implicit gates; explicit gating_rules are sparse.

### Chain dependency risks
- chains where RETRIEVE appears before REFERENCE artifact producer: 2
- C-FINALS-PREP: RETRIEVE appears before REFERENCE artifact producer
- C-STUDY-LOOP: RETRIEVE appears before REFERENCE artifact producer

### Research uncertainties
- methods with missing DOI in evidence fields: 81
- methods with no parseable evidence citation text: 0
- methods not directly mapped in ErrorType -> mandatory override table: 81
- Evidence strength labels are heuristic from canonical citation text until a DOI-linked evidence registry is completed.
