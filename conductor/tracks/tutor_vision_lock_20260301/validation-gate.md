# Validation Gate: Tutor Vision Lock

**Track:** `tutor_vision_lock_20260301`  
**Status:** Locked on 2026-03-13

## Automated Gate

Run this backend suite after changes that touch Tutor instructions, chains, retrieval, artifacts, or session lifecycle:

```powershell
pytest brain/tests/test_chain_runner.py brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_artifact_certification.py -q
```

### What this suite proves

- prompt-builder defaults survive custom instructions
- chain runtime prompt sections and guardrails remain present
- PRIME guardrails remain enforced
- reference-bounds behavior remains enforced
- selected-material scope and restore matrix behavior remain stable
- structured-notes, cards, wraps, and session-owned artifact persistence remain stable
- SSE stream contract still emits `done` frames, timing metadata, tool-round metadata, and heartbeat comments

### What this suite does not prove

- quick-note sidecar cleanup after session delete
- map-artifact save/delete ownership beyond truthful session recording
- frontend rendering behavior when no frontend files changed

### Failure meanings

- `test_chain_runner.py` failure: the global instruction contract or chain prompt assembly drifted
- `test_tutor_turn_stream_contract.py` failure: SSE contract or turn metadata drifted
- `test_tutor_session_linking.py` failure: session scope, PRIME, reference bounds, restore, or lifecycle behavior drifted
- `test_tutor_artifact_certification.py` failure: structured-notes, cards, or wrap behavior drifted

## Live/Manual Gate

### Dashboard startup

Use the repo-canonical path only:

```powershell
C:\pt-study-sop\Start_Dashboard.bat
```

### Live smoke

```powershell
python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000
```

Expected flow:

- preflight
- create
- turn
- restore
- summary
- end
- delete

### Save-wrap smoke

Expected evidence inside the summary response when save is requested:

- HTTP `200`
- `wrap_saved.saved == true`
- `wrap_saved.path` points to `Study Sessions/Wraps/_Session_Wrap_<date>.md`

### Selected-material provenance smoke

Use one selected-material live turn when retrieval/provenance behavior is under review.

Expected evidence in the Tutor response itself:

- source-backed claims use `[Source: <filename or note title>]`
- broader-knowledge teaching uses `[Based on general knowledge]`
- mixed teaching uses `[Mixed: <source> + general knowledge]`
- the response does not fabricate a citation, save, sync, or objective-update claim that the runtime did not emit

### Optional manual follow-up when note/map artifact behavior changes

- create a `note` artifact and confirm the product still treats it as a quick-note sidecar, not as a session-owned delete target
- create a `map` artifact and confirm the session records it truthfully without implying stronger save/delete guarantees than the runtime actually provides

## Validation Run Recorded For Track Closeout

### Automated

```powershell
pytest brain/tests/test_chain_runner.py brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_artifact_certification.py -q
```

Result: `64 passed in 16.70s`

### Live

```powershell
python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000
```

Result: all live Tutor smoke checks passed on 2026-03-13.

## Current Locked Baseline

The March 13, 2026 baseline for this track is:

- automated contract suite above
- live Tutor smoke through the dashboard startup path
- save-wrap success path
- existing session restore matrix and SSE timing contract coverage
- explicit provenance markers for source-backed, general-knowledge, and mixed claims

Any future Tutor work that changes instructions, lifecycle behavior, or artifact ownership must rerun this gate before the track can be considered preserved.
