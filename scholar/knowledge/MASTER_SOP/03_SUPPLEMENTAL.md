# PT STUDY SOP - SUPPLEMENTAL REFERENCE
**Purpose:** Additional content not in the Master Overview v9.3

---

## PART A: TEMPLATES

### 1. Weekly Plan Template (3+2)
```
Cluster A (technical):
- [ ] Class 1
- [ ] Class 2  
- [ ] Class 3

Cluster B (light/reading):
- [ ] Class 4
- [ ] Class 5

Weekly Rhythm:
- Mon/Wed/Fri: Deep Cluster A + 15 min Cluster B review
- Tue/Thu/Sat: Deep Cluster B + 15 min Cluster A review
- Sun: Weekly review + metacognition

Cross-review targets:
Known weak anchors:
```

### 2. Weekly Review Template (Sunday)
```
Wins:
- [ ]

Gaps / Friction:
- [ ]

Backlog (carry-forward):
- [ ]

Load Check:
- Intrinsic:
- Extraneous:
- Germane:

Next Week Plan:
- Cluster A priorities:
- Cluster B priorities:
```

### 3. Session Intake Template
```
- Target exam/block:
- Time available:
- Topic scope:
- Materials (Source-Lock):
- Plan of attack (3-5 steps):
- Pre-test/brain dump (1-3 items):
- Mode (Core/Sprint/Light/Quick Sprint/Drill):
- Weak anchors to interleave:
```

### 4. Study Metrics Log
```
- Calibration gap: [+/- or 0]
- Retrieval success rate: [0-100%]
- Cognitive load type: [intrinsic/extraneous/germane]
- Transfer check: [yes/no]
- Notes:
```

---

## PART B: DIALOGUE EXAMPLES

### Gated Platter (When User Stalls)
```
AI: "Give me a Seed — your hook, analogy, or connection."
User: "I don't have one."
AI: "Active Architect needs your Seed. I'll start a platter:
     Raw L1 metaphor: 'The ACL is like a leash on a dog pulling forward.'
     That's MY metaphor. Edit or upgrade it — what would YOU change?"
User: "Okay."
AI: "'Okay' isn't a Seed. You must ADD something. What would you change?"
User: "It's like a seatbelt catching you before you fly through the windshield."
AI: "Better — YOUR metaphor. Seed locked."
```

### Sprint Dialogue (Test-First)
```
AI: "What prevents anterior tibial translation?"
User: "ACL"
AI: "Correct. Next. What does the PCL prevent?"
User: "Lateral translation?"
AI: "Miss. PCL prevents POSTERIOR tibial translation.
     Hook: 'PCL = Posterior-C-Lock' — shin can't slide backward.
     Retry: What does PCL prevent?"
User: "Posterior tibial translation."
AI: "Correct. Next."
```

---

## PART C: LEARNING SCIENCE METHODS

### 1. Retrieval Practice
- **Testing effect:** Retrieval strengthens memory; re-reading creates illusions
- **Recognition ≠ Recall:** Can't fake retrieval
- **Failed retrieval valuable:** Hypercorrection effect — confident wrongs stick when corrected
- **Sprint mode = structured retrieval practice**

### 2. Desirable Difficulties
| Technique | Feels Like | Actually Does |
|-----------|------------|---------------|
| Spacing | "I forgot" | Better long-term retention |
| Interleaving | "I'm confused" | Better discrimination |
| Retrieval | "I can't remember" | Stronger memory traces |
| Generation | "This is hard" | More durable encoding |

**Key insight:** Performance during learning ≠ Learning

### 3. Elaborative Interrogation
- Ask "why" and "how" about material
- Generate your own explanations
- **Seed-Lock IS elaborative interrogation** — forces the cognitive process

### 4. Metacognition
- **Monitoring:** How well do I know this?
- **Control:** What should I do about it?
- **Calibration:** Confidence vs actual performance
- Most students are poorly calibrated → bad study decisions

### 5. Drawing for Anatomy
**Progressive Build Protocol:**
1. AI generates simple schematic (step N)
2. User copies onto paper
3. User says "done"
4. AI generates next image (all previous + one new element)
5. Repeat until complete

**Rules:**
- Labels ON the image
- ONE element per step
- Landmarks BEFORE muscles
- Cumulative images reinforce

---

## PART D: RESEARCH BACKLOG (Open Questions)

### New Engine Ideas
- **Procedure Engine:** For physical skills (goniometry, transfers) — research Cognitive Apprenticeship
- **Case Engine:** For patient vignettes (SOAP logic) — research Case-Based Reasoning
- **Debate Engine:** Devil's Advocate mode — research Dialectical Learning
- **Math/Physics Engine:** For biomechanics (Given→Find→Formula→Solve) — research Polya's Principles

### Architecture Questions
- Does "Visual-First" help adults or just novices?
- Is H1 (tree) too rigid? When to use concept maps (network)?
- Is M2 (linear) sufficient for feedback loops? Default to M6 for physiology?
- At what point does "Generation Fatigue" set in? Auto-suggest hooks after 45 min?
- Does L2 simplification correlate with L4 clinical competence?

---

## PART E: MASTER PLAN SUMMARY

### Vision (Non-Negotiable)
1. Remembers across sessions (durable context)
2. Runs end-to-end flows (plan→learn→test→log→review)
3. Grounds generation in learner's materials (RAG-first)
4. Produces spaced, high-quality cards retained over years

### Invariants (Never Change)
- Lifecycle: MAP → LOOP → WRAP
- Seed-Lock / Gated Platter / Teach-back
- RAG-first generation with citations
- Single source of truth: Brain DB + session logs
- Versioned schemas (backward-compatible)
- Deterministic logging (every session → log)

### Current Status (v9.3)
| Component | Status |
|-----------|--------|
| Session logging/ingest | ✅ Working |
| Dashboard | ✅ Implemented |
| RAG module | ✅ Exists (rag_notes.py) |
| Tutor API | ⚠️ Stub endpoints |
| Card bridge | ⏳ Needs source-tag gating |
| Content pipeline | ⏳ Not automated |

---

## PART F: EVIDENCE BASE

### Cited Research
| Claim | Source |
|-------|--------|
| Retrieval > restudy | Roediger & Karpicke (2006) |
| Spaced > massed | Cepeda et al. (2006) |
| Testing + spacing high-utility | Dunlosky et al. (2013) |
| Desirable difficulties | Bjork & Bjork (2011) |
| Elaborative interrogation | Pressley et al. (1988) |
| Metacognition framework | Nelson & Narens (1990) |

### Heuristics (Uncited)
- 1-3-7-21 spacing schedule
- 3+2 weekly rotation
- Exit ticket format
- R/Y/G retrospective timetable
- RSR thresholds

### Evidence Nuances (v9.3)
- No numeric forgetting claims unless cited
- Dual coding is heuristic, not guarantee
- Zeigarnik not memory guarantee — next-action hook for friction
- RSR thresholds are adaptive, not fixed

---

*Compiled from deep repo audit | Supplements PT_STUDY_SOP_MASTER_OVERVIEW_v9.3.md*


---

## PART G: TROUBLESHOOTING GUIDE (from v8.1)

### Stuck Detection Signals
| Signal | What It Looks Like |
|--------|-------------------|
| **Repetition** | Asking same question multiple times |
| **Blank recall** | Brain dump produces nothing; long pauses |
| **Confusion cascade** | "I don't get it" → more confusion after explanation |
| **Error escalation** | More mistakes as session continues |
| **Disengagement** | Short responses, "I guess," less energy |
| **Framework mismatch** | Concept doesn't fit current framework |

### Fatigue vs Confusion
| Fatigue | Confusion |
|---------|-----------|
| Knew it earlier, can't recall now | Never demonstrated understanding |
| Slower responses, less detail | Responses show misunderstanding |
| "I'm tired" / "need a break" | "This doesn't make sense" |
| General decline across topics | Specific concept is the problem |

### Fix Escalation Ladder
1. **Drop explanation level** — L4→L3→L2→L1; rebuild at lower level
2. **Swap framework** — Acknowledge mismatch; propose alternative
3. **Micro-step breakdown** — 3-5 tiny sequential steps; teach each separately
4. **Hook-first teaching** — Skip formal explanation; lead with vivid analogy
5. **Concrete-to-abstract** — Start with specific example; extract principle
6. **Partial teach-back** — User explains what they DO understand; fill specific gaps

### Specific Problem Patterns

**"I knew this yesterday"**
- Don't re-teach from scratch
- Provide retrieval cue: "Remember hook [X]? What did it connect to?"
- If cue works → practice retrieval more
- If cue fails → brief re-teach of specific forgotten piece

**Mixing up similar concepts**
- Put both concepts side by side
- Identify key distinguishing feature
- Create contrastive hook: "A is [X], B is [Y]"
- Quiz specifically on the distinction

**Can recall facts, can't apply**
- Present simple scenario requiring the knowledge
- Walk through reasoning together
- Present second scenario, user tries
- Add scenarios to weak points list

**Overwhelmed by volume**
- Pause and acknowledge
- Identify 2-3 MOST important items
- Explicitly set aside the rest
- Focus only on priority items

### Graceful Exit Protocol
1. Acknowledge: "Hitting a wall. Totally normal."
2. Offer options: push through X more minutes? stop now? one more recall then wrap?
3. Generate partial outputs: abbreviated recap, minimal cards, clear "Next Time" list
4. End cleanly: "Save this recap. Resume [topic] next time."

---

## PART H: RESEARCH NOTES BY MODULE

### M0 Planning Research
**Key findings:**
- Pre-testing improves retention; effects grow over longer intervals
- PT pre-lab quizzes improved lab exams and course grades
- Planning quality matters: concrete > vague plans
- Microlearning (10-15 min) works when paired with active recall
- "Struggle-first" practice leads to faster, fewer-error performance

**Sources:** Prequestioning review (Ed Psych Rev 2023), PT pre-lab study (2024), Planning study (npj Sci Learn 2024)

### M2 Prime Research
**Key findings:**
- Pre-questions boost targeted content (meta g≈0.54) even when initially wrong
- Errorful generation is desirable IF feedback follows
- Prior-knowledge activation (brain dump) primes schemas
- Visual generation (unlabeled→labeled) improves anatomy recall at 6-9 months
- Priming increases motivation/enjoyment

**Sources:** Pan & Carpenter (2023), St. Hilaire meta (2024), Kleiman echo study (2019)

### M3 Encode Research
**Key findings:**
- Dual coding: verbal + visuals yields ~0.5 SD gain
- Worked examples: meta g≈0.48; correct > incorrect; fading helps
- Self-explanation: meta g≈0.55 for "why/how" prompts
- Drawing helps when guided; unsupported adds load
- Segmenting complex media improves retention

**Sources:** Schoenherr (2024), Barbieri (2023), Bisra (2018), Leutner & Biele (2025)

### M4 Build Research
**Key findings:**
- Spacing: dramatically improves long-term retention
- Interleaving: meta g≈0.4; improves discrimination
- Variability: slows acquisition but improves transfer
- Successive relearning: 3+ correct recalls strengthens retention
- Feedback timing: immediate for factual errors; delay OK for reasoning

**Sources:** Brunmair & Richter (2019), Thompson & Hughes (2023), Metcalfe (2009)

### M5 Modes Research
**Key findings:**
- Practice testing: g≈0.5-0.7 for retention/transfer
- Mock exams outperform restudy and pretests
- Targeted remediation boosts exam scores ~1 letter grade
- Mastery thresholds (~80%+) cue progression
- Optimal focus chunks: ~20-30 min with breaks

**Switching criteria:**
- Sprint <70% → Drill
- Topic ~80%+ → Sprint or move on
- Conceptual errors → Core
- Memory slips → Drill

**Sources:** Adesope (2017), Rawson (2013), Serra (2025), Sievertsen (2016)

### M6 Wrap Research
**Key findings:**
- Self-explanation/teach-back: meta g≈0.55
- Ending with active recall beats passive re-read
- Error review with engagement matters
- Spaced follow-ups (1d/3d/7d): d≈0.6 in health-pro RCTs
- Confidence/JOL checks improve metacognitive accuracy
- Studying before sleep modestly improves next-day recall

**Sources:** Bisra (self-explanation meta), spacing RCTs, JOL calibration research

---

## PART I: LEGACY CONCEPTS WORTH PRESERVING

### NMMF Hook Structure (v8.1)
For key concepts, define:
- **N**ame: What is it called?
- **M**eaning: What does it mean/do?
- **M**emory Hook: Visual/story/sound/list hook
- **F**unction: What's its job/purpose?

### HookStyle Options
- Visual (picture/diagram)
- Story (narrative)
- Sound/Phonetic (what it sounds like)
- List/Jingle (rhythmic)
- Mixed (combination)

### Confidence Flags (v8.1)
Tag statements as:
- [From your materials] — verified from user sources
- [General knowledge] — from AI training
- [Uncertain] — needs verification

### Triage Modes (v8.1)
Based on time and knowledge level:
1. **Recall Only** — Quick retrieval check
2. **Compressed MAP** — Abbreviated priming
3. **Fast LOOP** — Rapid encode/test
4. **Full Protocol** — Complete M0-M6
5. **Depth + Mastery** — Extended with successive relearning

### Framework Selection Quick Reference
| Topic Type | Recommended Framework |
|------------|----------------------|
| Anatomy | H2 (Structure → Function) |
| Physiology | M6 (Perturbation → Correction) |
| Rehab/Load | M3 (Load → Response) or Y2 |
| Diagnosis | M8 (Cause → Test) |
| Unknown | Y1 (Generalist) or M2 (Mechanism) |

### Silver Platter Offer
Don't overwhelm the user with framework choices:
- Propose only TWO specific frameworks that fit best
- Example: "For 'Inflammation', I recommend M4 or Y2. Which map do you prefer?"

---

*Extracted from legacy v8.1, v8.4, v8.6 files*


---

## PART J: OPERATIONAL DEPLOYMENT

### Deployment Checklist

**Build Runtime Bundle:**
- Run: `python sop/tools/build_runtime_bundle.py`
- Confirm files created in `sop/runtime/knowledge_upload/`

**Upload/Paste Order:**
1. Paste `gpt_custom_instructions_study_os_v9.3.md` into Custom GPT system instructions
2. Upload knowledge files from `sop/runtime/knowledge_upload/`:
   - 00_INDEX_AND_RULES.md
   - 01_MODULES_M0-M6.md
   - 02_FRAMEWORKS.md
   - 03_ENGINES.md
   - 04_LOGGING_AND_TEMPLATES.md
   - 05_EXAMPLES_MINI.md
3. At session start, paste `runtime_prompt.md` as first user message
4. Use `gpt_prompt_weekly_rotational_plan.md` for weekly planning
5. Use `gpt_prompt_exit_ticket_and_wrap.md` for wrap outputs

**Success Criteria (First 2 Sessions):**
1. Planning enforced; source-lock and pre-test completed; no teaching before plan
2. Wrap produces Exit Ticket + JSON logs; spacing scheduled; cards captured

---

## PART K: LOGGING SCHEMA v9.3

### Formatting Rules
- Valid JSON only (double quotes, commas, no comments)
- Use `YYYY-MM-DD` for dates
- Use semicolon-separated values for list fields
- No multiline strings
- Use numbers for numeric fields
- Use "N/A" when field is unknown

### Tracker JSON (Required)
```json
{
  "schema_version": "9.3",
  "date": "YYYY-MM-DD",
  "topic": "Main topic",
  "mode": "Core",
  "duration_min": 45,
  "understanding": 4,
  "retention": 4,
  "calibration_gap": 10,
  "rsr_percent": 70,
  "cognitive_load": "intrinsic",
  "transfer_check": "yes",
  "anchors": "semicolon-separated",
  "what_worked": "semicolon-separated",
  "what_needs_fixing": "semicolon-separated",
  "notes": "semicolon-separated"
}
```

### Enhanced JSON (Required)
```json
{
  "schema_version": "9.3",
  "date": "YYYY-MM-DD",
  "topic": "Main topic",
  "mode": "Core",
  "duration_min": 45,
  "understanding": 4,
  "retention": 4,
  "calibration_gap": 10,
  "rsr_percent": 70,
  "cognitive_load": "intrinsic",
  "transfer_check": "yes",
  "source_lock": "semicolon-separated",
  "plan_of_attack": "semicolon-separated",
  "frameworks_used": "semicolon-separated",
  "buckets": "semicolon-separated",
  "confusables_interleaved": "semicolon-separated",
  "anchors": "semicolon-separated",
  "anki_cards": "semicolon-separated",
  "glossary": "semicolon-separated",
  "exit_ticket_blurt": "semicolon-separated",
  "exit_ticket_muddiest": "semicolon-separated",
  "exit_ticket_next_action": "semicolon-separated",
  "retrospective_status": "semicolon-separated",
  "spaced_reviews": "R1=YYYY-MM-DD; R2=...; R3=...; R4=...",
  "what_worked": "semicolon-separated",
  "what_needs_fixing": "semicolon-separated",
  "next_session": "semicolon-separated",
  "notes": "semicolon-separated"
}
```

### Required Calculations
- `calibration_gap` = predicted performance (JOL) minus actual recall
- `rsr_percent` = percent correct on retrieval attempts at session start

---

## PART L: WRAP OPERATOR SCRIPT (v8.6 legacy - still useful)

**Run this sequence when user says "Wrap":**

1. **Anchor Review:**
   "Session Paused. Let's review the **Locked Anchors** (User Seeds):
   - [Anchor 1] - [User's Hook]
   - [Anchor 2] - [User's Hook]"

2. **Card Selection:**
   "Which of these are shaky? I will generate Anki cards *only* for the ones you select."

3. **Co-Creation:**
   (For selected items) "Drafting Card... Front: [Concept]. Back: [User's specific hook]. Confirm or Edit?"

4. **Close:**
   "Session saved. Resume with 'Resume [Topic]' next time."

**Logic:**
- No cards during learning loop — WRAP is the dedicated card phase
- Recap focuses on user-built anchors, not new teaching
- Co-build cards using user's specific hooks (including phonetic cues)
- Confirm wording before finalizing; avoid duplicates

---

## PART M: NotebookLM BRIDGE

### Source Packet Format (Required for factual teaching)
```
SOURCE PACKET (NotebookLM)
- Topic:
- Sources used:
- Key excerpts (with citations):
  - Excerpt A: "..." [citation]
  - Excerpt B: "..." [citation]
- Definitions:
- Mechanism / steps:
- Differentiators:
- Practice questions:
```

### Hard Rule
If no Source Packet (or no excerpts from sources), the AI may help with study strategy and question-asking, but must NOT assert factual or clinical claims. It must request a Source Packet.

### NotebookLM Prompt Template
```
From my sources only: extract learning objectives, key definitions, mechanisms/steps, differentiators, and 5-10 practice questions; include citations.
```

---

## PART N: CORE PROTOCOL FLOW (v8.6 Step Summary)

### MAP → LOOP Flow

**Entry:** Verify state/motivation. Confirm topic. Demand user's Seed.

**Step 0 — Prime (System Scan)**
- Present H-Series: list parts/structures
- Ask user to group/bucket items
- Instruction: "Don't memorize yet—just bucket"

**Step 1 — Encode**
- Select one bucket
- Define function/purpose using M-Series
- Apply Phonetic Override for unfamiliar terms

**Step 2 — The Gate**
- Demand Seed before building
- If user stalls → Gated Platter (raw L1 metaphor; user must edit)

**Step 3 — Build (Level Escalation)**
- L1: Metaphor/Analogy
- L2: Simple/10-year-old (MUST teach-back before L4)
- L3: High-School
- L4: Professional/Clinical

**Loop Discipline:**
- Keep cycles short: prompt → user builds → quick verify → escalate or remediate
- No time-based gates; progress on user declaration (ready/next/again)

---

*Extracted from deployment docs, logging schema, runtime content, and v8.6 protocols*


---

## PART J: V7.2 METHODS INDEX (Key Extractions)

### NMMF Encoding (Name → Meaning → Memory Hook → Function)

**The 4 Components:**
1. **Name** — State term exactly as in source
2. **Meaning** — Etymology or "sounds like" explanation  
3. **Memory Hook** — Simple image/metaphor tied to mechanism
4. **Function** — One-sentence description connected to hook

**Example:**
```
Name: Astrocyte
Meaning: Astro- = star (star-shaped cells)
Memory Hook: "Mom cells" — feed, protect, clean
Function: Astrocytes are 'mom cells' that feed and protect neurons while cleaning up the neuronal environment
```

### Hook Integration Rule (HIR)

**5 Integration Points — hooks must appear in:**
1. **Initial Teaching** — "Remember, astrocytes are your 'mom cells'…"
2. **Recall Prompts** — "Explain what the 'mom cells' do"
3. **Anki Cards** — Include hook on back
4. **Recap Sheet** — List under "Memory Devices & Hooks"
5. **Consistency** — Same hook throughout session

**Key Principle:** Hooks are permanent retrieval cues, not decorations.

### Personal Encoding Step (PES)

**Process:**
1. AI presents NMMF with default hook
2. AI prompts: "What does this remind YOU of?"
3. User adopts, tweaks, or creates new hook
4. AI locks in user's version for all subsequent use
5. If user blanks: AI offers 1-2 candidates

**Key Principle:** The best hook is the one the user creates themselves.

### Hook Quality Criteria

**Good hooks are:**
- **Mechanism-Linked** — Connected to actual function
- **Simple & Vivid** — Easy to visualize, concrete
- **Personally Meaningful** — User-generated or approved
- **Stable** — Used consistently, updated everywhere if modified
- **Retrievable** — Works as cue under exam pressure

**Poor hooks:**
- Random associations ("sounds like asteroid")
- Overly complex metaphors
- Not tied to mechanism
- Changed frequently
- Imposed without user buy-in

### Brain Dump vs Teach-Back

| Method | Best For | Process |
|--------|----------|---------|
| **Brain Dump** | Unstructured content | Free recall everything about topic |
| **Teach-Back** | Processes, pathways | Step-by-step explanation as if teaching |

### Recall Timing Guidelines

**Default:** After 2-4 anchors or one subtopic

**Earlier (1-2 anchors) if:**
- User seems overloaded
- LoU was None/Low
- Material is very complex

**Later (4-6 anchors) if:**
- User is cruising
- LoU is High
- Material is straightforward

### Level of Understanding (LoU) Assessment

| Level | Description | Adjustments |
|-------|-------------|-------------|
| **None/Low** | First exposure, very fuzzy | Heavy priming, more teaching, simpler explanations |
| **Moderate** | Seen before, some gaps | Standard priming, regular recall, focus on weak spots |
| **High** | Mostly solid, need refinement | Brief prime, more recall/quiz, application questions |

### Chunk Size Adaptation

**If recall is poor:**
- Shrink chunks (1-2 anchors instead of 2-4)
- Slower, more detailed explanation
- More frequent micro-checks
- Add scaffolding

**If recall is strong:**
- Expand chunks (4-6 anchors)
- Faster pace
- More integration questions
- Application challenges

### Anki Card Generation Rules

**Card Sources:**
- All Weak anchors
- Important Moderate anchors
- Critical anchors (even if Strong, if user requests)

**Card Format:**
```
FRONT: Short, precise, exam-style cue
BACK: 
- Concise answer (bullets or short paragraph)
- Hook reminder

Tags: <Course>::<Module>::<Topic>::<Subtopic>
```

### Recap Sheet Structure

**Required Sections:**
1. **Title + Date**
2. **Anchor Summary** (bullets under framework headings)
3. **Memory Devices & Hooks** (listed under anchors)
4. **Weak Points / Next Time** (bullet list of trouble spots)

**Style:**
- Short bullets (framable as prompts)
- Designed for active recall, not passive re-reading
- One page maximum

### Always-On Rules

| Rule | Description |
|------|-------------|
| **Source-Lock** | Use only Project files; label external info |
| **Active Recall Gate** | No topic "covered" without recall attempt |
| **One-Small-Step** | Small chunks, frequent checks, invite questions |
| **Summary & Save** | Every session produces cards + recap |

### Fast Mode (15-30 min)

**MAP:** 3-5 ultra-brief anchors, one framework, quick NMMF
**LOOP:** Minimal teaching, 1-2 brain dumps, skip extended teaching
**WRAP:** 2-3 high-yield questions, 3-10 key cards, half-page recap

**Trade-off:** Coverage and emergency prep, NOT full mastery

### Quiz Design Method

**Structure:**
- 3-5 questions per session
- Mix of question types
- Map each question to specific anchors

**Question Types:**
1. Short-answer recall
2. Mechanism explanation
3. Mini case
4. Hook-based

**Coverage Rule:** Every anchor must appear in at least one question

---

## PART K: COMPLETE GOVERNANCE RULES

### Source-Lock Protocol
- Use ONLY Project files for course content
- External sources require explicit user permission
- Always label external info and tie back to course material

### Active Recall Gate
- No topic "covered" without retrieval attempt
- User must do Brain Dump, Teach-Back, or quiz before moving on
- If you haven't retrieved it from memory, you haven't learned it

### One-Small-Step Rule
- Avoid long monologues
- Pause regularly to check understanding
- Encourage interruption and questions
- Small steps beat big leaps

### Summary & Save Rule
Every session must produce:
1. Anki cards for weak/critical items (with hooks)
2. One-page recap (with hooks)

---

*Extracted from v7.2 Methods Index (1111 lines)*
