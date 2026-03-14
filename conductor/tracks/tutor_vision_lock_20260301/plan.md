# Implementation Plan: Tutor Vision Lock

**Track ID:** tutor_vision_lock_20260301  
**Status:** Complete  
**Last Updated:** 2026-03-13  
**Planning Method:** `treys-swarm-planner-repo`

## Goal

Lock Tutor behavior to one owner-approved baseline across instructions, chains, notes, retrieval, tooling, artifacts, and session lifecycle, then define the smallest validation gate that proves runtime alignment and detects future drift.

## Final Outcome

Complete. The track now leaves one locked Tutor-specific contract package, one evidence-backed gap analysis, one locked validation gate, and one closeout artifact with audit and validation evidence.

## Required Work Products

- [x] `owner-vision.md`
- [x] `current-vs-vision-gap.md`
- [x] `notes-model.md`
- [x] `validation-gate.md`
- [x] `closeout.md`

## Phase Plan

### Phase 1: Lock the Intended Behavior Surfaces

- [x] `1.1` Define the exact owner vision for global Tutor instructions.
- [x] `1.2` Define the exact owner vision for chain and block instructions.
- [x] `1.3` Define the notes operating model.
- [x] `1.4` Define the intended retrieval/tooling contract.
- [x] `1.5` Draft `owner-vision.md` and `notes-model.md`.

### Phase 2: Map the Actual Runtime to the Vision

- [x] `2.1` Capture the current runtime instruction assembly path and ownership map.
- [x] `2.2` Capture the current chain/block runtime path, including PRIME gating and block progression expectations.
- [x] `2.3` Capture the current notes/artifact/session-save behavior across turn, restore, summary, end, and delete.
- [x] `2.4` Capture the current retrieval/scoping/reference behavior, including strict selected-material behavior and broader-knowledge separation.
- [x] `2.5` Draft `current-vs-vision-gap.md` with evidence references for each surface.

### Phase 3: Classify Gaps and Decide the Minimal Fix Set

- [x] `3.1` Classify every gap as keep / change / retire.
- [x] `3.2` For each required change, identify the exact runtime surface and smallest viable fix.
- [x] `3.3` For each retired expectation, update the written contract so it stops creating false drift.
- [x] `3.4` Sequence required fixes into a minimal implementation batch plan.

### Phase 4: Lock the Validation Gate

- [x] `4.1` Define the automated regression set needed to defend the locked behavior.
- [x] `4.2` Define the manual/live smoke checklist needed for the non-automatable surfaces.
- [x] `4.3` Draft `validation-gate.md` with exact commands, expected evidence, and failure meanings.
- [x] `4.4` Run two independent reviews and fold their findings into the accepted execution artifacts.

### Phase 5: Close the Vision Lock and Hand Off Cleanly

- [x] `5.1` Execute the approved minimal fix set and validation gate.
- [x] `5.2` Draft `closeout.md` with final decisions, evidence summary, residual risks, and maintenance rules.
- [x] `5.3` Update the track status and registry state.

## Minimal Fix Set Executed

1. Runtime change: add explicit `No Answer Leakage` and `No Phantom Outputs` to the default Tutor rule stack.
2. Test change: assert those rules remain present when custom instructions are configured.
3. Contract retirements:
   - archived instruction bundles are not live prompt sources
   - quick-note sidecars are not part of the locked session-delete ownership contract
4. Validation gate hardening:
   - narrowed artifact guarantees to what the runtime actually owns
   - recorded automated and live validation evidence

## Audit Findings Folded In

### Product-contract review

- Synced track status across all governing docs.
- Expanded acceptance surfaces to include retrieval, tooling, artifacts, and lifecycle.
- Added explicit session-wrap ownership.
- Reframed these docs as Tutor-specific contract artifacts under repo canon.

### Runtime/validation review

- Narrowed `note` artifact ownership from session-owned to sidecar-only.
- Narrowed validation claims so the gate does not overstate note/map coverage.
- Added required `closeout.md` and closed the status mismatch.

## Validation Evidence

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

## Outcome

The track is complete. Future Tutor work should treat `owner-vision.md`, `notes-model.md`, `current-vs-vision-gap.md`, `validation-gate.md`, and `closeout.md` as the reusable package for this contract.
