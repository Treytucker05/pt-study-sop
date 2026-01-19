# PT Study SOP - Changelog

**Repository:** PT Study SOP
**Current Version:** 8.3
**Last Updated:** Updated for v8.3 release

---

## Version 8.3 (Current)

**Release Date:** November 29, 2025

### Summary

v8.3 (Current): Major Refactor. Removed Modules 5 & 7. Consolidated Triage into Sprint/Core/Drill. Implemented "Silver Platter" MAP protocol (no waiting). Added "Safety Override" to Custom Instructions to prevent bureaucracy.

**Folder:** `releases/v8/PT_Study_SOP_v8.3/`

---

## Version 8.2 (Previous)

**Release Date:** November 29, 2025

### Summary

v8.2: Major Refactor. Removed Modules 5 & 7. Consolidated Triage into Sprint/Core/Drill. Implemented "Silver Platter" MAP protocol (no waiting). Added "Safety Override" to Custom Instructions to prevent bureaucracy.

**Folder:** `releases/v8/PT_Study_SOP_v8.2/` (renamed to v8.3 for current materials)

---

## Version 8.1.1 (Previous)

**Release Date:** November 28, 2025

### Major Additions

1. **Prime Mode** — Pure priming, no encoding. Scan, name, group, move on. (15-20 min/module)
2. **Sprint Mode** — Fast coverage with basic hooks. (20-30 min/topic)
3. **Step-by-Step Entry Menus** — Replace Q&A with structured mode selection
4. **Hook Autonomy Rule** — No censorship of user-created hooks
5. **Hook Design Rule** — List all elements before building hooks
6. **Quiz Delivery Rules** — One question at a time, no embedded answers, LO-only scope
7. **PERO System Alignment** — Explicit mapping to Justin Sung's framework
8. **Interleaving Explicit** — Renamed Connect & Expand to Connect, Interleave & Expand
9. **Strength Labeling Clarified** — Pasted notes ≠ independent recall

### Files Modified
- Module_1_Core_Protocol.md (major updates)
- Module_2_Triage_Rules.md (new modes)
- Module_4_Session_Recap_Template.md (new templates)
- Runtime_Prompt.md (aligned)
- Master_Index.md (updated)
- Custom_GPT_Instructions.md (NEW - instructions for Custom GPT setup)
- USAGE.md (updated to reference Custom_GPT_Instructions.md)
- changelog.md (this file)

**Folder:** `releases/v8/PT_Study_SOP_v8.1.1/`

## Version 8.1 (Superseded)

**Release Date:** November 20, 2025

### New Features

#### Session HUD & Menu
- `menu` command displays: Phase, Mode, Framework, HookStyle, Level, Anchor progress
- Natural language setting changes ("switch to Fast LOOP", "use sound hooks")
- No always-visible banner (on-demand only)

#### Self-Check Rules (8-Item QA)
- Silently checks every substantial answer before sending
- 8 items: Phase, Exam focus, Constraints, Note prompts, Active recall, Hooks, Flow, Edge cases
- PASS/FAIL evaluation; revise once if any FAIL
- `qa?` command for debug visibility

#### High-Stakes Triggers
- Phrases: "Triple check", "This is important", "High stakes", "Board-level"
- Triggers extra correctness/edge-case pass before responding

#### Storyframe Integration
- Central metaphor option during MAP (anchor definition)
- Same storyframe scales across 4-10-HS-PT explanation levels
- Hooks and recall prompts use storyframe language

#### HookStyle Control
- Options: visual, story-based (default), sound/phonetic, list/jingle, mixed
- User can request changes naturally
- Bias toward few strong hooks over many weak hooks

#### Surface-Then-Structure
- Default pacing for new topics: fast coverage first, encoding depth second
- Surface pass in MAP (orient to whole topic), Structure passes in LOOP (deep encoding)

#### Note-Taking Prompts
- Light prompts for handwriting/mapping/sketching during LOOP
- 1-3 prompts per 20-30 minutes at natural stopping points

#### Flow Critique
- End-of-recap self-assessment: what worked, what didn't, next-time change

#### Meta-Log Flow
- End-of-session: Offer to generate 3-5 bullet meta-log
- Start-of-session: Ask for prior meta-log, extract and apply adjustments

### Files Changed
- Module_1_Core_Protocol.md - Added HUD, Self-Check, Storyframe, HookStyle, updated Explanation Levels
- Module_4_Session_Recap_Template.md - Added Flow Critique, Meta-Log offer
- Module_7_Meta_Revision_Log.md - Added start-of-session import
- Master_Index.md - Updated structure, triggers, checklist, version history
- Runtime_Prompt.md - Added commands, Self-Check, meta-log flow, Storyframe
- changelog.md - This entry

**Folder:** Package not currently stored in the repository; use v8.1.1 for the closest available materials.

### Files Removed
- Module_7_Storyframe_Protocol.md - Content absorbed into Module 1

---

## Version 8.0 (Previous)

**Release Date:** November 25, 2025

- v8.0 package is **not stored** in this repository. The folder `releases/v8/PT_Study_SOP_v8/` was never added.
- Refer to v8.1+ for current downloadable materials; v7.x documentation lives in `legacy/` for reference.

---

## Version Support

### Current Support
- **v8.3:** Fully supported, High-Speed refactor
- **v8.2:** Supported (superseded by v8.3)
- **v8.1.1:** Supported (package in `releases/v8/PT_Study_SOP_v8.1.1/`)
- **v8.1:** Supported (package not stored; superseded by v8.1.1 in this repo)

### Deprecated
- **v8.0:** Not available in this repository; consider upgrading to a supported v8.1+ release
- **v7.x and earlier:** No longer supported

---

## Version History Summary

| Version | Release Date | Key Features | Major Changes |
|---------|--------------|--------------|---------------|
| **8.3** | Nov 29, 2025 | High-Speed refactor, Safety Override, Silver Platter MAP, Sprint/Core/Drill triage | Removed Modules 5 & 7, streamlined triage into three modes |
| **8.2** | Nov 29, 2025 | High-Speed refactor, Safety Override, Silver Platter MAP, Sprint/Core/Drill triage | Removed Modules 5 & 7, streamlined triage into three modes |
| **8.1.1** | Nov 28, 2025 | Prime/Sprint modes, step-by-step entry menus, hook autonomy/design, quiz delivery rules, PERO alignment | Coverage + retrieval discipline, explicit priming/interleaving |
| **8.1** | Nov 20, 2025 | HUD/menu, Self-Check QA, Storyframe, HookStyle, Surface-Then-Structure, meta-log flow | Refinements for control, reliability, and encoding |
| **8.0** | Nov 25, 2025 | Modular SOP, triage, framework selector | Package not stored in repo; upgrade to v8.1+ |
| **7.2** | Nov 24, 2025 | NMMF, HIR, PES | Systematic hook creation |
| **7.1** | Prior | MAP + LOOP + WRAP, active recall | Established core structure |

---

*End of Changelog*
