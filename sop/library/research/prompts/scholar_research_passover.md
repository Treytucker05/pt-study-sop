# Scholar Research Passover Prompt

## Instructions
You are conducting a targeted evidence review for the PT Study SOP Method Library.

## Input (paste below)
- **Target type:** METHOD | CHAIN | ENGINE
- **Target ID:** {{TARGET_ID}}
- **Current spec:** (paste YAML)
- **Constraints:** {{CONSTRAINTS}}
- **Success metrics:** {{METRICS}}

## Required Output Sections

### A) Canonical Spec
Updated YAML spec with evidence-backed changes only.

### B) Keywords
Primary search terms, synonyms, exclusion terms used.

### C) Evidence Synthesis
- Top 3-5 findings (citation, design, effect size, relevance)
- Confidence: HIGH / MEDIUM / LOW per finding
- Contradictions or boundary conditions

### D) Operational Rules
If/then rules derived from evidence. Map to logged metrics where possible.
Format: IF [condition from logs] THEN [action].

### E) Library Patch Plan
File-level diffs: which YAML files to edit/create, what changes, why.
```yaml
# files_to_change:
#   - path: sop/library/methods/M-XXX-NNN.yaml
#     change: "update evidence.citation, add stop_criteria"
#   - path: sop/library/chains/C-XXX-NNN.yaml
#     change: "insert new block at position 3"
```

### F) Validation Plan
- Hypothesis: what measurable improvement is expected
- Control: current chain/method behavior
- Variant: proposed change
- Metrics: which logging fields to compare (must exist in session_log_template.yaml)
- Thresholds: minimum effect to accept
- Run window: N sessions or N days

## Non-Negotiables
- Do NOT invent evidence. If uncertain, say "INSUFFICIENT EVIDENCE" and mark confidence LOW.
- Map every recommendation to a logged metric.
- Keep changes minimal and testable — one variable at a time.
- Cite DOI/URL where available.
