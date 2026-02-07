# Composable Method Library Vision

## Overview

The Composable Method Library transforms study sessions from monolithic workflows into atomic, reusable blocks that can be assembled into context-aware chains. Each method is a single cognitive technique (e.g., "Memory Palace", "Concept Mapping") with known properties (duration, energy cost, learning stage). Chains are ordered sequences of methods tailored to specific contexts (class type, energy level, time available). The system learns which combinations work through continuous rating and analysis, creating a self-improving study OS.

---

## Three-Body Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Feedback Loop                            │
│                                                              │
│  ┌─────────────┐      ┌─────────────┐      ┌─────────────┐ │
│  │   TUTOR     │─────>│    BRAIN    │─────>│   SCHOLAR   │ │
│  │ (Execution) │<─────│  (Analysis) │<─────│(Intelligence)│ │
│  └─────────────┘      └─────────────┘      └─────────────┘ │
│        │                     │                     │         │
│        v                     v                     v         │
│   Owns library          Stores facts         Questions data  │
│   Runs sessions         Rates methods        Proposes tests  │
│   Assembles chains      Flags anomalies      Designs changes │
└─────────────────────────────────────────────────────────────┘
```

**Tutor (Execution)**
- Owns method library and chain templates
- Assembles chains based on context inputs
- Runs study sessions with timing and prompts
- Sends rating requests to Brain after each session

**Brain (Analysis)**
- Stores method ratings and session metadata
- Aggregates effectiveness/engagement metrics
- Flags statistical anomalies (outliers, patterns)
- Provides raw data to Scholar on demand
- **No interpretation** — pure facts only

**Scholar (Intelligence)**
- Queries Brain for performance patterns
- Generates hypotheses about method effectiveness
- Proposes new methods, chains, or context rules
- Designs A/B test plans
- Reports findings to user for approval before Tutor updates

---

## Method Block Schema

Each method is an atomic study technique with known properties.

```json
{
  "id": "method_uuid",
  "name": "Memory Palace",
  "category": "encode",
  "description": "Visualize concepts in spatial locations",
  "default_duration_min": 20,
  "energy_cost": "high",
  "best_stage": "first_exposure",
  "tags": ["visual", "spatial", "anatomy"],
  "created_at": "2026-02-07T12:00:00Z"
}
```

**Fields:**
- `id`: Unique identifier
- `name`: Human-readable method name
- `category`: One of 6 categories (see below)
- `description`: Brief technique summary
- `default_duration_min`: Suggested time allocation
- `energy_cost`: high | medium | low
- `best_stage`: first_exposure | review | exam_prep | consolidation
- `tags`: JSON array for filtering (e.g., ["visual", "anatomy"])
- `created_at`: Timestamp

---

## Method Categories

**1. Activate**
Warm up working memory, set focus, prime retrieval pathways. Examples: Preview scan, context recall, learning goal statement.

**2. Map**
Survey structure, build skeleton, identify relationships. Examples: Concept map, outline extraction, system overview.

**3. Encode**
Attach meaning, create memory hooks, deepen understanding. Examples: Memory palace, OIANA+ anatomy drill, analogy generation.

**4. Retrieve**
Test recall, strengthen pathways, identify gaps. Examples: Flashcard drill, free recall, practice questions.

**5. Connect**
Link to prior knowledge, apply concepts, integrate systems. Examples: Case study application, cross-system mapping, clinical scenario.

**6. Consolidate**
Close loop, capture artifacts, reflect on session. Examples: Summary note, Anki card draft, session log entry.

---

## Chain Schema

A chain is an ordered sequence of method blocks with context metadata.

```json
{
  "id": "chain_uuid",
  "name": "Anatomy Deep Dive",
  "description": "First exposure to new anatomical system",
  "block_ids": ["activate_1", "map_2", "encode_oiana", "retrieve_flashcard", "consolidate_anki"],
  "context_tags": {
    "class_type": "anatomy",
    "stage": "first_exposure",
    "energy": "high",
    "time_available": 60
  },
  "created_at": "2026-02-07T12:00:00Z",
  "is_template": true
}
```

**Fields:**
- `id`: Unique identifier
- `name`: Human-readable chain name
- `description`: When to use this chain
- `block_ids`: Ordered array of method IDs
- `context_tags`: JSON object with context dimensions (see below)
- `created_at`: Timestamp
- `is_template`: If true, reusable template; if false, one-time custom chain

---

## Context Dimensions

Context determines which chain to use. Four dimensions:

**1. class_type**
- anatomy, kinesiology, pathology, pharmacology, neuroscience, clinical_reasoning, etc.

**2. stage**
- `first_exposure`: New material, no prior exposure
- `review`: Revisiting known material
- `exam_prep`: Pre-test intensive review
- `consolidation`: Post-test reflection, gap filling

**3. energy**
- `high`: Full cognitive capacity, complex techniques OK
- `medium`: Some fatigue, prefer lighter methods
- `low`: Minimal capacity, passive/surface work only

**4. time_available**
- Minutes available for session (integer)

---

## Rating System

After each session, Tutor prompts user to rate the session and individual methods.

**Session Rating:**
```json
{
  "session_id": "session_uuid",
  "chain_id": "chain_uuid",
  "context": { "class_type": "anatomy", "stage": "first_exposure", "energy": "high", "time_available": 60 },
  "effectiveness": 4,  // 1-5: How well did this session achieve learning goals?
  "engagement": 5,     // 1-5: How engaged/focused were you?
  "notes": "Memory palace worked great for muscle origins/insertions",
  "rated_at": "2026-02-07T13:00:00Z"
}
```

**Method Rating:**
```json
{
  "method_id": "encode_oiana",
  "session_id": "session_uuid",
  "effectiveness": 5,
  "engagement": 5,
  "notes": "OIANA+ structure made anatomy stick immediately",
  "rated_at": "2026-02-07T13:00:00Z"
}
```

Brain stores all ratings without interpretation. Scholar queries aggregates to find patterns.

---

## Template Chains

Six pre-built chains covering common study scenarios:

**1. First Exposure (Core)**
```
Activate → Map → Encode → Retrieve → Connect → Consolidate
```
- Full cycle for new material
- High energy required
- 60-90 minutes
- All class types

**2. Review Sprint**
```
Activate → Retrieve → Connect → Consolidate
```
- Known material, strengthen recall
- Medium energy
- 30-45 minutes
- All class types

**3. Quick Drill**
```
Activate → Retrieve → Consolidate
```
- Rapid flashcard/question session
- Low-medium energy
- 15-20 minutes
- Best for anatomy, kinesiology, pharmacology

**4. Anatomy Deep Dive**
```
Activate → Map → Encode (OIANA+) → Retrieve → Consolidate
```
- Specialized for anatomical systems
- High energy
- 60-75 minutes
- Anatomy only

**5. Low Energy**
```
Activate → Map → Consolidate
```
- Passive structure building when fatigued
- Low energy
- 20-30 minutes
- All class types (structure-heavy preferred)

**6. Exam Prep**
```
Activate → Retrieve → Connect → Retrieve → Consolidate
```
- Double retrieval pass for exam readiness
- Medium-high energy
- 45-60 minutes
- All class types

---

## Data Flow

```
┌──────────────────────────────────────────────────────────────────┐
│                         Session Cycle                             │
└──────────────────────────────────────────────────────────────────┘

1. CONTEXT INPUT
   User specifies: class_type, stage, energy, time_available

2. CHAIN SELECTION (Tutor)
   Tutor queries method library, selects matching chain template

3. SESSION EXECUTION (Tutor)
   Tutor runs each method block in sequence with timing prompts

4. RATING COLLECTION (Tutor → Brain)
   Post-session, user rates effectiveness/engagement per method
   Brain stores ratings with session metadata

5. PATTERN ANALYSIS (Scholar ← Brain)
   Scholar periodically queries Brain for rating aggregates:
   - "Which methods have effectiveness < 3 in anatomy first_exposure?"
   - "Which chains perform best in low energy contexts?"
   - "Are there rating outliers (anomalies)?"

6. HYPOTHESIS GENERATION (Scholar)
   Scholar proposes changes:
   - "Replace method X with method Y in chain Z"
   - "Add new 'Encode' method for kinesiology"
   - "Test A/B: Map-first vs Retrieve-first in review chains"

7. APPROVAL & UPDATE (User → Tutor)
   User reviews Scholar's proposal
   If approved, Tutor updates method library or chain templates

8. LOOP REPEATS
   Next session uses updated library, new ratings feed analysis

┌──────────┐      ┌──────────┐      ┌──────────┐
│  TUTOR   │─────>│  BRAIN   │─────>│ SCHOLAR  │
│ (Execute)│<─────│ (Store)  │<─────│(Analyze) │
└──────────┘      └──────────┘      └──────────┘
     ^                                    |
     |                                    v
     └──────────────[Approval]───────────┘
```

---

## Future

**Phase 1: Manual Templates**
- User selects chain based on context
- Rates methods after each session
- Scholar generates monthly reports

**Phase 2: Auto-Recommendations**
- Tutor suggests chains based on context and past ratings
- Scholar proposes new chains from high-performing method combinations

**Phase 3: A/B Testing**
- Scholar designs controlled experiments (e.g., Chain A vs Chain B for anatomy review)
- Brain tracks experiment arms, Scholar analyzes results

**Phase 4: Method Discovery**
- Scholar parses session transcripts to identify emergent techniques
- Proposes new methods when user deviates from template and rates it highly

**Phase 5: Adaptive Chains**
- Tutor dynamically reorders methods mid-session based on real-time engagement signals
- Brain tracks intra-session adjustments, Scholar learns adjustment rules

---

**Last Updated:** 2026-02-07
**Status:** Vision document — not yet implemented
**Owner:** Trey Tucker (DPT student)
