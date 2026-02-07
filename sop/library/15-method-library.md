# 15 — Composable Method Library

## §1 Purpose

The Composable Method Library provides reusable method blocks and pre-built chains for study sessions. Method blocks are atomic study activities (e.g., brain dump, teach-back, retrieval drill). Chains are ordered sequences of blocks designed for specific contexts (e.g., first exposure, exam prep, low energy).

**Goals:**
- **Consistency** — Apply proven methods across sessions
- **Adaptability** — Select chains based on context (class type, stage, energy, time)
- **Data** — Rate effectiveness to improve recommendations over time

---

## §2 Method Block Schema

Each method block represents a single study activity.

**Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `name` | string | Block name (e.g., "Brain Dump", "Teach-Back") |
| `category` | enum | One of 6 categories (see below) |
| `description` | string | What the block does |
| `duration` | number | Typical minutes required |
| `energy_cost` | enum | `low` / `medium` / `high` |
| `best_stage` | enum | `first_exposure` / `review` / `exam_prep` / `any` |
| `tags` | array | Descriptors (e.g., `["retrieval", "active"]`) |

**Categories (aligned with PEIRRO):**

1. **Activate** — Prime attention and surface prior knowledge (e.g., brain dump, pre-test)
2. **Map** — Build structural overview (e.g., H1 scan, bucket organization)
3. **Encode** — Attach meaning to material (e.g., KWIK hooks, dual coding, teach-back)
4. **Retrieve** — Test recall without cues (e.g., free recall, flashcards, problem sets)
5. **Connect** — Link to other content (e.g., confusable discrimination, transfer scenarios)
6. **Consolidate** — Lock and review (e.g., spaced retrieval, error analysis, card drafting)

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

**Example:**

```json
{
  "chain_id": "first_exposure_core",
  "name": "First Exposure Core",
  "blocks": ["Brain Dump", "H1 Scan", "Bucket", "KWIK Encode", "Teach-Back", "Free Recall"],
  "context_tags": {
    "class_type": "anatomy",
    "stage": "first_exposure",
    "energy": "high",
    "time_available": 60
  },
  "description": "Full Core mode session for new material"
}
```

---

## §4 Template Chains

Six pre-built chains cover common scenarios.

### 1. First Exposure Core
**Blocks:** Brain Dump → H1 Scan → Bucket → KWIK Encode → Teach-Back → Free Recall
**Context:** First exposure, high energy, 60+ min
**Use for:** New material requiring scaffolding

### 2. Review Sprint
**Blocks:** Pre-Test → Retrieval Drill → Error Analysis → Card Draft → Spaced Retrieval
**Context:** Review, any energy, 30-45 min
**Use for:** Exam prep, gap-finding

### 3. Quick Drill
**Blocks:** Activate → Retrieval Drill → Error Reflection
**Context:** Any stage, low-medium energy, 15-20 min
**Use for:** Quick review between classes

### 4. Anatomy Deep Dive
**Blocks:** Landmark Scan → Drawing Protocol → OIANA+ Drill → Error Analysis → Card Draft
**Context:** Anatomy, first exposure or review, high energy, 45-60 min
**Use for:** Regional anatomy sessions

### 5. Low Energy
**Blocks:** Brain Dump → Passive Review → Flashcards
**Context:** Any stage, low energy, 20-30 min
**Use for:** Low-focus days, maintaining momentum

### 6. Exam Prep
**Blocks:** Confusable Discrimination → Practice Questions → Transfer Scenario → Error Analysis → Card Draft
**Context:** Exam prep, high energy, 45-60 min
**Use for:** Final exam preparation

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

1. **method_blocks** — All available blocks
2. **method_chains** — Pre-built and custom chains
3. **chain_ratings** — Post-session ratings per chain

**Analytics:**

- **Effectiveness stats** — Average rating per chain, per context
- **Usage frequency** — Which chains are used most often
- **Anomaly detection** — Flag chains with low ratings in specific contexts
- **Recommendations** — Suggest chains based on session context and historical performance

**Example query:**
```sql
SELECT chain_id, AVG(effectiveness), AVG(engagement), COUNT(*)
FROM chain_ratings
WHERE context_tags->>'stage' = 'first_exposure'
GROUP BY chain_id
ORDER BY AVG(effectiveness) DESC;
```

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

**Example Scholar prompt:**
```
Analyze chain_ratings for anatomy sessions.
Which chains have highest effectiveness?
Propose a new chain optimized for low-energy anatomy review.
```

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
- Brain and Scholar integration requires backend implementation (see backlog).
