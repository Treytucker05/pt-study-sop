# Contributing

This repository centers on the Runtime Canon in `sop/gpt-knowledge/`. Keep changes minimal and explicit so the canon stays trustworthy.

## Safe Changes
- Documentation and CI configuration updates are safe by default.
- Runtime Canon (`sop/gpt-knowledge/`) changes should stay isolated and clearly documented; avoid altering SOP behavior unless explicitly requested.
- Brain code, prompts, and database logic should not be modified for routine documentation updates.

## How to Validate Changes
Run these commands from the repository root:
- Unit tests: `python -m pytest brain/tests`
- Brain smoke check (creates/updates local SQLite): `python brain/db_setup.py`

If you add dependencies, document how to install them alongside these commands.

## Pull Request Expectations
- Keep Runtime Canon edits in their own commits or PR sections so reviewers can audit them separately.
- Update documentation when terminology or version messaging changes.
- Include before/after notes for any SOP-facing text so reviewers can spot intent quickly.
