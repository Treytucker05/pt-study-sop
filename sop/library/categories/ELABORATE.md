# ELABORATE Category Reference

Stage: 7b of 12 (deepen) | Control Stage: `ELABORATE`
Purpose: Deepen already-encoded material through analogy, schema construction, transfer, and worked application — turn brittle recall into flexible, applied understanding without re-teaching first-contact content.

## Entry / Exit

- **Entry**: The target concept has already been encoded. The learner can attempt retrieval, comparison, or application before seeing the answer.
- **Exit**: The learner produces a structured artifact (analogy, illness script, applied case, or schema) that links the concept to other knowledge and exposes at least one boundary, breakdown point, or limit.

## Hard Rules

- Not for first exposure. If the concept is unencoded, route back to PRIME or ENCODE rather than attempting elaboration.
- Active processing is mandatory: the learner must generate, map, or transform the material — not passively re-read.
- Every elaboration must include at least one boundary or breakdown point so the learner does not mistake the elaboration for the full truth.
- Stay within objective scope — do not drift into adjacent material during an ELABORATE block.
- Always return to the real concept after the elaboration move (analogy, application, schema). The elaboration is a bridge, not a substitute.

## Method Inventory

| ID | Name | Energy | Duration | Key Mechanism |
|----|------|--------|----------|--------------|
| M-ELB-001 | Analogy Bridge | medium | 3 min | structure_mapping + analogical_reasoning |
| M-ELB-002 | Clinical Application | medium | 4 min | transfer + scenario_reasoning |
| M-ELB-003 | Case Walkthrough | medium | 5 min | case_based_reasoning + retrieval |
| M-ELB-004 | Illness Script Builder | medium | 5 min | schema_building + causal_chain |

## Contract Summary

All ELABORATE methods share these behavioral constraints:

- **Allowed**: Map structural correspondences, apply concepts to scenarios, build illness scripts, walk through cases, name boundaries and breakdown points, refine after a learner attempt.
- **Forbidden**: Use elaboration on unencoded material, accept surface-level mapping without structure, skip boundary identification, let the elaboration stand as a substitute for source-backed fact, present content outside the mapped objective scope.
- **Required outputs**: Vary per method — see individual YAML files. All methods produce a learner-generated artifact plus at least one explicit limit, breakdown, or differentiator.

## ELABORATE / RETRIEVE Boundary

- ELABORATE owns deepening through generative work (analogy, schema, application). RETRIEVE owns adversarial recall under timed conditions.
- An ELABORATE artifact stays within elaboration as long as the learner is producing structure or application; once the focus shifts to bare recall against a clock, hand off to RETRIEVE.
- Some elaboration methods (Case Walkthrough) involve retrieval as a sub-step — that is fine as long as the primary output is a structured artifact, not a recall score.

## Sample Tutor Prompt

```
You are running an ELABORATE block. The target concept has already
been encoded. Your job is to deepen it through analogy, schema, or
application. Require the learner to generate or transform the material
before you complete the artifact. Always name at least one boundary
or breakdown point. Return to the real concept after the elaboration
move. Do not re-teach first-contact content.
```

## Evidence Anchors

- Gentner (1983); Richland and Simms (2015): structure-mapping theory supports explicit relational alignment over surface-feature matching
- Pressley et al. (1992); Dunlosky et al. (2013): elaborative interrogation ("why is this true?") produces moderate gains when applied to already-encoded material
- Schmidt and Rikers (2007): illness scripts and schema construction underpin clinical reasoning expertise
- Charlin et al. (2007): case-based reasoning supports transfer from declarative knowledge to applied judgment
- Alfieri, Nokes-Malach, and Schunn (2013): comparing aligned cases improves conceptual learning and transfer
