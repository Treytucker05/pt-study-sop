# Tutor Obsidian Note Rules (Canonical)

Date: 2026-02-22  
Purpose: define exactly how tutor outputs notes for Obsidian and how those notes participate in the RAG graph.

## Scope
- Applies to all tutor-generated note artifacts.
- Applies to first-exposure and review sessions.
- This file is canonical for note structure, wiki-link behavior, and graph linkage rules.

## Non-Negotiable Defaults
- Tutor notes must include wiki links at generation time.
- Wiki links are not a later cleanup step.
- PRIME outputs structure-first notes (no assessment scoring in PRIME).
- Mind-map style visual defaults remain `ASCII` unless method-specific knobs override.

## Required Tutor Artifacts
1. `Session Note` (one per tutor session)
2. `Concept Note` (one per core concept node)

## Session Note Contract
- Must include:
  - session metadata (date, module, stage flow)
  - source materials used
  - generated concept links
  - unknowns and follow-up targets
  - next actions (what moves to CALIBRATE/ENCODE/RETRIEVE)
- Must wiki-link each concept note created in session.

## Concept Note Contract
- Must include:
  - definition
  - why it matters
  - prerequisites
  - relationships
  - retrieval targets
  - common errors
  - next review target/date (if scheduled)
- Must wiki-link:
  - parent module note
  - prerequisite concepts
  - related/confusable concepts

## Frontmatter Minimum
Use this minimum frontmatter in tutor-generated concept notes:

```yaml
---
note_type: concept
module_id: <module-id>
control_stage: <PRIME|CALIBRATE|ENCODE|REFERENCE|RETRIEVE|OVERLEARN>
source_ids: [<material-id-1>, <material-id-2>]
tags: [pt-study, tutor]
---
```

## Wiki-Link Rules
- Use Obsidian wiki links: `[[Note Name]]`.
- If a concept is referenced in text, it should be linked on first mention.
- Prefer stable concept note titles (avoid frequent renames).
- Do not create orphan concept notes with zero inbound/outbound links.
- If a referenced note does not exist yet, create a planned stub entry in the session note.

## Graph Edge Rules (RAG)
- The graph is derived from:
  - wiki links in note body
  - explicit relationship sections (`prerequisite_for`, `supports`, `contrasts_with`)
- Retrieval priority for tutoring:
1. current module notes
2. directly linked neighbors
3. broader semantic/global notes
- No retrieval stage should run without reference targets already documented.

## PRIME-Specific Note Behavior
- PRIME notes are orientation artifacts:
  - structural skeleton
  - concept clusters
  - objective primer
  - unknowns
- PRIME does not write scored assessment outputs.

## Quality Checks
- Every session note must link to at least 1 concept note.
- Every concept note must have at least 2 links (one parent/module + one relation).
- Every retrieval target must map to at least one concept note.

## Ownership and Change Control
- Update this file when note schema, linking policy, or graph rules change.
- If owner preference changes, update `docs/root/TUTOR_OWNER_INTENT.md` first, then reconcile this file.
