# PT Study SOP – Changelog

**Repository:** PT Study SOP
**Current Version:** 8.1
**Last Updated:** December 5, 2025

---

## Version 8.1 (Current)

**Release Date:** December 5, 2025

### Notes
- Added a **Response QA Checklist (Always-On)** to Module 1 so the AI self-checks phase, depth, constraints, note prompts, hooks, and flow before sending non-trivial replies.
- Defined **Note-Taking Prompts** under LOOP in Module 1 to encourage small handwriting/mapping/sketching actions at natural stopping points.
- Extended Module 1 NMMF guidance to explicitly allow **sound/phonetic hooks** and short jingles; added **Depth & Pacing: Surface-Then-Structure** defaults for new topics in Full Protocol and Compressed MAP.
- Appended a **Flow Critique** block to Module 4 session recaps for pacing feedback.
- Introduced **Module 7 – Meta-Revision Log** for cross-session adjustments and updated Runtime Prompt to reference QA and note prompts.
- Updated Master Index with Module 7 across structure, triggers, and checklist.

---

## Version 8.0 (Previous)

**Release Date:** November 25, 2025

### Package contents
- Added v8 package in `releases/v8/PT_Study_SOP_v8.zip` (with extracted folder).
- Includes Module_1_Core_Protocol.md, Module_2_Triage_Rules.md, Module_3_Framework_Selector.md, Module_4_Session_Recap_Template.md, Module_5_Troubleshooting.md, Module_6_Framework_Library.md, Master_Index.md, and Runtime_Prompt.md.

### Notes
- v7.x documentation lives in `legacy/` (including V7.4 prompt, sop_v7_core.md, methods_index.md); v8 in `releases/v8/` is the latest source.

---

## Version 7.2 (Previous)

**Release Date:** November 24, 2025

### Major Additions

#### 1. NMMF Framework (Section 2.5)

**Name → Meaning → Memory Hook → Function**

A systematic approach to learning and remembering complex terminology.

**Components:**

- **Name:** State term exactly as in source material
- **Meaning:** Etymology or "sounds like" explanation to reduce cognitive load
- **Memory Hook:** Simple image/metaphor tied directly to mechanism
- **Function:** One-sentence description connected to the hook

**Purpose:**

- Binds terminology → mechanism → hook in one small chunk
- Reduces cognitive load on complex terms
- Creates strong, mechanism-linked retrieval cues

**Example:**

```
Name: Astrocyte
Meaning: Astro- = star (star-shaped cells)
Memory Hook: "Mom cells" – feed, protect, clean
Function: Astrocytes are 'mom cells' that feed and protect neurons 
while cleaning up the neuronal environment
```

**Impact:**

- Standardizes approach to terminology across all topics
- Makes hook creation systematic, not random
- Ensures every key anchor has a memorable retrieval cue

---

#### 2. Hook Integration Rule (HIR) (Section 2.6)

**Mandatory reuse of memory hooks across all learning phases**

**Five Integration Points:**

1. **Initial Teaching** – Use hook when first explaining concept
2. **Recall Prompts** – Cue with hook during Brain Dump/Teach-Back
3. **Anki Cards** – Include hook on back of flashcard
4. **Recap Sheet** – List under "Memory Devices & Hooks" section
5. **Consistency** – Use same hook throughout session; update everywhere if changed

**Purpose:**

- Prevents "hook drift" (changing hooks mid-session)
- Strengthens retrieval cues through repetition
- Makes hooks permanent memory aids, not one-off jokes

**Rule:**

If an anchor has a hook, it must appear in:  
**Teaching → Recall → Cards → Recap**

**Impact:**

- Dramatically improves hook effectiveness
- Creates consistent retrieval cues across all study materials
- Ensures hooks are reinforced, not forgotten

---

#### 3. Personal Encoding Step (PES) (Section 2.7)

**User-generated or user-modified hooks for active encoding**

**Process:**

1. AI presents NMMF with default hook
2. AI prompts user: "What does this remind *you* of?"
3. User adopts, tweaks, or creates entirely new hook
4. AI locks in user's version and uses it everywhere
5. If user is blank, AI offers 1–2 candidates for user to choose/modify

**Purpose:**

- Forces **active encoding** (not passive acceptance)
- Creates personally meaningful associations
- Dramatically increases retention
- Makes learning feel natural and memorable

**Example:**

```
AI: "I'm calling astrocytes 'mom cells.' Does that work for you?"

User: "I like 'support staff' better – like the crew that keeps a 
theater running."

AI: "Perfect! We'll use 'support staff' as your hook."
```

**Impact:**

- Transforms hooks from AI-imposed to user-owned
- Leverages personal experience and associations
- Increases engagement and ownership of learning

---

### Minor Improvements

- **Enhanced hook quality criteria** throughout documentation
- **Clearer integration** of hooks into all phases (MAP, LOOP, WRAP)
- **Explicit hook reuse** in recall prompts and corrections
- **Standardized hook placement** in Anki cards and recap sheets
- **Emphasis on mechanism-linked hooks** (not random associations)

---

### Documentation Updates

- Added detailed NMMF, HIR, and PES sections to Core SOP
- Updated Methods Index with new protocols
- Enhanced examples throughout to show hook integration
- Clarified hook quality criteria and best practices
- Added troubleshooting guidance for hook creation

---

## Version 7.1 (Previous)

**Release Date:** Prior to November 2025

### Features

- **MAP → LOOP → WRAP framework** established
- **Smart Prime** with anchor building
- **Active recall protocols** (Brain Dump, Teach-Back)
- **Strength labeling system** (Strong/Moderate/Weak)
- **Framework selection** (Structure → Function, Mechanism → Outcome, etc.)
- **Level of Understanding (LoU)** assessment
- **Anki card generation** for weak points
- **One-page recap sheets**
- **Fast/Exam Crunch Mode** for time-constrained sessions
- **Source-Lock protocol**
- **Always-on rules** (Active Recall Gate, One-Small-Step, Summary & Save)

### Limitations Addressed in v7.2

- **Hooks were optional** – No systematic approach to creating them
- **Hooks were inconsistent** – Could change or be forgotten mid-session
- **Hooks were AI-imposed** – No user personalization or active encoding
- **No integration rule** – Hooks might appear once and never again
- **No terminology framework** – Complex terms handled ad-hoc

---

## Version History Summary

| Version | Release Date | Key Features | Major Changes |
|---------|--------------|--------------|---------------|
| **7.2** | Nov 24, 2025 | NMMF, HIR, PES | Systematic hook creation, mandatory reuse, user personalization |
| **7.1** | Prior to Nov 2025 | MAP → LOOP → WRAP, active recall, frameworks | Established core SOP structure |
| **7.0 and earlier** | Historical | Various iterations | Foundation development |

---

## Migration Guide: v7.1 → v7.2

### For Students

**What's New:**

1. **You'll be prompted to create/modify hooks** for key concepts (PES)
2. **Hooks will be reused consistently** throughout your session (HIR)
3. **Every key term gets NMMF treatment** (Name → Meaning → Hook → Function)

**What Stays the Same:**

- MAP → LOOP → WRAP structure
- Brain Dump and Teach-Back protocols
- Anki card and recap generation
- All always-on rules

**Action Items:**

- None – v7.2 is backward compatible
- Simply engage with PES prompts when offered
- Your personalized hooks will make learning more effective

---

### For AI Study Coaches

**Implementation Changes:**

1. **Add NMMF block** for every anchor with a key term
   - Name, Meaning, Memory Hook, Function

2. **Run PES after NMMF**
   - Prompt user for personal hook
   - Lock in user's version
   - Use it everywhere

3. **Apply HIR consistently**
   - Reuse hooks in teaching
   - Cue with hooks in recall
   - Include hooks on cards
   - List hooks in recap

4. **Update card and recap templates**
   - Add hook reminder to card backs
   - Add "Memory Devices & Hooks" section to recaps

**Backward Compatibility:**

- All v7.1 protocols still apply
- NMMF/HIR/PES are additions, not replacements
- Can run v7.1-style sessions if needed (though v7.2 is preferred)

---

## Planned Future Enhancements

### Under Consideration for v7.3+

- **Spaced repetition scheduling** integrated into SOP
- **Multi-session topic tracking** (beyond single-session scope)
- **Visual map generation** (automated flowcharts/diagrams)
- **Case-based learning protocols** (extended clinical scenarios)
- **Peer teaching mode** (structured study group facilitation)
- **Exam simulation mode** (timed, mixed-topic quizzes)
- **Progress analytics** (strength trends over time)

### Community Feedback Welcome

If you have suggestions for future versions:

1. Test them in real study sessions
2. Document what worked and what didn't
3. Share your findings

The goal is continuous refinement based on real-world use.

---

## Version Comparison: Key Differences

### Hook Handling

| Aspect | v7.1 | v7.2 |
|--------|------|------|
| **Hook Creation** | Optional, ad-hoc | Systematic (NMMF) |
| **Hook Reuse** | Inconsistent | Mandatory (HIR) |
| **User Involvement** | Passive acceptance | Active encoding (PES) |
| **Hook Placement** | Teaching only | Teaching, recall, cards, recap |
| **Hook Quality** | Variable | Mechanism-linked, user-approved |

### Terminology Learning

| Aspect | v7.1 | v7.2 |
|--------|------|------|
| **Approach** | Ad-hoc explanations | Systematic NMMF |
| **Etymology** | Sometimes mentioned | Always included (Meaning) |
| **Memory Aids** | Optional | Mandatory for key terms |
| **User Personalization** | None | PES for every hook |

### Output Quality

| Aspect | v7.1 | v7.2 |
|--------|------|------|
| **Anki Cards** | Answer only | Answer + hook reminder |
| **Recap Sheets** | Anchors + weak points | Anchors + hooks + weak points |
| **Hook Documentation** | Scattered | Dedicated "Memory Devices" section |
| **Consistency** | Variable | Enforced by HIR |

---

## Breaking Changes

None. Version 7.2 is fully backward compatible with v7.1.

**All v7.1 features remain functional.**

NMMF, HIR, and PES are **additions**, not replacements.

---

## Acknowledgments

### v7.2 Development

- **Cognitive science principles:** Encoding specificity, generation effect, retrieval practice
- **User feedback:** DPT students testing v7.1 in real study sessions
- **Iterative refinement:** Multiple rounds of testing and adjustment

### Inspiration

- **Desirable difficulty** (Bjork & Bjork)
- **Retrieval practice** (Roediger & Karpicke)
- **Elaborative encoding** (Craik & Lockhart)
- **Generation effect** (Slamecka & Graf)
- **Dual coding theory** (Paivio)

---

## Version Support

### Current Support

- **v7.2:** Fully supported, recommended for all users
- **v7.1:** Supported, but v7.2 is preferred

### Deprecated

- **v7.0 and earlier:** No longer supported

---

## Release Notes Archive

### v7.2 (November 24, 2025)

**Summary:** Major enhancement to memory encoding and hook integration

**New Features:**

- NMMF Framework (Section 2.5)
- Hook Integration Rule (Section 2.6)
- Personal Encoding Step (Section 2.7)

**Improvements:**

- Enhanced hook quality and consistency
- Systematic approach to terminology
- User personalization of memory aids
- Stronger retrieval cues across all phases

**Bug Fixes:** None (new features only)

**Known Issues:** None

---

### v7.1 (Prior to November 2025)

**Summary:** Established core MAP → LOOP → WRAP framework

**Features:**

- Three-phase session structure
- Smart Prime with anchor building
- Active recall protocols
- Framework selection
- Anki card and recap generation
- Fast Mode for time-constrained sessions
- Always-on governance rules

**Known Limitations:**

- Hook creation was optional and inconsistent
- No systematic approach to terminology
- No user personalization of memory aids

*(Addressed in v7.2)*

---

## Feedback & Contributions

This is a living document. Feedback and suggestions are welcome.

**To contribute:**

1. Test proposed changes in real study sessions
2. Document results (what worked, what didn't)
3. Share findings with clear examples

**Focus areas for feedback:**

- Hook creation and integration effectiveness
- NMMF framework usability
- PES engagement and outcomes
- Overall session flow and timing
- Output quality (cards and recaps)

---

## License & Usage

This study system is shared for educational purposes.

Feel free to:

- Use for personal study
- Adapt to your learning needs
- Share with classmates
- Implement in custom GPTs or AI systems

**Attribution appreciated but not required.**

---

**For more information:**

- [Core SOP Documentation](./legacy/sop_v7_core.md)
- [Methods Index](./legacy/methods_index.md)
- [README](./README.md)

---

*End of Changelog*



