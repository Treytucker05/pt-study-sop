# Concept Map Corrections — All Fixes Applied

Date: 2026-02-02
Status: ✅ DEPLOYED

---

## Summary

Audited the ASCII concept map against canonical SOP documentation and applied all corrections. Concept map now accurately represents PT Study SOP v9.4.

---

## Changes Applied

### 1. ✅ FIXED: Weekly Rotation (3+2) — HIGH PRIORITY

**Before (WRONG):**
```
Study 3 classes (1 session each)
Review 2 weakest anchors (spaced recall)
```

**After (CORRECT):**
```
CLUSTER SPLIT:
- Cluster A: 3 Technical Classes (highest cognitive load)
- Cluster B: 2 Lighter/Reading-Heavy Classes

WEEKLY RHYTHM (M-S rotation):
Mon/Wed/Fri  → Cluster A (deep work) + 15 min Cluster B review
Tue/Thu/Sat  → Cluster B (deep work) + 15 min Cluster A review
Sunday       → Weekly review + metacognition
             → Wins/Gaps/Backlog/Load check
             → Next-week cluster assignments

KEY INSIGHT: 3+2 is distributed practice ACROSS CLASSES
             (distinct from interleaving WITHIN a class)
```

**Why it matters:**
- The rotation alternates between two clusters throughout the week
- Each cluster gets deep work 3 days, cross-review 3 days
- Not about weak anchors — about balancing cognitive load
- Sunday is for metacognition and planning, not review

---

### 2. ✅ ADDED: Spaced Retrieval Details (1-3-7-21)

**New section:**
```
SPACED RETRIEVAL (1-3-7-21 Heuristic)
R1 (+1d)  → RSR adaptive or Manual R/Y/G
R2 (+3d)  → Adjust: ≥80% +25% | 50-79% keep | <50% -50%
R3 (+7d)  → Min 12h, Max 60d bounds
R4 (+21d) → If no RSR captured, use standard 1-3-7-21
```

**Details added:**
- RSR threshold adjustments (≥80%, 50-79%, <50%)
- Bounds enforcement (12h minimum, 60d maximum)
- Fallback to standard spacing if RSR not captured

---

### 3. ✅ CLARIFIED: Session Ledger vs JSON

**Before (Unclear):**
- Listed "Session Log v9.4" as if it were always JSON

**After (Correct):**
```
SESSION LEDGER (Text Output at Wrap):
- Tutor outputs plain TEXT at Wrap
- Contains: date, covered, not_covered, weak_anchors,
  artifacts_created, timebox_min

CONVERTED TO JSON (via Brain Ingestion):
- Brain processes text → JSON v9.4
- Adds tracker fields + enhanced fields
- Stored in database
```

**Key distinction:**
- Tutor = text output (Exit Ticket + Session Ledger)
- Brain = JSON conversion and storage
- Dashboard reads from Brain (not tutor)

---

### 4. ✅ ADDED: LO Engine Mention

**New:**
```
Content Engines:
├─ Anatomy (OIANA+)
├─ Concept (5-step)
└─ LO Engine (wraps Concept for LO-driven topics)
```

**Details:**
- LO Engine: LO → source anchors → milestone map → cluster map → teach loop → note emit
- Can wrap Concept Engine for learning-objective-driven topics
- Optional protocol pack for structured LO workflows

---

### 5. ✅ ADDED: System Flow (Data Pipeline)

**New visual showing:**
```
Material Ingestion → Tutor → RAG/Anki/Exit Ticket+Ledger
                     ↓
              Anki Desktop ← Brain Ingestion → Dashboard/Planner
```

**Clarifies:**
- Text flows from tutor to Brain (not JSON)
- Brain converts to JSON and ingests
- Anki Desktop and Dashboard read from their respective systems
- Two-way arrows show data relationships

---

### 6. ✅ EXPANDED: Evidence Guardrails

**Now includes:**
- ✗ No numeric forgetting curve claims (cite studies)
- ✗ Dual coding = heuristic only (never "2x" guarantee)
- ✗ Zeigarnik effect ≠ reliable memory guarantee
- ✗ RSR thresholds = adaptive (not fixed "85%")
- ✗ 3+2 rotation = distributed practice across classes
- ✗ Interleaving = discrimination within class only
- ✗ These are distinct (rotation ≠ interleaving)

**Critical insight:**
The last two items clarify the confusing relationship between rotation and interleaving.

---

### 7. ✅ UPDATED: WRAP Phase Description

**Before:**
```
M6 Wrap
Exit Ticket
Session Ledger
```

**After:**
```
M6 Wrap
Text Output:
• Exit Ticket
• Session Ledger
```

**Clarifies:** Tutor outputs text, not JSON or structured data

---

## Files Modified

- `dashboard_rebuild/client/src/pages/tutor.tsx` — Updated `CONCEPT_MAP_CONTENT` constant
- Frontend rebuilt (4.46s)
- Deployed to `brain/static/dist/`

---

## How to Access

1. Open Tutor page
2. Click "CONCEPT MAP" at top of SOP Explorer
3. View the corrected ASCII concept map

---

## Verification

All changes cross-referenced against:
- ✅ `sop/library/00-overview.md` (Vision)
- ✅ `sop/library/01-core-rules.md` (Rules)
- ✅ `sop/library/02-learning-cycle.md` (PEIRRO + KWIK)
- ✅ `sop/library/04-engines.md` (Engines + LO)
- ✅ `sop/library/05-session-flow.md` (Session flow)
- ✅ `sop/library/06-modes.md` (Modes)
- ✅ `sop/library/07-workload.md` (3+2 rotation, spacing)
- ✅ `sop/library/08-logging.md` (Schemas)

---

## Audit Report

See `CONCEPT-MAP-AUDIT.md` for detailed comparison.

