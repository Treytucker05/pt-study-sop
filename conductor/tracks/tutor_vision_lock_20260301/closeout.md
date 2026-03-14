# Closeout: Tutor Vision Lock

**Track:** `tutor_vision_lock_20260301`  
**Closed:** 2026-03-13  
**Outcome:** Complete

## What Changed

1. Added explicit `No Answer Leakage` to the default Tutor rule stack.
2. Added explicit `No Phantom Outputs` to the default Tutor rule stack.
3. Added prompt-builder test coverage proving those rules survive custom-instruction overrides.
4. Wrote the locked Tutor-specific contract package:
   - `owner-vision.md`
   - `notes-model.md`
   - `current-vs-vision-gap.md`
   - `validation-gate.md`
5. Retired two stale expectations instead of forcing unnecessary runtime changes:
   - archived instruction bundles are not active prompt sources
   - quick-note sidecars are not part of the locked session-delete ownership contract

## Audit Results Folded In

### Product-contract review

Findings resolved:

- track status and artifact status were inconsistent -> synced in `spec.md`, `plan.md`, `index.md`, and this closeout
- acceptance criteria did not explicitly cover retrieval, tooling, artifacts, and lifecycle -> expanded in `spec.md`
- session-wrap ownership was implicit -> made explicit in `owner-vision.md` and `notes-model.md`
- authority wording was too strong -> reframed these docs as Tutor-specific contract artifacts under repo canon

### Runtime/validation review

Findings resolved:

- quick-note `note` artifacts were overclaimed as session-owned lifecycle artifacts -> narrowed the contract to reflect actual runtime ownership
- validation gate overstated artifact coverage -> narrowed automated guarantees and added explicit non-coverage notes plus optional note/map follow-up checks
- closeout artifact was missing -> created here

## Validation Evidence

### Automated

- `pytest brain/tests/test_chain_runner.py brain/tests/test_tutor_turn_stream_contract.py brain/tests/test_tutor_session_linking.py brain/tests/test_tutor_artifact_certification.py -q`
- Result: `64 passed in 16.70s`

### Live

- `python scripts/live_tutor_smoke.py --base-url http://127.0.0.1:5000`
- Result: `All live Tutor smoke checks passed.`

## Final Decisions

- Keep current runtime behavior for chain launch, PRIME enforcement, reference bounds, scoped retrieval, structured-notes finalization, wrap save, and session-owned delete cleanup.
- Keep broader model knowledge as an allowed teaching aid, but require truthful provenance labeling.
- Change the base prompt contract to state no-answer-leakage and no-phantom-output explicitly.
- Retire the expectation that archived SOP instruction bundles drive live prompt assembly.
- Retire the expectation that quick-note sidecars are part of session-delete ownership without explicit future runtime work.

## Residual Risks

- Quick-note sidecars remain globally stored and outside session-delete cleanup.
- Map artifacts are still only weakly owned at the runtime layer.
- If future work wants either surface to become session-owned, that work needs explicit schema, persistence, and delete-path design rather than silent contract creep.

## Maintenance Rules

- Update this track package before changing Tutor instruction defaults, artifact ownership rules, or session lifecycle guarantees.
- Re-run the locked validation gate whenever Tutor instructions, retrieval scope, artifact ownership, or session lifecycle behavior changes.
- Do not treat archived instruction bundles or chat history as live contract sources.
- Any future artifact type must declare whether it is session-owned, sidecar-only, or template-shaped before implementation starts.
