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
| `category` | enum | One of 6 PEIRRO phases (see below) |
| `description` | string | What the block does |
| `duration` | number | Typical minutes required |
| `energy_cost` | enum | `low` / `medium` / `high` |
| `best_stage` | enum | `first_exposure` / `review` / `exam_prep` / `consolidation` |
| `tags` | array | Descriptors (e.g., `["retrieval", "active"]`) |
| `evidence` | string | Research citation (Author, Year; brief finding) |

**Categories (PEIRRO phases):**

1. **Prepare** — Prime attention, surface prior knowledge, build structure (e.g., brain dump, prediction questions, prior knowledge scan, ai skeleton review, concept cluster, three-layer chunk, pre-test)
2. **Encode** — Attach meaning to material (e.g., kwik hook, seed-lock generation, draw-label, teach-back, why-chain, think-aloud protocol, self-explanation protocol, mechanism trace, concept map, comparison table, process flowchart, clinical decision tree)
3. **Retrieve** — Test recall without cues (e.g., free recall blurt, sprint quiz, fill-in-blank, mixed practice, variable retrieval)
4. **Interrogate** — Link to other content, apply, compare (e.g., analogy bridge, clinical application, cross-topic link, side-by-side comparison, case walkthrough, illness script builder)
5. **Refine** — Analyze errors and relearn (e.g., error autopsy, mastery loop)
6. **Overlearn** — Close loop, capture artifacts (e.g., exit ticket, anki card draft)

**Evidence citation format:** `Author (Year); brief finding`

---

## §2.1 Block Catalog (34 blocks)

### Prepare (7 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Brain Dump | 3 min | low | Brod et al. (2013); prior knowledge activation improves encoding of new information |
| Prediction Questions | 3 min | low | Pressley et al. (1990); question-generation primes elaborative processing |
| Prior Knowledge Scan | 3 min | low | Ausubel (1968); meaningful learning requires anchoring to existing schemas |
| AI Skeleton Review | 5 min | low | Lorch & Lorch (1996); advance organizers improve text comprehension |
| Concept Cluster | 5 min | medium | Bower et al. (1969); conceptual organization improves recall by 2-3x |
| Three-Layer Chunk | 5 min | medium | Miller (1956); Gobet et al. (2001); chunking manages cognitive load |
| Pre-Test | 5 min | low | Richland et al. (2009); Kornell et al. (2009); pre-testing primes encoding even when initial answers are wrong |

### Encode (12 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| KWIK Hook | 3 min | medium | Paivio (1991); dual-coding theory — combining verbal + visual improves retention |
| Seed-Lock Generation | 3 min | medium | Slamecka & Graf (1978); generation effect — self-generated items remembered better than read items |
| Draw-Label | 10 min | high | Wammes et al. (2016); drawing effect — drawing produces superior memory compared to writing |
| Teach-Back | 5 min | high | Nestojko et al. (2014); expecting to teach enhances encoding and organization |
| Why-Chain | 5 min | medium | Dunlosky et al. (2013); elaborative interrogation rated moderate utility for learning |
| Think-Aloud Protocol | 5 min | medium | Chi et al. (1994); self-explanation leads to deeper understanding and better problem-solving |
| Self-Explanation Protocol | 7 min | medium | Chi et al. (1994); Dunlosky et al. (2013); self-explanation rated moderate-high utility across domains |
| Mechanism Trace | 10 min | high | Kulasegaram et al. (2013); causal reasoning with biomedical mechanisms supports diagnostic transfer |
| Concept Map | 10 min | high | Nesbit & Adesope (2006) d=0.82; self-constructed > provided (d=1.00 vs 0.37) |
| Comparison Table | 7 min | medium | Alfieri et al. (2013); comparison improves discrimination and concept formation |
| Process Flowchart | 10 min | high | Winn (1991); spatial-sequential diagrams improve procedural understanding |
| Clinical Decision Tree | 10 min | high | Charlin et al. (2000); decision trees scaffold clinical reasoning |

### Retrieve (5 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Free Recall Blurt | 5 min | medium | Roediger & Karpicke (2006); testing effect — retrieval practice > re-reading for long-term retention |
| Sprint Quiz | 5 min | medium | McDaniel et al. (2007); quiz-based retrieval enhances later exam performance |
| Fill-in-Blank | 5 min | low | Dunlosky et al. (2013); cloze-based retrieval is effective for factual knowledge |
| Mixed Practice | 10 min | high | Rohrer et al. (2015); interleaved practice improves discrimination and transfer |
| Variable Retrieval | 10 min | medium | Morris et al. (1977); PNAS 2024; varied retrieval practice produces more durable and transferable knowledge than constant retrieval |

### Interrogate (6 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Analogy Bridge | 3 min | medium | Gentner (1983); analogical reasoning supports structural mapping and transfer |
| Clinical Application | 5 min | high | Schmidt & Rikers (2007); clinical application strengthens illness script formation |
| Cross-Topic Link | 3 min | medium | Pugh & Bergin (2006); interest deepens when learners see cross-domain connections |
| Side-by-Side Comparison | 7 min | medium | Alfieri et al. (2013); comparison-based learning improves discrimination and concept formation |
| Case Walkthrough | 10 min | high | Thistlethwaite et al. (2012); case-based learning improves clinical reasoning in health professions |
| Illness Script Builder | 10 min | high | Schmidt & Rikers (2007); illness scripts are the cognitive structure underlying expert clinical reasoning |

### Refine (2 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Error Autopsy | 5 min | medium | Metcalfe (2017); error correction with feedback is more effective than errorless learning |
| Mastery Loop | 10 min | medium | Rawson & Dunlosky (2011); successive relearning combines testing + spacing for durable retention |

### Overlearn (2 blocks)
| Block | Duration | Energy | Evidence |
|-------|----------|--------|----------|
| Exit Ticket | 3 min | low | Tanner (2012); metacognitive reflection improves self-regulated learning |
| Anki Card Draft | 5 min | low | Kornell (2009); Cepeda et al. (2006); spaced retrieval via flashcards is high-utility |

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

## §4 Template Chains (13 chains)

### Core Chains

#### 1. First Exposure (Core)
**Blocks:** Brain Dump → AI Skeleton Review → Free Recall Blurt → KWIK Hook → Analogy Bridge → Exit Ticket
**Context:** first exposure, high energy, 45 min
**Use for:** Full PEIRRO cycle for new material. Prepare → Encode → Retrieve → Interrogate → Overlearn. Retrieval before generative encoding per Potts & Shanks (2022).
**Note:** Retrieval (Free Recall) comes before generative encoding (KWIK Hook) per Potts & Shanks (2022) — lower cognitive load, higher gains.

#### 2. Review Sprint
**Blocks:** Prediction Questions → Sprint Quiz → Cross-Topic Link → Exit Ticket
**Context:** review, medium energy, 25 min
**Use for:** Fast review loop. Prepare → Retrieve → Interrogate → Overlearn. Skips encode for known material.

#### 3. Quick Drill
**Blocks:** Brain Dump → Sprint Quiz → Exit Ticket
**Context:** review, medium energy, 15 min
**Use for:** Minimal time investment. Prepare → Retrieve → Overlearn. Good for spacing reviews.

#### 4. Anatomy Deep Dive
**Blocks:** Prior Knowledge Scan → Three-Layer Chunk → Draw-Label → Free Recall Blurt → Anki Card Draft
**Context:** Anatomy, first exposure, high energy, 40 min
**Use for:** Anatomy-focused chain with drawing. Prepare → Encode (Draw-Label) → Retrieve → Overlearn.

#### 5. Low Energy
**Blocks:** Brain Dump → AI Skeleton Review → Exit Ticket
**Context:** low energy, 15 min
**Use for:** Low-effort chain for tired days. Prepare → Overlearn. Maintain streak without burning out.

#### 6. Exam Prep
**Blocks:** Prediction Questions → Mixed Practice → Side-by-Side Comparison → Error Autopsy → Anki Card Draft
**Context:** exam prep, high energy, 35 min
**Use for:** Exam-focused chain with interleaving and error analysis. Prepare → Retrieve → Interrogate → Refine → Overlearn.

#### 7. Clinical Reasoning
**Blocks:** Prior Knowledge Scan → Three-Layer Chunk → Case Walkthrough → Side-by-Side Comparison → Error Autopsy → Anki Card Draft
**Context:** Clinical, exam prep, high energy, 45 min
**Use for:** Build clinical reasoning chains. Prepare → Interrogate → Refine → Overlearn.

#### 8. Mastery Review
**Blocks:** Free Recall Blurt → Error Autopsy → Mastery Loop → Anki Card Draft
**Context:** consolidation, medium energy, 30 min
**Use for:** Deep consolidation with successive relearning. Retrieve → Refine → Overlearn.

### Intake-Focused Chains

#### 9. Dense Anatomy Intake
**Blocks:** Pre-Test → Draw-Label → Free Recall Blurt → KWIK Hook → Anki Card Draft
**Context:** Anatomy, first exposure, high energy, 40 min
**Use for:** High-detail anatomy first exposure. Pre-Test primes encoding, Draw-Label for spatial memory, retrieval before generative steps.

#### 10. Pathophysiology Intake
**Blocks:** Pre-Test → Self-Explanation Protocol → Concept Cluster → Free Recall Blurt → Error Autopsy
**Context:** Pathology, first exposure, high energy, 45 min
**Use for:** Pathology first exposure with mechanism tracing. Pre-Test → Self-Explanation → Concept Cluster → Retrieve → Refine.

#### 11. Clinical Reasoning Intake
**Blocks:** Pre-Test → Illness Script Builder → Side-by-Side Comparison → Free Recall Blurt → Anki Card Draft
**Context:** Clinical, first exposure, high energy, 45 min
**Use for:** Clinical first exposure with illness scripts. Pre-Test → Illness Script → Compare → Retrieve → Overlearn.

#### 12. Quick First Exposure
**Blocks:** Pre-Test → AI Skeleton Review → Free Recall Blurt → Exit Ticket
**Context:** first exposure, medium energy, 20 min
**Use for:** Minimal intake chain when time is limited. Pre-Test → AI Skeleton → Retrieve → Overlearn.

### Visualization Chains

#### 13. Visual Encoding
**Blocks:** Brain Dump → Concept Map → Comparison Table → Free Recall Blurt → Exit Ticket
**Context:** first exposure, high energy, 40 min
**Use for:** Visualization-first encoding for topics with confusable concepts. Build visual representations before retrieval.

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
