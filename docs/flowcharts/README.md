# PT Study SOP — Flowchart Index

Complete visual breakdown of the PT Study Operating System architecture, CP-MSS v1.0 learning cycle, and data flows.

## Overview

This directory contains 6 comprehensive Mermaid flowcharts that decompose the PT Study SOP into progressive levels of detail:

---

## Flowcharts

### 1. **System Overview** (`01-system-overview.mmd`)
**Purpose:** Full system architecture and data flow

Shows how all major components connect:
- Material Ingestion → Tutor-Ready Packet
- Tutor System (enforces M0-M6, CP-MSS, KWIK)
- RAG Subsystem (source-lock compliance)
- Brain (ingestion & storage)
- Anki Bridge (card management)
- Dashboard / Planner (spacing & readiness)
- Progress Tracking & Weekly Rotation

**When to use:** High-level system understanding, architecture reviews, stakeholder presentations.

---

### 2. **Session Flow (M0-M6)** (`02-session-flow-m0-to-m6.mmd`)
**Purpose:** Complete session lifecycle with module details

Walks through all 6 modules in sequence:
- **M0 Planning:** target, sources, plan, pre-test, weak anchors
- **M1 Entry:** state check, scope, mode selection
- **M2 Prime:** H1 scan, bucket, pre-questions
- **M3 Encode:** KWIK flow per hook (Sound → Function → Image → Resonance → Lock)
- **M4 Build:** L2 teach-back gate, progressive ladder (Guided → Faded → Independent → Interleaved)
- **M5 Modes:** Anatomy Engine vs Concept Engine execution
- **M6 Wrap:** Exit Ticket, Session Ledger, card creation, error classification
- **Post-Session:** Progress tracking, weekly review (3+2 rotation)

**When to use:** Tutoring workflow, step-by-step session execution, tutor training.

---

### 3. **Control Plane + KWIK Learning Cycles** (`03-peirro-kwik-learning-cycles.mmd`, legacy filename)
**Purpose:** Cognitive framework (macro & micro loops)

Shows how learning science is encoded:
- **Control Plane (macro):** 6-stage session cycle
  - PRIME
  - CALIBRATE
  - ENCODE (activates KWIK)
  - REFERENCE
  - RETRIEVE
  - OVERLEARN
- **KWIK (micro):** 5-step encoding flow nested inside the ENCODE stage
  1. Sound (phonetic seed)
  2. Function (true action)
  3. Image (tied to function)
  4. Resonance (learner approval)
  5. Lock (card/log artifact)

**When to use:** Learning science documentation, neuroscience/cognitive alignment, encoding troubleshooting.

---

### 4. **Content Engines Decision Tree** (`04-content-engines-decision-tree.mmd`)
**Purpose:** How to choose and execute teaching engines

Shows conditional logic for content type:
- **Anatomy Engine** (regional/spatial anatomy)
  - Steps: Bones → Landmarks → Attachments → Actions → Nerves → Arterial Supply → Clinical
  - Landmark Pass (Visual → Spatial → Neighbors → Attachments)
  - Attachment Map before OIANA+ details
  - Drawing Protocol (bone outline → landmarks → muscle lines → labels → actions)
  - Rollback rule on recall failure

- **Concept Engine** (abstract/non-spatial)
  - Steps: Definition → Context → Mechanism → Differentiation → Application
  - Generation-first (ask learner first)
  - Backtrack on gaps

**When to use:** Content design, tutor prompt engineering, debugging teaching sequences.

---

### 5. **Core Rules & Invariants** (`05-core-rules-and-invariants.mmd`)
**Purpose:** 10 no-skip behavioral rules that cannot be violated

Mandatory checks at session start:
1. **M0 Planning** (target, sources, plan, pre-test)
2. **Source-Lock** (grounded or UNVERIFIED)
3. **Seed-Lock Ask-First** (learner attempts first)
4. **Level Gating** (L2 before L4)
5. **Control Plane Cycle** (no skipping stage contracts)
6. **Exit Ticket** (mandatory)
7. **Session Ledger** (mandatory)
8. **No Phantom Outputs** (never invent missing data)
9. **Evidence Nuance** (prevent overclaiming)
10. **Function Before Structure** (what before how)

Each rule includes consequences for violation and halt/restart protocol.

**When to use:** Quality assurance, tutor guardrails, rules enforcement, troubleshooting rule violations.

---

### 6. **Data Flow & Schemas** (`06-data-flow-and-schemas.mmd`)
**Purpose:** How data moves through the system and what shape it takes

Traces data from tutor output to dashboard:
- **Tutor outputs:** Exit Ticket, Session Ledger, Card artifacts (text)
- **Anki Bridge:** Processes cards, dedupes, source-tags
- **Brain Ingestion:** Session Ledger (text) → JSON via prompts
- **Schemas:**
  - Session Log v9.4 (Tracker + Enhanced fields)
  - RAG Document v1 (chunks, images, metadata)
  - Card v1 (front/back, tags, sources)
  - Resume v1 (readiness, coverage, gaps, recommendations)
- **Storage:** Brain DB (logs, progress, resume)
- **Dashboard:** Reads logs, generates coverage/spacing/readiness
- **Observer:** Learner reads Dashboard, Resume, Session Ledgers

**When to use:** Data pipeline design, schema validation, backend integration, logging/storage planning.

---

## Reading Order (Recommended)

For first-time users:
1. Start with **01-system-overview.mmd** (see the forest)
2. Read **02-session-flow-m0-to-m6.mmd** (walk the path)
3. Study **03-peirro-kwik-learning-cycles.mmd** (legacy filename, Control Plane + KWIK science model)
4. Dive into **04-content-engines-decision-tree.mmd** (choose what to teach)
5. Memorize **05-core-rules-and-invariants.mmd** (rules that can't break)
6. Reference **06-data-flow-and-schemas.mmd** (build backend/integration)

---

## How to Use These Diagrams

### For Tutors / AI Implementation
- Use 02 + 03 + 04 + 05 as the "SOP enforcement checklist"
- Embed rules from 05 into system prompts
- Reference 04 when choosing teaching strategy

### For Backend / Data Engineering
- Use 06 as the data contract
- Define schemas in databases based on 06
- Build ingestion pipelines per 06 data flow

### For Stakeholders / Leadership
- Share 01 for system vision
- Share 02 for session workflow
- Share 05 for quality assurance

### For Learning Science Review
- Use 03 to validate CP-MSS + KWIK implementation
- Cross-check with evidence base in `sop/library/12-evidence.md`

---

## Viewing Mermaid Diagrams

These files use Mermaid syntax and can be viewed:

1. **GitHub:** Paste filename into GitHub repo (auto-renders in markdown)
2. **Mermaid Live Editor:** https://mermaid.live/ (copy-paste .mmd content)
3. **VS Code:** Install "Markdown Mermaid" extension
4. **Obsidian:** Built-in Mermaid support
5. **Export to PNG/SVG:** Use Mermaid CLI:
   ```bash
   npm install -g @mermaid-js/mermaid-cli
   mmdc -i 01-system-overview.mmd -o system-overview.png
   ```

---

## Integration with SOP Library

These flowcharts are visual companions to:
- **sop/library/00-overview.md** — System vision
- **sop/library/01-core-rules.md** — Behavioral rules (→ 05-core-rules-and-invariants.mmd)
- **sop/library/02-learning-cycle.md** — CP-MSS + KWIK (→ `03-peirro-kwik-learning-cycles.mmd`, legacy filename)
- **sop/library/04-engines.md** — Anatomy/Concept engines (→ 04-content-engines-decision-tree.mmd)
- **sop/library/05-session-flow.md** — M0-M6 flow (→ 02-session-flow-m0-to-m6.mmd)
- **sop/library/08-logging.md** — Session log schema (→ 06-data-flow-and-schemas.mmd)

---

## Version & Governance

- **Version:** Corresponds to SOP v9.4
- **Last Updated:** 2026-02-02
- **Canonical Source:** `sop/library/` (flowcharts are visual artifacts)
- **Updates:** When SOP library changes, regenerate flowcharts to match

---

## Quick Reference: Concept Map

```
PT Study SOP (Level 1: Vision)
  ├─ System Overview (L2)
  │  ├─ Tutor (M0-M6)
  │  ├─ RAG (source-lock)
  │  ├─ Brain (ingestion & storage)
  │  ├─ Anki Bridge (cards)
  │  └─ Dashboard/Planner (spacing)
  │
  ├─ Learning Cycle (L3)
  │  ├─ Control Plane (macro: 6 stages)
  │  └─ KWIK (micro: 5 steps)
  │
  ├─ Session Flow (L2)
  │  ├─ M0-M1: MAP (Planning & Entry)
  │  ├─ M2-M5: LOOP (Prime → Encode → Build → Modes)
  │  └─ M6: WRAP (Exit Ticket + Session Ledger)
  │
  ├─ Content Engines (L4)
  │  ├─ Anatomy (OIANA+)
  │  └─ Concept (5-step)
  │
  ├─ Core Rules (L5)
  │  └─ 10 no-skip invariants
  │
  └─ Data Flow (L6)
     ├─ Tutor output (text)
     ├─ Brain ingestion (JSON)
     ├─ Storage (DB)
     └─ Dashboard output
```

---

## Questions?

See `sop/library/00-overview.md` for high-level overview, or reference the canonical files linked above for detailed explanations.

Legacy note: The filename `03-peirro-kwik-learning-cycles.mmd` is retained for backward link compatibility; the canonical runtime model is CP-MSS v1.0.
