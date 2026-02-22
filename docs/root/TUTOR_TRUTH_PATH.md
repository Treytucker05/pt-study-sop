# Tutor Truth Path (Single Navigation)

Date: 2026-02-22  
Purpose: prevent documentation drift by defining exactly where to read and write decisions.

## Read Order (Authoritative)
1. `docs/root/TUTOR_OWNER_INTENT.md`
2. `docs/root/TUTOR_CATEGORY_DEFINITIONS.md`
3. `docs/root/TUTOR_METHOD_SELECTION_RULES.md`
4. `docs/root/TUTOR_NORTH_STAR_RULES.md`
5. `docs/root/TUTOR_OBSIDIAN_NOTE_RULES.md`

## Reference-Only Documents
- `docs/root/TUTOR_CONTROL_PLANE_CANON.md`
  - Use for evidence/rationale context.
  - Do not treat as the first place to define new product requirements.
- `docs/root/TUTOR_TODO.md`
  - Active execution tracker (priority order, implementation tasks, current focus).
  - Do not store canonical policy here; store policy in authoritative docs above.
- `docs/root/TUTOR_PRIME_DRAFT_MATRIX.md`
  - Working draft for PRIME method policy/knob matrices pending manager reconciliation.
  - Promote finalized decisions into canonical docs.

## Write Rules
- If owner preference changes:
  - update `docs/root/TUTOR_OWNER_INTENT.md`
- If category semantics change:
  - update `docs/root/TUTOR_CATEGORY_DEFINITIONS.md`
- If stage/method boundary policy changes:
  - update `docs/root/TUTOR_METHOD_SELECTION_RULES.md`
- If North Star/session-start gate logic changes:
  - update `docs/root/TUTOR_NORTH_STAR_RULES.md`
- If Obsidian note format / wiki-link / graph rules change:
  - update `docs/root/TUTOR_OBSIDIAN_NOTE_RULES.md`
- If adding evidence background:
  - update `docs/root/TUTOR_CONTROL_PLANE_CANON.md`

## Non-Negotiable Defaults (Current)
- System model: `Category -> Method -> Knob -> Chain`
- First-exposure-first mode is default.
- PRIME is non-assessment.
- CALIBRATE starts assessment probes.
- Mind Map default representation knob is `ASCII`.
- Session planning is blocked until North Star is loaded/validated.
- Tutor-generated notes include wiki links at creation time.
