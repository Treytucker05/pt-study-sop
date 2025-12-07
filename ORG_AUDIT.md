# PT Study SOP — Repository Organization Audit

This audit focuses on how the repository is structured and how that structure supports maintenance of the PT Study SOP release package.

## Top Gaps

1. **Duplicate Brain code paths without a declared source of truth.**
   - The root repo ships a `brain/` directory while the release package embeds its own copy under `releases/v9.1/brain/`, but there is no guidance on which one should receive updates or how they stay in sync. The copies already differ in files such as `README.md`, `generate_resume.py`, and bundled session logs, so changes can silently diverge. 【F:README.md†L25-L49】【8841f7†L1-L11】
   - **Impact:** Bug fixes or schema tweaks may be applied to only one location, leading to inconsistent behavior between development and the packaged release.
   - **Recommendation:** Declare a single authoritative `brain/` (likely the root version) and add a build/publish step that regenerates `releases/<version>/brain` from it. Document the sync process and remove manual edits in the packaged copy.

2. **Release package is manually duplicated from source materials with no regeneration path.**
   - The README calls `releases/v9.1/` the starting point, while `sop/` is described as "source files (development)," but there is no documented workflow for rebuilding the release assets (GPT instructions, knowledge files, Brain package) from the source tree when a new version is cut. 【F:README.md†L11-L49】
   - **Impact:** The packaged release can drift from the maintained source (e.g., if frameworks or modules in `sop/` change) and makes auditing or reproducing the release content difficult.
   - **Recommendation:** Add a release-generation script and checklist (e.g., copy vetted `sop/` documents and the authoritative `brain/` into a versioned `releases/` folder). Include it in `NEXT_STEPS.md` or a dedicated `RELEASING.md`.

3. **Automated checks exist but are disconnected from onboarding and release guidance.**
   - There is a small pytest suite under `tests/` that exercises the ingest pipeline, yet neither the root nor release quick-start instructions mention running it. 【F:tests/test_ingest_session.py†L1-L94】【F:README.md†L11-L21】
   - **Impact:** Contributors and package consumers may skip regression checks, so parsing or schema regressions could reach the release unnoticed.
   - **Recommendation:** Add a "Run tests" step to setup/release docs and consider packaging the minimal test runner (or a smoke-test command) alongside the release so users can verify their environment.

## Next Actions (suggested order)
1. Pick the source-of-truth `brain/`, script the copy into `releases/<version>/brain/`, and document the command.
2. Create a short release pipeline doc (inputs from `sop/`, outputs to `releases/`) so future versions are reproducible.
3. Integrate `pytest` into the quick-start/release checklist (e.g., `python -m pytest tests/test_ingest_session.py`).
