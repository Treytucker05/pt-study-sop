# 15 — Composable Method Library

## §1 Purpose

The Composable Method Library provides reusable, evidence-backed method blocks and pre-built chains for study sessions. Method blocks are atomic study activities (e.g., brain dump, teach-back, retrieval drill). Chains are ordered sequences of blocks designed for specific contexts (e.g., first exposure, exam prep, low energy).

**Goals:**
- **Consistency** — Apply proven methods across sessions
- **Adaptability** — Select chains based on context (class type, stage, energy, time)
- **Evidence** — Every block cites research backing its effectiveness
- **Data** — Rate effectiveness to improve recommendations over time

---

## §2 Method Block Schema

Each method block represents a single study activity.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Block name (e.g., "Brain Dump", "Teach-Back") |
| `control_stage` | enum | One of 7 Control Plane stages (see below) |
| `description` | string | What the block does |
| `duration` | number | Typical minutes required |
| `energy_cost` | enum | `low` / `medium` / `high` |
| `best_stage` | enum | `first_exposure` / `review` / `exam_prep` / `consolidation` |
| `tags` | array | Descriptors (e.g., `["retrieval", "active"]`) |
| `evidence` | string | Research citation (Author, Year; brief finding) |

**Categories (Control Plane stages):**

1. **PRIME** — Prepare attention and build structure from the source before detail (e.g., overarching pre-question set, hierarchical advance organizer, skeleton concept hierarchy, structural skimming + pillar mapping, structural extraction, syntopical big-picture synthesis, learning objectives primer, terminology pretraining, big-picture orientation summary, ambiguity and blind-spot scan)
2. **TEACH** — Deliver first-contact explanation in bounded chunks before diagnostic probing (e.g., mechanism trace, analogy bridge, story spine, confusable contrast teach, clinical anchor mini-case, modality switch, jingle / rhyme hook, depth ladder (4-10-hs-pt), kwik lite)
3. **CALIBRATE** — Diagnostic readiness checks after PRIME or TEACH to identify weaknesses before learner production (e.g., micro precheck, full calibrate probes, full calibrate priority set, story confidence tag, brain dump, prior knowledge scan, pre-test)
4. **ENCODE** — Attach meaning to material through active processing (e.g., kwik hook, seed-lock generation, draw-label, teach-back, why-chain, self-explanation protocol, concept map, comparison table, process flowchart, clinical decision tree, memory palace, chain linking, hand-draw map, clinical application, cross-topic link, side-by-side comparison, case walkthrough, illness script builder)
5. **REFERENCE** — Generate target cues and cheat sheets for retrieval (e.g., error autopsy, mastery loop, one-page anchor, question bank seed)
6. **RETRIEVE** — Test recall with adversarial near-miss and timed sprints (e.g., timed brain dump, sprint quiz, fill-in-blank, mixed practice, variable retrieval, adversarial drill, timed sprint sets)
7. **OVERLEARN** — Close loop, capture artifacts, Anki, drill sheets (e.g., exit ticket, anki card draft, drill sheet builder, post-learn brain dump)

**Evidence citation format:** `Author (Year); brief finding`

---

## §2.1 Block Catalog (59 blocks)

### PRIME (10 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Overarching Pre-Question Set | 3 min | low | Jamison et al. (2023/2024); Prequestions improve downstream learning when paired with structured follow-up. |
| Hierarchical Advance Organizer | 5 min | low | Ausubel (1960); Luiten et al. (1980); advance organizers facilitate subsumption of new material |
| Skeleton Concept Hierarchy | 5 min | medium | Novak & Cañas (2008); Concept mapping supports meaningful learning when structures are constrained and explicit. |
| Structural Skimming + Pillar Mapping | 5 min | medium | Ausubel (1960); Advance structure before detail improves assimilation of new material. |
| Structural Extraction | 5 min | medium | Ausubel (1968); Advance organizers improve comprehension when structure is established before detail. |
| Syntopical Big-Picture Synthesis | 6 min | low | Ausubel (1968); Comparative organizers support integration across related sources. |
| Learning Objectives Primer | 3 min | low | Ausubel (1968); Hattie (2009); explicit learning objectives improve encoding direction and metacognitive monitoring |
| Terminology Pretraining | 4 min | low | Mayer (2009); pretraining helps novices when key parts and names are introduced before complex explanation. |
| Big-Picture Orientation Summary | 4 min | low | Ausubel (1968); advance organizers help assimilation of new material when structure is established before detail. Mayer (2009); segmented orientation helps novices manage complex material. |
| Ambiguity and Blind-Spot Scan | 4 min | medium | Overoye et al. (2021); Pan and Rivers (2023); Hausman and Rhodes (2018); bounded prequestions and targeted attention-shaping can potentiate later learning when they highlight what matters without becoming hidden explanation. |

### TEACH (9 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Mechanism Trace | 10 min | high | Kulasegaram et al. (2013); Causal reasoning with biomedical mechanisms supports diagnostic transfer to novel cases |
| Analogy Bridge | 3 min | medium | Gentner (1983); Analogical reasoning supports structural mapping and transfer across domains |
| Story Spine | 6 min | medium | Mayer (2009); Segmented explanation and pretraining support novice learning on unfamiliar systems |
| Confusable Contrast Teach | 6 min | medium | Alfieri et al. (2013); Comparison-based learning improves discrimination and concept formation |
| Clinical Anchor Mini-Case | 5 min | medium | Schmidt and Rikers (2007); Clinically anchored explanation supports later script formation and transfer |
| Modality Switch | 3 min | low | Mayer (2009); Matching representation and segmenting explanation helps novice comprehension |
| Jingle / Rhyme Hook | 3 min | low | Paivio (1991); Verbal plus image-linked hooks can improve retention when grounded in meaning |
| Depth Ladder (4-10-HS-PT) | 6 min | medium | Mayer (2009); Segmented and progressively elaborated explanation improves novice understanding of unfamiliar systems. |
| KWIK Lite | 2 min | low | Paivio (1991); Lightweight verbal-plus-image hooks can improve retention when they are grounded in already-understood meaning. |

### CALIBRATE (7 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Micro Precheck | 4 min | medium | Kornell et al. (2009); Pretesting improves later learning and reveals knowledge gaps. |
| Full Calibrate Probes | 6 min | medium | Metcalfe (2017); Calibration monitoring supports targeted corrective learning. |
| Full Calibrate Priority Set | 3 min | low | Rawson and Dunlosky (2011); Targeted corrective practice outperforms broad untargeted restudy. |
| Story Confidence Tag | 2 min | low | Metcalfe (2017); Metacognitive monitoring at the schema level identifies high-value encoding targets |
| Brain Dump | 3 min | low | Ausubel (1968); Bjork & Bjork (2011); prior knowledge activation strengthens subsequent encoding |
| Prior Knowledge Scan | 3 min | low | Ausubel (1968); Meaningful learning requires anchoring new information to existing schemas |
| Pre-Test | 5 min | low | Richland et al. (2009); Pre-testing primes encoding even when initial answers are wrong; the attempt creates retrieval hooks |

### ENCODE (18 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| KWIK Hook | 3 min | medium | Paivio (1991); Dual-coding theory — combining verbal + visual improves retention by creating multiple retrieval paths |
| Seed-Lock Generation | 3 min | medium | Slamecka & Graf (1978); Generation effect — self-generated items are remembered significantly better than items simply read |
| Draw-Label | 10 min | high | Wammes et al. (2016); Drawing effect — drawing produces superior memory compared to writing, especially for visual-spatial content |
| Teach-Back | 5 min | high | Nestojko et al. (2014); Expecting to teach enhances encoding and organization of information |
| Why-Chain | 5 min | medium | Dunlosky et al. (2013); Elaborative interrogation rated moderate utility for learning; builds causal understanding |
| Self-Explanation Protocol | 7 min | medium | Chi et al. (1994); Self-explanation rated moderate-high utility across domains; works by generating inferences |
| Concept Map | 10 min | high | Novak & Canas (2008); concept mapping promotes meaningful learning through explicit relationship encoding |
| Comparison Table | 7 min | medium | Alfieri et al. (2013); Comparison improves discrimination and concept formation by highlighting distinctive features |
| Process Flowchart | 10 min | high | Winn (1991); Spatial-sequential diagrams improve procedural understanding and memory |
| Clinical Decision Tree | 10 min | high | Charlin et al. (2000); Decision trees scaffold clinical reasoning and support diagnostic accuracy |
| Memory Palace | 10 min | high | Dresler et al. (2017); fMRI study showed memory athletes using Method of Loci exhibit distinct patterns of functional brain connectivity; 40 days of loci training significantly improved recall in naive subjects |
| Chain Linking | 8 min | medium | Bower & Winzenz (1970); Narrative chaining improves serial recall by creating meaningful connections between unrelated items |
| Hand-Draw Map | 5 min | medium | Wammes et al. (2016); Drawing effect — drawing doubles free-recall rates (45% vs 20%) through multimodal encoding combining motor, visual, and semantic processing |
| Clinical Application | 5 min | high | Schmidt & Rikers (2007); Clinical application strengthens illness script formation and diagnostic reasoning |
| Cross-Topic Link | 3 min | medium | Pugh & Bergin (2006); Interest and retention deepen when learners see cross-domain connections |
| Side-by-Side Comparison | 7 min | medium | Alfieri et al. (2013); Comparison-based learning improves discrimination and concept formation |
| Case Walkthrough | 10 min | high | Schmidt & Rikers (2007); case-based walkthrough strengthens illness script formation and transfer |
| Illness Script Builder | 10 min | high | Schmidt & Rikers (2007); Illness scripts are the cognitive structure underlying expert clinical reasoning |

### REFERENCE (4 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Error Autopsy | 5 min | medium | Metcalfe (2017); error correction with feedback is more effective than errorless learning |
| Mastery Loop | 10 min | medium | Rawson & Dunlosky (2011); successive relearning combines testing + spacing for durable retention |
| One-Page Anchor | 8 min | medium | Schmidt & Rikers (2007); Structured scripts and discriminators improve transfer and diagnostic reasoning |
| Question Bank Seed | 8 min | medium | Roediger & Karpicke (2006); Retrieval-oriented item generation improves durable recall performance |

### RETRIEVE (7 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Timed Brain Dump | 5 min | medium | Roediger & Karpicke (2006); testing effect — retrieval practice > re-reading for long-term retention |
| Sprint Quiz | 5 min | medium | McDaniel et al. (2007); quiz-based retrieval enhances later exam performance |
| Fill-in-Blank | 5 min | low | Dunlosky et al. (2013); cloze-based retrieval is effective for factual knowledge |
| Mixed Practice | 10 min | high | Rohrer et al. (2015); interleaved practice improves discrimination and transfer |
| Variable Retrieval | 10 min | medium | Morris et al. (1977); PNAS 2024; varied retrieval practice produces more durable and transferable knowledge than constant retrieval |
| Adversarial Drill | 8 min | high | Rohrer et al. (2015); Interleaved discrimination practice improves transfer on confusable categories |
| Timed Sprint Sets | 8 min | high | Cepeda et al. (2006); Spaced retrieval with repeated timed attempts improves long-term access speed |

### OVERLEARN (4 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Exit Ticket | 3 min | low | Tanner (2012); metacognitive reflection improves self-regulated learning |
| Anki Card Draft | 5 min | low | Kornell (2009); Cepeda et al. (2006); spaced retrieval via flashcards is high-utility |
| Drill Sheet Builder | 10 min | medium | Rawson & Dunlosky (2011); Successive relearning with repeated retrieval strengthens durable mastery |
| Post-Learn Brain Dump | 7 min | medium | RetrievalPractice.org (2017); 5-minute free recall sessions strengthen past and future learning, improve organization, and identify gaps without stakes |

---

## §3 Chain Schema

A chain is an ordered sequence of method blocks with context tags.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `chain_id` | string | Unique identifier |
| `name` | string | Chain name (e.g., "First Exposure Core") |
| `blocks` | array | Ordered list of block names |
| `context_tags` | object | Recommended context (see §6) |
| `description` | string | When to use this chain |

---

## §3.1 How To Read IDs

Use the IDs as compact labels, not as something you are expected to memorize without a key.

**Chain pattern:** `C-<family>-<variant>`

- `C-FE-STD` = `Chain / First Exposure / Standard`
- `C-QD-001` = `Chain / Quick Drill` (`001` is the first numbered variant in that family)
- `C-TRY-002` = `Chain / Top-Down / Forward Progress`

**Method pattern:** `M-<family>-<sequence>`

- `M-PRE-010` = `Method / PRE family / item 010`
- `M-CAL-001` = `Method / CAL family / item 001`
- `M-ENC-010` = `Method / ENC family / item 010`

**Important runtime rule:** the live `control_stage` is the truth for execution when an older prefix and the current runtime stage differ.

- Example: `M-ENC-008` still carries an older `ENC` prefix in its ID, but it currently runs as a `TEACH` block in the live library.
- Example: `M-INT-*` methods are integration/interrogation families; use the current `control_stage`, not the raw prefix alone, to know where they run in a chain.

**Current chain family codes in this library:**

| Code | Meaning |
|------|---------|
| `AD` | Anatomy Deep Dive |
| `CI` | Clinical Reasoning Intake |
| `CR` | Clinical Reasoning |
| `DA` | Dense Anatomy Intake |
| `DP` | DEPTH |
| `EP` | Exam Prep |
| `FE` | First Exposure |
| `LE` | Low Energy |
| `MR` | Mastery Review |
| `PI` | Pathophysiology Intake |
| `QD` | Quick Drill |
| `QF` | Quick First Exposure |
| `RS` | Review Sprint |
| `SW` | SWEEP |
| `TRY` | Top-Down family |
| `VE` | Visual Encoding |

**Current method family codes in this library:**

| Code | Meaning |
|------|---------|
| `PRE` | PRIME-family method ID |
| `CAL` | CALIBRATE-family method ID |
| `TEA` | TEACH-family method ID |
| `ENC` | ENCODE-family method ID |
| `INT` | Integration/interrogation method ID family |
| `REF` | REFERENCE-family method ID |
| `RET` | RETRIEVE-family method ID |
| `OVR` | OVERLEARN-family method ID |

---

## §4 Template Chains (20 chains)

### Control Plane Chains (CP-MSS v2.0)

#### C-FE-STD. Trey's Favorite: Start Here
**Blocks:** Learning Objectives Primer → Structural Extraction → Micro Precheck → Mechanism Trace → One-Page Anchor → Full Calibrate Probes → Full Calibrate Priority Set → Comparison Table → KWIK Hook → Question Bank Seed → Timed Sprint Sets
**Context:** medium energy, 35 min
**Use for:** Default start-here chain for Trey. Standard first-exposure flow for medium-energy sessions targeting classification and mechanism modes. Opening is explicit MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE, then ENCODE, reference generation, and timed retrieval sprint.

#### C-FE-MIN. First Exposure: Minimal
**Blocks:** Learning Objectives Primer → Structural Extraction → Micro Precheck → Modality Switch → One-Page Anchor → Full Calibrate Probes → Full Calibrate Priority Set → Timed Brain Dump → Exit Ticket
**Context:** low energy, 20 min
**Use for:** Minimal first-exposure chain for low-energy sessions targeting definition and recognition modes. Uses compact opening sequence MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE, then light retrieval and wrap-up.

#### C-FE-PRO. First Exposure: Procedure
**Blocks:** Learning Objectives Primer → Structural Extraction → Micro Precheck → Story Spine → Process Flowchart → Full Calibrate Probes → Full Calibrate Priority Set → One-Page Anchor → Case Walkthrough → Timed Sprint Sets
**Context:** high energy
**Use for:** Procedure-focused first-exposure chain for high-energy sessions. Uses explicit opening sequence MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE, then process encoding, anchor generation, case walkthrough with fault injection, and timed sprint retrieval.

### Core Chains

#### C-FE-001. First Exposure (Core)
**Blocks:** Learning Objectives Primer → Structural Extraction → Syntopical Big-Picture Synthesis → Micro Precheck → Analogy Bridge → One-Page Anchor → Full Calibrate Probes → Full Calibrate Priority Set → KWIK Hook → Question Bank Seed → Timed Brain Dump → Adversarial Drill → Timed Sprint Sets → Anki Card Draft → Drill Sheet Builder
**Context:** first exposure, high energy, 55 min
**Use for:** Control-plane first exposure flow with explicit MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE opening, followed by ENCODE, REFERENCE, RETRIEVE, and OVERLEARN.
**Note:** Retrieval (Free Recall) comes before generative encoding (KWIK Hook) per Roelle et al. (2022) — lower cognitive load, higher gains.

#### C-RS-001. Review Sprint
**Blocks:** Overarching Pre-Question Set → One-Page Anchor → Question Bank Seed → Sprint Quiz → Clinical Application → Exit Ticket
**Context:** review, medium energy, 25 min
**Use for:** Fast review loop. Prepare → Retrieve → Interrogate (application) → Overlearn. Skips encode for known material.

#### C-QD-001. Quick Drill
**Blocks:** Learning Objectives Primer → Brain Dump → One-Page Anchor → Question Bank Seed → Sprint Quiz → Exit Ticket
**Context:** review, medium energy, 15 min
**Use for:** Minimal time investment. Short PRIME orientation, quick calibrate pulse, then reference, retrieve, and overlearn. Good for spacing reviews.

#### C-AD-001. Anatomy Deep Dive
**Blocks:** Learning Objectives Primer → Prior Knowledge Scan → Structural Skimming + Pillar Mapping → Draw-Label → One-Page Anchor → Question Bank Seed → Timed Brain Dump → Anki Card Draft
**Context:** Anatomy, first exposure, high energy, 40 min
**Use for:** Anatomy-focused chain with a short PRIME orientation, a calibrate check, and drawing-led encoding before retrieval and overlearn.

#### C-LE-001. Low Energy
**Blocks:** Learning Objectives Primer → Brain Dump → Hierarchical Advance Organizer → One-Page Anchor → Question Bank Seed → Fill-in-Blank → Exit Ticket
**Context:** low energy, 15 min
**Use for:** Low-effort chain for tired days. Short PRIME orientation, quick calibrate pulse, then reference, retrieve, and overlearn. Maintain streak without burning out.

#### C-EP-001. Exam Prep
**Blocks:** Overarching Pre-Question Set → One-Page Anchor → Question Bank Seed → Mixed Practice → Side-by-Side Comparison → Error Autopsy → Anki Card Draft
**Context:** exam prep, high energy, 35 min
**Use for:** Exam-focused chain with interleaving and error analysis. Prepare → Retrieve → Interrogate → Refine → Overlearn.

#### C-CR-001. Clinical Reasoning
**Blocks:** Learning Objectives Primer → Prior Knowledge Scan → Structural Skimming + Pillar Mapping → Case Walkthrough → Side-by-Side Comparison → Error Autopsy → Anki Card Draft
**Context:** Clinical, exam prep, high energy, 45 min
**Use for:** Build clinical reasoning chains with a short PRIME orientation, a calibrate scan, and contrast-heavy encoding before wrap.

#### C-MR-001. Mastery Review
**Blocks:** One-Page Anchor → Question Bank Seed → Timed Brain Dump → Error Autopsy → Mastery Loop → Anki Card Draft
**Context:** consolidation, medium energy, 30 min
**Use for:** Deep consolidation with successive relearning. Retrieve → Refine → Overlearn.

### Intake-Focused Chains

#### C-DA-001. Dense Anatomy Intake
**Blocks:** Learning Objectives Primer → Pre-Test → Draw-Label → One-Page Anchor → Question Bank Seed → Timed Brain Dump → KWIK Hook → Anki Card Draft
**Context:** Anatomy, first exposure, high energy, 40 min
**Use for:** High-detail anatomy first exposure with a short PRIME orientation before pre-test, Draw-Label for spatial memory, retrieval, and later generative steps.

#### C-PI-001. Pathophysiology Intake
**Blocks:** Learning Objectives Primer → Pre-Test → Self-Explanation Protocol → Skeleton Concept Hierarchy → One-Page Anchor → Question Bank Seed → Timed Brain Dump → Error Autopsy
**Context:** Pathology, first exposure, high energy, 45 min
**Use for:** Pathology first exposure with a short PRIME orientation before pre-test, self-explanation, concept clustering, retrieval, and refinement.

#### C-CI-001. Clinical Reasoning Intake
**Blocks:** Learning Objectives Primer → Pre-Test → Illness Script Builder → Side-by-Side Comparison → One-Page Anchor → Question Bank Seed → Timed Brain Dump → Anki Card Draft
**Context:** Clinical, first exposure, high energy, 45 min
**Use for:** Clinical first exposure with a short PRIME orientation before pre-test, illness scripts, comparison, retrieval, and overlearn.

#### C-QF-001. Quick First Exposure
**Blocks:** Learning Objectives Primer → Pre-Test → Hierarchical Advance Organizer → One-Page Anchor → Question Bank Seed → Timed Brain Dump → Exit Ticket
**Context:** first exposure, medium energy, 20 min
**Use for:** Minimal intake chain when time is limited. Short PRIME orientation before pre-test, hierarchy setup, retrieval, and overlearn.

### Visualization Chains

#### C-VE-001. Visual Encoding
**Blocks:** Learning Objectives Primer → Brain Dump → Concept Map → Comparison Table → One-Page Anchor → Question Bank Seed → Timed Brain Dump → Exit Ticket
**Context:** first exposure, high energy, 40 min
**Use for:** Visualization-first encoding for topics with confusable concepts. Short PRIME orientation, quick calibrate pulse, then build visual representations before retrieval.

#### C-SW-001. SWEEP
**Blocks:** Skeleton Concept Hierarchy → Concept Map → Comparison Table → One-Page Anchor → Question Bank Seed → Sprint Quiz → Anki Card Draft
**Context:** first exposure, medium energy, 30 min
**Use for:** Pass 1: Fast structural understanding. Touch everything once. Produce visual maps, objectives, confusables, seed cards.

#### C-DP-001. DEPTH
**Blocks:** Learning Objectives Primer → Pre-Test → Why-Chain → Self-Explanation Protocol → Clinical Application → One-Page Anchor → Question Bank Seed → Variable Retrieval → Error Autopsy → Anki Card Draft
**Context:** first exposure, high energy, 45 min
**Use for:** Pass 2: Selective mastery on high-priority objectives with a quick PRIME orientation, pre-test calibration, then depth encode/application work. Retrieval-driven. Cards only from errors.

#### C-TRY-001. Top-Down Narrative Mastery
**Blocks:** Hierarchical Advance Organizer → Micro Precheck → Story Spine → Analogy Bridge → One-Page Anchor → Full Calibrate Probes → Full Calibrate Priority Set → Hand-Draw Map → KWIK Hook → Concept Map → Timed Brain Dump → Post-Learn Brain Dump
**Context:** first exposure, medium energy, 45 min
**Use for:** Top-down first-exposure chain with explicit opening order: MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE. TEACH builds a story + analogy bridge, closes with a compact anchor artifact, then full calibrate determines ENCODE depth. Teach-back is not a default live gate.

#### C-TRY-002. Top-Down Forward Progress
**Blocks:** Hierarchical Advance Organizer → Micro Precheck → Mechanism Trace → Analogy Bridge → One-Page Anchor → Full Calibrate Probes → Full Calibrate Priority Set → Hand-Draw Map → KWIK Hook → Concept Map → Timed Brain Dump → Post-Learn Brain Dump
**Context:** first exposure, medium energy, 50 min
**Use for:** Top-down first-exposure chain with tiered exits and explicit opening order: MICRO-CALIBRATE -> TEACH -> FULL CALIBRATE. TEACH closes with a learner-usable anchor artifact before any mnemonic slot. Teach-back is removed from the default live path.

---

## §5 Rating Protocol

After each session using a method chain, rate its effectiveness.

**Post-Session Rating (captured during Wrap):**

| Field | Scale | Description |
|-------|-------|-------------|
| `effectiveness` | 1-5 | How well did the chain work for this material? |
| `engagement` | 1-5 | How engaged/focused were you? |
| `context_tags` | object | Actual context (class_type, stage, energy, time_available) |
| `notes` | string | Optional free text (e.g., "KWIK worked well; Teach-Back felt rushed") |

**Rating Scale:**

- **1** — Ineffective / disengaged
- **2** — Somewhat ineffective / low engagement
- **3** — Neutral / moderate engagement
- **4** — Effective / high engagement
- **5** — Highly effective / fully engaged

**Capture in Session Ledger:**

Add to `artifacts_created` if a method chain was used:
```
method_chain: [chain_id]; effectiveness: [1-5]; engagement: [1-5]
```

---

## §6 Context Dimensions

Context tags describe when a chain is appropriate.

| Dimension | Values | Description |
|-----------|--------|-------------|
| `class_type` | `anatomy` / `physiology` / `pathology` / `pharmacology` / `clinical` / `general` | Subject type |
| `stage` | `first_exposure` / `review` / `exam_prep` | Learning stage |
| `energy` | `low` / `medium` / `high` | Focus/motivation level (1-10 scale mapped to low=1-4, medium=5-7, high=8-10) |
| `time_available` | number | Minutes available for session |

**Matching Logic:**

Brain recommends chains where context tags align with current session context. Exact matches preferred; partial matches allowed.

---

## §7 Brain Integration

Brain stores and analyzes method chain data.

**Tables:**

1. **method_blocks** — All available blocks (with evidence citations)
2. **method_chains** — Pre-built and custom chains
3. **method_ratings** — Post-session ratings per block and chain

**Analytics:**

- **Effectiveness stats** — Average rating per chain, per context
- **Usage frequency** — Which chains are used most often
- **Anomaly detection** — Flag chains with low ratings in specific contexts
- **Recommendations** — Suggest chains based on session context and historical performance

---

## §8 Scholar Integration

Scholar questions chain effectiveness and proposes improvements.

**Research Questions:**

1. Which blocks correlate with high retention (from RSR data)?
2. Do certain chains work better for specific class types?
3. Are there context patterns where effectiveness is consistently low?
4. Can we predict optimal chain selection based on past sessions?

**Outputs:**

- **Chain Optimization Proposals** — Reorder blocks, swap blocks, adjust durations
- **New Chain Designs** — Propose chains for underserved contexts
- **A/B Test Plans** — Compare variant chains in similar contexts

---

## Cross-References

- **Core Rules:** `01-core-rules.md` (planning, source-lock, seed-lock gates apply during method execution)
- **Session Flow:** `05-session-flow.md` (method chains run inside M2-M4; selection occurs during M0 Planning)
- **Modes:** `06-modes.md` (chains can be mode-specific; e.g., Sprint chains use retrieval-first blocks)
- **Logging:** `08-logging.md` (method_chain field added to Session Ledger and Enhanced JSON)
- **Templates:** `09-templates.md` (method_chain added to Session Ledger template)

---

## Implementation Notes

- Method chains are **optional**. Sessions can proceed without selecting a chain.
- Chains are **composable** — blocks can be reordered or omitted as needed.
- **Ad-hoc chains** can be built during M0 Planning if no template fits.
- Rating is **opt-in** but recommended for data-driven improvement.
- All blocks include evidence citations. Use `--force` re-seed to update.
- Use `--migrate` flag to update categories on an existing database without wiping data.
