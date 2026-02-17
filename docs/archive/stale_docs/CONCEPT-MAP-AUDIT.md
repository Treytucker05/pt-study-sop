# Concept Map Audit Report

## Overview
Comparing the ASCII concept map against canonical SOP library documentation.

---

## ✅ CORRECT SECTIONS

### 1. Vision (L1)
**What's in the map:**
- Durable Context ✅
- End-to-End Flows (MAP → LOOP → WRAP) ✅
- RAG-First, Citation-First ✅
- Spaced, High-Quality Cards ✅
- Deterministic Logging ✅
- No Phantom Outputs ⚠️ (in Core Rules, not Vision)

**Source:** `00-overview.md` — North Star Vision section
**Status:** GOOD (except "No Phantoms" belongs to invariants, not vision)

---

### 2. PEIRRO + KWIK Learning Cycles (L3)
**What's in the map:**
- PEIRRO: Prepare → Encode → Interrogate → Retrieve → Refine → Overlearn ✅
- KWIK: Sound → Function → Image → Resonance → Lock ✅
- KWIK nested inside PEIRRO Encode ✅
- Function before Image gate ✅
- Seed-Lock rule ✅

**Source:** `02-learning-cycle.md`
**Status:** PERFECT ✅

---

### 3. Content Engines (L4)
**What's in the map:**
- Anatomy Engine: Bones → Landmarks → Attachments → Actions → Nerves → Arterial Supply → Clinical ✅
- Concept Engine: Definition → Context → Mechanism → Differentiation → Application ✅
- L2 Teach-back gate before L4 detail ✅
- Rollback on recall failure ✅

**Source:** `04-engines.md`
**Status:** PERFECT ✅

---

### 4. Core Rules (L5)
**What's in the map:**
- M0 Planning (mandatory) ✅
- Source-Lock (invariant) ✅
- Seed-Lock ask-first ✅
- Level Gating (L2 before L4) ✅
- PEIRRO Cycle (no skip) ✅
- Exit Ticket (mandatory) ✅
- Session Ledger (mandatory) ✅
- No Phantom Outputs (invariant) ✅
- Evidence Nuance Guardrails ✅
- Function Before Structure ✅

**Source:** `01-core-rules.md`
**Status:** PERFECT ✅

---

### 5. Session Flow Phases (L2)
**What's in the map:**
- MAP: M0 Planning + M1 Entry ✅
- LOOP: M2 Prime + M3 Encode + M4 Build + M5 Modes ✅
- WRAP: M6 Exit Ticket + Session Ledger ✅

**Source:** `05-session-flow.md`
**Status:** PERFECT ✅

---

### 6. Operating Modes (L8)
**What's in the map:**
- Core: Guided + scaffolds ✅
- Sprint: Test-first ✅
- Light: Micro-session (10-15 min) ✅
- Quick Sprint: 20-30 min time-boxed ✅
- Drill: Repeated misses ✅

**Source:** `06-modes.md`
**Status:** GOOD ✅

---

## ❌ INCORRECT / INCOMPLETE SECTIONS

### 1. Weekly Rotation (3+2) — WRONG
**What's in the map:**
```
Study 3 classes (1 session each)
Review 2 weakest anchors (spaced recall)
```

**What should be:**
```
CLUSTER SPLIT:
- Cluster A: 3 technical classes (highest cognitive load)
- Cluster B: 2 lighter/reading-heavy classes

WEEKLY RHYTHM:
Mon/Wed/Fri  → Cluster A (deep work) + 15 min Cluster B review
Tue/Thu/Sat  → Cluster B (deep work) + 15 min Cluster A review
Sunday       → Weekly review + metacognition
```

**Why it matters:** The rotation is NOT about weak anchors — it's about distributing cognitive load across the week by alternating between two clusters of courses.

**Source:** `07-workload.md`
**Status:** ❌ NEEDS FIX

---

### 2. System Components (L6) — INCOMPLETE
**What's in the map:**
- Tutor System ✅
- RAG Subsystem ✅
- Brain ✅
- Anki Bridge ✅
- Planner/Dashboard ✅
- Calendar Sync (noted as "design only") ✅

**Missing:** Protocol Packs and LO Engine
- **LO Engine:** "LO → source anchors → milestone map → cluster map → teach loop → note emit"
- Can wrap the Concept Engine for LO-driven topics

**Source:** `04-engines.md` (Protocol Packs section)
**Status:** ⚠️ INCOMPLETE (minor — LO Engine is optional)

---

### 3. Data Schemas (L7) — INCOMPLETE
**What's in the map:**
- Session Log v9.4 ✅
- RAG Document v1 ✅
- Card v1 ✅
- Resume v1 ✅

**What's missing:**
- Session Ledger (plain text, output at Wrap) vs Tracker JSON (produced via Brain ingestion)
- **Important distinction:** The tutor outputs a plain-text **Session Ledger** at Wrap (not JSON). Brain ingestion then converts it to JSON.

**Source:** `08-logging.md`
**Status:** ⚠️ OVERSIMPLIFIED (the tutor doesn't produce JSON; it produces plain text)

---

### 4. Evidence Guardrails — CORRECT but VAGUE
**What's in the map:**
- No numeric forgetting curves ✅
- No "2x" dual-coding guarantees ✅
- Zeigarnik ≠ memory guarantee ✅
- RSR adaptive (not fixed 85%) ✅
- Interleaving ≠ distributed practice ✅

**Source:** `01-core-rules.md` (Evidence Nuance Rules)
**Status:** ✅ CORRECT (though map could note RSR threshold details: ≥80%, 50-79%, <50%)

---

## 📋 SUMMARY OF CHANGES NEEDED

| Issue | Severity | Fix |
|-------|----------|-----|
| 3+2 Rotation (cluster split, weekly rhythm) | 🔴 HIGH | Rewrite section to show Cluster A/B alternation |
| LO Engine mention | 🟡 MEDIUM | Add brief mention under System Components |
| Session Ledger vs JSON distinction | 🟡 MEDIUM | Clarify tutor outputs text, not JSON |
| RSR thresholds detail | 🟠 LOW | Can add numeric thresholds if needed |

---

## Next Steps
1. **Fix 3+2 Rotation** (HIGH PRIORITY)
2. Review updated concept map against sources
3. Re-deploy to Tutor page

