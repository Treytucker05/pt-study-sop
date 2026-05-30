---
id: M-PRE-015
name: Detailed Clinical Structural Map
stage: PRIME
status: validated
version: '1.0'
created: '2026-05-30'
updated: '2026-05-30'
tags: [method, M-PRE, prime, clinical-map, detailed-overview]
---

# M-PRE-015 — Detailed Clinical Structural Map

## Summary
Build a comprehensive, objective-organized, clinically-tagged top-down map of the whole topic before detail work. Where M-PRE-008 returns a compact high-signal spine, M-PRE-015 returns a full study map: a "0. Main frame" anchor block, one numbered section per objective, and a "Clinical meaning" branch on every content section so the structure carries "so what for the patient," not just labels.

**Not for:** a quick spine or fast orientation pass (use M-PRE-008), or teaching, scored assessment, or full solution reveal (use a TEACH method).

## Core Steps
1. **Resolve Objective Scope** — lock the full objective set (instructor objectives or M-PRE-010)
2. **Write the Main Frame** — 4-6 one-line big-picture anchors (section 0)
3. **Build the Deep Objective-Organized Tree** — one numbered section per objective (plus a method/tool section if taught), expanded to its meaningful branches; no tight node cap; exclude only true trivia
4. **Add a Clinical Meaning Branch** to every content section — 2-4 lines of "so what for assessment / patient care"
5. **Link, Mark Unknowns, Set Priorities** — nest examples under the node they illustrate; mark gaps as orientation cues, not scores

## Inputs
- Source material loaded in chat
- Learning objectives (instructor objectives or M-PRE-010 output)
- Prior notes or prior-session context (optional)

## Required Outputs
- `DetailedClinicalMap` (deep tree with a "0. Main frame" block and a "Clinical meaning" branch on every content section)
- `Objective linkage map` (each section linked to >=1 objective)
- `UnknownNodeList` (orientation gaps, not scores)
- `PriorityNodes`

## Knob Schema
```yaml
knobs:
  priming_depth_mode: comprehensive
  node_cap: none
  output_format: ascii_tree
  objective_link_required: true
  require_main_frame: true
  require_clinical_meaning: true
```

## Runtime Prompt
```text
You are running M-PRE-015 (Detailed Clinical Structural Map) in the PRIME stage.
Use only the loaded source. Require learning objectives first (instructor objectives or M-PRE-010).
Produce a comprehensive, objective-organized, clinically-tagged top-down map - not a compact spine.

Build it as an ASCII tree with these required parts:
- Section "0. Main frame": 4-6 one-line big-picture anchors that capture the spine of the whole topic.
- One numbered section per objective (and a final method/tool section if the source teaches one), each
  expanded to its meaningful sub-branches and clinical detail across multiple levels (no tight node cap;
  cover the full supported structure; exclude only true trivia).
- A "Clinical meaning" branch at the end of every content section (2-4 lines: what it means for
  assessment or patient care).

Then add: an Objective linkage map (each section -> objective[s]), an UnknownNodeList (orientation gaps,
not scores), and PriorityNodes (study first).

Rules: orientation-only and non-assessive (no scoring or quizzing); source-locked (no outside facts);
objective-linked. Apply a Source-Role Gate - nest supporting examples/demos/instructor-de-emphasized
items under the node they illustrate; never promote them to their own objective. Do not collapse into a
terse spine; that is M-PRE-008's job.
```

## Evidence
- **Citation:** Ausubel (1968); van Kesteren, Krabbendam, and Meeter (2018); Bogaerds-Hazenberg, Evers-Vermeul, and van den Bergh (2020)
- **Finding:** Advance organizers and explicit text-structure framing improve comprehension when a bounded structure is established before detail. M-PRE-015 extends this to a comprehensive, objective-organized clinical map for learners who want one study-ready overview, while keeping the structure orientation-only and non-assessive.

## Related Methods
- [[M-PRE-008]] — Sibling; use for a compact high-signal spine instead of the full clinical map
- [[M-PRE-010]] — Run first to produce the objectives that organize the map
- [[M-PRE-012]] — Pairs after the map to pre-train key terminology

## Changelog
- **v1.0** — initial method. Created as the detailed-clinical-map counterpart to M-PRE-008's compact spine: adds a Main-frame anchor block and a per-section Clinical-meaning branch, removes the tight node cap for full objective-organized coverage, and folds the old StructuralMap + FullTopicMap roles into one tree. Wired into the priming prompt (V11) as the default structural step.
