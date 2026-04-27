---
title: C-PRIME-ONCE — Prime Once (Per Topic)
created: 2026-04-19
updated: 2026-04-19
type: chain
tags: [chain, prime, finals, integrated-prompt]
---

# C-PRIME-ONCE — Prime Once (Per Topic)

One-time priming chain. Builds the structural reference notes for a topic that C-STUDY-LOOP will read from every session. Single ChatGPT chat, 15-25 min, output drops straight into Obsidian as persistent reference material.

## When to Use
- First time touching a topic for finals
- Re-running only to fill gaps or fix errors flagged during a study session
- One bounded topic per run (e.g., `Shoulder Complex`, not `Upper Quarter`)

## Method Stack (embodied inline in the prompt)
- M-PRE-010 Learning Objectives Primer (with source coverage table)
- M-PRE-012 Terminology Pretraining (8-15 terms + confusable contrasts)
- M-PRE-004 Advance Organizer / M-PRE-006 Structural Skimming (ASCII concept map)
- M-PRE-013 Big-Picture Orientation (3-5 sentences + clinical hook)
- M-PRE-014 Ambiguity Scan (2-4 misconceptions/traps)
- Vault handoff manifests (instructor objectives, source manifest, image manifest, coverage gaps)

See [[C-PRIME-ONCE.yaml]] for the spec, gates, and failure actions.

## Workflow
1. Open a fresh ChatGPT chat
2. Confirm Custom Instructions are active (set in ChatGPT settings, not pasted)
3. Paste the prompt below
4. Replace `[TOPIC]` with the bounded topic for this run (e.g., `Shoulder Complex`)
5. When prompted in Step 0, paste your materials list table
6. Copy the full output into the topic's Obsidian note — this is your persistent reference
7. C-STUDY-LOOP can now run against this topic

---

## Prompt

```
I'm a DPT student. I need to prime myself on [TOPIC] before studying it. The goal is to build a structural framework I can reference later. Output everything in plain text I can copy directly into Obsidian. No Socratic chunking — give me each step's full artifact in ONE reply, then move on.

STEP 0 — MATERIALS LIST (before starting)
I'll paste a table of my available course files for [TOPIC]. For each file: filename, full local path, source type. If a path is unknown, I'll write [PATH UNKNOWN] — do not invent paths.

Format:

| Filename | Full local path | Source type |
|---|---|---|
| ... | ... | ... |

Once I paste, build a SOURCE COVERAGE TABLE for every file with:
  - filename
  - source type
  - scanned: yes/no
  - relevant to this topic: yes/no
  - objective signals found: yes/no/unknown

Logical rules:
- If scanned = no, then objective signals found must be unknown
- If objective signals = yes/no, then scanned must be yes
- No internally inconsistent rows

Do not generate final learning objectives until every file is accounted for. Merge duplicates. Mark redundant files. Flag unusable files explicitly.

STEP 1 — LEARNING OBJECTIVES (2 min)
Using the coverage table, extract candidate learning objectives from every relevant file, then merge into one final bullet list. These are my study targets for the session.

Output format:
  - Candidate objectives by file (grouped)
  - Final merged objective list (deduplicated)

STEP 2 — KEY TERMINOLOGY (3 min)
Extract 8-15 high-yield terms, abbreviations, and jargon for [TOPIC]. Lean — not a glossary dump.

Format:
  TERM — one-line functional definition
  ABBR — what it stands for, when it's used

Then list 3-5 CONFUSABLE CONTRASTS (terms students mix up):
  Term A vs Term B — the distinction that matters

If you hit more than 15 candidate terms, cut to high-yield and list the dropped ones separately under "Terms Dropped."

STEP 3 — ASCII CONCEPT MAP (5 min)
Build the structure of [TOPIC] as a map I can follow.

Output exactly two parts:
1. ASCII concept map using tree characters or clear indentation
2. Obsidian-friendly nested bullet hierarchy I can paste into notes

Rules:
- 3-5 top-level pillars MAX
- show parent → child relationships clearly
- structure over explanation
- no paragraph teaching
- if source is dense, extract its built-in document structure first, then compress

If [TOPIC] source is well-organized (textbook chapter, structured slide deck), use Structural Skimming approach: pull the source's own headings/sections as the skeleton. Otherwise build the map fresh from the LOs.

STEP 4 — BIG PICTURE SUMMARY (2 min)
3-5 sentences max: what [TOPIC] is, why it matters for PT, and the main clinical hook.

STEP 5 — BLIND SPOT SCAN (2 min)
2-4 common misconceptions, traps, or "gotchas" students get wrong on [TOPIC]. One line each.

STEP 6 — IMAGE PLANNING
Do not output a free-form image list here. Identify visuals as you go and put the structured image plan in STEP 7C.

STEP 7 — VAULT AGENT HANDOFF
Four sections, all required.

A. INSTRUCTOR LEARNING OBJECTIVES
Copy the exact instructor learning objectives from explicit objective statements in the source material (slides, transcripts, handouts).
- Do not rephrase
- Do not merge with Step 1 study targets
- Preserve original wording exactly
- Only use explicit statements that actually appear in the source

If no explicit objectives appear in any source file, write exactly:
`No explicit objectives found in source material`

B. SOURCE FILE MANIFEST
Markdown table for every source file used:

| Filename | Full local path | Type |
|---|---|---|

Rules:
- Use only paths from STEP 0
- Do not guess paths
- If unknown, write `[PATH UNKNOWN]`

C. IMAGE EXTRACTION MANIFEST
For every `[IMG: ...]` reference embedded in the primer, one row:

| Source file | Page | What it shows | Suggested filename |
|---|---|---|---|

Rules:
- One row per image reference
- Filenames: short, lowercase, hyphenated, ending in `.png`
- Do not invent page numbers

D. OBJECTIVE COVERAGE GAPS
Compare instructor objectives (section A) against content covered in Steps 1-5.
For each instructor objective, mark: Full / Partial / Missing.
If Partial or Missing, state exactly what source support is absent.

If there are no gaps, write exactly:
`No gaps — all instructor objectives are fully covered by the source material.`

STEP 8 — ONE-LINE MENTAL MAP (end)
End with one sentence only:
  [TOPIC] = [simple structural formula]

OUTPUT RULES:
- Print every step header explicitly: STEP 0 through STEP 8
- Do not skip or rename step numbers
- STEP 6 must appear as its own visible header even if image refs were embedded earlier
- Keep output in step order
- Use markdown headers and bullets so I can paste directly into Obsidian
- Use markdown tables (not box-drawing) for manifests
- Code blocks only for the ASCII map (to preserve spacing)
- Keep [IMG: ...] placeholders as plain text — a script extracts the cited pages later

TIME CHECK:
- Hard cap at 25 minutes — if not at STEP 8 by then, save what you have and flag the gap.
```

---

## Test Results
_No live runs yet._

## Notes / Open Questions
- This prompt embodies the methods inline — it does NOT pull from the method YAMLs at runtime. When tightening a PRIME method (e.g., M-PRE-012 facilitation_prompt), check whether the change should be mirrored here.
- After running, paste the entire output into the topic's Obsidian note. C-STUDY-LOOP STEP 0 reads from this.
- If STEP 7D shows missing instructor objectives, decide whether to (a) live with the gap or (b) source more material and re-run those steps.
- See [[Notes & Tech Debt]] for the Option A integrated-prompt decision and long-term plan.

## Related
- [[C-PRIME-ONCE.yaml]] — spec / design intent
- [[C-STUDY-LOOP.md]] — per-session chain that reads PRIME output
- [[../Notes & Tech Debt]] — decisions log
- [[00 - Custom Instructions]] — global tutor rules (set in ChatGPT settings)
- Methods embodied: [[01 - M-PRE-010]], [[01 - M-PRE-012]], [[01 - M-PRE-004]], [[01 - M-PRE-006]], [[01 - M-PRE-013]], [[01 - M-PRE-014]]
- Original prompt source: `SOP Program/study-sop/17a - Test Prompt - PRIME.md`
