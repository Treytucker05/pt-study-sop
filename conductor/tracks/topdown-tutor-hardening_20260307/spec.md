# Specification: Top-Down Tutor Hardening

**Track ID:** topdown-tutor-hardening_20260307
**Type:** Feature
**Created:** 2026-03-07
**Status:** Draft

## Summary

Harden the Tutor's runtime behavior so top-down tutoring becomes the first-class standard without breaking chain-agnostic support. The immediate proving ground is Neuroscience, but the runtime stack must still behave correctly if a different chain is chosen.

## Problem Description

The current Tutor runtime is still too generic:

1. Global tutor rules in `brain/tutor_prompt_builder.py` are too rigidly source-locked for natural teaching.
2. Top-down chains exist in YAML, but runtime behavior is not driven by explicit chain profiles or chain-specific block overrides.
3. Several method cards used by the top-down chains still read like generic stage contracts rather than top-down tutoring contracts.
4. The current reply footer shows retrieval confidence and citations, but not an honest user-facing provenance classification for mixed-source teaching.

## Acceptance Criteria

- `C-TRY-001` behaves as the primary top-down tutoring standard.
- `C-TRY-002` behaves as the structured comparison path, with different runtime behavior than `C-TRY-001`.
- Global tutor rules allow broader model knowledge for analogies and conceptual teaching while remaining truthful about provenance.
- The runtime prompt builder composes chain runtime profile + block override + method contract.
- Tutor replies expose an improved qualitative provenance/confidence label without removing the current footer.
- Week 7 smoke runs on `C-TRY-001` and `C-TRY-002` show different, intentional tutoring behavior.

## Non-goals

- Full semantic-entropy, conformal prediction, or judge-agent implementation in this pass.
- Full x-ray provenance mode in this pass.

## Dependencies

- `brain/tutor_prompt_builder.py`
- `brain/dashboard/api_tutor.py`
- `brain/data/seed_methods.py`
- `sop/library/chains/C-TRY-001.yaml`
- `sop/library/chains/C-TRY-002.yaml`
- method YAMLs used by the top-down chains
- `dashboard_rebuild/client/src/components/TutorChat.tsx`

---

_Generated for top-down runtime behavior hardening._
