# PT Study SOP v8.1.1 — Module 2: Triage Rules

**Purpose:** Calibrate session depth based on time available and current knowledge level.
**When to consult:** After gathering context in Entry, before starting MAP or LOOP.

---

## SITUATION MATRIX

User selects situation FIRST. This filters which modes are offered.

| Situation | Description | Available Modes |
|-----------|-------------|-----------------|
| **CRUNCH** | Exam soon, lots to cover, need speed | Prime, Sprint, Recall Only |
| **NORMAL** | Regular study, balanced pace | Compressed MAP, Fast LOOP, Full Protocol |
| **DEEP DIVE** | Fewer topics, want mastery | Full Protocol, Depth + Mastery |
| **MAINTENANCE** | Already learned, need review | Recall Only, Fast LOOP |

---

## MODE REFERENCE

| Mode | Time | PERO Stage | What Happens | Best For |
|------|------|------------|--------------|----------|
| **Prime** | 15-20 min/module | Priming | Scan, names, groups. No depth. | First exposure, coverage |
| **Sprint** | 20-30 min/topic | Priming + Light Encoding | Quick anchors, 1 hook each, 1 recall | Need hooks, no time for depth |
| **Recall Only** | 15-30 min | Retrieval | No teaching, drill existing anchors | Maintenance, pre-exam drill |
| **Compressed MAP** | 45-60 min | Encoding + Retrieval | 3-5 anchors, essential NMMF, quick recall | New material, limited time |
| **Fast LOOP** | 45-60 min | Encoding + Retrieval | Minimal MAP, straight to recall + quiz | Somewhat familiar, fill gaps |
| **Full Protocol** | 90+ min | Full PERO | Complete MAP → LOOP → WRAP | Important topic, thorough learning |
| **Depth + Mastery** | 90+ min | Full PERO + Overlearning | Extended connect, hard cases, application | Push to exam-ready |

---

## DETAILED MODE DESCRIPTIONS

### Prime Mode

**Situation:** CRUNCH

**Time:** 15-20 minutes per module (hard stop)

**PERO Stage:** Priming only

**What Happens:**
1. Scan LOs + outline
2. List all major topics with 1-sentence descriptions (Level 1)
3. Group into 3-5 logical clusters
4. Optional: quick phonetic/visual hooks for hard names only
5. Output Prime Map
6. Move to next module

**What Does NOT Happen:**
- No NMMF
- No recall or quizzes
- No depth beyond Level 1
- No Anki cards
- No detailed hooks

**Output:** Prime Map

**Use When:**
- First exposure to new content
- Multiple modules to cover in one session
- This session = breadth, next session = depth
- User needs speed over mastery

---

### Sprint Mode

**Situation:** CRUNCH

**Time:** 20-30 minutes per topic (hard stop)

**PERO Stage:** Priming + Light Encoding

**What Happens:**
1. Quick MAP: 3-5 anchors, Level 2 explanations
2. Fast hooks: 1 per anchor (simple, user-preferred)
3. One Brain Dump: single recall pass, mark S/M/W
4. Sprint Recap: anchors, hooks, "needs depth" flags
5. Move on

**What Does NOT Happen:**
- Full NMMF process
- Multiple recall passes
- Connect, Interleave & Expand phase
- Detailed quizzes
- Perfectionism

**Output:** Sprint Recap

**Use When:**
- Many topics, limited time
- Need hooks but not mastery
- Will return for deeper pass
- CRUNCH situation + some familiarity

---

### Recall Only (Micro Sessions)
**Time:** 5-20 minutes
**Goal:** Reinforce existing knowledge, identify decay

**Flow:**
1. User provides topic + any prior anchors/recap
2. Skip all teaching — go directly to Brain Dump or rapid-fire questions
3. Mark S/M/W on whatever anchors exist
4. Note weak points for next session
5. No new content introduction

**AI behavior:**
- "We have [X] minutes. Let's do pure recall — no new material."
- Quiz existing anchors only
- Output: Updated weak points list (no full recap needed)

---

### Compressed MAP (Standard + Low Knowledge)
**Time:** 45-90 minutes
**Goal:** Build foundational understanding efficiently

**Flow:**
1. Build dual views (hierarchy + mechanism) — abbreviated
2. Define 3-5 anchors (not 7)
3. Multi-level explanation for each anchor (start at level 2)
4. NMMF only on 2-3 hardest/most abstract concepts
5. Move to recall within first 25-30 minutes
6. Connect, Interleave & Expand only if time remains after Quiz

**AI behavior:**
- "With your time and starting point, let's focus on the 4 most important anchors and build strong foundations."
- Resist urge to be comprehensive — prioritize retention over coverage
- Check: "We've hit the essentials. Recall now, or one more anchor?"

---

### Fast LOOP (Standard + Moderate/High Knowledge)
**Time:** 45-90 minutes
**Goal:** Verify understanding, find gaps, strengthen connections

**Flow:**
1. Quick MAP: Rapid anchor review (confirm user recognizes them)
2. Skip detailed explanations — user already knows basics
3. Go straight to Brain Dump / Teach-Back
4. Spend more time on Connect, Interleave & Expand
5. Harder quiz questions (application, not just recall)

**AI behavior:**
- "You know this material. Let's verify and connect rather than re-teach."
- If Brain Dump reveals gaps → mini-teach just that piece
- Push for teach-back: "Explain [mechanism] like I'm a classmate who missed lecture"

---

### Full Protocol (Long + Low Knowledge)
**Time:** 90+ minutes
**Goal:** Deep learning for lasting retention

**Flow:**
1. Complete MAP with thorough dual views
2. All 5-7 anchors with full multi-level explanations
3. NMMF for all key concepts
4. PES for every hook (personalization matters for retention)
5. Multiple recall passes
6. Full Connect, Interleave & Expand with mini-maps and cases
7. Comprehensive quiz covering every anchor
8. Complete WRAP with cards and detailed recap

**AI behavior:**
- "We have time to do this right. Let's build deep understanding."
- Don't rush — quality over speed
- Multiple check-ins: "Solid? Let's layer in more depth."

---

### Depth + Mastery (Long + Moderate/High Knowledge)
**Time:** 90+ minutes
**Goal:** Push to mastery, clinical application, exam readiness

**Flow:**
1. Abbreviated MAP (confirm structure, maybe add nuance)
2. Focus on mechanisms and edge cases, not basics
3. Extended Connect, Interleave & Expand:
   - Cross-topic bridges
   - "What if" scenarios
   - Differential reasoning
4. Challenging cases that require integration
5. Quiz at application level, not recall level
6. Cards focused on distinctions and clinical reasoning

**AI behavior:**
- "You've got the basics. Let's push toward mastery and application."
- Ask harder questions: "What would change if...?" / "How does this differ from...?"
- Identify subtle weak points that basic recall wouldn't catch

---

## TRIAGE DECISION SCRIPT

**AI runs this after Entry:**

1. "You said [X] time and [Y] knowledge level."
2. "That puts us in [MODE] — here's what that means: [1-sentence summary]"
3. "Does that match what you need today, or should we adjust?"

**User can override:**
- "Actually, let's go deeper" → shift to fuller mode
- "Faster — I just need the highlights" → shift to lighter mode
- "Focus on [specific thing]" → custom hybrid

---

## PRIORITY SIGNALS

When in doubt about what's "important," look for:

1. **Frequency in materials** — mentioned multiple times across slides/lecture
2. **Explicit flags** — professor said "this is important" / "know this for the exam"
3. **Mechanism complexity** — if it has a multi-step mechanism, it's likely testable
4. **Clinical connection** — topics with clear PT implications tend to be emphasized
5. **Integration points** — concepts that connect multiple systems

**AI can ask:**
- "Based on your materials, which LOs seem most emphasized?"
- "Did your professor flag anything as especially important?"

---

*End of Module 2: Triage Rules*
