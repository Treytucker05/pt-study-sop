# PT Study SOP — Repository Organization Audit

This audit focuses on how the repository is structured and how that structure supports maintenance of the PT Study SOP release package.

## Top Gaps

1. **Release packaging lacks a declared source of truth for generated assets.**
   - The README calls `releases/v9.1/` the starting point, while `sop/` is described as "source files (development)," but there is no documented workflow for rebuilding the release assets (GPT instructions, knowledge files, Brain package) from the source tree when a new version is cut. 【F:README.md†L11-L49】
   - **Impact:** The packaged release can drift from the maintained source (e.g., if frameworks or modules in `sop/` change) and makes auditing or reproducing the release content difficult.
   - **Recommendation:** Add a release-generation script and checklist (e.g., copy vetted `sop/` documents and the authoritative `brain/` into a versioned `releases/` folder). Include it in `NEXT_STEPS.md` or a dedicated `RELEASING.md`.

2. **Automated checks exist but are disconnected from onboarding and release guidance.**
   - There is a small pytest suite under `tests/` that exercises the ingest pipeline, yet neither the root nor release quick-start instructions mention running it. 【F:tests/test_ingest_session.py†L1-L94】【F:README.md†L11-L21】
   - **Impact:** Contributors and package consumers may skip regression checks, so parsing or schema regressions could reach the release unnoticed.
   - **Recommendation:** Add a "Run tests" step to setup/release docs and consider packaging the minimal test runner (or a smoke-test command) alongside the release so users can verify their environment.

## Next Actions (suggested order)
1. Create a short release pipeline doc (inputs from `sop/`, outputs to `releases/`) and include a script to copy the authoritative `brain/` into versioned `releases/` folders.
2. Integrate `pytest` into the quick-start/release checklist (e.g., `python -m pytest tests/test_ingest_session.py`).
