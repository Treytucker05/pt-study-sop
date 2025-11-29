# PT Study SOP - releases and docs

**Latest package:** v8.1 (`releases/v8/PT_Study_SOP_v8.1/`)
**Included docs:** v8.1 module folder (`releases/v8/PT_Study_SOP_v8.1/`), legacy prompts/docs (`legacy/`)
**Last Updated:** December 5, 2025

---

## Repo map

- `releases/v8/PT_Study_SOP_v8.1/`: complete v8.1 package with Runtime Prompt, Master Index, Modules 1-7 (Core Protocol, Triage Rules, Framework Selector, Session Recap Template, Troubleshooting, Framework Library, Meta Revision Log), and optional Module_7_Storyframe_Protocol.
- `USAGE.md`: step-by-step instructions for loading v8 into a Custom GPT.
- `changelog.md`: version history.
- `legacy/`: archival v7.x docs—v7.4 prompt ([legacy/V7.4/](./legacy/V7.4/)), v7.3 package ([legacy/v7.3/](./legacy/v7.3/)), and v7.2 core SOP/methods ([legacy/sop_v7_core.md](./legacy/sop_v7_core.md), [legacy/methods_index.md](./legacy/methods_index.md)). Use v8.1 in `releases/v8/` as the current source.

## What's here

- `releases/v8/PT_Study_SOP_v8.1/`: latest v8.1 modules — Runtime Prompt, Master Index, Modules 1-7, and optional Module_7_Storyframe_Protocol.

The sections below summarize the older v7.x documentation. For current usage, start with `releases/v8/` and read `USAGE.md`.

---

## Using PT Study SOP v8.1

For day-to-day studying or Custom GPT setup, follow these steps:

1. Extract/upload the 9 v8.1 files listed in `USAGE.md` (`Runtime_Prompt.md`, `Master_Index.md`, Modules 1-7).
2. Apply the Source-Lock/system instructions from `USAGE.md` so the GPT reads only those files.
3. Run sessions in this order: Entry → Triage (Module_2) → MAP/LOOP/WRAP (Module_1 with Modules 3 & 6) → Troubleshooting (Module_5) → Recap (Module_4).
4. Keep v7.4/v7.2 files only for historical reference unless you need the older prompts.

See `USAGE.md` for full details, pacing rules, and confirmation steps.

---

## Project Overview *(Legacy v7.2 summary)*

Welcome to the **PT Study SOP** repository. The current release is v8.1 (see above). The remaining sections capture the v7.2 documentation set for archival/reference purposes.

The system is built around a simple, repeatable framework:

### **MAP -> LOOP -> WRAP**
- **MAP** -> Set up your session, build anchor concepts, and create memory hooks
- **LOOP** -> Teach small chunks -> Active Recall -> Correct -> Repeat
- **WRAP** -> Connect concepts, quiz yourself, and export weak-point flashcards

Think of it as: **MAP (warm-up) -> LOOP (work sets) -> WRAP (cool-down + log)**

---

## Core Principles

This SOP is grounded in cognitive science and learning theory:

- **Desirable Difficulty** -> Effortful recall beats passive review
- **Mechanistic Understanding** -> Learn *why* things work, not just *what* they are
- **Scaffolding** -> Build big-picture anchors first, then add details
- **Cognitive Load Management** -> Small chunks, minimal overwhelm
- **Metacognition** -> Track what you know (Strong/Moderate/Weak)
- **Weak-Point-Driven Review** -> Focus on what you actually missed
- **Personal Encoding** -> Create your own memory hooks for better retention

---

## Documentation Structure

This repository contains four main documentation files:

### 1. [Core SOP Documentation](./legacy/sop_v7_core.md)
The complete operational guide for running study sessions. This is your primary reference for:
- Session setup and triggers
- Smart Prime (MAP phase) with NMMF framework
- Active recall techniques (LOOP phase)
- Integration and output generation (WRAP phase)
- Fast/exam crunch mode
- Troubleshooting and guardrails

### 2. [Methods Index](./legacy/methods_index.md)
A comprehensive index of all methods, protocols, and techniques used in the SOP:
- NMMF (Name -> Meaning -> Memory Hook -> Function)
- Hook Integration Rule (HIR)
- Personal Encoding Step (PES)
- Brain Dump and Teach-Back protocols
- Framework selection guides
- Card generation rules

### 3. [Changelog](./changelog.md)
Version history and updates:
- v7.2 changes (current)
- Previous version notes
- Feature additions and refinements

---

## Quick Start Guide

### For Students

1. **Start a session** with one of these trigger phrases:
   - "Let's study [course/topic]"
   - "Ready to study [course/topic]"
   - "Exam prep for [course]"

2. **Provide context:**
   - Course/module name
   - Specific topic
   - Time available (5-20 min / 45-90 min / 90-180 min)
   - Your Level of Understanding (None/Low/Moderate/High)

3. **Follow the MAP -> LOOP -> WRAP flow:**
   - Build your mental map with 3-7 anchor concepts
   - Create personal memory hooks (NMMF + PES)
   - Practice active recall (Brain Dump or Teach-Back)
   - Get corrections and repeat
   - Connect concepts and take a quiz
   - Export Anki cards for weak points

### For AI Study Coaches

If you're implementing this SOP in a custom GPT or AI system:

1. Read the [Core SOP Documentation](./legacy/sop_v7_core.md) thoroughly
2. Reference the [Methods Index](./legacy/methods_index.md) for specific protocols
3. Follow the always-on rules:
   - Source-Lock to project materials
   - Enforce active recall before moving on
   - Integrate hooks consistently (HIR)
   - Generate weak-point cards and recaps
   - Use small chunks (One-Small-Step rule)

---

## Key Features of v7.2

### New in Version 7.2

1. **NMMF Framework** (Section 2.5)
   - Systematic approach to learning terminology
   - Name -> Meaning -> Memory Hook -> Function
   - Reduces cognitive load on complex terms

2. **Hook Integration Rule (HIR)** (Section 2.6)
   - Mandatory reuse of memory hooks across all phases
   - Hooks appear in teaching, recall, flashcards, and recaps
   - Prevents "hook drift" and strengthens retrieval cues

3. **Personal Encoding Step (PES)** (Section 2.7)
   - User-generated or user-modified hooks
   - Active encoding for dramatically improved retention
   - Makes learning personal and memorable

---

## Use Cases

This SOP works for:

- **Regular study sessions** (45-90 minutes)
- **Micro-sessions** (5-20 minutes between classes)
- **Long deep-dives** (90-180 minutes on complex topics)
- **Exam prep** (fast mode for quick review)
- **All PT coursework:**
  - Anatomy and physiology
  - Pathophysiology
  - Clinical pathology
  - Pharmacology
  - Neuroscience
  - Musculoskeletal systems
  - And more!

---

## Tools & Integration

This SOP is designed to work with:

- **ChatGPT Projects** (or similar AI platforms)
- **Anki** (spaced repetition flashcards)
- **OneNote** (or any note-taking system)
- **Course materials** (PDFs, slides, lecture notes)

---

## Session Outputs

Every study session produces:

1. **Anki Flashcards**
   - Focused on weak and moderate anchors
   - Include memory hooks on the back
   - Tagged by course/module/topic

2. **One-Page Recap Sheet**
   - Session date and topic
   - Anchor summary under framework
   - Memory devices and hooks
   - Weak points for next session

---

## Learning Philosophy

This SOP treats studying like physical training:

- **Warm-up (MAP):** Orient yourself and prepare your mind
- **Work sets (LOOP):** Do the hard work of active recall
- **Cool-down (WRAP):** Integrate, assess, and log your progress

Just like you wouldn't skip warm-ups or cool-downs in PT, don't skip MAP or WRAP in your study sessions!

---

## Contributing

This is a living document. If you have suggestions, improvements, or adaptations:

1. Test them in real study sessions
2. Document what worked and what didn't
3. Share your findings

The goal is continuous refinement based on real-world use.

---

## Support & Questions

For questions about implementation or adaptation:

- Review the [Core SOP Documentation](./legacy/sop_v7_core.md) for detailed guidance
- Check the [Methods Index](./legacy/methods_index.md) for specific techniques
- Consult the [Changelog](./changelog.md) for version-specific information

---

## License

This study system is shared for educational purposes. Feel free to adapt it to your own learning needs.

---

## Success Metrics

You'll know this system is working when:

- You can explain concepts without looking at notes
- Your Anki reviews focus on actual weak points, not random cards
- You feel confident connecting topics across modules
- Your exam performance reflects your study effort
- You spend less time "studying" and more time actually learning

---

**Ready to start?** Head to the [Core SOP Documentation](./legacy/sop_v7_core.md) and begin your first MAP -> LOOP -> WRAP session!
