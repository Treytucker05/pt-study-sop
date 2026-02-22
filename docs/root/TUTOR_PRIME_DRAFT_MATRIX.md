# PRIME Draft Matrix (Policy + Knobs)

Date: 2026-02-22  
Status: Draft for manager reconciliation  
Scope: PRIME method blocks only (with CALIBRATE boundary note for `M-PRE-007`)

## Draft Boundary Rules (Locked Inputs)
- PRIME is orientation/teaching only (non-assessment).
- CALIBRATE starts scored probes.
- First-exposure default intake is 3-5 core concepts.
- Visual boundary uses `Provide vs Produce`:
  - PRIME: tutor provides scaffold visuals.
  - ENCODE: learner produces/manipulates visuals.

## Step 1 (Locked) — M-PRE-010 Learning Objectives Primer

### Contract (Final for implementation)
- Stage: `PRIME` only.
- Intent: establish objective orientation before any deep content, either module-wide or single-focus.
- Objective source precedence:
  - instructor-provided objectives are authoritative.
  - source-material-derived objectives are fallback only.
- Required outputs:
  - `ModuleObjectiveMap` (module_all mode)
  - `FocusObjectiveCard` (single_focus mode)
  - `SelectedFocusObjectiveId`
  - `LearnerAcknowledgment`
- Hard blocked behaviors:
  - scored questions
  - retrieval checks
  - confidence scoring
  - answer grading
- Exit criteria:
  - module_all: all active module objectives surfaced at high level.
  - single_focus: one measurable objective is defined.
  - selected focus objective exists for downstream chain steps.
  - learner acknowledges goals.

### Knobs (Locked for step 1)
- `objective_scope` (enum): `module_all | single_focus`
  - default: `module_all`
  - `module_all` is your default start mode for big-picture priming.
- `cognitive_depth` (enum): `foundational_recall | conceptual_understanding | clinical_application`
  - default: `conceptual_understanding`
  - first-exposure lock: `foundational_recall` or `conceptual_understanding`
- `delivery_style` (enum): `direct_statement | inquiry_based_preview`
  - default: `direct_statement`
  - low-energy or short-time lock: `direct_statement`

### Runtime wiring notes (implemented/required)
- FE chains now start with `M-PRE-010` before other PRIME methods.
- North Star/session gate injects objective context and reference bounds at session start.
- `M-PRE-010` method YAML now includes:
  - objective-source precedence
  - non-assessment constraints
  - explicit steps/outputs/stop criteria

## Step 2 (Locked) — M-PRE-008 Structural Extraction

### Contract (Final for implementation)
- Stage: `PRIME` only.
- Intent: build a compact orientation spine tied directly to objectives.
- Dependency note: requires objective context, sourced from either `M-PRE-010` (current flow) or existing `North Star` (prior context). Pairing with `M-PRE-010` is recommended, not mandatory.
- Scope behavior:
  - `module_all`: spine spans all active module objectives.
  - `single_focus`: spine constrained to selected focus objective.
- Required outputs:
  - `StructuralSpine`
  - `Objective linkage map`
  - `UnknownNodeList`
  - `PriorityNodes`
- Hard blocked behaviors:
  - scored questions
  - retrieval checks
  - confidence scoring
  - deep-detail teaching
- Exit criteria:
  - spine node count within cap
  - every node linked to at least one objective
  - unknown list captured (can be empty)

### Knobs (Locked for step 2)
- `priming_depth_mode` (enum): `basic | schema` (default `basic`)
  - `basic` target window: `2-5` min
  - `schema` target window: `5-10` min for complex topics
- `node_cap` (int): min `6`, max `12`, default `10`
- `output_format` (enum): `ascii_tree | bulleted_spine | markdown_table` (default `ascii_tree`)
- `objective_link_required` (bool): default `true` (hard lock `true` in PRIME)

### Metrics (M-PRE-008)
- `spine_node_count`
- `objective_link_coverage_rate` (linked nodes / total nodes)
- `unknown_node_count`
- `priority_node_count`
- `prime_assessment_violation_count` (target `0`)
- `prime_retrieval_violation_count` (target `0`)
- `trivia_node_rate` (target near `0`)

## Matrix A — PRIME Policy Contract

| Method ID | Method | Stage | Draft intent | Required outputs | Allowed behavior | Blocked behavior |
|---|---|---|---|---|---|---|
| M-PRE-010 | Learning Objectives Primer | PRIME | Set 3-5 measurable targets before content depth | Objectives list; learner acknowledgment | Goal framing; expectation setting | Scored questioning; retrieval grading |
| M-PRE-004 | AI Skeleton Review | PRIME | Provide high-level structural map of topic | Hierarchical skeleton; priority sections | Tutor-provided orientation map | Deep detail teaching; assessment prompts |
| M-PRE-008 | Structural Extraction | PRIME | Build compact topic spine linked to objectives | Spine <=12 nodes; objective linkage map | Structure extraction from source | Trivia expansion; scoring correctness |
| M-PRE-009 | Emphasis Audit | PRIME | Separate must-know from secondary and set run goals | GoalTargets; Unknowns; Predictions | Priority setting; uncertainty capture | Quiz-style checks; confidence scoring |
| M-PRE-003 | Prior Knowledge Scan | PRIME | Surface anchors and prerequisite gaps | Connection map; primary anchor; gap list | Connection labeling; optional visual | Penalizing weak prior knowledge |
| M-PRE-005 | Concept Cluster | PRIME | Organize terms into meaningful clusters | 3-5 labeled clusters; inter-cluster links | Tutor-guided organization | Detailed mechanism testing |
| M-PRE-006 | Three-Layer Chunk | PRIME | Layer topic into big picture, key details, edge cases | Three-layer breakdown; priority assignment | Ordered chunking guidance | Retrieval scoring; timed pressure |
| M-PRE-002 | Prediction Questions | PRIME | Generate forward hooks for focused reading | 3-5 prediction questions; curiosity ranking | Curiosity priming; orientation questions | Grading answers; confidence scoring |
| M-PRE-001 | Brain Dump | PRIME | Synthesize learner’s current map after orientation | Strong Connections; Missing Nodes; gap baseline | Non-scored synthesis feedback | Quiz framing; penalization; follow-up testing |

## Boundary Note (Not PRIME)
- `M-PRE-007 Pre-Test` is currently `CALIBRATE`, and should stay assessment-owned.

## Visual Boundary Note (ENCODE Methods)
- `M-ENC-009 Concept Map`, `M-ENC-011 Process Flowchart`, `M-ENC-012 Clinical Decision Tree` remain ENCODE unless a PRIME-lite tutor-provided variant is explicitly created.

## Matrix B — PRIME Knob Matrix (Existing + Draft Additions)

| Method ID | Knob | Type | Default | Draft bounds/options | Draft lock/escalate/rollback |
|---|---|---|---|---|---|
| M-PRE-010 | cognitive_depth | enum | conceptual_understanding | foundational_recall, conceptual_understanding, clinical_application | Lock to foundational/conceptual in first exposure; escalate to clinical after stable CALIBRATE |
| M-PRE-010 | delivery_style | enum | direct_statement | direct_statement, inquiry_based_preview | Lock to direct_statement when energy/time low |
| M-PRE-004 | complexity_level | enum | intermediate_outline | epitome_only, intermediate_outline, detailed_hierarchy | Roll back to epitome_only if overload signs appear |
| M-PRE-001 | feedback_style | enum | supportive_synthesis | supportive_synthesis, strict_gap_analysis | Lock supportive in first exposure; allow strict only after repeated sessions |
| M-PRE-002 | question_count (draft) | int | 4 | min 3, max 5 | Lock at 3 when cognitive load high |
| M-PRE-002 | question_scope (draft) | enum | foundational | foundational, mixed | Keep foundational in first exposure |
| M-PRE-003 | map_format (draft) | enum | bullet_list | bullet_list, ascii_map | Roll back to bullet_list if map complexity rises |
| M-PRE-003 | connection_target (draft) | int | 3 | min 3, max 5 | Lock at 3 for low energy/time |
| M-PRE-005 | cluster_limit (draft) | int | 4 | min 3, max 5 | Roll back if one cluster dominates |
| M-PRE-005 | render_format (draft) | enum | ascii_list | ascii_list, ascii_map, markdown_table | Lock to ascii_list by default |
| M-PRE-006 | detail_depth (draft) | enum | standard | light, standard, expanded | Keep light/standard in first exposure |
| M-PRE-008 | node_cap (draft) | int | 10 | min 6, max 12 | Hard cap 12; no escalation beyond 12 |
| M-PRE-008 | objective_link_required (draft) | bool | true | true/false | Hard lock true in PRIME |
| M-PRE-009 | goal_count (draft) | int | 3 | fixed 3 | Hard lock 3 to keep focus |
| M-PRE-009 | prediction_required (draft) | bool | true | true/false | Hard lock true in PRIME |

## Draft PRIME Sequence (Implementation-Oriented)
1. `M-PRE-010` Learning Objectives Primer  
2. `M-PRE-004` AI Skeleton Review  
3. `M-PRE-008` Structural Extraction  
4. `M-PRE-009` Emphasis Audit  
5. `M-PRE-003` Prior Knowledge Scan  
6. `M-PRE-005` Concept Cluster  
7. `M-PRE-006` Three-Layer Chunk  
8. `M-PRE-002` Prediction Questions  
9. `M-PRE-001` Brain Dump

## Open Items to Resolve with Manager Output
- Confirm which draft knobs become canonical vs remain optional.
- Confirm whether Prediction Questions should remain PRIME in first-exposure mode or become optional-only.
- Confirm whether PRIME-lite variants are needed for any ENCODE visual methods.
