# Tutor Certification Report

- Generated: `2026-03-13T16:59:53.027745`
- Overall status: `ready`

## Chain Summary

- Total template chains: `20`
- Strict-certification: `2`
- Baseline-certification: `18`
- Legacy/Admin-only: `0`
- Uncategorized: `none`

## Checks

- `PASS` `Chain registry and runtime contract`
  - Command: `pytest -q brain/tests/test_seed_methods.py brain/tests/test_template_chain_certification.py brain/tests/test_template_chain_runtime_contract.py`
- `PASS` `Template-chain smoke coverage`
  - Command: `pytest -q brain/tests/test_template_chain_smoke.py`
- `PASS` `Material pipeline certification`
  - Command: `pytest -q brain/tests/test_tutor_material_pipeline_certification.py`
- `PASS` `Artifact reliability certification`
  - Command: `pytest -q brain/tests/test_tutor_artifact_certification.py brain/tests/test_tutor_templates.py`
- `PASS` `Session authority and selected-material scope`
  - Command: `pytest -q brain/tests/test_tutor_session_linking.py`
- `PASS` `Session restore matrix`
  - Command: `pytest -q brain/tests/test_tutor_session_linking.py -k session_restore_matrix`
- `PASS` `Trust and restore UI`
  - Command: `npx vitest run client/src/pages/__tests__/tutor.test.tsx client/src/components/__tests__/TutorChat.test.tsx`

## Pending Manual Gates

