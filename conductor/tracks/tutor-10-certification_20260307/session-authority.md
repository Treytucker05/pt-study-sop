# Session Authority Map

This document freezes the canonical ownership map for session scope truth in the certified Tutor path.

## Certified Setup Path

1. `Tutor Wizard` seeds setup intent only.
2. `POST /api/tutor/session/preflight` resolves scope truth.
3. `POST /api/tutor/session` consumes that resolved scope.
4. `tutor_sessions.content_filter_json` becomes persisted runtime truth for restore/resume.

## Scope Ownership

### Preflight owns

- `course_id`
- `study_unit`
- `material_ids`
- `objective_scope`
- `focus_objective_id`
- `resolved_learning_objectives`
- `map_of_contents`
- `vault_folder`
- `recommended_mode_flags`
- `blockers`

Rule:
- these fields are certification-critical scope truth
- the certified path should not recompute them from free-text topic input after preflight succeeds

### Session create owns

- session identity
- chain identity
- persisted runtime copy of the scoped filter
- session lifecycle status

Rule:
- create consumes preflight output
- create does not become a second scope resolver in the certified path

### Active session row owns

- restore/resume truth
- `content_filter_json`
- turn continuity
- `last_response_id`
- active chain/block position

Rule:
- restore/resume must hydrate from persisted session state first
- local UI storage may help seed the Wizard, but it must not override active certified session truth

### Tutor start surface and localStorage own

- UI convenience state only:
  - last selected materials
  - last topic draft
  - last accuracy profile
  - start-panel draft state

Rule:
- localStorage is not scope authority
- it may seed setup when there is no active certified session
- it must be discarded when stale, corrupted, or contradicted by active session data

### Library handoff owns

- canonical selected-material handoff into the Tutor setup UI

Rule:
- library handoff beats stale wizard restore
- library handoff does not beat an already active certified session

### Adapter CRUD and Obsidian scaffolds own

- read/admin surfaces
- note persistence
- note structure and continuity context

Rule:
- these are not scope authority for objective lock in the certified runtime path
- they may reflect or persist scope, but do not resolve it

## Remaining Consolidation Work

- `T-201`: enforce preflight as the only certified setup authority in the supported runtime path
- `T-202b`: remove remaining places where session creation or auxiliary CRUD can silently become a second scope resolver
