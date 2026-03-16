# Specification: Tutor Workflow Depth Pass

**Track ID:** `tutor-workflow-depth-pass_20260316`
**Type:** Feature
**Created:** 2026-03-16
**Status:** Active

## Summary

Deepen the finished staged Tutor workflow so it more closely matches the original product vision without reopening the closed workflow-backbone track. This pass focuses on source-linked Priming extraction, richer publishable Studio artifacts in Polish / Final Sync, and stronger Brain workflow analytics and learner-evidence rollups.

## Context

The staged Tutor workflow backbone is already landed:

- `Launch -> Priming -> Tutor -> Polish -> Final Sync`
- workflow persistence
- note / summary separation
- memory capsules
- Obsidian and Anki publish paths
- Brain workflow analytics summary

What remains is product depth. Priming is still largely a manual drafting surface, Final Sync still centers on note/card payloads, and Brain analytics are useful but shallow relative to the original Tutor/Scholar system-improvement goal.

## User Story

As the learner and system owner, I want Tutor’s staged workflow to preserve richer source-linked study context, publish more than just note/card payloads, and record stronger evidence about how the workflow performs so the system can improve over time.

## Acceptance Criteria

- [ ] A new baseline scorecard records current coverage for source-linked Priming outputs, extraction automation, publishable artifact types, and workflow analytics.
- [ ] Priming can persist source-linked extraction objects and support source-level rerun or assist behavior without forcing a full bundle reset.
- [ ] Polish / Final Sync can classify and carry at least one richer Studio artifact type beyond notes, summaries, and cards.
- [ ] Brain analytics expose enriched workflow evidence and learner-archetype support on top of the richer upstream data.
- [ ] The enriched workflow still passes build, backend tests, live smoke, and a manual end-to-end enriched workflow checklist.

## Dependencies

- Completed track: `tutor-workflow-redesign_20260316`
- Existing staged workflow APIs and workflow schema in `brain/dashboard/api_tutor_workflows.py`
- Existing staged workflow UI in `/tutor`
- Existing Obsidian and Anki publish integrations
- Existing Brain analytics summary surface

## Out of Scope

- Full Brain Home redesign
- Full UI Production System rollout
- Replacing the Obsidian connector wholesale
- Replacing the Anki connector wholesale
- Building a second Tutor launch/session/task architecture
- Deep retention-science modeling beyond bounded evidence rollups

## Technical Notes

- Brain remains the home route and broad launch owner.
- `/tutor` remains the staged workflow shell.
- The closed Tutor Workflow Redesign track remains closed; this track extends depth on top of it.
- Execution should run as one continuous pass after track bootstrap and baseline capture rather than as a new planning loop between waves.

---

Generated from the locked depth-pass plan and repo canon.
