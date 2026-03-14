# Validation Matrix

## TLR-100 completed

- Frontend targeted tests:
  - `npm run test -- client/src/lib/__tests__/tutorClientState.test.ts client/src/components/__tests__/TutorWizard.test.tsx`
  - Result: `11 passed`
- Frontend build:
  - `npm run build`
  - Result: success
- Push gate blocker fixes:
  - `python -m pytest brain/tests/test_tutor_quality_eval.py brain/tests/test_tutor_session_linking.py -k "quality_snapshot or generic_module" -q`
  - Result: `1 passed, 1 skipped`
- Full backend pre-push gate after blocker fix:
  - Result: `847 passed, 1 skipped`

## TLR-010 completed

- Grounding check:
  - Result: several later-branch track/doc paths named in the original plan do not exist in this repo slice, so this track remains the durable source for shell/start-panel cleanup.
- Active-board wording cleanup:
  - Result: older `wizard` references in the active board now read as legacy/start-surface terminology instead of current runtime authority.

## TLR-020 completed

- Historical/superseded wording grep:
  - `rg -n "TutorStartPanel|legacy start surface|historical|superseded" docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md docs/root/TUTOR_CONTROL_PLANE_CANON.md docs/root/TUTOR_TODO.md`
  - Result: remaining surviving wizard-era inventory/canon references were updated to historical or current start-surface wording.

## TLR-110 completed

- Frontend focused tests:
  - `npm run test -- client/src/components/__tests__/TutorStartPanel.test.tsx client/src/lib/__tests__/tutorClientState.test.ts client/src/components/__tests__/TutorChat.test.tsx`
  - Result: `13 passed`
- Frontend build:
  - `npm run build`
  - Result: success

## TLR-120 completed

- Page-level Tutor launch tests:
  - `npm run test -- client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorStartPanel.test.tsx client/src/components/__tests__/TutorChat.test.tsx client/src/lib/__tests__/tutorClientState.test.ts`
  - Result: `17 passed`
- Frontend build:
  - `npm run build`
  - Result: success
- Runtime hardening folded into the same step:
  - delayed selected-material persistence until launch hydration completes
  - delayed setup close on resume until session payload load succeeds

## TLR-300 completed

- Active-doc stale wording grep:
  - Result: no matches for old wizard-led phrasing in the active doc set
- Active-doc current-model grep:
  - Result: active docs now point at Brain/Library launch, `/tutor`, and `TutorStartPanel`

## Remaining validation

- Broader Tutor UI regression checks after wizard replacement
- Final full gate once docs and remaining UI work are complete
