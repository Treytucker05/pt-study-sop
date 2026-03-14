# Specification: Neuroscience Exam Intake + First Tutor Run

**Track ID:** neuroscience-exam-intake_20260307
**Type:** Feature
**Created:** 2026-03-07
**Status:** Complete

## Summary

Implement the first real neuroscience exam-prep workflow in the live Study System using actual course materials, an Obsidian week scaffold, and a tutor session that is scoped to one objective instead of broad extraction.

## Context

The Neuroscience course already exists in the DB and Blackboard course shell, but the live Study System does not yet have:

- exam-window-derived material scope loaded into `rag_docs`
- structured neuroscience learning objectives in `learning_objectives`
- a populated Obsidian week scaffold the Tutor can use before live teaching
- session gating that forces the week scaffold to exist before teaching starts

This track uses Week 7 first so the live workflow can be tested on real material before expanding to the rest of Exam 2.

## Problem Description

1. The Tutor can currently start before exam scope, week objectives, and Obsidian note structure are ready.
2. Real neuroscience files exist locally, but the Week 7 source set is not loaded into the live Library.
3. The Obsidian week structure had to be drafted manually because the current system does not yet turn source files into a tutor-ready scaffold.
4. The exam workflow needs a concrete bridge from local files -> Library -> Obsidian scaffold -> Tutor session.

## Acceptance Criteria

- [x] Week 7 neuroscience source files are loaded into the live Library (`rag_docs`) and linked to the Neuroscience course.
- [x] Week 7 Obsidian scaffold exists and is consistent with the loaded material set.
- [x] The tutor session flow can target a single Week 7 objective using the live Library material scope.
- [x] The live workflow is documented clearly enough to repeat for Week 8 and Basal Ganglia.
- [x] The implementation notes make clear which remaining steps still need product wiring for the one-stop-shop goal.

## Non-goals

- Fully automating Week 8 and Basal Ganglia in this first pass.
- Replacing the whole tutor session flow in one change.
- Adding new plugins to Obsidian during exam week.

## Dependencies

- `docs/root/TUTOR_TODO.md`
- `conductor/tracks.md`
- `conductor/tracks/GENERAL/log.md`
- `brain/dashboard/api_tutor.py`
- `brain/rag_notes.py`
- `brain/data/pt_study.db`
- `C:\Users\treyt\Desktop\Treys School\Courses\Neuroscience\Week 7\`

## Outcome Summary

- Kept the track narrow: real Week 7 intake, scaffold, and first single-objective Tutor run.
- Closed the metadata gap on `2026-03-13` after later certification/vision-lock work absorbed the remaining runtime hardening.
- Future Week 8 or broader Exam 2 expansion should proceed as a new implementation track, not as a reopening of this intake proof.

---

_Generated for live neuroscience exam prep implementation._
