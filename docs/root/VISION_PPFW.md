# VISION: PPFW Stack (Genesis Document)

The theoretical and scientific foundation for the PT Study OS. This document distills learning science into a **PPFW (Paradigm, Principles, Frameworks, Workflows)** abstraction ladder — from the "hardware" of how brains learn to the "tactics" of what to do right now.

> **Relationship to other docs:**
> - For the operational system built on this foundation, see `sop/library/00-overview.md`
> - For the composable method library, see `sop/library/15-method-library.md`
> - For the product architecture, see `docs/root/PROJECT_ARCHITECTURE.md`
> - For the evidence base, see `sop/library/12-evidence.md`

---

## The Abstraction Ladder

| Tier | Component | Metaphor | Research Focus | System Output |
|------|-----------|----------|----------------|---------------|
| **P** | **Paradigm** | The Hardware/OS | How brains work | Master Rules for the Tutor |
| **P** | **Principles** | The Scientific Laws | What always works | Grading criteria for the Brain |
| **F** | **Frameworks** | The Meso-Cycles | Multi-step processes | Structure of the 6 PEIRRO phases |
| **W** | **Workflows** | The Micro-Actions | Specific tactics | The 34 Method Blocks (MA-01 to MA-34) |

---

## Tier 1: PARADIGM (The Worldview)

These are the foundational theories of cognition that dictate how the **Tutor** interprets learning and how the **Scholar** evaluates session quality.

### 1.1 Constructivism

**Core Claim:** Learners actively build new knowledge upon existing mental structures (schemas). Knowledge is not transmitted but constructed.

| Researcher | Contribution | Implication for Tutor |
|------------|--------------|----------------------|
| **Jean Piaget** | Assimilation (fitting new info into existing schemas) and Accommodation (modifying schemas) | Always activate prior knowledge before new material |
| **Lev Vygotsky** | Zone of Proximal Development (ZPD) — the gap between what learner can do alone vs. with guidance | Tutor operates in the ZPD; scaffolds then fades |
| **Jerome Bruner** | Scaffolding — temporary support removed as competence grows | M4 Build uses Guided → Faded → Independent progression |

**System Implementation:**
- **Prior Knowledge Scan (M-PRE-003):** Surfaces existing schemas before encoding
- **Brain Dump (M-PRE-001):** Activates prior knowledge to anchor new material
- **Seed-Lock Rule:** Learner generates the hook; AI does not impose meaning
- **L2 Teach-Back Gate:** Verifies schema construction before advancing

**Key Citation:** Brod et al. (2013) — Prior knowledge activation improves encoding by providing anchoring schemas.

---

### 1.2 Cognitive Load Theory (CLT)

**Core Claim:** Working memory is severely limited (~4 items, ~20 seconds). Learning fails when cognitive load exceeds capacity.

| Load Type | Definition | Design Implication |
|-----------|------------|-------------------|
| **Intrinsic** | Inherent complexity of the material | Cannot reduce; manage by chunking |
| **Extraneous** | Load from poor instructional design | Eliminate ruthlessly |
| **Germane** | Load from schema construction | Maximize — this is learning |

**Key Researchers:** John Sweller (1988, 2011, 2024), Fred Paas, Jeroen van Merriënboer

**System Implementation:**
- **H3 Load Stack Framework:** Explicit load classification in priming
- **3+2 Rotational Interleaving:** Prevents overload via topic rotation
- **Chunking:** Miller's 7±2 rule; group related items
- **Dual Coding:** Offloads verbal to visual channel
- **Faded Scaffolding:** Reduces extraneous load as competence grows

**Key Citation:** Sweller (2024) — "Cognitive load theory is an instructional theory based on evolutionary psychology and human cognitive architecture."

---

### 1.3 Metacognition

**Core Claim:** Thinking about thinking. Awareness and regulation of one's own cognitive processes.

| Component | Definition | System Implementation |
|-----------|------------|----------------------|
| **Metacognitive Knowledge** | What you know about your own learning | Exit Ticket "muddiest point" |
| **Metacognitive Regulation** | Planning, monitoring, evaluating | M0 Planning, M6 Wrap |
| **Calibration** | Accuracy of confidence judgments | Pre-Test (M-PRE-007) with confidence ratings |

**Key Researchers:** John Flavell (1979), Ann Brown (1987), Philip Winne

**System Implementation:**
- **Exit Ticket (M-OVR-001):** "What did I learn? What's still muddy? What's my next action?"
- **Pre-Test with Confidence:** Calibration check before learning
- **RSR (Retrieval Success Rate):** Quantified self-assessment
- **Error Autopsy (M-REF-001):** Metacognitive error analysis

**Key Citation:** Tanner (2012) — Metacognitive reflection improves self-regulated learning.

---

### 1.4 Desirable Difficulty

**Core Claim:** Conditions that make learning harder in the short term often make it more durable in the long term.

| Difficulty | Why It Works | System Implementation |
|------------|--------------|----------------------|
| **Generation** | Creating answers > reading answers | Seed-Lock; Teach-Back; Free Recall |
| **Retrieval Practice** | Testing > restudying | Sprint Quiz; Mixed Practice |
| **Spacing** | Distributed > massed practice | 1-3-7-21 schedule; 3+2 rotation |
| **Interleaving** | Mixed > blocked practice | Mixed Practice (M-RET-004) |
| **Variability** | Varied contexts > constant contexts | Variable Retrieval (M-RET-005) |

**Key Researchers:** Robert Bjork & Elizabeth Bjork (UCLA)

**System Implementation:**
- **Socratic Persona:** "Do not give answers; give hints and ask diagnostic questions"
- **Zero-Feedback Retrieve:** No answers until after retrieval attempt
- **Time Pressure:** Sprint Quiz enforces speed
- **PEIRRO Spacing:** Built into the macro learning cycle

**Key Citation:** Bjork & Bjork (2020) — "Desirable Difficulties in Theory and Practice," *Journal of Applied Research in Memory and Cognition*.

---

### 1.5 Connectivism

**Core Claim:** Knowledge resides in connections — between neurons, between concepts, between people. Learning is network formation.

**Key Researchers:** George Siemens, Stephen Downes

**System Implementation:**
- **Concept Map (M-ENC-009):** Visualizes knowledge networks
- **Cross-Topic Link (M-INT-003):** Builds inter-concept connections
- **Analogy Bridge (M-INT-001):** Maps new concepts to familiar domains
- **Knowledge Graphs:** Obsidian vault integration for networked notes

---

## Tier 2: PRINCIPLES (The Scientific Laws)

These are the evidence-based "rules" that must be present in every study session. The **Brain** uses these to grade session effectiveness.

### 2.1 Retrieval Practice (The Testing Effect)

**Core Claim:** The act of retrieving information from memory strengthens that memory more than restudying.

| Finding | Source | Effect Size |
|---------|--------|-------------|
| Testing > restudying for long-term retention | Roediger & Karpicke (2006) | d = 0.50-0.80 |
| Testing benefits transfer to new contexts | Butler (2010) | d = 0.40 |
| Pretesting improves later learning (even when wrong) | Richland et al. (2009) | d = 0.33 |

**System Implementation:**
- **Free Recall Blurt (M-RET-001):** Pure retrieval, no cues
- **Sprint Quiz (M-RET-002):** Rapid-fire Q&A with RSR tracking
- **Pre-Test (M-PRE-007):** Activates retrieval before learning
- **M4 Build Ladder:** Guided → Faded → Independent → Interleaved

**Key Citation:** Roediger & Karpicke (2006) — "Test-Enhanced Learning," *Psychological Science*.

---

### 2.2 Spaced Repetition (The Spacing Effect)

**Core Claim:** Distributing practice over time produces better long-term retention than massing practice.

| Finding | Source | Effect Size |
|---------|--------|-------------|
| Spaced > massed practice | Cepeda et al. (2006) | d = 0.42-0.79 |
| Optimal gap = 10-20% of retention interval | Cepeda et al. (2008) | — |
| Spaced retrieval practice = strongest combination | Latimier et al. (2021) | d = 0.63 |

**Optimal Spacing Schedules:**
- **Leitner System:** Box progression (1 day → 3 days → 7 days → 21 days)
- **SM-2 Algorithm:** Anki's adaptive spacing
- **1-3-7-21 Heuristic:** Simple rule for manual scheduling

**System Implementation:**
- **1-3-7-21 Schedule:** Default spacing intervals
- **3+2 Rotational Interleaving:** 3 active topics + 2 review topics per week
- **Anki Card Draft (M-OVR-002):** Creates spaced repetition cards
- **Mastery Loop (M-REF-002):** Successive relearning protocol

**Key Citation:** Cepeda et al. (2006) — "Distributed Practice in Verbal Recall Tasks," *Psychological Bulletin*.

---

### 2.3 Interleaving (The Mixing Effect)

**Core Claim:** Mixing different topics/problem types during practice improves discrimination and transfer.

| Finding | Source | Effect Size |
|---------|--------|-------------|
| Interleaved > blocked for math | Rohrer et al. (2015) | d = 0.42 |
| Interleaving improves discrimination | Foster et al. (2019) | d = 0.30-0.50 |
| Benefits strongest for confusable categories | Birnbaum et al. (2013) | — |

**Why It Works:**
1. **Discrimination Learning:** Forces learner to identify "which strategy applies here?"
2. **Distributed Practice:** Natural spacing within the interleaved set
3. **Contextual Variability:** Varied retrieval contexts build flexible access

**System Implementation:**
- **Mixed Practice (M-RET-004):** 2-3 topics interleaved in retrieval block
- **Variable Retrieval (M-RET-005):** Same concept, 3 different formats
- **Track B Interleaving:** Review sessions interleave prior material
- **Confusables List:** Explicitly tracks easily confused items

**Key Citation:** Rohrer et al. (2015) — "Interleaved practice improves mathematics learning," *Journal of Educational Psychology*.

---

### 2.4 Dual Coding

**Core Claim:** Information encoded in both verbal and visual forms is better retained than information encoded in only one form.

| Finding | Source | Effect Size |
|---------|--------|-------------|
| Pictures + words > words alone | Paivio (1991) | d = 0.50-0.80 |
| Drawing enhances memory | Wammes et al. (2016) | d = 0.45 |
| Multimedia principle | Mayer (2001) | d = 0.72 |

**Mayer's Multimedia Principles:**
1. **Coherence:** Remove extraneous material
2. **Signaling:** Highlight essential information
3. **Spatial Contiguity:** Place words near corresponding graphics
4. **Temporal Contiguity:** Present words and graphics simultaneously
5. **Modality:** Use spoken words with graphics, not text

**System Implementation:**
- **KWIK Micro-Loop:** Sound → Function → **Image** → Resonance → Lock
- **Draw-Label (M-ENC-003):** Sketch from memory, then label
- **Concept Map (M-ENC-009):** Visual network of relationships
- **Process Flowchart (M-ENC-011):** Visual algorithm representation
- **Mermaid.js Diagrams:** AI-parseable visual encoding

**Key Citation:** Mayer (2001) — *Multimedia Learning*, Cambridge University Press.

---

### 2.5 Elaboration & Self-Explanation

**Core Claim:** Explaining material to oneself (or others) deepens understanding by forcing integration with prior knowledge.

| Finding | Source | Effect Size |
|---------|--------|-------------|
| Self-explanation improves learning | Chi et al. (1994) | d = 0.61 |
| Elaborative interrogation ("Why?") | Dunlosky et al. (2013) | Moderate utility |
| Teaching others improves own learning | Nestojko et al. (2014) | d = 0.40 |

**Types of Elaboration:**
- **Self-Explanation:** Explaining to yourself what a sentence/step means
- **Elaborative Interrogation:** Asking "Why does this make sense?"
- **Teaching:** Explaining to a real or imagined other

**System Implementation:**
- **Why-Chain (M-ENC-005):** Repeat "Why?" until bedrock
- **Self-Explanation Protocol (M-ENC-007):** Explain each paragraph in own words
- **Teach-Back (M-ENC-004):** Explain concept to AI without notes
- **Analogy Bridge (M-INT-001):** Map to familiar domain

**Key Citation:** Chi et al. (1994) — "Eliciting self-explanations improves understanding," *Cognitive Science*.

---

### 2.6 Successive Relearning

**Core Claim:** Combining retrieval practice with spaced repetition produces the most durable learning.

| Finding | Source |
|---------|--------|
| Relearning to criterion + spacing = optimal | Rawson & Dunlosky (2011) |
| 3 correct retrievals = mastery threshold | Rawson & Dunlosky (2013) |

**Protocol:**
1. Test item → if incorrect, restudy briefly → retest immediately
2. Repeat until correct
3. Space and retest again

**System Implementation:**
- **Mastery Loop (M-REF-002):** Re-study misses → immediate retest → repeat until mastered
- **RSR Thresholds:** <80% = needs more encoding; >90% = ready to advance

**Key Citation:** Rawson & Dunlosky (2011) — "Successive relearning combines testing + spacing," *Memory & Cognition*.

---

## Tier 3: FRAMEWORKS (The Meso-Cycles)

These are multi-step methodologies that organize principles into repeatable processes. They define the **structure** of the 6 PEIRRO phases.

### 3.1 Bloom's Taxonomy (Revised)

**Original:** Benjamin Bloom (1956)
**Revision:** Anderson & Krathwohl (2001)

| Level | Cognitive Process | Sample Verbs | PEIRRO Mapping |
|-------|-------------------|--------------|----------------|
| 1. **Remember** | Retrieve from memory | List, recall, identify | Retrieve |
| 2. **Understand** | Construct meaning | Explain, summarize, paraphrase | Encode |
| 3. **Apply** | Use in new situation | Solve, demonstrate, use | Interrogate |
| 4. **Analyze** | Break into parts | Compare, contrast, differentiate | Interrogate |
| 5. **Evaluate** | Make judgments | Critique, justify, argue | Interrogate |
| 6. **Create** | Produce new work | Design, construct, develop | Overlearn (artifacts) |

**System Implementation:**
- **H4 Bloom's Depth Framework:** Explicit level tagging
- **L1-L4 Depth Gating:** Maps to Bloom's lower → higher levels
- **M4 Build Ladder:** Moves from Remember → Apply → Analyze

---

### 3.2 PEIRRO (Macro Learning Cycle)

**What:** Six-phase cycle structuring every study session.

**Pattern:** Prepare → Encode → Interrogate → Retrieve → Refine → Overlearn

| Phase | Bloom's Level | Primary Principle | Key Methods |
|-------|---------------|-------------------|-------------|
| **Prepare** | — | Prior Knowledge Activation | Brain Dump, Pre-Test |
| **Encode** | Understand | Dual Coding, Elaboration | KWIK Hook, Draw-Label, Teach-Back |
| **Interrogate** | Apply/Analyze | Elaboration, Transfer | Analogy Bridge, Clinical Application |
| **Retrieve** | Remember | Retrieval Practice | Free Recall, Sprint Quiz |
| **Refine** | Evaluate | Error Correction | Error Autopsy, Mastery Loop |
| **Overlearn** | Create | Spacing, Artifacts | Exit Ticket, Anki Card Draft |

---

### 3.3 KWIK (Encoding Micro-Loop)

**What:** Five-step gated process for creating durable memory hooks.

**Pattern:** Sound → Function → Image → Resonance → Lock

| Step | Gate Condition | Principle Applied |
|------|----------------|-------------------|
| **Sound** | Phonetic hook identified | Dual Coding (verbal) |
| **Function** | Meaning confirmed | Elaboration |
| **Image** | Visual anchored to function | Dual Coding (visual) |
| **Resonance** | Learner confirms "feels right" | Metacognition |
| **Lock** | Artifact logged | Successive Relearning |

---

### 3.4 Cognitive Apprenticeship

**Researchers:** Collins, Brown, Newman (1989)

| Phase | Definition | System Implementation |
|-------|------------|----------------------|
| **Modeling** | Expert demonstrates thinking | Tutor think-aloud in Encode |
| **Coaching** | Guided practice with feedback | M4 Build Guided tier |
| **Scaffolding** | Temporary support structures | Faded scaffolding in M4 |
| **Fading** | Gradual removal of support | Independent tier in M4 |
| **Articulation** | Learner explains reasoning | Teach-Back (M-ENC-004) |
| **Reflection** | Learner compares to expert | Error Autopsy (M-REF-001) |

---

### 3.5 Syntopical Reading

**Researchers:** Adler & Van Doren (1972) — *How to Read a Book*

**Process:**
1. Survey multiple sources on same topic
2. Identify key terms and normalize vocabulary
3. Build comparative framework
4. Synthesize into unified understanding

**System Implementation:**
- **Source Packets:** Multiple NotebookLM sources per topic
- **Comparison Table (M-ENC-010):** Side-by-side analysis
- **Cross-Topic Link (M-INT-003):** Finds shared principles

---

### 3.6 Zettelkasten (Atomic Notes)

**Originator:** Niklas Luhmann

**Principles:**
1. **Atomicity:** One idea per note
2. **Linking:** Every note connects to others
3. **Emergence:** Ideas develop through connections

**System Implementation:**
- **Anki Cards:** Atomic, single-fact cards
- **Obsidian Vault:** Linked notes with backlinks
- **Concept Map (M-ENC-009):** Visualizes note networks

---

## Tier 4: WORKFLOWS (The Micro-Actions)

These are specific, interchangeable tactics that plug into the Meso-phases. The 34 Method Blocks live here.

### 4.1 Feynman Technique

**Originator:** Richard Feynman (Nobel Prize physicist)

**Steps:**
1. **Choose concept** — Write topic at top of page
2. **Teach to 12-year-old** — Explain in simple terms without jargon
3. **Identify gaps** — Where did you get stuck? Those are your gaps.
4. **Simplify further** — Refine explanation until crystal clear

**System Implementation:**
- **Teach-Back (M-ENC-004):** Core Feynman workflow
- **L2 Simplification Gate:** Must explain simply before advancing to L3/L4
- **Why-Chain (M-ENC-005):** Drills to bedrock understanding

---

### 4.2 Socratic Method

**Originator:** Socrates (via Plato)
**Modern:** Richard Paul, Linda Elder (Critical Thinking Foundation)

**Question Types:**
| Type | Purpose | Example |
|------|---------|---------|
| **Clarifying** | Define terms | "What do you mean by...?" |
| **Probing assumptions** | Surface hidden beliefs | "What are you assuming?" |
| **Probing reasons** | Examine evidence | "How do you know?" |
| **Questioning viewpoints** | Consider alternatives | "What would someone who disagrees say?" |
| **Probing implications** | Trace consequences | "If that's true, what follows?" |
| **Meta-questions** | Reflect on the question | "Why is this question important?" |

**System Implementation:**
- **Tutor Persona:** "Act as a Mental Personal Trainer... do not give answers; give hints and ask diagnostic questions"
- **Interrogate Phase:** Tutor acts as skeptic, probing gaps
- **Why-Chain (M-ENC-005):** Recursive probing to bedrock

---

### 4.3 Cornell Notes

**Originator:** Walter Pauk (Cornell University, 1950s)

**Format:**
| Cue Column (left) | Notes Column (right) |
|-------------------|---------------------|
| Questions, keywords | Detailed notes during lecture |
| **Summary (bottom):** | 2-3 sentence summary after |

**System Implementation:**
- **Session Ledger:** Covered/Not Covered maps to Cornell summary
- **Exit Ticket:** Summary component
- **AI Skeleton Review (M-PRE-004):** Cue column equivalent

---

### 4.4 Mind Mapping / Concept Mapping

**Originator:** Tony Buzan (Mind Maps), Joseph Novak (Concept Maps)

**Differences:**
- **Mind Map:** Radial, single central topic, uses images/color
- **Concept Map:** Network, multiple nodes, labeled relationships

**System Implementation:**
- **Concept Map (M-ENC-009):** Network visualization
- **Mermaid.js Diagrams:** AI-parseable visual encoding
- **Obsidian Graph View:** Knowledge network visualization

---

### 4.5 SQ3R / PQ4R

**Originator:** Francis Robinson (1946)

**Steps:** Survey → Question → Read → Recite → Review

**System Implementation:**
- **AI Skeleton Review (M-PRE-004):** Survey equivalent
- **Prediction Questions (M-PRE-002):** Question equivalent
- **Think-Aloud (M-ENC-006):** Read/process equivalent
- **Free Recall Blurt (M-RET-001):** Recite equivalent
- **Mastery Loop (M-REF-002):** Review equivalent

---

## The Complete Method Block Library

### By PEIRRO Phase

| Phase | Block ID | Name | Duration | Energy | Principle |
|-------|----------|------|----------|--------|-----------|
| **Prepare** | M-PRE-001 | Brain Dump | 3 min | Low | Prior Knowledge |
| | M-PRE-002 | Prediction Questions | 3 min | Low | Curiosity |
| | M-PRE-003 | Prior Knowledge Scan | 5 min | Low | Schema Activation |
| | M-PRE-004 | AI Skeleton Review | 5 min | Low | Survey |
| | M-PRE-005 | Concept Cluster | 5 min | Medium | Chunking |
| | M-PRE-006 | Three-Layer Chunk | 5 min | Medium | CLT |
| | M-PRE-007 | Pre-Test | 5 min | Medium | Pretesting Effect |
| **Encode** | M-ENC-001 | KWIK Hook | 3 min | Low | Dual Coding |
| | M-ENC-002 | Seed-Lock Generation | 3 min | Medium | Generation |
| | M-ENC-003 | Draw-Label | 5 min | Medium | Drawing Effect |
| | M-ENC-004 | Teach-Back | 5 min | Medium | Feynman |
| | M-ENC-005 | Why-Chain | 5 min | High | Elaboration |
| | M-ENC-006 | Think-Aloud | Variable | Medium | Metacognition |
| | M-ENC-007 | Self-Explanation | 5 min | Medium | Chi Effect |
| | M-ENC-008 | Mechanism Trace | 10 min | High | Causal Reasoning |
| | M-ENC-009 | Concept Map | 10 min | High | Connectivism |
| | M-ENC-010 | Comparison Table | 10 min | High | Discrimination |
| | M-ENC-011 | Process Flowchart | 10 min | High | Visual Encoding |
| | M-ENC-012 | Clinical Decision Tree | 10 min | High | Transfer |
| **Interrogate** | M-INT-001 | Analogy Bridge | 5 min | Medium | Far Transfer |
| | M-INT-002 | Clinical Application | 10 min | High | Near Transfer |
| | M-INT-003 | Cross-Topic Link | 5 min | Medium | Connectivism |
| | M-INT-004 | Side-by-Side Comparison | 10 min | High | Discrimination |
| | M-INT-005 | Case Walkthrough | 10 min | High | Case-Based Learning |
| | M-INT-006 | Illness Script Builder | 10 min | High | Schema Building |
| **Retrieve** | M-RET-001 | Free Recall Blurt | 5 min | Medium | Testing Effect |
| | M-RET-002 | Sprint Quiz | 5 min | Medium | Retrieval Practice |
| | M-RET-003 | Fill-in-Blank | 5 min | Low | Cloze Deletion |
| | M-RET-004 | Mixed Practice | 10 min | High | Interleaving |
| | M-RET-005 | Variable Retrieval | 10 min | Medium | Variability |
| **Refine** | M-REF-001 | Error Autopsy | 5 min | Medium | Error Correction |
| | M-REF-002 | Mastery Loop | 10 min | Medium | Successive Relearning |
| **Overlearn** | M-OVR-001 | Exit Ticket | 3 min | Low | Metacognition |
| | M-OVR-002 | Anki Card Draft | 5 min | Low | Spacing |

---

## The Root Agent Blueprint

These three agents are the "hardware" of the system:

| Agent | Role | PPFW Responsibility |
|-------|------|---------------------|
| **Brain** | Database | Holds Source Truth + Performance Log; grades sessions against Principles |
| **Scholar** | Architect | Researches the Abstraction Ladder; builds Macro Chains; proposes system improvements |
| **Tutor** | Interface | Executes the Method Blocks; enforces Source-Lock and Socratic persona |

---

## The Execution Hierarchy

1. **Macro (The Chain):** A sequence of Mesos (e.g., `PRIME → ENCODE → RETRIEVE`)
2. **Meso (The Phase):** A functional bucket with a specific "mode" of teaching
3. **Micro (The Tweak):** The specific Method Block chosen for that phase

---

## Research Gaps & Backlog

### Explicit (Well-Covered)
- ✅ All 6 core principles implemented with evidence (28 citations)
- ✅ H/M/Y/L series, PEIRRO, KWIK fully specified
- ✅ M0-M6 flow, 5 modes, 34 blocks, 13 chains comprehensive

### Implicit (Needs Labeling)
- ⚠️ Paradigm layer present but not explicitly documented
- ⚠️ PEIRRO → Bloom's alignment not explicit
- ⚠️ Transfer & generalization principles implicit

### Missing (Research Backlog)
- ❌ **Procedure Engine:** Cognitive Apprenticeship for physical skills (goniometry, transfers)
- ❌ **Debate Engine:** Dialectical learning for clinical reasoning defense
- ❌ **Math/Physics Engine:** Polya's problem-solving for Biomechanics
- ❌ **Rhizomatic Learning:** Non-hierarchical, network-based topic navigation

---

## Quick Reference: System Initialization

*The "Master Prompt" for turning a new AI chat into the Tutor agent.*

> ### SYSTEM INITIALIZATION: MODULAR LEARNING ENGINE
>
> **ROLE:** You are the **TUTOR** agent in a three-part system (Brain, Scholar, Tutor). Your goal is to lead me through high-fidelity, source-locked study sessions.
>
> **MASTER RULES (GLOBAL):**
> 1. **SOURCE-LOCK:** You are in a closed-circuit system. Use **ONLY** uploaded materials. If info is missing, state: "Not defined in provided material."
> 2. **CITATION MANDATE:** Every claim, definition, or answer must be cited: `[Wk#, Slide#]` or `[Doc Name, Pg#]`.
> 3. **SOCRATIC PERSONA:** Act as a "Mental Personal Trainer." Prioritize **Desirable Difficulty**. Do not give answers; give hints and ask diagnostic questions.
> 4. **FIDELITY CHECK:** Ensure terminology matches the instructor's verbatim phrasing. Label any of your own synthesis as **"INFERRED."**
>
> **OPERATIONAL MODES (MESOS):**
> * **PRIME:** Prioritize "Big Picture" deconstruction (Lenses).
> * **ENCODE:** Focus on verbatim capture and atomic units.
> * **INTERROGATE:** Act as a skeptic; find logical gaps and prerequisites.
> * **RETRIEVE:** Zero-feedback mode. Pure active recall.
> * **REFINE:** Detailed feedback loop and error logging.
> * **OVERLEARN:** High-speed, interleaved practice across all topics.
>
> **SESSION START:** I will provide the materials. Once uploaded, I will give you a **MACRO CHAIN** (e.g., `PRIME → ENCODE`) and specify which **METHOD BLOCKS (M-XXX-NNN)** to execute.
> **Acknowledge and wait for data upload.**

---

## Appendix: Key Citations

| Author(s) | Year | Title | Finding |
|-----------|------|-------|---------|
| Roediger & Karpicke | 2006 | Test-Enhanced Learning | Testing > restudying (d=0.50-0.80) |
| Cepeda et al. | 2006 | Distributed Practice | Spacing > massing (d=0.42-0.79) |
| Dunlosky et al. | 2013 | Improving Students' Learning | Practice testing + distributed practice = high utility |
| Chi et al. | 1994 | Self-Explanation Effect | Self-explaining improves understanding (d=0.61) |
| Mayer | 2001 | Multimedia Learning | Multimedia principle (d=0.72) |
| Paivio | 1991 | Dual Coding Theory | Pictures + words > words alone |
| Bjork & Bjork | 2020 | Desirable Difficulties | Difficulty now = durability later |
| Sweller | 2011/2024 | Cognitive Load Theory | Working memory is the bottleneck |
| Rohrer et al. | 2015 | Interleaving | Mixed practice > blocked (d=0.42) |
| Rawson & Dunlosky | 2011 | Successive Relearning | Testing + spacing = optimal combo |
| Flavell | 1979 | Metacognition | Thinking about thinking |
| Anderson & Krathwohl | 2001 | Bloom's Revised Taxonomy | Remember → Create hierarchy |

---

## Practitioner Spotlight: Modern Learning System Builders

### Dr. Justin Sung & The PERRIO System

**Background:** Dr. Justin Sung is a former medical doctor turned full-time learning coach and consultant. Based in Australia, he has worked with over 10,000 learners from 120+ countries. He is a top 1% viewed TEDx speaker and founder of **iCanStudy** — a step-by-step learning skills program.

**The PERRIO System:**

Dr. Sung developed the **PERRIO** learning framework (also documented as PERO) over 312 weeks of research and field-testing. The system is designed to boost learning efficiency by 60%+ and save 10+ hours of studying per week.

| Phase | What It Does | Key Activities | System Alignment |
|-------|--------------|----------------|------------------|
| **P - Priming** | Prepare the brain for learning | Survey material, identify key concepts, activate prior knowledge | M0 Planning + M2 Prime (H-series frameworks) |
| **E - Encoding** | Convert information into memory | Deep processing, chunking, creating connections | M3 Encode (KWIK micro-loop) |
| **R - Reference** | Create strategic notes | Capture details that don't fit elsewhere, build revision system | Session Ledger, Anki cards |
| **R - Retrieval** | Practice recalling without cues | Active recall, self-testing, identifying gaps | M4 Retrieve + M5 Refine |
| **I - Interleaving** | Mix topics during practice | Prevent blocking, build discrimination | M-RET-004 Mixed Practice |
| **O - Overlearning** | Continue beyond initial mastery | Spaced repetition, successive relearning | M6 Overlearn |

**Key Insights from Dr. Sung:**

1. **Theory-Practice Cycle:** Learn just enough to start → practice → reflect → fill gaps. Avoid "information hoarding" as procrastination.

2. **Schema Theory Foundation:** Learning is schema building. New information must connect to existing mental structures.

3. **Four Learner Types:** Dr. Sung classifies learners by current abilities (not fixed traits):
   - **Overwhelmed:** Needs structure and simplification
   - **Passive:** Needs activation and engagement
   - **Scattered:** Needs focus and depth
   - **Stuck:** Needs new techniques and strategies

4. **HUDLE™ Framework:** High-level cognitive skills for efficient learning:
   - **H**elping your brain form connections (Priming)
   - **U**nderstanding deeply (Encoding)
   - **D**eveloping reference systems (Reference)
   - **L**earning through retrieval (Retrieval)
   - **E**xtending mastery (Overlearning)

**Integration with PT Study OS:**

The PERRIO system maps almost 1:1 to the PT Study PEIRRO cycle:
- **Priming** → M0-M2 (Prepare + Prime phases)
- **Encoding** → M3 Encode + KWIK micro-loop
- **Reference** → M2/M6 artifacts (Session Ledger, Anki cards)
- **Retrieval** → M4 Retrieve
- **Interleaving** → M4 Build (Interleaved tier)
- **Overlearning** → M6 Overlearn

**Resources:**
- Main program: [iCanStudy.com](https://www.icanstudy.com/)
- TEDx Talk: "Stop Studying. Start Learning" (top 1% viewed 2022)
- YouTube: [Dr. Justin Sung](https://www.youtube.com/@JustinSung)
- Free diagnostic: [Learning System Diagnostic](https://quiz.icanstudy.com/learning-diagnostic)

---

### Jim Kwik & The Kwik Learning Framework

**Background:** Jim Kwik (yes, that's his real name) is the world's #1 brain performance coach and founder of **Kwik Brain**. After a childhood brain injury left him learning-challenged, he developed strategies to dramatically enhance mental performance. He now trains elite performers including CEOs, celebrities, and athletes.

**The FAST Method:**

Jim Kwik's foundational learning framework for accelerating any skill acquisition:

| Letter | Meaning | Description | System Application |
|--------|---------|-------------|-------------------|
| **F** | Forget | Temporarily forget: (1) what you already know, (2) distractions/urgent matters, (3) your limitations | Beginner's mind; avoid "expert blind spot" |
| **A** | Active | Learning is not a spectator sport. Take notes, ask questions, engage physically | M3 Encode generation requirements |
| **S** | State | All learning is state-dependent. Manage your emotional/physical state | M1 Entry state check |
| **T** | Teach | Learn with the intention of teaching others (protégé effect) | M-ENC-004 Teach-Back; Feynman Technique |

**The LIMITLESS Model:**

From his bestselling book *Limitless* (2020), Jim identifies **3 M's** of learning:

1. **Mindset** — The beliefs and attitudes you hold about learning
   - "I'm not good at this" → "I'm not good at this YET"
   - Fixed mindset vs. growth mindset (Carol Dweck)

2. **Motivation** — The energy and drive to learn
   - Purpose (why you're learning)
   - Energy (physical capacity)
   - Small simple steps (avoid overwhelm)

3. **Methods** — The specific techniques and strategies
   - Memory techniques (memory palace, visualization)
   - Speed reading
   - Critical thinking frameworks

**Kwik Memory Techniques:**

| Technique | How It Works | Application |
|-----------|--------------|-------------|
| **Memory Palace (Method of Loci)** | Associate items with familiar locations (e.g., rooms in your house) | Memorizing lists, speeches, presentations without notes |
| **PIE Method** | Place, Imagine, Entwine — Create vivid mental images | Vocabulary, definitions, key facts |
| **SEE Method** | Senses, Exaggeration, Energize — Make images multi-sensory and absurd | Medical terminology, anatomy |
| **Chain Linking** | Connect items in a story sequence | Processes, steps, ordered lists |

**Kwik Speed Reading Principles:**

1. **Visual pacing** — Use a finger/pen to guide reading (reduces regression)
2. **Expand peripheral vision** — Take in more words per fixation
3. **Reduce subvocalization** — Stop "hearing" words in your head
4. **Preview before diving** — Survey structure before detailed reading
5. **Target:** 300%+ increase in reading speed while maintaining comprehension

**Integration with PT Study OS:**

| Jim Kwik Method | PT Study OS Equivalent | Notes |
|-----------------|------------------------|-------|
| FAST Method | PEIRRO cycle | F=Prime, A=Encode, S=Prepare, T=Interrogate |
| Memory Palace | Concept Map (M-ENC-009) | Spatial memory visualization |
| Speed Reading | AI Skeleton Review (M-PRE-004) | Preview/survey before encoding |
| Teaching to Learn | Teach-Back (M-ENC-004) | Core Feynman workflow |
| State Management | M1 Entry + Modes | Energy check and mode selection |

**Key Jim Kwik Quotes:**

> "It's not how smart you are, it's how are you smart."

> "Knowledge is power. Learning is your superpower."

> "If knowledge is power, then learning is your superpower."

> "The person who says he knows what he thinks but cannot express it usually does not know what he thinks."

**Resources:**
- Main website: [JimKwik.com](https://www.jimkwik.com/)
- Courses: [KwikBrain.com](https://kwikbrain.com/)
- Book: *Limitless: Upgrade Your Brain, Learn Anything Faster* (2020)
- Podcast: Kwik Brain (weekly episodes)
- YouTube: [Jim Kwik](https://www.youtube.com/c/JimKwik)

---

### Comparative Analysis: PEIRRO vs. PERRIO vs. FAST

| Framework | Origin | Phases | Best For | Key Distinction |
|-----------|--------|--------|----------|-----------------|
| **PEIRRO** | PT Study OS | 6 phases (Prepare → Encode → Interrogate → Retrieve → Refine → Overlearn) | Medical education, systematic learning | Explicit error correction (Refine phase) |
| **PERRIO** | Dr. Justin Sung | 5-6 phases (Priming → Encoding → Reference → Retrieval → Interleaving → Overlearning) | Professional development, skill mastery | Strong emphasis on priming and reference systems |
| **FAST** | Jim Kwik | 4 steps (Forget → Active → State → Teach) | Rapid skill acquisition, mindset shift | Focus on state management and "beginner's mind" |

**Synthesis:**

All three frameworks share core principles:
- ✅ Preparation before encoding
- ✅ Active engagement (not passive consumption)
- ✅ Testing/retrieval as primary learning mechanism
- ✅ Teaching/explanation as comprehension check
- ✅ Spaced practice for long-term retention

The PT Study OS **PEIRRO** cycle synthesizes the best of both:
- From **PERRIO**: Strong priming, explicit reference systems
- From **FAST**: State management, teaching intention
- Unique addition: **Refine** phase for error correction (not in other frameworks)

---

*Last updated: February 2026*
*Version: 2.1*
