# Release Process

Purpose: Document the repeatable steps to cut a release without drift.
Audience: Maintainers preparing a tagged release.
Source of Truth: SOP canon in `sop/library/` (generated runtime bundle in `sop/runtime/`) and this process doc for mechanics.

## Inputs (Canon Paths)
- SOP canon: `sop/library/`
- Generated runtime bundle: `sop/runtime/knowledge_upload/`
- Release bundle template: `releases/`
- Supporting scripts: `scripts/release_check.py`

## Validation Gates
1. **Bytecode compile:** `python -m compileall .` must succeed.
2. **Tests:** `pytest` runs if tests are present; failures block the release.
3. **Encoding check:** `scripts/release_check.py` enforces ASCII-only README files.
4. **Drift check:** Confirm `sop/runtime/knowledge_upload/` is up to date with `sop/library/`; if mismatch, rebuild the runtime bundle before tagging.

## Output
- New release directory under `releases/vX.Y/` containing the frozen snapshot (README, GPT bundles, scripts as needed).

## Steps to Cut a Release
1. Ensure working tree is clean and on the release branch.
2. Run `python scripts/release_check.py` from repo root; fix any failures.
3. Copy the generated runtime bundle from `sop/runtime/knowledge_upload/` into the target `releases/vX.Y/` folder (or update existing versioned folder).
4. Update version markers in `README.md` and release README files to reflect `vX.Y`.
5. Spot-check key flows (e.g., brain setup) using the release folder contents only.
6. Commit the release folder changes and tag as needed.
7. Publish the release snapshot and associated notes.
