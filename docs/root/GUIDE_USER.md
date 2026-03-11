# PT Study System — User Guide

## Who This Is For

Learners using the system to run study sessions, track progress, and improve performance across DPT coursework.

## System Overview (At a Glance)

Trey’s Study System is built around three systems:

- **Brain** = tracks how you learn, what is sticking, and where you struggle
- **Scholar** = researches how to improve the system and can ask you focused questions
- **Tutor** = teaches you live from your selected materials

The study lifecycle is:
1. Upload study materials (slides, PDFs, notes) via the **Library** page (`/library`).
2. Start a **Tutor** session (`/tutor`) — pick course, attach materials, select a chain.
3. Tutor walks you through the chain block-by-block with RAG-powered retrieval over your materials.
4. At wrap: Exit Ticket + Session Ledger → saved to DB + Obsidian vault.
5. **Brain** stores telemetry, updates learner evidence, and tracks progress patterns.
6. **Scholar** audits that evidence, asks focused research questions when needed, and produces findings/proposals.
7. Dashboard/Calendar surface priorities → next Tutor targets.

```
Library (upload materials)
    |
    v
Tutor Wizard (course + chain + mode)
    |
    v
Chain Execution (PRIME → CALIBRATE → ENCODE → REFERENCE → RETRIEVE → OVERLEARN)
    |
    v
Wrap (Exit Ticket + Session Ledger + Anki cards when applicable)
    |
    v
Brain (telemetry + learner evidence) -> Scholar (research + findings) -> next Tutor target
```

---

## Cold Start (First Time Setup)

### Prerequisites
- Python 3.10+ installed
- Node.js 18+ installed
- OpenAI API key set as `OPENAI_API_KEY` environment variable (used for embeddings)
- Codex CLI authenticated (`codex login`) — used for tutor LLM

### Minimum to start studying
1. Launch the dashboard: double-click `Start_Dashboard.bat` → opens `http://127.0.0.1:5000`.
2. Go to **Library** (`/library`) and upload at least one study file (PDF, DOCX, PPTX, or slides).
3. Go to **Tutor** (`/tutor`) and start a session.

What the system does automatically:
- Ingests uploaded files → extracts text → embeds into ChromaDB for RAG retrieval.
- Creates missing entities (Course, Topic) from session metadata.
- Writes session artifacts to the Obsidian vault (fire-and-forget).
- Stores study telemetry in Brain so the system can learn what helps you most over time.

### Optional later
- Add assessments (date optional) via the Dashboard.
- Connect Google Calendar/Tasks for scheduling (OAuth setup in `/calendar`).
- Connect Anki Desktop (AnkiConnect on port 8765) for card sync.
- Sync materials from OneDrive folder (`C:\Users\treyt\OneDrive\Desktop\PT School`).

---

## Quick Start: Your First Study Session

### Step 1: Upload Materials

1. Open `http://127.0.0.1:5000/library`.
2. Select or create a **Course** (e.g., "Neuroanatomy").
3. Upload files — PDFs, DOCX, PPTX, or plain text. These are your **Source-Lock** materials.
4. Wait for ingestion to complete (progress shown in the UI).

> **Source-Lock rule:** The tutor will only teach from materials you provide. No sources = outputs marked UNVERIFIED.

### Step 2: Start a Tutor Session

1. Open `http://127.0.0.1:5000/tutor`.
2. The **Wizard** walks you through 3 steps:

| Step | What you do |
|------|-------------|
| **1. Course & Materials** | Pick your course, define the topic scope, select source files, choose Obsidian save folder |
| **2. Chain Selection** | Pick a chain: **Template** (pre-built), **Custom** (build your own), or **Auto** (system recommends) |
| **3. Start** | Confirm operating mode (Core/Sprint/Light/etc.) and launch |

### Step 3: Follow the Chain

The tutor walks you through each block in order. Each block has:
- A **name** (e.g., "Learning Objectives Primer", "Timed Brain Dump")
- A **CP stage** badge (PRIME, CALIBRATE, ENCODE, REFERENCE, RETRIEVE, OVERLEARN)
- A **duration** estimate

Just follow the tutor's prompts. It handles progression, retrieval, and artifact creation.

### Step 4: Wrap

At the end, the tutor runs:
1. **Exit Ticket** — free recall, muddiest point, next action hook.
2. **Session Ledger** — what was covered, weak anchors, artifacts created.
3. **Anki cards** — auto-generated for misses/weak anchors (if applicable).

Session data is saved to the database and (optionally) written to Obsidian.

---

## Recommended First Chain: C-FE-MIN

For your first session, use **C-FE-MIN** ("First Exposure: Minimal"):

```
C-FE-MIN  ~20 min  |  Low energy

  1. M-PRE-010  Learning Objectives Primer     PRIME
  2. M-PRE-008  Structural Extraction           PRIME
  3. M-REF-003  One-Page Anchor (Cheat Sheet)   REFERENCE
  4. M-RET-001  Timed Brain Dump                 RETRIEVE
  5. M-OVR-001  Exit Ticket                     OVERLEARN
```

**Why this one first:**
- Shortest chain (5 blocks, ~20 min)
- Covers the full pipeline end-to-end (PRIME → REFERENCE → RETRIEVE → OVERLEARN)
- Low energy — you're learning the system, not grinding
- If this works, graduate to `C-FE-STD` (35 min, 7 blocks) or `C-FE-PRO` (45 min, 6 blocks)

### Other First Exposure Chains

| Chain | Duration | Energy | Use Case |
|-------|----------|--------|----------|
| `C-FE-MIN` | 20 min | Low | Quick first pass, definitions, recognition |
| `C-FE-STD` | 35 min | Medium | Standard first exposure, classification + mechanism |
| `C-FE-PRO` | 45 min | High | Procedure/lab learning with fault injection |

---

## Control Plane Pipeline (CP-MSS v1.0)

Every session follows a 6-stage pipeline. Stages execute in dependency order:

```
PRIME → CALIBRATE → ENCODE → REFERENCE → RETRIEVE → OVERLEARN
```

| Stage | What happens | Your role |
|-------|-------------|-----------|
| **PRIME** | Orientation — brain dump, structural extraction, learning objectives | Activate what you already know |
| **CALIBRATE** | Diagnostic — confidence-tagged quiz (H/M/L), no grading | Honest self-assessment |
| **ENCODE** | Attach meaning — KWIK hooks, teach-back, comparison tables | Build mental models |
| **REFERENCE** | Build study aids — one-page anchor, question bank seed | Create retrieval targets |
| **RETRIEVE** | Test recall — free recall, sprint quiz, adversarial drill | Practice remembering |
| **OVERLEARN** | Close the loop — exit ticket, Anki cards, drill sheets | Lock it in |

**The Dependency Law:** No retrieval without targets. Every RETRIEVE block must be preceded by a REFERENCE block.

---

## Operating Modes

Modes modify tutor behavior across all blocks:

| Mode | AI Role | Duration | When to use |
|------|---------|----------|-------------|
| **Core** | Guide | 45-60 min | First-pass structured learning (default) |
| **Sprint** | Tester | 30-45 min | Gap-finding via rapid-fire testing |
| **Quick Sprint** | Tester | 20-30 min | Time-boxed Sprint with mandatory wrap |
| **Light** | Guide | 10-15 min | Micro-session, single objective |
| **Drill** | Spotter | Variable | Deep practice on a specific weak area |

**Mode alignment:** If energy is low (1-4), default to Light or Quick Sprint. If material is new, default to Core. See `sop/library/06-modes.md`.

---

## Speed Tiers

The tutor supports configurable speed/quality tradeoffs per turn. Toggle in the chat UI:

| Toggle | What it does |
|--------|-------------|
| **Materials** | Include RAG retrieval from your uploaded study materials |
| **Obsidian** | Include context from your Obsidian vault notes |
| **Web** | Enable web search for supplementary context |
| **Deep Think** | Extended reasoning for complex explanations |

Fewer toggles = faster responses (~1-2s). All toggles on = full pipeline (~5-8s).

---

## Where Your Data Lives

| Data | Location |
|------|----------|
| Study materials (raw files) | `brain/data/uploads/` |
| Study materials (vectors) | `brain/data/chroma_tutor/materials/` (ChromaDB) |
| Database | `brain/data/pt_study.db` (SQLite) |
| Session logs | `brain/session_logs/*.md` |
| Obsidian vault | `C:\Users\treyt\Desktop\Treys School` |
| Scholar outputs | `scholar/outputs/` |
| SOP methodology | `sop/library/` (how the tutor teaches — NOT study materials) |

> **"Library" disambiguation:** `sop/library/` = methodology definitions (how the tutor teaches). The `/library` page = your study materials (what you study). See `AGENTS.md` → "Library Disambiguation".

---

## Dashboard Pages

| Page | Route | Purpose |
|------|-------|---------|
| Dashboard | `/` | Overview, quick stats |
| Brain | `/brain` | Learner evidence, telemetry, mastery signals, vault-linked study artifacts |
| Calendar | `/calendar` | Google Calendar/Tasks, local events |
| Scholar | `/scholar` | Investigations, questions, findings, proposals, research status |
| **Tutor** | `/tutor` | **Chat, sources drawer, Map of Contents, vault authoring** |
| **Library** | `/library` | **Study material upload, course organization, source selection** |
| Methods | `/methods` | Block library, chains, analytics |

---

## Troubleshooting

### Dashboard issues
- **Nothing shows:** Confirm you launched via `Start_Dashboard.bat`. Never use `npm run dev`.
- **Brain page goes black:** Stale frontend build. Run `cd dashboard_rebuild && npm run build`, restart `Start_Dashboard.bat`, hard refresh (Ctrl+F5).
- **Calendar sync fails:** Verify OAuth credentials in `brain/data/api_config.json`.

### Tutor issues
- **Black screen with `Cannot access 'ze' before initialization`:** Stale JS chunks. Rebuild UI (`cd dashboard_rebuild && npm run build`), restart dashboard, hard refresh (Ctrl+F5).
- **Translucent overlay stuck after bulk delete:** Reload the Tutor tab, rebuild UI, restart. Retry — should show themed in-panel confirm.
- **Bulk delete reports partial results:** Tutor now shows `Requested / Deleted / Already gone / Failed` and a short failure details panel when any session delete fails.
- **Session delete returns warning instead of full failure:** `status: deleted_with_warnings` means the Tutor session row was deleted, but one or more Obsidian files were missing/unremovable. Inspect `obsidian_cleanup.missing_paths` and `request_id`.
- **Deleting selected sessions includes your active chat:** Confirm modal now warns that active chat will be cleared and UI returns to WIZARD after delete.
- **Need root cause for recurring delete failures:** Check DB table `tutor_delete_telemetry` using the response `request_id` from delete calls. Each row persists route, status, counts, and structured details for post-mortem.
- **Tutor only uses ~6 files when 30+ selected:** Check browser Network tab on the `turn` request — `content_filter.material_ids` must include all selected files. Check `retrieval_debug` in the response for `material_ids_count`.
- **Slow responses:** Disable toggles you don't need (Web, Obsidian, Deep Think). Materials-only is fastest.

### Build issues
- **Changes don't appear:** You must rebuild: `cd dashboard_rebuild && npm run build`. Vite outputs directly to `brain/static/dist/`.
- **Port conflict:** Only use `Start_Dashboard.bat` (port 5000). Never run a separate dev server.

---

## Further Reading

| Doc | Location | Purpose |
|-----|----------|---------|
| Session flow (full walkthrough) | `sop/library/05-session-flow.md` | Wizard → Chain → Wrap step-by-step |
| Tutor architecture | `docs/TUTOR_ARCHITECTURE.md` | Visual architecture with Mermaid diagrams |
| Tutor runtime wiring | `docs/root/GUIDE_TUTOR_FLOW.md` | Developer-facing backend flow |
| Operating modes | `sop/library/06-modes.md` | Core, Sprint, Light, Drill details |
| Method blocks + chains | `sop/library/15-method-library.md` | Full catalog of 46 blocks + 15 chains |
| Control Plane constitution | `sop/library/17-control-plane.md` | CP-MSS v1.0 stage contracts + adaptation |
| Dev guide | `docs/root/GUIDE_DEV.md` | Build, test, deploy commands |
| Data storage guide | `docs/root/GUIDE_DATA.md` | brain/data/ layout + material flow |
