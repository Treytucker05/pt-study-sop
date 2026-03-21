# Specification: Tutor Guided Studyability Loop

> Track artifact. Product/ownership authority lives only in `README.md`.
> This spec records the execution contract for the guided studyability loop; it does not replace the canon.

**Track ID:** tutor-guided-studyability_20260320
**Type:** audit-loop
**Created:** 2026-03-20
**Status:** Active

## Summary

Turn Tutor refinement into one guided, repo-native loop:

- build a Tutor-only feature inventory
- run stage-by-stage live study passes against real active class/materials
- normalize every friction point into one structured issue log
- convert the result into a prioritized fix backlog

## Goal

Leave the repo with one current studyability workflow that can be reused every time Tutor needs a real-user pass:

- the current Tutor workflow stages are inventoried in one place
- planned and discussed features are visible instead of living only in chat memory
- every live study observation has a stable place to land
- implementation can follow a real backlog instead of rediscovering issues

## Locked decisions

- Scope is Tutor workflow only: `Launch`, `Priming`, `Tutor`, `Polish`, `Final Sync`
- Support pages matter only when they directly block Tutor study flow
- Guided testing uses the learner's real active class/materials
- All friction is captured, not just hard failures
- The facilitator normalizes observations; the learner does not need to speak in ticket language
- Stage-by-stage passes happen before the final end-to-end pass

## Acceptance criteria

- [ ] `feature-matrix.md` distinguishes `canon`, `planned`, and `discussed` features
- [ ] every feature row is tagged `landed`, `partial`, `missing`, or `drifted`
- [ ] `study-pass-checklist.md` defines a real study action and expected output for each Tutor stage
- [ ] `issue-log.md` can capture likes, dislikes, friction, and failures in one normalized schema
- [ ] `findings.md` groups issues into `Fix now`, `Fix next`, and `Later`
- [ ] at least one full end-to-end study pass is planned after the stage-by-stage passes

## Out of scope

- implementing Tutor fixes in this track
- broad Brain, Scholar, or support-page redesign unless they directly block Tutor studying
- replacing the current canon with chat-only feature wishes
