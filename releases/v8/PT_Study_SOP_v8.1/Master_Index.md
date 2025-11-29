# PT Study SOP v8.1.1 - Master Index

---

## What Changed from v8.1 to v8.1.1

| Issue in v8.1 | Fix in v8.1.1 |
|---------------|---------------|
| No pure Priming mode | Added Prime Mode (15-20 min/module, scan only) |
| No fast coverage mode | Added Sprint Mode (20-30 min/topic, hooks + 1 recall) |
| Entry was Q&A interrogation | Replaced with Step-by-Step Option Menus |
| Quiz delivered multiple questions | Added Quiz Delivery Rules (1 at a time, no hints) |
| GPT censored user hooks | Added Hook Autonomy Rule (no censorship) |
| Hooks built without listing elements | Added Hook Design Rule (list first, build second) |
| PERO system implicit | Made explicit with PERO alignment section |
| Interleaving unnamed | Renamed to "Connect, Interleave & Expand" |
| Strong label given for pasted notes | Clarified strength requires INDEPENDENT recall |

---

## Module Structure
```
PT_Study_SOP_v8.1/
├── Master_Index.md          ← You are here
├── Custom_GPT_Instructions.md  ← Instructions for Custom GPT setup
├── Runtime_Prompt.md        ← Copy-paste to start any new chat
├── Module_1_Core_Protocol.md    ← ALWAYS LOADED (main instruction set)
├── Module_2_Triage_Rules.md     ← Pull when calibrating depth
├── Module_3_Framework_Selector.md   ← Pull when choosing frameworks
├── Module_4_Session_Recap_Template.md   ← Pull when generating outputs
├── Module_5_Troubleshooting.md  ← Pull when stuck
├── Module_6_Framework_Library.md    ← Pull for framework details
└── Module_7_Meta_Revision_Log.md    ← Pull for cross-session meta notes
```

---

## PERO System Alignment

| PERO Stage | SOP Location |
|------------|--------------|
| **P — Priming** | Prime Mode, Sprint Mode, MAP surface pass |
| **E — Encoding** | NMMF, Hooks, Storyframe, Frameworks |
| **R — Reference** | Anki cards, Recaps, NotebookLM |
| **R — Retrieval** | Brain Dump, Teach-Back, Quiz |
| **O — Overlearning** | Depth + Mastery, Anki spaced repetition |

---

### New in v8.1
- **Session HUD & Menu** - Type `menu` to see Phase/Mode/Framework/HookStyle/Level/Anchor
- **Self-Check Rules** - 8-item PASS/FAIL check before substantial answers
- **`qa?` Command** - Debug visibility into last response's quality check
- **High-Stakes Triggers** - "Triple check", "This is important", "High stakes", "Board-level"
- **Storyframe Integration** - Central metaphor option in MAP, scales across explanation levels
- **HookStyle Control** - User can request visual, story-based, sound/phonetic, list/jingle, or mixed
- **Surface-Then-Structure** - Fast coverage first, encoding depth second
- **Note-Taking Prompts** - Light prompts for handwriting/mapping during LOOP
- **Flow Critique** - Pacing self-assessment in session recaps
- **Meta-Log Flow** - Lightweight end-of-session capture, start-of-session import

---

## Module Triggers (When to Pull Which Module)

| Trigger phrase / situation | Module | Purpose |
|----------------------------|--------|---------|
| Runtime prompt needs SOP context | 1 | Core protocol always in memory |
| Calibrate depth based on time and knowledge | 2 | Select mode (Recall Only, Compressed MAP, etc.) |
| Need frameworks and rationale | 3 | Choose best-fit frameworks |
| Ready to generate recap at WRAP | 4 | Session recap template |
| Stuck, confused, or flow broken | 5 | Troubleshooting steps |
| Want detailed framework definitions | 6 | Framework library |
| "Log meta notes", end-of-day, or pasting prior meta-log | 7 | Cross-session adjustments |
| `menu` | 1 | Display session HUD |
| `qa?` or `show check` | 1 | Display QA check for last answer |

---

## How to Use This System

### Starting a New Chat

1. Copy the Runtime Prompt (Runtime_Prompt.md) into a new chat
2. Say: "Let's study [course - topic]" or "Resume [topic]"
3. AI acknowledges SOP and gathers context
4. Provide source material from NotebookLM
5. Study

### For Best Results

- Keep the Runtime Prompt compact - it has everything needed for most sessions
- Load full modules only when needed - if you need deep troubleshooting, paste Module 5
- Save your recaps - the Session Recap Template is designed for easy resume
- Name recaps consistently - `Course - Module - Topic - YYYY-MM-DD`

### Resuming a Session

1. Open new chat with Runtime Prompt
2. Say: "Resume [course - topic]"
3. Paste your saved recap + current LOs/outline
4. AI rebuilds context and offers options
5. Continue from weak points

---

## Quick Reference: The Seven Modes

| Mode | Time | PERO Stage | What Happens |
|------|------|------------|--------------|
| **Prime Mode** | 15-20 min/module | Priming | Scan, names, groups, no depth |
| **Sprint Mode** | 20-30 min/topic | Priming + Light Encoding | Quick anchors, hooks, 1 recall |
| **Recall Only** | 15-30 min | Retrieval | No teaching, drill existing |
| **Compressed MAP** | 45-60 min | Encoding + Retrieval | 3-5 anchors, essential hooks |
| **Fast LOOP** | 45-60 min | Encoding + Retrieval | Minimal MAP, straight to recall |
| **Full Protocol** | 90+ min | Full PERO | Complete MAP → LOOP → WRAP |
| **Depth + Mastery** | 90+ min | Full PERO + Overlearning | Extended connect, hard cases |

---

## Quick Reference: Phase Flow

```
ENTRY
  |
  Step-by-step menu: acknowledge version -> course/topic -> mode selection -> materials -> prior recap/meta-log
  |
TRIAGE
  |
  Select mode based on time + knowledge
  |
MAP (if not Recall Only)
  |
  Select frameworks + Build dual views + Define anchors + Explain + NMMF + Hooks
  |
LOOP
  |
  Learn & Clarify + Active Recall (S/M/W) + Connect, Interleave & Expand + Quiz & Coverage
  |
WRAP
  |
  Anki cards + Session Recap + Save instructions
```

---

## Files Checklist

- [ ] Runtime_Prompt.md - ready to copy-paste
- [ ] Module_1_Core_Protocol.md - complete (includes HUD, Self-Check, Storyframe)
- [ ] Module_2_Triage_Rules.md - complete
- [ ] Module_3_Framework_Selector.md - complete
- [ ] Module_4_Session_Recap_Template.md - complete (includes Flow Critique, Meta-Log offer)
- [ ] Module_5_Troubleshooting.md - complete
- [ ] Module_6_Framework_Library.md - complete (all 21 frameworks)
- [ ] Module_7_Meta_Revision_Log.md - complete (includes start-of-session import)

---

## Version History

| Version | Date | Changes |
|---------|------|---------|
| v8.1.1 | 2025-11-28 | Prime + Sprint modes, step-by-step entry menus, hook autonomy/design rules, quiz delivery discipline, PERO alignment |
| v8.1 | 2025-12-05 | HUD/menu, Self-Check (8-item QA + `qa?` command), high-stakes triggers, Storyframe integration, HookStyle control, Surface-Then-Structure, note prompts, Flow Critique, meta-log flow |
| v8.0 | 2025-11-25 | Modular restructure, triage system, 4-level explanations, framework selector, improved recap template |
| v7.4 | Prior | Monolithic SOP |

---

*End of Master Index*
