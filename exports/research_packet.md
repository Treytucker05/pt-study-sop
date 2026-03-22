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
| M-CAL-001 | Micro Precheck | CALIBRATE | Run a short scored micro-calibrate baseline (2-5 minutes) at session opening to estimate readiness before TEACH. | Active objective targets; Calibrate item set aligned to scope; objective_scope and focus objective context -> CalibrateItemResults; ReadinessSnapshot; CalibrationGapSummary; DominantErrorSeed; MicroCalibrateSnapshot | Require one best-attempt response per item before hints or answer reveal.; Keep all items constrained to active objective scope.; Maintain hard time cap; do not exceed max_duration_min.; Do not switch into TEACH or FULL CALIBRATE during this block. | failure_mode:Learner requests answer without attempt; failure_mode:Out-of-scope items appear; failure_mode:Overlong single item stalls the block | operational_stage=CALIBRATE; item_count=5; max_duration_min=4; confidence_scale=HML | You are running M-CAL-001 (Micro Precheck) in CALIBRATE stage.
This is MICRO-CALIBRATE: a scored opening baseline that stays brief and low-friction.

Requirements:
- Run {item_count} short items within {max_duration_min} minutes (hard cap <=5).
- Require learner attempt before any answer reveal.
- Capture per-item correctness, latency, and confidence ({confidence_scale}).
- Keep items inside active objective scope only.

Return exactly:
1) CalibrateItemResults
2) ReadinessSnapshot
3) CalibrationGapSummary
4) DominantErrorSeed
5) MicroCalibrateSnapshot

Do not move into TEACH here. Hand off to TEACH next, then FULL CALIBRATE (M-CAL-002 / M-CAL-003).
 |
| M-CAL-002 | Full Calibrate Probes | CALIBRATE | Run the FULL CALIBRATE probe set after TEACH-close artifact to generate scored evidence for routing. | TEACH-close artifact (anchor/map/table/flow); Full-calibrate probe set aligned to objective scope; Item correctness; Item latency -> FullCalibrateItemResults; ConfidenceTaggedResults; HighConfidenceMisses; LowConfidenceHits; CalibrationRiskFlags; FullCalibrateSnapshot | Run scored probes only after TEACH-close artifact exists.; Capture confidence before correctness feedback for every attempted item.; Treat this block as diagnostic-only; do not teach or explain content deeply.; Never lower difficulty based on confidence alone; require correctness/latency corroboration.; Preserve a single confidence_scale throughout the block. | failure_mode:Confidence captured after feedback; failure_mode:Confidence manipulated to force easier flow; failure_mode:Learner always picks same confidence level | operational_stage=CALIBRATE; item_count=6; max_duration_min=5; confidence_scale=HML; miscalibration_threshold=0.2 | You are running M-CAL-002 (Full Calibrate Probes) in CALIBRATE stage.
This is FULL CALIBRATE and must run after TEACH-close artifact.

Requirements:
- Run {item_count} scored probes within {max_duration_min} minutes.
- Tag each item with confidence ({confidence_scale}) before correctness feedback.
- Detect and list high-confidence misses and low-confidence hits.
- Compute calibration risk using {miscalibration_threshold} as alert boundary.

Return exactly:
1) FullCalibrateItemResults
2) ConfidenceTaggedResults
3) HighConfidenceMisses
4) LowConfidenceHits
5) CalibrationRiskFlags
6) FullCalibrateSnapshot

Do not teach content here. This method is diagnostic routing only.
 |
| M-CAL-003 | Full Calibrate Priority Set | CALIBRATE | Build a deterministic top-3 weakness set from FULL CALIBRATE telemetry to drive ENCODE method selection. | FullCalibrateItemResults; FullCalibrateSnapshot; Confidence-tagged results; Error-type labels -> FullCalibratePrioritySet; WeaknessScoreTable; EncodeRoutingSeed; FullCalibrateHandoff | Emit exactly top_k weaknesses (fixed at 3).; Apply deterministic tie-breaks (high-confidence misses, then frequency).; Output ranking and routing seeds only; no teaching/explanations.; Keep ranking scoped to current objective telemetry only.; Treat this as FULL CALIBRATE closure before ENCODE. | failure_mode:Output drifts into teaching; failure_mode:Ranking ties remain unresolved; failure_mode:Too little data for stable ranking | operational_stage=CALIBRATE; top_k=3; weighting_profile=balanced | You are running M-CAL-003 (Full Calibrate Priority Set) in CALIBRATE stage.
Build a deterministic ranked weakness set to close FULL CALIBRATE and hand off to ENCODE.

Requirements:
- Use correctness, latency, confidence, and error types.
- Apply {weighting_profile}.
- Emit exactly {top_k} weaknesses (fixed at 3).
- Add one ENCODE method-family seed per weakness.

Return exactly:
1) FullCalibratePrioritySet
2) WeaknessScoreTable
3) EncodeRoutingSeed
4) FullCalibrateHandoff

Do not provide full teaching or answer explanations in this method.
 |
| M-CAL-004 | Story Confidence Tag | CALIBRATE | After receiving the big-picture narrative overview, rate your confidence in the story as a whole. Can you retell the narrative thread? Where does the story break down? Light-touch calibration that respects top-down learners — no item-level quizzing. | Completed narrative overview from PRIME or early ENCODE; The story thread the learner just received -> Story confidence rating (1-3); Fuzzy zones list (narrative breakdown points); Priority encoding targets | Capture confidence before correctness feedback.; Diagnostic only — do not teach or explain content.; Stay at narrative/story level, not item level.; Do not treat this output as a substitute for FULL CALIBRATE telemetry. | failure_mode:Learner says they got it all when they did not; failure_mode:Takes too long; failure_mode:Turns into a quiz | operational_stage=CALIBRATE; confidence_scale=HML | You are running M-CAL-004 (Story Confidence Tag) in CALIBRATE stage.
Capture optional narrative-level MICRO-CALIBRATE confidence after the big-picture overview.

Requirements:
- Ask learner to rate story confidence on {confidence_scale} scale.
- Ask where the narrative breaks down or gets fuzzy.
- Tag fuzzy areas as priority targets for deeper encoding.
- No item-level questions — story-level confidence only.
- Hard cap at 2 minutes.
- This does NOT replace FULL CALIBRATE (M-CAL-002 / M-CAL-003).

Return exactly:
1) StoryConfidenceRating
2) FuzzyZonesList (narrative breakdown points)
3) PriorityEncodingTargets
4) OptionalProbeSeedSuggestions

Do not teach or explain content. This method is diagnostic only.
 |
| M-ENC-001 | KWIK Hook | ENCODE | Structured 6-step encoding protocol for new terms. Sound (phonetic cue) → Function (true meaning) → Image (vivid visual tied to function) → Entwine (PIE method: personal meaning) → Resonance (learner confirms it clicks) → Lock (record as card/log). Each step is gated — don't skip ahead. | New term or concept to encode; Definition or meaning from source material; Blank note area for hook creation -> KWIK hook (sound-function-image triplet); Anki card draft (optional); Session log entry | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only.; Require TEACH-close artifact to exist before running full KWIK. | failure_mode:Image too abstract; failure_mode:Skipping steps; failure_mode:Sound cue forced; failure_mode:Weak personal connection | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-ENC-001 (KWIK Hook) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope. - Confirm concept function before mnemonic elaboration begins. - Treat hooks as memory supports, not as evidence claims.

Required outputs:
- KWIK hook (sound-function-image triplet)
- Anki card draft (optional)
- Session log entry

Stop conditions:
- All 6 steps completed
- Hook feels "locked" (resonance confirmed)
- 3 minutes elapsed per term

If required inputs are missing, request only the minimum needed input and continue.
If you use analogy or broader teaching knowledge to make a hook vivid, label it as a teaching support rather than as sourced fact.
 |
| M-ENC-002 | Seed-Lock Generation | ENCODE | Learner generates their own encoding hook BEFORE the AI offers help. Start with your own association, metaphor, or mnemonic. AI only assists if you're stuck. Enforces active generation over passive reception. | New term or concept to encode; Definition from source material; 90-second timer -> Learner-generated Seed (primary hook attempt); Final locked hook; Generation success flag (self vs AI-assisted) | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Asking AI immediately; failure_mode:Giving up too fast; failure_mode:Over-relying on AI hooks | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-ENC-002 (Seed-Lock Generation) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Learner-generated Seed (primary hook attempt)
- Final locked hook
- Generation success flag (self vs AI-assisted)

Stop conditions:
- Hook generated (self or AI-assisted)
- 90-second attempt completed
- Hook locked for retention

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-ENC-003 | Draw-Label | ENCODE | Sketch the structure (anatomy, pathway, concept map) and label from memory. Fill gaps with source material. | Structure to draw (anatomy, pathway, diagram); Blank paper or drawing surface; Source material for gap-filling -> Completed labeled diagram; Gap list (what was missing); Accuracy percentage | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Focusing on artistic quality; failure_mode:Looking at source while drawing; failure_mode:Not tracking gaps | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-ENC-003 (Draw-Label) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Completed labeled diagram
- Gap list (what was missing)
- Accuracy percentage

Stop conditions:
- Diagram complete with all labels
- Gap rate <30%
- 10 minutes elapsed (or earlier if complete)

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-ENC-004 | Teach-Back | ENCODE | Explain the concept aloud as if teaching a classmate. Identify points where explanation breaks down. | Concept to teach; Imaginary student (or real one); Recording device (optional) -> Verbal explanation (recorded or noted); Breakdown points list; Targeted review areas | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Not identifying breakdowns; failure_mode:Reading instead of explaining; failure_mode:Skipping "dumb" questions | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-ENC-004 (Teach-Back) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope. - Guide the learner explanation before judging it. - Do not switch into strict grading unless the chain explicitly requests evaluation.

Required outputs:
- Verbal explanation (recorded or noted)
- Breakdown points list
- Targeted review areas

Stop conditions:
- Full explanation delivered
- Breakdown points identified
- 5 minutes elapsed

If required inputs are missing, request only the minimum needed input and continue.
Use breakdown points to guide the next encoding move, not to spring an unexpected verdict.
 |
| M-ENC-005 | Why-Chain | ENCODE | Ask 'why?' 3-5 times in succession about a concept to build causal depth. Each answer becomes the premise for the next question. Based on elaborative interrogation (Dunlosky et al.). | Initial statement or fact to interrogate; Source material for verification -> Why-chain document (3-5 linked explanations); Depth level reached; Verification status | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Circular reasoning; failure_mode:Making up explanations; failure_mode:Stopping too early | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-ENC-005 (Why-Chain) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Why-chain document (3-5 linked explanations)
- Depth level reached
- Verification status

Stop conditions:
- 3-5 why levels completed
- Hit bedrock knowledge
- Chain verified against source

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-ENC-007 | Self-Explanation Protocol | ENCODE | After reading each paragraph or concept, pause and explain WHY each step follows from the previous one. Supports silent, spoken, or written verbalization modes. Focus on reasoning, not restating facts. Merges Think-Aloud Protocol (formerly M-ENC-006). | Text passage or concept sequence; Note-taking area (written mode) or quiet environment (spoken mode); Timer (optional) -> Self-explanation notes or think-aloud log (per paragraph); Inference gap list; Confusion points flagged; Comprehension checkpoints | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Just restating facts; failure_mode:Not writing explanations (in written mode); failure_mode:Silent reading without explaining (in spoken mode); failure_mode:Skipping "obvious" sections; failure_mode:Skipping prediction step | operational_stage=ENCODE; verbalization_mode=written; guidance_level=medium; output_format=bullets | You are running M-ENC-007 (Self-Explanation Protocol) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.
Verbalization mode knob: silent / spoken / written (default: written).
Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Self-explanation notes or think-aloud log (per paragraph)
- Inference gap list
- Confusion points flagged
- Comprehension checkpoints

Stop conditions:
- All paragraphs processed
- Major gaps and confusion points flagged
- 7 minutes elapsed (or content complete)

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-ENC-008 | Mechanism Trace | ENCODE | Trace the causal mechanism step-by-step: what triggers what, and why. Build a cause→effect chain from input to output. Especially useful for pathophysiology and physiological pathways. | Pathway or mechanism to trace; Source material with mechanism details; Flowchart template or blank paper -> Complete mechanism chain (trigger to outcome); Because statements for each step; Branch points identified; Verification status | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Linear thinking only; failure_mode:Skipping intermediate steps; failure_mode:Vague "because" statements | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-ENC-008 (Mechanism Trace) in TEACH stage.
This method is non-assessment. Do not score, grade, or quiz the learner.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Deliver one teach chunk in this order: Source Facts -> Plain Interpretation -> Bridge Move -> Application -> Anchor Artifact.
- Keep focus on target concept scope. - Use the mechanism trace as the bridge/application scaffold, not as a graded check. - Stop once the learner has a usable L2 grasp and one anchor artifact.

Required outputs:
- Complete mechanism chain (trigger to outcome)
- Because statements for each step
- Branch points identified
- Verification status

Stop conditions:
- Chain reaches final outcome
- All "because" statements filled
- Chain verified against source

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-ENC-009 | Concept Map | ENCODE | Generate a learner-usable concept map that captures core nodes and labeled links for objective-scoped encoding. | Target concept from objective map; Current misconception or gap signal -> Learner-generated explanation or structured encoding artifact | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Overload; failure_mode:Passive repetition | operational_stage=ENCODE; diagram_format=mermaid | Analyze the skeleton outline just provided and generate a concept map visualizing the relationships between the core components. You MUST format your visual output strictly using {diagram_format}.
You are running M-ENC-009 (Concept Map) in ENCODE stage.
Stage boundary: - ENCODE requires active processing. Do not passively summarize. - Keep map scoped to the current objective only. - The map must stay learner-usable and explanation-ready. - Prefer clarity and relationship structure over visual flourish.
Build and return exactly: 1) BriefTopDownFrame 2) ConceptMapNodes 3) ConceptMapLinks 4) MermaidOrAsciiMap 5) One-ParagraphLearnerExplanation
Provenance rule: if you add structure or phrasing that comes from your own teaching synthesis rather than a cited course source, mark it as teaching support, not source evidence.
Stop condition: - End when the learner can explain the concept map structure in their own words with minimal support.
 |
| M-ENC-010 | Comparison Table | ENCODE | Create a side-by-side table comparing 2-4 confusable concepts across shared features. Highlight discriminating features. Builds differential diagnosis skill. | 2-4 confusable concepts to compare; List of comparison dimensions/features; Source material for accuracy -> Completed comparison table; Discriminating features highlighted; Differential rules (1-2 per comparison); Error list from initial attempt | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Looking up before trying; failure_mode:No discriminators identified; failure_mode:Too many comparison dimensions | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-ENC-010 (Comparison Table) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Completed comparison table
- Discriminating features highlighted
- Differential rules (1-2 per comparison)
- Error list from initial attempt

Stop conditions:
- All cells filled
- Discriminators identified
- Rules generated

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-ENC-011 | Process Flowchart | ENCODE | Draw a sequential diagram showing a process, pathway, or algorithm. Include decision points where applicable. Use Mermaid graph TD syntax for dashboard editor. | Process or algorithm to diagram; Source material with step sequence; Mermaid editor or blank paper -> Completed flowchart; Mermaid code (if using dashboard); Decision point list; Loop/feedback points identified | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Linear-only thinking; failure_mode:Missing decision branches; failure_mode:Too complex single diagram | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-ENC-011 (Process Flowchart) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Completed flowchart
- Mermaid code (if using dashboard)
- Decision point list
- Loop/feedback points identified

Stop conditions:
- All steps included
- All decisions branched correctly
- Flowchart verified against source

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-ENC-012 | Clinical Decision Tree | ENCODE | Build a branching decision diagram: presentation → key findings → differential → tests → diagnosis. Scaffolds clinical reasoning into explicit decision points. | Clinical presentation or chief complaint; Differential diagnosis list; Source material with diagnostic criteria -> Clinical decision tree; Red flag list; Confirmatory test per diagnosis; Mermaid code (if using dashboard) | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Missing red flags; failure_mode:Non-discriminating questions; failure_mode:Too many branches at one node | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-ENC-012 (Clinical Decision Tree) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Clinical decision tree
- Red flag list
- Confirmatory test per diagnosis
- Mermaid code (if using dashboard)

Stop conditions:
- All major diagnoses included
- Decision points are truly discriminating
- Tree verified against guidelines

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-ENC-013 | Memory Palace | ENCODE | Use spatial memory to encode ordered sequences by associating items with familiar locations. Based on the ancient Method of Loci used by Greek orators and memory champions. | List of items to memorize (5-10 optimal); Familiar location (home, route, etc.); Imagination for vivid imagery -> Mental palace with placed items; Retrieval accuracy check; Weak links identified | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Images not vivid/absurd; failure_mode:Locations not familiar; failure_mode:Too many items | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-ENC-013 (Memory Palace) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Mental palace with placed items
- Retrieval accuracy check
- Weak links identified

Stop conditions:
- All items placed
- Can retrieve forward and backward
- Mental walk completed without errors

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-ENC-014 | Chain Linking | ENCODE | Create a bizarre narrative story connecting unrelated items. The absurdity makes it memorable without spatial locations. | List of items to memorize in order; Creativity for bizarre connections -> Bizarre story narrative; Retrieval success rate; Weak links (breaks in chain) | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Chain too long; failure_mode:Story too logical; failure_mode:Weak links | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-ENC-014 (Chain Linking) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Bizarre story narrative
- Retrieval success rate
- Weak links (breaks in chain)

Stop conditions:
- Story complete with all items
- Can retrieve entire sequence
- Backward retrieval also possible

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-ENC-015 | Hand-Draw Map | ENCODE | Hand-draw a spatial mind map of the topic structure using own words, simple pictures, colors, and spatial positioning. Close eyes afterward to recall layout — positions trigger details. Max 5 minutes, never full rewrite. | Structural overview or H1 map from prior PRIME block; Blank paper and colored pens/markers; Timer set to 5 minutes -> Hand-drawn spatial mind map (physical artifact); Spatial recall confidence (can you see the layout with eyes closed?) | Do not assess or score the learner in ENCODE.; Stay at orientation level — this is encoding, not retrieval. | failure_mode:Copying verbatim from source; failure_mode:Drawing too many branches (overload); failure_mode:Skipping the eyes-closed recall step; failure_mode:Spending too long on drawing quality | operational_stage=ENCODE; map_format=ascii_tree; node_count_cap=5; confidence_scale=HML | You are running M-ENC-015 (Hand-Draw Map) in ENCODE stage.
Guide the learner to create a spatial mind map of the topic structure.

Requirements:
- Learner reviews the structural overview (30 sec scan, no drawing yet).
- Central concept placed in middle of page using own words.
- Draw {branch_limit} broad umbrella branches using different colors so the whole overview stays represented.
- Add simple pictures/icons to anchor key concepts (speed over beauty).
- Close eyes and mentally walk through the map layout.

Return exactly:
1) MapStructureConfirmation (central concept + branch count)
2) SpatialRecallConfidence (can learner see layout with eyes closed?)
3) TimeSpent (hard stop at {time_cap_minutes} min)

This is a non-assessment activity. Do not quiz or score the learner.
This is orientation-level encoding, not retrieval.
 |
| M-INT-001 | Analogy Bridge | ENCODE | Create an analogy linking this concept to something familiar. Test if the analogy holds at the edges. | Concept to analogize; Familiar domain for comparison -> Analogy statement (A is to B as X is to Y); Mapping table (3+ correspondences); Breakdown points (where analogy fails) | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Analogy too superficial; failure_mode:Familiar domain not actually familiar; failure_mode:Ignoring breakdown points | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-INT-001 (Analogy Bridge) in TEACH stage.
This method is non-assessment. Do not score, grade, or quiz the learner.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Deliver one teach chunk in this order: Source Facts -> Plain Interpretation -> Bridge Move -> Application -> Anchor Artifact.
- Keep focus on target concept scope. - Treat analogies as explanatory bridges, not evidence. - Make the analogy limits explicit before moving on. - State at least one analogy breakdown point before closing the chunk. - Return to the real concept after the bridge.

Required outputs:
- Analogy statement (A is to B as X is to Y)
- Mapping table (3+ correspondences)
- Breakdown points (where analogy fails)

Stop conditions:
- Analogy created with 3+ mappings
- At least 1 breakdown point identified
- 3 minutes elapsed

If required inputs are missing, request only the minimum needed input and continue.
Return to the actual concept after the analogy and distinguish explanation from source-backed fact.
 |
| M-INT-002 | Clinical Application | ENCODE | Apply the concept to a clinical scenario. Ask: how would this present? What would you test? How would you treat? | Concept to apply clinically; Clinical scenario or patient type; Source material for verification -> Clinical application narrative; Presentation, testing, intervention summary; Verification notes | Require closed-note recall first, then feedback.; If repeated misses occur, route back to ENCODE or REFERENCE. | failure_mode:Generic application; failure_mode:Skipping assessment phase; failure_mode:Treatment without rationale | operational_stage=ENCODE; difficulty=medium; feedback_timing=after_attempt | You are running M-INT-002 (Clinical Application) in ENCODE stage.
The learner must actively transform the concept into a clinical scenario.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Require learner attempt first.
- Do not reveal full answer before attempt.
- Capture errors and route signals.

Required outputs:
- Clinical application narrative
- Presentation, testing, intervention summary
- Verification notes

Stop conditions:
- All three questions answered (present, test, treat)
- Verified against source
- 5 minutes elapsed

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-INT-003 | Cross-Topic Link | ENCODE | Identify 2-3 connections between this topic and topics from other courses. Look for shared principles. | Current topic; Access to previous course notes (optional) -> Cross-topic connection list (2-3); Explanatory sentences; Shared principles identified | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Connections too vague; failure_mode:Listing without explaining; failure_mode:Only within-course connections | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-INT-003 (Cross-Topic Link) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Cross-topic connection list (2-3)
- Explanatory sentences
- Shared principles identified

Stop conditions:
- 2-3 connections identified
- Each explained in one sentence
- Shared principle stated

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-INT-004 | Side-by-Side Comparison | ENCODE | Place two confusable concepts in a comparison table (features, functions, clinical signs). Identify discriminating features. Builds differential diagnosis skill. | Two confusable concepts; Comparison dimensions (features to compare); Source material for accuracy -> Side-by-side comparison table; Discriminating features highlighted; Error list from initial attempt | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Features too similar across concepts; failure_mode:Looking up before trying; failure_mode:Not identifying discriminators | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-INT-004 (Side-by-Side Comparison) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Side-by-side comparison table
- Discriminating features highlighted
- Error list from initial attempt

Stop conditions:
- Table complete (5-7 rows filled)
- Discriminators identified
- Verified against source

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-INT-005 | Case Walkthrough | ENCODE | Walk through a realistic case to retrieve reasoning steps, identify gaps, and reinforce application accuracy. | Reference targets or question bank; Scoring rubric and confidence capture -> LearnerCaseResponse; ErrorTags; ConfidenceTag; CorrectiveFeedback; NextTargetedProbe | Require closed-note recall first, then feedback.; If repeated misses occur, route back to ENCODE or REFERENCE. | failure_mode:Answer leakage; failure_mode:Repeated misses | operational_stage=ENCODE; guidance_level=partial_scaffold | You are running M-INT-005 (Case Walkthrough) in ENCODE stage.
The learner must actively transform clinical knowledge into case-based reasoning.
Require an attempt-first case response before feedback.
Use {guidance_level}: - case_prompt_only: present the case and require full learner reasoning. - partial_scaffold: allow limited structure prompts without revealing final answer. - targeted_hint: provide one focused hint after an attempt, then require revised answer.
Return: 1) LearnerCaseResponse 2) ErrorTags 3) ConfidenceTag 4) CorrectiveFeedback 5) NextTargetedProbe
 |
| M-INT-006 | Illness Script Builder | ENCODE | For a condition, build the illness script: (1) enabling conditions, (2) pathophysiological fault, (3) clinical consequences. Compare your script to the textbook version. | Condition/disease to script; Source material with pathophysiology; Illness script template -> Complete illness script (3 parts); Causal chain diagram; Comparison to textbook; Discriminating features | Force active processing (explain, transform, or map), not passive reading.; Keep output scoped to mapped objectives only. | failure_mode:Consequences without mechanism; failure_mode:Generic enabling conditions; failure_mode:Not discriminating from similar conditions | operational_stage=ENCODE; guidance_level=medium; output_format=bullets | You are running M-INT-006 (Illness Script Builder) in ENCODE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Force active learner processing.
- Prefer transformation over passive lecture.
- Keep focus on target concept scope.

Required outputs:
- Complete illness script (3 parts)
- Causal chain diagram
- Comparison to textbook
- Discriminating features

Stop conditions:
- All three script parts completed
- Causal chain drawn
- Compared to source

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-OVR-001 | Exit Ticket | OVERLEARN | Answer three questions: (1) What did I learn? (2) What's still muddy? (3) What's my next action? | Completed study session; Exit ticket template (3 questions); Session notes or artifacts for reference -> Exit ticket (3-part response); Key takeaways list; Muddy points / weak anchors; Next action commitment; Questions for next session | Run only after stable retrieval performance.; Stop after cap is met to avoid burnout loops. | failure_mode:Generic answers ("I learned a lot"); failure_mode:Skipping the muddy point question; failure_mode:Vague next action ("study more") | operational_stage=OVERLEARN; intensity=medium; speed_pressure=soft | You are running M-OVR-001 (Exit Ticket) in OVERLEARN stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Run bounded fluency reps.
- Respect fatigue and stop caps.
- Prioritize durable retention over speed only.

Required outputs:
- Exit ticket (3-part response)
- Key takeaways list
- Muddy points / weak anchors
- Next action commitment
- Questions for next session

Stop conditions:
- All three questions answered
- Next action is specific and actionable
- Exit ticket logged to session record

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-OVR-002 | Anki Card Draft | OVERLEARN | Draft 3-5 Anki cards for the session's key concepts. Use cloze or basic format. Brain syncs to Anki. | Session notes and key concepts; Anki card template (cloze or basic); Card draft staging area (Brain or text file); Target deck name -> 3-5 drafted Anki cards; Cards tagged by topic and source; Cards staged in Brain for Anki sync; Card count logged to session record | Output ONLY canonical card blocks. No prose before/after cards.; Produce 3-5 cards total.; {'Each card must use exact labels and line order': None, 'CARD N:, TYPE:, FRONT:, BACK:, TAGS': None}; Do not use bullets, markdown tables, CSV, or JSON. | failure_mode:Cards too complex (essay answers); failure_mode:Double-barreled cards (multiple facts per card); failure_mode:Drafting cards for material not yet understood | operational_stage=OVERLEARN; intensity=medium; speed_pressure=soft | You are running M-OVR-002 (Anki Card Draft) in OVERLEARN stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Run bounded fluency reps.
- Respect fatigue and stop caps.
- Prioritize durable retention over speed only.

Required outputs:
- 3-5 drafted Anki cards
- Cards tagged by topic and source
- Cards staged in Brain for Anki sync
- Card count logged to session record

Stop conditions:
- 3-5 cards drafted (minimum 3)
- All cards follow single-fact rule
- Every card has TYPE, FRONT, BACK, TAGS label lines

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-OVR-003 | Drill Sheet Builder | OVERLEARN | Build an interleaved drill sheet (30-60 timed items) and define cross-session validation checks. | Question Bank Seed; ErrorLog trends -> DrillSheet; CrossSessionValidation checklist | Run only after stable retrieval performance.; Stop after cap is met to avoid burnout loops. | failure_mode:Burnout/fatigue; failure_mode:Speed over accuracy collapse | operational_stage=OVERLEARN; intensity=medium; speed_pressure=soft | You are running M-OVR-003 (Drill Sheet Builder) in OVERLEARN stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Run bounded fluency reps.
- Respect fatigue and stop caps.
- Prioritize durable retention over speed only.

Required outputs:
- DrillSheet
- CrossSessionValidation checklist

Stop conditions:
- Drill sheet has 30-60 items
- Cross-session validation criteria defined

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-OVR-004 | Post-Learn Brain Dump | OVERLEARN | Close all materials. Write everything you remember from the session — stories, connections, details, anything. Then open materials, compare, identify gaps, and fill them in. Different from Free Recall Blurt: this is comprehensive session-level closure, not topic-level retrieval practice. | Completed study session (all blocks done); Blank paper or text area; Timer (5 min dump + 2 min gap-fill); Session materials (closed during dump, opened for gap-fill) -> Brain dump text (raw recall); Gap list (what was missing or wrong); Gap-fill annotations; Session retention estimate (percentage of material recalled) | Run only after encoding and retrieval blocks are complete.; Materials must be closed during dump phase.; Gap-fill is targeted, not comprehensive re-study. | failure_mode:Peeking during dump phase; failure_mode:Skipping the gap comparison; failure_mode:Spending too long on gap-fill (turning into re-study); failure_mode:Writing nothing because "I forgot everything" | operational_stage=OVERLEARN; output_format=bullets; feedback_style=strict_gap_analysis; priming_scope=module_all | You are running M-OVR-004 (Post-Learn Brain Dump) in OVERLEARN stage.
Guide the learner through comprehensive session-level free recall and gap-fill.

Requirements:
- Ensure ALL materials are closed before dump phase begins.
- Set timer for 5 minutes. Learner writes everything remembered ({dump_format}).
- When stuck, write "?" and keep going — gaps are data, not failures.
- After 5 min, open materials and compare (max 2 min).
- Identify gaps — what was missed or wrong?
- Fill gaps with one-line annotations only ({gap_fill_mode}).

Return exactly:
1) DumpWordCount
2) GapCount (items missed or wrong)
3) GapFillAnnotations
4) RetentionEstimate (percentage of session material recalled)

This builds recall fluency at the session level — comprehensive, not item-by-item.
Hard stop at {time_cap_minutes} minutes total. This is closure, not re-learning.
 |
| M-PRE-001 | Brain Dump | PRIME | Rapid orientation recall over existing notes to identify strong anchors and missing nodes before deeper work. | Topic name; Prior notes/North Star links -> StrongConnections; MissingNodes; FollowUpTargets | Do not assess or score the learner in CALIBRATE.; Stay at orientation level and avoid full solution reveal. | failure_mode:Learner treats it like a quiz; failure_mode:No prior context exists | operational_stage=PRIME; feedback_style=supportive_synthesis | You are running M-PRE-001 (Brain Dump) in CALIBRATE stage.
This method is non-assessment.
This is orientation only, not assessment.

Hard rules:
- If prior notes/North Star context are missing, do not run this method. Route to M-PRE-010 then M-PRE-008.
- Do not score, grade, or confidence-rate the learner.

Ask for a brief free write, then return exactly:
1) StrongConnections (what they already linked correctly at a top level)
2) MissingNodes (important anchors not mentioned)
3) FollowUpTargets (wikilinks for downstream focus)

Use {feedback_style} tone. Keep output concise and structural.
 |
| M-PRE-002 | Overarching Pre-Question Set | PRIME | Generate 3-5 broad why/how/where-fit questions that jointly cover the whole selected material or module slice before deep study to set conceptual hooks. | Topic title or lecture heading; Full heading structure or major sections for the selected material/module slice -> PreQuestionSet; PriorityPrompts; FollowUpTargets | Do not assess or score the learner in PRIME.; Stay at orientation level and avoid full solution reveal. | failure_mode:Learner anxiety rises from open prompts; failure_mode:Prompts are too vague to use downstream; failure_mode:Prompts become detailed quiz items | operational_stage=PRIME; priming_scope=single_focus; guidance_level=medium | You are running M-PRE-002 (Overarching Pre-Question Set) in PRIME stage.
This method is non-assessment.
This method is orientation only and never scored.
First account for the full selected source/module scope, then compress it into exactly 3-5 broad conceptual prompts. Treat the 3-5 cap as a final grouping cap, not as permission to ignore supported content.
Prompt style:
- Why does this matter?
- How does it work at a high level?
- Where does it fit in the module?

Then return:
1) PreQuestionSet
2) PriorityPrompts (top 1-2)
3) FollowUpTargets

If learner anxiety is high, reduce to 1-2 scaffolded prompts or skip and route to M-PRE-010.
 |
| M-PRE-003 | Prior Knowledge Scan | PRIME | Conditional CALIBRATE method that maps known concepts to the new topic when prior notes or North Star context already exist. | New topic name; Access to previous module/course notes (required); North Star objective context (preferred) -> Connection map (topic + related concepts); Primary anchoring schema identified; Prerequisite gap list; Optional follow_up_targets list for unresolved prerequisite gaps | Do not assess or score the learner in CALIBRATE.; Stay at orientation level and avoid full solution reveal. | failure_mode:Connections too superficial; failure_mode:No connections found; failure_mode:No prior context available; failure_mode:Spending too long on drawing | operational_stage=PRIME; priming_scope=single_focus; guidance_level=medium | You are running M-PRE-003 (Prior Knowledge Scan) in CALIBRATE stage.
This method is conditional and non-assessment.

Hard rules:
- Run only if prior notes/North Star context exist.
- If no prior context exists, skip and route to M-PRE-010 then M-PRE-008.
- Do not score or confidence-rate responses.

Produce exactly:
1) ConnectionMap (topic -> known related concepts with labeled links)
2) PrimaryAnchor
3) PrerequisiteGaps
4) FollowUpTargets

Keep to top-level orientation output; no deep teaching in this method.
 |
| M-PRE-004 | Hierarchical Advance Organizer | PRIME | Present a high-abstraction top-down framework (3-5 umbrella pillars + sub-branches) that still covers the full selected scope before detail study. | Topic title; Learning objectives (preferred); Prior mastered topics (optional) -> PillarTree; PriorKnowledgeLinks; StructuralHypotheses | Do not assess or score the learner in PRIME.; Stay at orientation level and avoid full solution reveal. | failure_mode:No prior bridge links; failure_mode:Tree becomes detail-heavy | operational_stage=PRIME; complexity_level=intermediate_outline; representation_format=markdown_tree | You are running M-PRE-004 (Hierarchical Advance Organizer) in PRIME stage.
This method is non-assessment.
Build a top-down organizer, not a lesson and not a quiz.

Requirements:
- 3-5 pillars, max depth 2. - Pillars are umbrella groups that collectively cover the full selected scope.
- One concise prior-knowledge bridge per pillar.
- Output in {representation_format} at {complexity_level}.
- No scoring, no checks, no retrieval prompts.

Return exactly:
1) PillarTree
2) PriorKnowledgeLinks
3) StructuralHypotheses
 |
| M-PRE-005 | Skeleton Concept Hierarchy | PRIME | Generate a bare concept hierarchy (topic core -> 4-6 umbrella categories -> short descriptors) that still covers the full selected scope without deep explanations. | Topic title; Section headings or term list -> SkeletonMap; CategoryLabels; CrossLinks | Do not assess or score the learner in PRIME.; Stay at orientation level and avoid full solution reveal. | failure_mode:Map turns into paragraph notes; failure_mode:Too many nodes causing overload | operational_stage=PRIME; node_count_cap=6; map_format=ascii_tree | You are running M-PRE-005 (Skeleton Concept Hierarchy) in PRIME stage.
This method is non-assessment.
Build a bare hierarchy, not explanations.

Rules:
- Central topic -> 4-6 categories -> 1-2 descriptors each. - Categories are umbrella groups that collectively cover the full selected scope.
- Depth max = 2.
- Use {map_format}; respect node_count_cap.
- No scoring or quiz prompts.

Return:
1) SkeletonMap
2) CategoryLabels
3) CrossLinks
Stop condition: - End when category count and depth constraints are satisfied.
 |
| M-PRE-006 | Structural Skimming + Pillar Mapping | PRIME | Rapidly skim headings/visual cues across the full selected scope, then map 3-5 umbrella pillars before deep reading. | Topic packet (headings + visual cues); Learning objectives (optional) -> PillarMap; ObjectiveLinks; FollowUpTargets | Do not assess or score the learner in PRIME.; Stay at orientation level and avoid full solution reveal. | failure_mode:LLM drifts into paragraph summarization; failure_mode:Pillars hide uncovered sections by over-compressing the source; failure_mode:Too many pillars | operational_stage=PRIME; pillar_count=4; output_mode=nested_list | You are running M-PRE-006 (Structural Skimming + Pillar Mapping) in PRIME.
Use only structural cues; do not summarize full paragraphs.

Produce:
1) PillarMap (3-5 pillars, {output_mode})
2) ObjectiveLinks
3) FollowUpTargets

Hard constraints:
- Non-assessment.
- Structural-only output. - Pillars are umbrella groups that collectively cover the full selected scope.
- Respect pillar_count cap.
 |
| M-PRE-007 | Pre-Test | PRIME | Attempt to answer questions on the topic BEFORE studying it. Getting answers wrong primes the brain to encode the correct information more deeply. | Pre-test questions (3-5 questions on upcoming topic); Timer (5 min max); Answer sheet (to record guesses) -> Pre-test answers (with confidence ratings); Encoding priming for correct answers; Calibration baseline | Require a best attempt before giving correction.; Capture confidence and accuracy for each item. | failure_mode:Checking answers immediately; failure_mode:Pre-test too hard; failure_mode:Refusing to guess | operational_stage=PRIME; probe_count=3; confidence_scale=h_m_l | You are running M-PRE-007 (Pre-Test) in CALIBRATE stage.
This method is diagnostic calibration, not summative grading. Pre-test items establish a baseline before encoding.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Collect measurable baseline signals.
- Capture confidence with correctness and latency.
- Do not provide deep teaching.

Required outputs:
- Pre-test answers (with confidence ratings)
- Encoding priming for correct answers
- Calibration baseline

Stop conditions:
- All questions attempted
- Confidence rated
- 5 minutes elapsed

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-PRE-008 | Structural Extraction | PRIME | Extract a compact structural spine from source material before detail work. Build high-signal nodes and link every node to at least one objective. | North Star objectives; Source packet; objective_scope (module_all \| single_focus); focus_objective_id (required in single_focus) -> StructuralSpine; Objective linkage map; UnknownNodeList; PriorityNodes | Do not assess or score the learner in PRIME.; Stay at orientation level and avoid full solution reveal. | failure_mode:Drift into testing; failure_mode:Scope too broad | operational_stage=PRIME; priming_depth_mode=basic; node_cap=10; output_format=ascii_tree; objective_link_required=True | You are running M-PRE-008 (Structural Extraction) in PRIME stage.
This method is non-assessment: do not quiz, grade, or run retrieval checks.

Dependency note:
- M-PRE-008 requires objective context.
- Objective context may come from M-PRE-010 in this flow OR an already-built North Star.
- In PRIME for first-contact material, run M-PRE-010 before M-PRE-008. If North Star already exists, the prerequisite remains satisfied.

Time guidance by priming_depth_mode:
- basic: 2-5 minutes
- schema: 5-10 minutes for complex topics

Use objective_scope:
- module_all: build a high-level spine across all active module objectives.
- single_focus: build a spine only for the selected focus objective.

Produce:
1) StructuralSpine (<= node_cap, high-signal nodes only)
2) Objective linkage map (every node linked to >=1 objective)
3) UnknownNodeList (orientation gaps, not scores)
4) PriorityNodes (what to cover first)

Exclude trivia and avoid deep teaching details in this method.
 |
| M-PRE-009 | Syntopical Big-Picture Synthesis | PRIME | Synthesize top-level structure across 2-3 sources into one module-level hierarchy with cross-links. | 2-3 source excerpts; Learning objectives (optional) -> UnifiedTopDownTree; CrossSourceLinks; ConflictFlags; FollowUpTargets | Do not assess or score the learner in PRIME.; Stay at orientation level and avoid full solution reveal. | failure_mode:Drift into testing; failure_mode:Scope too broad | operational_stage=PRIME; source_cap=3; synthesis_format=hierarchy | You are running M-PRE-009 (Syntopical Big-Picture Synthesis) in PRIME.
Build one integrated top-down view from up to {source_cap} sources.

Return exactly:
1) UnifiedTopDownTree ({synthesis_format})
2) CrossSourceLinks
3) ConflictFlags
4) FollowUpTargets

Rules:
- Keep synthesis high-level.
- Non-assessment only.
- If only one source is available, skip this method.
 |
| M-PRE-010 | Learning Objectives Primer | PRIME | Anchor the session to instructor-aligned learning objectives and choose module-wide or single-focus direction before deeper study. | North Star objectives for current module; Selected source slice for current focus -> ModuleObjectiveMap; FocusObjectiveCard; SelectedFocusObjectiveId; LearnerAcknowledgment | Do not assess or score the learner in PRIME.; Stay at orientation level and avoid full solution reveal. | failure_mode:Drift into testing; failure_mode:Scope too broad | operational_stage=PRIME; objective_scope=module_all; cognitive_depth=conceptual_understanding; delivery_style=direct_statement | You are running M-PRE-010 (Learning Objectives Primer) in PRIME stage.
This stage is non-assessment: do not quiz, grade, or run retrieval checks.

Objective source precedence:
1) Instructor-provided learning objectives (use verbatim whenever available)
2) Source-material-derived objectives (only if instructor objectives are missing)

Operate by {objective_scope}:
- module_all: publish a high-level map of all active module objectives from North Star, then ask learner to pick one focus objective for zoom-in.
- single_focus: publish exactly one measurable focus objective card.

Use {cognitive_depth} level and {delivery_style} tone. Ask for learner acknowledgment only, then stop.
Do not begin core teaching content inside this method.
 |
| M-PRE-012 | Terminology Pretraining | PRIME | Extract the names, abbreviations, and short component definitions that the learner must recognize before TEACH begins. | Selected source material slice; Current study unit/topic label -> TerminologySet; AbbreviationMap; ComponentDefinitionList | No scoring, quizzing, or learner diagnosis in PRIME.; Do not explain full mechanisms or causal chains. | failure_mode:Definitions become mini-lessons; failure_mode:Too many low-value terms | operational_stage=PRIME; method-specific knobs=MISSING | You are running M-PRE-012 (Terminology Pretraining) in PRIME stage.
Extract only the names, abbreviations, and short component definitions the learner
must recognize before TEACH begins.

Requirements:
- Stay source-grounded and concise.
- Do not drift into mechanism teaching.
- Definitions should orient the learner, not replace TEACH.

Return exactly:
1) TerminologySet
2) AbbreviationMap
3) ComponentDefinitionList

This is non-assessment. Do not quiz, grade, or judge mastery.
 |
| M-PRE-013 | Big-Picture Orientation Summary | PRIME | Generate a short source-grounded overview that orients the learner to what the material is about without crossing into full explanation. | Selected source material slice; Current study unit/topic label -> OrientationSummary; MajorSectionList; NorthStarSentence | No scored checks or learner diagnosis in PRIME.; No mechanism-level explanation or stepwise TEACH content. | failure_mode:Overview becomes too explanatory; failure_mode:Overview becomes too vague | operational_stage=PRIME; method-specific knobs=MISSING | You are running M-PRE-013 (Big-Picture Orientation Summary) in PRIME stage.
Build a short overview that helps the learner understand what the source is
generally about before TEACH begins.

Requirements:
- Stay source-grounded.
- Keep the summary concise and orientation-level.
- Do not cross into mechanism teaching or full explanation.

Return exactly:
1) NorthStarSentence
2) OrientationSummary
3) MajorSectionList

This is non-assessment. Do not quiz, grade, or test the learner.
 |
| M-PRE-014 | Ambiguity and Blind-Spot Scan | PRIME | Scan the selected source for ambiguities, unsupported jumps, contradictions, and follow-up targets that should be watched during TEACH. | Selected source material slice; Current study unit/topic label -> AmbiguityLog; UnsupportedJumpList; FollowUpTargets | No scored checks or learner-memory probing in PRIME.; Do not resolve the ambiguity by teaching the full mechanism here. | failure_mode:Findings become vague complaints; failure_mode:Scan turns into diagnosis of the learner | operational_stage=PRIME; method-specific knobs=MISSING | You are running M-PRE-014 (Ambiguity and Blind-Spot Scan) in PRIME stage.
Inspect the source for unclear jumps, contradictions, and follow-up targets that
TEACH should repair later.

Requirements:
- Stay source-grounded.
- Report ambiguities and unsupported jumps only.
- Do not turn this into learner diagnosis or full explanation.

Return exactly:
1) AmbiguityLog
2) UnsupportedJumpList
3) FollowUpTargets

This is non-assessment. Do not quiz, grade, or score the learner.
 |
| M-REF-001 | Error Autopsy | REFERENCE | Review errors from retrieval practice. For each error: (1) What did I say? (2) What's correct? (3) Why did I confuse them? (4) What cue will prevent this next time? Metacognitive error analysis. | List of errors from recent retrieval practice; Correct answers for each error; Reference materials for deep understanding; Error autopsy template (4-column format) -> Completed error autopsy table; Root cause analysis for each error; Discrimination cues created; Anki card candidates identified | Produce structured targets that RETRIEVE can directly test.; No retrieval drills until reference targets are explicit. | failure_mode:Defensive attribution ("trick question", "unfair"); failure_mode:Skipping the prevention cue (Column 4); failure_mode:Superficial analysis (just noting "I was wrong") | operational_stage=REFERENCE; artifact_depth=standard; link_density=medium | You are running M-REF-001 (Error Autopsy) in REFERENCE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Build concrete anchors and artifacts.
- Map concept to applied context.
- Do not skip artifact creation.

Required outputs:
- Completed error autopsy table
- Root cause analysis for each error
- Discrimination cues created
- Anki card candidates identified

Stop conditions:
- All errors from session analyzed
- Each error has a prevention cue
- High-value errors converted to study artifacts

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-REF-002 | Mastery Loop | REFERENCE | Re-study items missed during retrieval, then immediately re-test. Repeat until all items are recalled correctly. Based on successive relearning (Rawson & Dunlosky). | List of missed items from retrieval practice; Source materials for re-study; Testing mechanism (flashcards, quiz, or Tutor); Loop tracker (to count iterations) -> Mastery achieved on all targeted items; Loop count per item (difficulty metric); Weak anchor list (items needing 3+ loops); Updated spacing recommendations | Produce structured targets that RETRIEVE can directly test.; No retrieval drills until reference targets are explicit. | failure_mode:Not tracking loop counts; failure_mode:Re-studying too long before re-testing; failure_mode:Stopping after first correct recall (no overlearning) | operational_stage=REFERENCE; artifact_depth=standard; link_density=medium | You are running M-REF-002 (Mastery Loop) in REFERENCE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Build concrete anchors and artifacts.
- Map concept to applied context.
- Do not skip artifact creation.

Required outputs:
- Mastery achieved on all targeted items
- Loop count per item (difficulty metric)
- Weak anchor list (items needing 3+ loops)
- Updated spacing recommendations

Stop conditions:
- All items recalled correctly at least once
- Maximum loop limit reached (e.g., 5 loops per item)
- Time budget exhausted (with partial progress logged)

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-REF-003 | One-Page Anchor | REFERENCE | Build a single-page reference anchor containing minimal definitions, decision rules, canonical examples, near-misses, and traps. | PrioritySet; Source-grounded notes -> One-Page Anchor; Trap list and near-miss set | Produce structured targets that RETRIEVE can directly test.; No retrieval drills until reference targets are explicit. | failure_mode:Artifact too vague for retrieval; failure_mode:Reference bloat | operational_stage=REFERENCE; artifact_depth=standard; link_density=medium | You are running M-REF-003 (One-Page Anchor) in REFERENCE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Build concrete anchors and artifacts.
- Map concept to applied context.
- Do not skip artifact creation. - Preserve the main concept spine so the anchor supports later recall, not just storage.

Required outputs:
- One-Page Anchor
- Trap list and near-miss set

Stop conditions:
- Definitions, decision rules, examples, near-miss, traps all present

If required inputs are missing, request only the minimum needed input and continue.
Keep the anchor compact, retrieval-ready, and explicitly scoped to the active objective.
 |
| M-REF-004 | Question Bank Seed | REFERENCE | Generate a mode-tagged seed bank of 10-20 retrieval questions from objectives and anchor artifacts. | Objectives; One-Page Anchor; Assessment mode selector -> Question Bank Seed (10-20 items, mode-tagged); Coverage check draft | Produce structured targets that RETRIEVE can directly test.; No retrieval drills until reference targets are explicit. | failure_mode:Artifact too vague for retrieval; failure_mode:Reference bloat | operational_stage=REFERENCE; artifact_depth=standard; link_density=medium | You are running M-REF-004 (Question Bank Seed) in REFERENCE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Build concrete anchors and artifacts.
- Map concept to applied context.
- Do not skip artifact creation.

Required outputs:
- Question Bank Seed (10-20 items, mode-tagged)
- Coverage check draft

Stop conditions:
- At least 10 and at most 20 items
- Every item tagged by objective and assessment mode

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-RET-001 | Timed Brain Dump | RETRIEVE | Close materials. Set timer. Write everything you remember about the topic. No peeking. Compare after. Timed constraint adds desirable difficulty. | Topic or concept to recall; Blank paper or text area; Timer (5 min recommended); Reference materials (closed during recall, opened for comparison) -> Free recall dump (raw text with gaps marked); Accuracy assessment (what was correct vs. incorrect); Gap list (what was missing); RSR percentage estimate | Require closed-note recall first, then feedback.; If repeated misses occur, route back to ENCODE or REFERENCE. | failure_mode:Peeking during recall; failure_mode:Skipping the comparison step; failure_mode:Stopping too early when recall feels hard | operational_stage=RETRIEVE; difficulty=medium; feedback_timing=after_attempt | You are running M-RET-001 (Timed Brain Dump) in RETRIEVE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Require learner attempt first.
- Do not reveal full answer before attempt.
- Capture errors and route signals. - If the chain requires learner readiness before retrieval, confirm readiness first.

Required outputs:
- Free recall dump (raw text with gaps marked)
- Accuracy assessment (what was correct vs. incorrect)
- Gap list (what was missing)
- RSR percentage estimate

Stop conditions:
- Timer ends (hard stop)
- You've exhausted everything you can recall
- Comparison with source is complete

If required inputs are missing, request only the minimum needed input and continue.
This is retrieval, not surprise evaluation. If a learner-ready gate is active, honor it explicitly before the dump begins.
 |
| M-RET-002 | Sprint Quiz | RETRIEVE | Rapid-fire Q&A with Tutor. 10-15 questions in 5 min. Track accuracy for RSR. | Topic or concept set for quiz; Tutor AI (or pre-made question set); Timer (5 min recommended); Scoring tracker (correct/incorrect tally) -> RSR percentage (correct/total); List of missed questions; Weak anchor flags (uncertain but correct); Topics needing re-encoding | Require closed-note recall first, then feedback.; If repeated misses occur, route back to ENCODE or REFERENCE. | failure_mode:Looking up answers during quiz; failure_mode:Not committing to answers (hedging); failure_mode:Skipping RSR calculation | operational_stage=RETRIEVE; difficulty=medium; feedback_timing=after_attempt | You are running M-RET-002 (Sprint Quiz) in RETRIEVE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Require learner attempt first.
- Do not reveal full answer before attempt.
- Capture errors and route signals.

Required outputs:
- RSR percentage (correct/total)
- List of missed questions
- Weak anchor flags (uncertain but correct)
- Topics needing re-encoding

Stop conditions:
- Timer ends
- All planned questions answered
- RSR threshold achieved (if targeting specific level)

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-RET-003 | Fill-in-Blank | RETRIEVE | Review notes with key terms blanked out. Fill from memory. Targets specific vocabulary recall. | Notes or text with key terms identified; Cloze deletion tool (or manually blanked printout); Answer key for verification -> Completed cloze exercise; Accuracy count (correct/total blanks); Miss list for targeted review; Second-pass improvement rate | Require closed-note recall first, then feedback.; If repeated misses occur, route back to ENCODE or REFERENCE. | failure_mode:Blanking too many terms (cognitive overload); failure_mode:Rushing without committing to answers; failure_mode:Using blanks that have no context clues | operational_stage=RETRIEVE; difficulty=medium; feedback_timing=after_attempt | You are running M-RET-003 (Fill-in-Blank) in RETRIEVE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Require learner attempt first.
- Do not reveal full answer before attempt.
- Capture errors and route signals.

Required outputs:
- Completed cloze exercise
- Accuracy count (correct/total blanks)
- Miss list for targeted review
- Second-pass improvement rate

Stop conditions:
- All blanks attempted
- Second pass on missed items complete
- Accuracy threshold reached (e.g., 90%)

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-RET-004 | Mixed Practice | RETRIEVE | Interleave questions from 2-3 different topics in a single retrieval block. Builds discrimination and prevents blocked-practice illusion. Based on interleaving research (Rohrer et al.). | 2-3 different topics for interleaving; Question bank or Tutor AI covering all topics; Timer (10 min recommended); Randomization method (shuffle cards, AI random selection) -> Overall accuracy across all topics; Per-topic accuracy breakdown; Confusion matrix (which topics got mixed up); Discrimination insights (what cues distinguish topics) | Require closed-note recall first, then feedback.; If repeated misses occur, route back to ENCODE or REFERENCE. | failure_mode:Blocked practice creeping in (doing all topic A, then all topic B); failure_mode:Frustration at harder recall (interleaving feels harder); failure_mode:Not tracking which topic each question belongs to | operational_stage=RETRIEVE; difficulty=medium; feedback_timing=after_attempt | You are running M-RET-004 (Mixed Practice) in RETRIEVE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Require learner attempt first.
- Do not reveal full answer before attempt.
- Capture errors and route signals.

Required outputs:
- Overall accuracy across all topics
- Per-topic accuracy breakdown
- Confusion matrix (which topics got mixed up)
- Discrimination insights (what cues distinguish topics)

Stop conditions:
- Timer ends (10 min)
- All questions in the mixed set answered
- Discrimination accuracy meets threshold (can correctly identify topic)

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-RET-005 | Variable Retrieval | RETRIEVE | Retrieve the same concept in 3 different formats: (1) free recall, (2) application question, (3) compare/contrast. Varied retrieval contexts build more flexible memory traces. | Single concept or topic to retrieve; Three retrieval format prompts (free recall, application, compare/contrast); Reference materials for verification (closed during retrieval) -> Three retrieval outputs (free recall, application, compare/contrast); Accuracy assessment for each format; Difficulty ranking of formats; Flexibility gap identification | Require closed-note recall first, then feedback.; If repeated misses occur, route back to ENCODE or REFERENCE. | failure_mode:Picking a concept you don't know well enough yet; failure_mode:Rushing through formats without genuine retrieval effort; failure_mode:Skipping the compare/contrast format | operational_stage=RETRIEVE; difficulty=medium; feedback_timing=after_attempt | You are running M-RET-005 (Variable Retrieval) in RETRIEVE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Require learner attempt first.
- Do not reveal full answer before attempt.
- Capture errors and route signals.

Required outputs:
- Three retrieval outputs (free recall, application, compare/contrast)
- Accuracy assessment for each format
- Difficulty ranking of formats
- Flexibility gap identification

Stop conditions:
- All three formats completed
- Verification against source complete
- Format difficulty pattern noted

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-RET-006 | Adversarial Drill | RETRIEVE | Run near-miss adversarial prompts that force distinction between confusable concepts under low support. | Confusable pairs from Spine or ErrorLog; Question Bank Seed -> Adversarial near-miss results; ErrorLog updates | Require closed-note recall first, then feedback.; If repeated misses occur, route back to ENCODE or REFERENCE. | failure_mode:Answer leakage; failure_mode:Repeated misses | operational_stage=RETRIEVE; difficulty=medium; feedback_timing=after_attempt | You are running M-RET-006 (Adversarial Drill) in RETRIEVE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Require learner attempt first.
- Do not reveal full answer before attempt.
- Capture errors and route signals.

Required outputs:
- Adversarial near-miss results
- ErrorLog updates

Stop conditions:
- Near-miss set completed
- All misses logged

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-RET-007 | Timed Sprint Sets | RETRIEVE | Execute timed retrieval sprints and record latency per item to expose speed bottlenecks. | Question Bank Seed; Timer -> Timed sprint result set; Latency log; ErrorLog updates | Require closed-note recall first, then feedback.; If repeated misses occur, route back to ENCODE or REFERENCE. | failure_mode:Answer leakage; failure_mode:Repeated misses | operational_stage=RETRIEVE; difficulty=medium; feedback_timing=after_attempt | You are running M-RET-007 (Timed Sprint Sets) in RETRIEVE stage.
Execute this method card exactly and keep outputs deterministic.

Stage hard rules:
- Require learner attempt first.
- Do not reveal full answer before attempt.
- Capture errors and route signals.

Required outputs:
- Timed sprint result set
- Latency log
- ErrorLog updates

Stop conditions:
- Item-level latency captured
- Misses and speed failures logged

If required inputs are missing, request only the minimum needed input and continue.
 |
| M-TEA-001 | Story Spine | MISSING | Teach a sequence or pathway as a compact story with a beginning state, trigger, causal progression, consequence, and clinical breakpoint. | Ordered process, pathway, or sequence; Source anchors for the key steps -> Story spine; Ordered step list; Clinical breakpoint; Source-backed mechanism restatement | Keep the story inside the active objective scope.; Use the story only to clarify the true causal sequence.; End with a source-backed restatement. | failure_mode:Learner remembers story but not real terms; failure_mode:Story becomes decorative and loses the mechanism | operational_stage=MISSING; guidance_level=medium; output_format=bullets | You are running M-TEA-001 (Story Spine) in TEACH stage.
This method is non-assessment. Teach one bounded story chunk.
Return exactly:
1) StorySpine
2) OrderedStepList
3) ClinicalBreakpoint
4) MechanismRestatement
Keep the story faithful to the source sequence and translate back to formal source terms before stopping.
 |
| M-TEA-002 | Confusable Contrast Teach | MISSING | Teach two confusable concepts side-by-side by naming the shared bucket, the key difference, the signature clue, and the classic trap. | Two confusable concepts; Source anchors for definitions and discriminators -> Shared bucket statement; Key difference statement; Signature clues; Classic trap; Mini application contrast | Teach the shared bucket before the difference.; Keep the contrast bounded to the active objective scope.; Use a minimal application example, not a scored check. | failure_mode:Contrast stays too abstract; failure_mode:Too many differences create noise | operational_stage=MISSING; output_format=bullets | You are running M-TEA-002 (Confusable Contrast Teach) in TEACH stage.
This method is non-assessment. Teach the contrast clearly before any learner-built table.
Return exactly:
1) SharedBucket
2) KeyDifference
3) SignatureClues
4) ClassicTrap
5) MiniApplicationContrast
End with the cleanest discriminator in one sentence.
 |
| M-TEA-003 | Clinical Anchor Mini-Case | MISSING | Use one tiny patient scene to show why the concept matters clinically without turning the block into a full case drill. | Target concept; One clinically relevant consequence or decision point; Source anchors for the concept -> Mini-case scene; Concept-to-case link; Clinical significance statement; Overgeneralization boundary | Keep the case bounded to one concept and one clinical consequence.; Return to the concept explicitly after the scene.; Name one overgeneralization boundary. | failure_mode:Case feels detached from the concept; failure_mode:Case is too big and becomes a full reasoning drill | operational_stage=MISSING; output_format=bullets | You are running M-TEA-003 (Clinical Anchor Mini-Case) in TEACH stage.
This method is non-assessment. Use one tiny patient scene as an anchor, not as a drill.
Return exactly:
1) MiniCase
2) ConceptLink
3) ClinicalSignificance
4) BoundaryNote
Keep the case small and return to the core concept before stopping.
 |
| M-TEA-004 | Modality Switch | MISSING | Choose the best first representation for the concept and switch the explanation into that modality before overload sets in. | Target concept; Concept type; Available representation options -> Concept type; Chosen modality; Re-expressed teaching chunk; Modality rationale | Pick one dominant modality first.; Keep the representation choice tied to the concept type.; Do not add scored checks or retrieval probes. | failure_mode:Too many modalities at once; failure_mode:Wrong modality chosen for the concept | operational_stage=MISSING; guidance_level=medium; output_format=bullets | You are running M-TEA-004 (Modality Switch) in TEACH stage.
This method is non-assessment. Choose the clearest first representation for the concept and switch into it.
Return exactly:
1) ConceptType
2) ChosenModality
3) ReExpressedChunk
4) ModalityRationale
Prefer one strong modality over a cluttered mixed explanation.
 |
| M-TEA-005 | Jingle / Rhyme Hook | MISSING | Compress a fixed ordered list or stable sequence into a short jingle or rhyme after the learner understands the meaning of the items. | Fixed sequence or ordered list; Plain-language meaning of each step -> Sequence statement; Jingle or rhyme hook; Hook-to-sequence map; Distortion warning | Confirm meaning before mnemonic compression.; Use only for fixed sequences or stable ordered sets.; Map the hook back to the real sequence before stopping. | failure_mode:Hook comes before meaning; failure_mode:Hook distorts the order or content | operational_stage=MISSING; output_format=bullets | You are running M-TEA-005 (Jingle / Rhyme Hook) in TEACH stage.
This method is non-assessment. Build the hook only after the meaning is clear.
Return exactly:
1) SequenceStatement
2) JingleOrRhyme
3) HookSequenceMap
4) DistortionWarning
Use this only for fixed ordered material and state the simplification limit clearly.
 |
| M-TEA-006 | Depth Ladder (4-10-HS-PT) | MISSING | Route first-contact explanation through a brief hook, direct mechanism teaching, and DPT precision, using analogy or simple-language scaffolds only when comprehension actually needs recovery. | Active concept or objective; Source facts or PRIME artifacts; Learner familiarity signal -> DepthRoutePlan; L0Hook; L3Mechanism; FallbackScaffoldUsed; FunctionConfirmation; L4PrecisionRestatement | Default to brief L0 hook -> L3 mechanism -> L4 DPT precision.; Use L1/L2 only when comprehension needs recovery.; Require low-friction function confirmation before L4 precision.; Keep every move inside the active objective scope. | failure_mode:Depth ladder becomes a mandatory blank-page performance task; failure_mode:L4 detail arrives before function is actually clear; failure_mode:Tutor spends too long in analogy or simple-language mode | operational_stage=MISSING; guidance_level=medium; output_format=bullets | You are running M-TEA-006 (Depth Ladder (4-10-HS-PT)) in TEACH stage.
This method is non-assessment. Follow the depth route deliberately.
Return exactly:
1) DepthRoutePlan
2) L0Hook
3) L3Mechanism
4) FallbackScaffoldUsed
5) FunctionConfirmation
6) L4PrecisionRestatement
Default to brief L0 -> L3 -> L4. Use L1/L2 only as fallback scaffolds, and do not unlock L4 until function confirmation is captured.
 |
| M-TEA-007 | KWIK Lite | MISSING | Run the lightweight live mnemonic slot after the TEACH close artifact and before FULL CALIBRATE using one system-seeded cue plus one learner ownership action. | TEACH close artifact; Target term, concept, or ordered item to compress; Short meaning/function statement -> KWIKLiteSeed; LearnerOwnershipAction; FinalHook; DistortionGuard | Run only after the TEACH close artifact exists.; Do not use this slot before concept meaning is clear.; Keep the slot lighter than full KWIK Hook.; Skip by default for clinical reasoning or systems-integration topics unless a hook is clearly helpful. | failure_mode:Hook becomes too elaborate and turns into full KWIK; failure_mode:Hook distorts clinical reasoning or integrated systems content; failure_mode:Slot is used before meaning is clear | operational_stage=MISSING; output_format=bullets | You are running M-TEA-007 (KWIK Lite) in TEACH stage.
This method is non-assessment. It is the lightweight post-TEACH mnemonic slot, not full KWIK.
Return exactly:
1) KWIKLiteSeed
2) LearnerOwnershipAction
3) FinalHook
4) DistortionGuard
Only run this after the TEACH close artifact exists and the concept meaning is clear. Keep it to one system seed plus one learner ownership action.
 |

## D) Full Chain Catalog

| chain_id | category | method sequence | default knobs | gates and failure actions |
| --- | --- | --- | --- | --- |
| C-AD-001 | First Exposure | M-PRE-010 -> M-PRE-003 -> M-PRE-006 -> M-ENC-003 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-OVR-002 | class_type=anatomy; stage=first_exposure; energy=high; time_available=40 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-CI-001 | First Exposure | M-PRE-010 -> M-PRE-007 -> M-INT-006 -> M-INT-004 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-OVR-002 | class_type=clinical; stage=first_exposure; energy=high; time_available=45 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-CR-001 | Exam Ramp | M-PRE-010 -> M-PRE-003 -> M-PRE-006 -> M-INT-005 -> M-INT-004 -> M-REF-001 -> M-OVR-002 | class_type=clinical; stage=exam_prep; energy=high; time_available=45 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-DA-001 | First Exposure | M-PRE-010 -> M-PRE-007 -> M-ENC-003 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-ENC-001 -> M-OVR-002 | class_type=anatomy; stage=first_exposure; energy=high; time_available=40 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-DP-001 | First Exposure | M-PRE-010 -> M-PRE-007 -> M-ENC-005 -> M-ENC-008 -> M-INT-002 -> M-REF-003 -> M-REF-004 -> M-RET-005 -> M-REF-001 -> M-OVR-002 | stage=first_exposure; pass=depth; energy=high; time_available=45 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-EP-001 | Exam Ramp | M-PRE-002 -> M-REF-003 -> M-REF-004 -> M-RET-004 -> M-INT-004 -> M-REF-001 -> M-OVR-002 | stage=exam_prep; energy=high; time_available=35 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-FE-001 | First Exposure | M-PRE-010 -> M-PRE-008 -> M-PRE-009 -> M-CAL-001 -> M-INT-001 -> M-REF-003 -> M-CAL-002 -> M-CAL-003 -> M-ENC-001 -> M-REF-004 -> M-RET-001 -> M-RET-006 -> M-RET-007 -> M-OVR-002 -> M-OVR-003 | stage=first_exposure; energy=high; time_available=55 | Gates=prime_artifacts_present; micro_calibrate_before_teach; teach_chunk_delivered_when_present; teach_close_artifact_ready; full_calibrate_after_teach; mnemonic_after_teach_close_artifact_only; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-FE-MIN | First Exposure | M-PRE-010 -> M-PRE-008 -> M-CAL-001 -> M-TEA-004 -> M-REF-003 -> M-CAL-002 -> M-CAL-003 -> M-RET-001 -> M-OVR-001 | energy=low; retrieval_support=minimal; time_available_min=20; timed=off | Gates=micro_calibrate_before_teach; teach_close_artifact_ready; full_calibrate_after_teach; rsr_accuracy_ge_0.80; FailureActions=inject_reference_targets_before_retrieve; re_run_retrieval_gate_after_insertion |
| C-FE-PRO | First Exposure | M-PRE-010 -> M-PRE-008 -> M-CAL-001 -> M-TEA-001 -> M-ENC-011 -> M-CAL-002 -> M-CAL-003 -> M-REF-003 -> M-INT-005 -> M-RET-007 | energy=high; assessment_mode=procedure; near_miss_intensity=high | Gates=micro_calibrate_before_teach; teach_chunk_delivered_when_present; teach_close_artifact_ready; full_calibrate_after_teach; cascade_misses_eq_0; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-FE-STD | First Exposure | M-PRE-010 -> M-PRE-008 -> M-CAL-001 -> M-ENC-008 -> M-REF-003 -> M-CAL-002 -> M-CAL-003 -> M-ENC-010 -> M-ENC-001 -> M-REF-004 -> M-RET-007 | energy=medium; near_miss_intensity=low; time_available_min=35; timed=soft | Gates=micro_calibrate_before_teach; teach_chunk_delivered_when_present; teach_close_artifact_ready; full_calibrate_after_teach; mnemonic_after_teach_close_artifact_only; tie_breakers_complete; rsr_accuracy_ge_0.85; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-LE-001 | Maintenance | M-PRE-010 -> M-PRE-001 -> M-PRE-004 -> M-REF-003 -> M-REF-004 -> M-RET-003 -> M-OVR-001 | energy=low; time_available=15 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-MR-001 | Consolidation | M-REF-003 -> M-REF-004 -> M-RET-001 -> M-REF-001 -> M-REF-002 -> M-OVR-002 | stage=consolidation; energy=medium; time_available=30 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-PI-001 | First Exposure | M-PRE-010 -> M-PRE-007 -> M-ENC-007 -> M-PRE-005 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-REF-001 | class_type=pathology; stage=first_exposure; energy=high; time_available=45 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-QD-001 | Maintenance | M-PRE-010 -> M-PRE-001 -> M-REF-003 -> M-REF-004 -> M-RET-002 -> M-OVR-001 | stage=review; energy=medium; time_available=15 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-QF-001 | First Exposure | M-PRE-010 -> M-PRE-007 -> M-PRE-004 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-OVR-001 | stage=first_exposure; energy=medium; time_available=20 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-RS-001 | Maintenance | M-PRE-002 -> M-REF-003 -> M-REF-004 -> M-RET-002 -> M-INT-002 -> M-OVR-001 | stage=review; energy=medium; time_available=25 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-SW-001 | First Exposure | M-PRE-005 -> M-ENC-009 -> M-ENC-010 -> M-REF-003 -> M-REF-004 -> M-RET-002 -> M-OVR-002 | stage=first_exposure; pass=sweep; energy=medium; time_available=30 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |
| C-TRY-001 | First Exposure | M-PRE-004 -> M-ENC-015 -> M-CAL-001 -> M-TEA-001 -> M-INT-001 -> M-REF-003 -> M-CAL-002 -> M-CAL-003 -> M-ENC-001 -> M-ENC-009 -> M-RET-001 -> M-OVR-004 | stage=first_exposure; energy=medium; time_available=45; learner_style=top_down_narrative | Gates=prime_artifacts_present; micro_calibrate_before_teach; teach_chunk_delivered_when_present; teach_close_artifact_ready; full_calibrate_after_teach; mnemonic_after_teach_close_artifact_only; retrieve_after_reference_only; FailureActions=if_micro_calibrate_unstable_reduce_teach_chunk_size; if_full_calibrate_poor_route_to_targeted_encode; substitute_by_error_type_mapping |
| C-TRY-002 | First Exposure | M-PRE-004 -> M-ENC-015 -> M-CAL-001 -> M-ENC-008 -> M-INT-001 -> M-REF-003 -> M-CAL-002 -> M-CAL-003 -> M-ENC-001 -> M-ENC-009 -> M-RET-001 -> M-OVR-004 | energy=medium; near_miss_intensity=low; time_available_min=50; timed=soft | Gates=prime_artifacts_present; micro_calibrate_before_teach; teach_chunk_delivered_when_present; teach_close_artifact_ready; full_calibrate_after_teach; mnemonic_after_teach_close_artifact_only; retrieve_after_reference_only; tier_exit_allowed; FailureActions=if_micro_calibrate_unstable_reduce_initial_chunk; if_full_calibrate_poor_route_to_targeted_encode; substitute_by_error_type_mapping |
| C-VE-001 | First Exposure | M-PRE-010 -> M-PRE-001 -> M-ENC-009 -> M-ENC-010 -> M-REF-003 -> M-REF-004 -> M-RET-001 -> M-OVR-001 | stage=first_exposure; energy=high; time_available=40 | Gates=prime_artifacts_present; calibrate_attempt_completed; reference_targets_ready; retrieve_after_reference_only; exit_requires_rsr_or_remediation; FailureActions=inject_reference_targets_before_retrieve; substitute_by_error_type_mapping; re_run_retrieval_gate_after_insertion |

## E) Knob Dictionary

| knob | allowed values | default | semantics |
| --- | --- | --- | --- |
| artifact_depth | compact; standard; detailed | MISSING | Depth of generated reference artifacts. |
| assessment_mode | classification; mechanism; computation; definition; procedure; spatial; recognition; synthesis | procedure | Target assessment mode for chain routing. |
| class_type | anatomy; physiology; pathology; pharmacology; clinical; general | anatomy | Domain type for chain routing. |
| cognitive_depth | foundational_recall; conceptual_understanding; clinical_application | MISSING | Target cognitive depth for learning objectives. |
| complexity_level | epitome_only; intermediate_outline | MISSING | Complexity of structural output. |
| confidence_scale | HML; h_m_l; one_to_five | MISSING | Scale used for confidence judgments. |
| delivery_style | direct_statement; inquiry_based_preview | MISSING | How learning objectives are presented. |
| diagram_format | mermaid; ascii; markdown_list | MISSING | Format for generated diagrams. |
| difficulty | low; medium; high | MISSING | Difficulty level for retrieval and interrogation tasks. |
| energy | low; medium; high | high | Expected learner energy for chain matching. |
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
| operational_stage | PRIME; CALIBRATE; ENCODE; REFERENCE; RETRIEVE; OVERLEARN | MISSING | Control-plane operational stage. |
| output_format | ascii; ascii_tree; bulleted_spine; bullets; markdown_table; table | MISSING | Format for method output artifacts. |
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
| M-CAL-001 | calibration; retrieval; metacognitive_monitoring | Kornell et al. (2009) | MISSING | medium |
| M-CAL-002 | metacognitive_monitoring; calibration | Metcalfe (2017) | MISSING | medium |
| M-CAL-003 | adaptive_sequencing; error_localization | Rawson and Dunlosky (2011) | MISSING | medium |
| M-CAL-004 | metacognitive_monitoring; calibration; schema_assessment | Metcalfe (2017) | MISSING | medium |
| M-ENC-001 | dual_coding; elaboration; generation; emotional_encoding | Paivio (1991) | MISSING | medium |
| M-ENC-002 | generation; elaboration; desirable_difficulty | Slamecka & Graf (1978) | MISSING | medium |
| M-ENC-003 | dual_coding; retrieval; generation | Wammes et al. (2016) | MISSING | medium |
| M-ENC-004 | generation; elaboration; calibration | Nestojko et al. (2014) | MISSING | medium |
| M-ENC-005 | elaboration; generation | Dunlosky et al. (2013) | MISSING | medium |
| M-ENC-007 | elaboration; generation; calibration; feedback | Chi et al. (1994) | MISSING | medium |
| M-ENC-008 | elaboration; transfer; generation | Kulasegaram et al. (2013) | MISSING | medium |
| M-ENC-009 | MISSING | Novak & Canas (2008); concept mapping promotes meaningful learning through explicit relationship encoding | MISSING | medium |
| M-ENC-010 | discrimination; elaboration; dual_coding | Alfieri et al. (2013) | MISSING | medium |
| M-ENC-011 | elaboration; dual_coding; generation | Winn (1991) | MISSING | medium |
| M-ENC-012 | elaboration; discrimination; transfer | Charlin et al. (2000) | MISSING | medium |
| M-ENC-013 | dual_coding; elaboration; visualization; generation | Dresler et al. (2017) | MISSING | medium |
| M-ENC-014 | elaboration; narrative_encoding; generation | Bower & Winzenz (1970) | MISSING | medium |
| M-ENC-015 | dual_coding; generation; spatial_encoding; motor_encoding | Wammes et al. (2016) | MISSING | medium |
| M-INT-001 | elaboration; transfer; generation | Gentner (1983) | MISSING | medium |
| M-INT-002 | transfer; elaboration; generation | Schmidt & Rikers (2007) | MISSING | medium |
| M-INT-003 | elaboration; transfer | Pugh & Bergin (2006) | MISSING | medium |
| M-INT-004 | discrimination; elaboration | Alfieri et al. (2013) | MISSING | medium |
| M-INT-005 | MISSING | Schmidt & Rikers (2007); case-based walkthrough strengthens illness script formation and transfer | MISSING | medium |
| M-INT-006 | elaboration; generation; transfer | Schmidt & Rikers (2007) | MISSING | medium |
| M-OVR-001 | metacognition; reflection; calibration; planning | Tanner (2012) | MISSING | high |
| M-OVR-002 | spacing; retrieval; generation; artifact_creation | Kornell (2009) | MISSING | medium |
| M-OVR-003 | spacing; interleaving; retrieval | Rawson & Dunlosky (2011) | MISSING | medium |
| M-OVR-004 | retrieval; generation; metacognition; consolidation; error_detection | RetrievalPractice.org (2017) | MISSING | medium |
| M-PRE-001 | MISSING | Ausubel (1968); Bjork & Bjork (2011); prior knowledge activation strengthens subsequent encoding | MISSING | medium |
| M-PRE-002 | generation; elaboration | Jamison et al. (2023/2024) | MISSING | medium |
| M-PRE-003 | retrieval; elaboration; transfer | Ausubel (1968) | MISSING | medium |
| M-PRE-004 | schema_activation; subsumption | Ausubel (1960); Luiten et al. (1980); advance organizers facilitate subsumption of new material | MISSING | medium |
| M-PRE-005 | elaboration; discrimination | Novak & Cañas (2008) | MISSING | medium |
| M-PRE-006 | schema_activation; chunking | Ausubel (1960) | MISSING | medium |
| M-PRE-007 | retrieval; desirable_difficulty; calibration | Richland et al. (2009) | MISSING | medium |
| M-PRE-008 | scaffolding; metacognitive_monitoring | Ausubel (1968) | MISSING | medium |
| M-PRE-009 | schema_activation; integration | Ausubel (1968) | MISSING | medium |
| M-PRE-010 | MISSING | Ausubel (1968); Hattie (2009); explicit learning objectives improve encoding direction and metacognitive monitoring | MISSING | high |
| M-PRE-012 | pretraining_principle; vocabulary_grounding; schema_activation | Mayer (2009); pretraining helps novices when key parts and names are introduced before complex explanation. | MISSING | medium |
| M-PRE-013 | advance_organizer; orientation; schema_activation | Ausubel (1968); advance organizers help assimilation of new material when structure is established before detail. Mayer (2009); segmented orientation helps novices manage complex material. | MISSING | medium |
| M-PRE-014 | gap_detection; attention_guidance; prequestioning | Overoye et al. (2021); Pan and Rivers (2023); Hausman and Rhodes (2018); bounded prequestions and targeted attention-shaping can potentiate later learning when they highlight what matters without becoming hidden explanation. | MISSING | medium |
| M-REF-001 | error_correction; metacognition; elaboration; discrimination | Metcalfe (2017) | MISSING | medium |
| M-REF-002 | retrieval; spacing; successive_relearning; mastery_learning | Rawson & Dunlosky (2011) | MISSING | medium |
| M-REF-003 | elaboration; discrimination | Schmidt & Rikers (2007) | MISSING | medium |
| M-REF-004 | retrieval; transfer | Roediger & Karpicke (2006) | MISSING | medium |
| M-RET-001 | retrieval; generation; calibration | Roediger & Karpicke (2006) | MISSING | medium |
| M-RET-002 | retrieval; testing; calibration; spacing | McDaniel et al. (2007) | MISSING | medium |
| M-RET-003 | retrieval; cued_recall; vocabulary_encoding | Dunlosky et al. (2013) | MISSING | medium |
| M-RET-004 | retrieval; interleaving; discrimination; transfer | Rohrer et al. (2015) | MISSING | medium |
| M-RET-005 | retrieval; transfer; elaboration; varied_practice | Morris et al. (1977) | MISSING | medium |
| M-RET-006 | discrimination; retrieval | Rohrer et al. (2015) | MISSING | medium |
| M-RET-007 | retrieval; desirable_difficulty | Cepeda et al. (2006) | MISSING | medium |
| M-TEA-001 | scaffolding; elaboration; transfer | Mayer (2009) | MISSING | medium |
| M-TEA-002 | discrimination; scaffolding; transfer | Alfieri et al. (2013) | MISSING | medium |
| M-TEA-003 | elaboration; transfer; scaffolding | Schmidt and Rikers (2007) | MISSING | medium |
| M-TEA-004 | scaffolding; dual_coding; cognitive_load | Mayer (2009) | MISSING | medium |
| M-TEA-005 | dual_coding; elaboration; generation | Paivio (1991) | MISSING | medium |
| M-TEA-006 | scaffolding; worked_examples; transfer | Mayer (2009) | MISSING | medium |
| M-TEA-007 | dual_coding; elaboration; generation | Paivio (1991) | MISSING | medium |

## H) Open Gaps List

### Missing metadata fields
- methods missing explicit `stage`: 59 (examples: M-CAL-001, M-CAL-002, M-CAL-003, M-CAL-004, M-ENC-001, M-ENC-002, M-ENC-003, M-ENC-004)
- methods missing method-specific `knobs`: 3
- methods with no explicit gates (`gating_rules` or `stop_criteria`): 0
- chains missing chain-specific `gates`: 0
- chains missing chain-specific `failure_actions`: 0

### Unclear gates
- Most chains rely on global stage gates from the control-plane rather than chain-local gate definitions.
- Most methods use stop criteria as implicit gates; explicit gating_rules are sparse.

### Chain dependency risks
- chains where RETRIEVE appears before REFERENCE artifact producer: 0

### Research uncertainties
- methods with missing DOI in evidence fields: 59
- methods with no parseable evidence citation text: 0
- methods not directly mapped in ErrorType -> mandatory override table: 59
- Evidence strength labels are heuristic from canonical citation text until a DOI-linked evidence registry is completed.
