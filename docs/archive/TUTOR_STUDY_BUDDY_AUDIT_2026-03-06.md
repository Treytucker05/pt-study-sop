# Tutor / Study Buddy Canon Audit (2026-03-06)

Purpose: document the evidence used to establish the new Tutor / Study Buddy canon, classify the major source layers in the repo, and preserve the historical path that led to the current system.

## 1. Locked Conclusions

This audit supports these final conclusions:

- Library controls what Tutor teaches.
- SOP rules and chains control how Tutor teaches.
- Brain is the operational system of record and telemetry store, but not the direct pedagogy policy layer.
- Scholar reads Brain outputs and turns them into research, questions, and proposals.
- Obsidian is the primary note home.
- Anki is chain-conditional.
- Tutor is a protocol-led study operator, not a generic chatbot.

## 2. Evidence Reviewed

### Active docs sampled

- `docs/README.md`
- `README.md`
- `docs/root/PROJECT_ARCHITECTURE.md`
- `docs/root/GUIDE_TUTOR_FLOW.md`
- `docs/root/TUTOR_OWNER_INTENT.md`
- `docs/root/TUTOR_CONTROL_PLANE_CANON.md`
- `docs/root/TUTOR_OBSIDIAN_NOTE_RULES.md`
- `conductor/product.md`
- `sop/library/00-overview.md`
- `sop/library/01-core-rules.md`
- `sop/library/05-session-flow.md`
- `sop/library/17-control-plane.md`

### Historical evidence sampled

- `conductor/tracks/*`
- `docs/archive/CONTINUITY_archive_20260217.md`
- `docs/archive/stale_docs/*`
- `sop/archive/*`
- `archive/pt-study-sop-docs-and-manifest/*`
- recent `git log` across `docs/`, `conductor/`, `sop/`, and `README.md`

### Runtime truth samples

- Tutor / Library sync:
  - `dashboard_rebuild/client/src/lib/tutorClientState.ts`
  - `dashboard_rebuild/client/src/pages/library.tsx`
  - `dashboard_rebuild/client/src/pages/tutor.tsx`
- Tutor / Obsidian / Anki:
  - `brain/dashboard/api_tutor.py`
  - `brain/obsidian_vault.py`
  - `brain/anki_sync.py`
  - `sop/library/methods/M-OVR-002.yaml`
- Scholar / Brain boundary:
  - `scholar/brain_reader.py`
  - `scholar/CHARTER.md`
  - `docs/root/PROJECT_ARCHITECTURE.md`
- Pedagogy and stage contracts:
  - `sop/library/17-control-plane.md`
  - `sop/library/01-core-rules.md`
  - `sop/library/05-session-flow.md`

## 3. Source Classification Matrix

| Source | Class | Why it matters now | Notes |
|---|---|---|---|
| `docs/root/TUTOR_STUDY_BUDDY_CANON.md` | Active canon | Master product truth path for Tutor / Study Buddy vision and subsystem contracts | Created in this pass |
| `sop/library/17-control-plane.md` | Active canon | Canonical control-plane semantics and dependency law | Pedagogy/control-plane source |
| `sop/library/01-core-rules.md` | Active canon | Canonical global tutor rules and block-stage contracts | Pedagogy source |
| `sop/library/05-session-flow.md` | Active canon | Canonical chain/session execution flow | Pedagogy source |
| `docs/root/TUTOR_OBSIDIAN_NOTE_RULES.md` | Active canon | Canonical note structure and wiki-link rules for tutor-generated notes | Subsystem canon |
| `docs/README.md` | Active support doc | Docs entrypoint and routing layer | Must point to master canon |
| `README.md` | Active support doc | Repo overview for humans and tools | Must point to master canon |
| `docs/root/PROJECT_ARCHITECTURE.md` | Active support doc | Technical architecture and integration map | Not the overall product canon |
| `docs/root/GUIDE_TUTOR_FLOW.md` | Active support doc | Runtime wiring and endpoint/state guide | Implementation doc only |
| `docs/root/TUTOR_OWNER_INTENT.md` | Active support doc | Owner lock-ins and non-negotiables | No longer the overall canon |
| `docs/root/TUTOR_CONTROL_PLANE_CANON.md` | Active support doc | Supporting rationale/evidence for control-plane categories | Defers to SOP and master canon |
| `conductor/product.md` | Active support doc | Conductor product summary | Should mirror master canon, not replace it |
| `docs/root/VISION_PPFW.md` | Active support doc | Theory and learning-science background | Foundational rationale, not operational truth path |
| `docs/root/TUTOR_TODO.md` | Active support doc | Active board and execution tracker | Board, not canon |
| `conductor/tracks/*` | Historical evidence | Shows decision history, shipped phases, and audit/hardening work | Useful for chronology and rationale |
| `docs/archive/CONTINUITY_archive_20260217.md` | Historical evidence | Dense evolution log across January–February shifts | High-value history, not active guidance |
| `sop/archive/*` | Historical evidence | Preserves pre-canon SOP eras, including M0-M6 and legacy deployment packs | Valuable migration evidence |
| `archive/pt-study-sop-docs-and-manifest/*` | Historical evidence | Archived repo snapshots and manifest materials | Retained for forensics only |
| `docs/archive/stale_docs/system_map.md` | Stale / superseded | Still explains a Brain/Scholar/Tutor loop, but centers deprecated Custom GPT framing | Historical only |
| `docs/archive/stale_docs/TUTOR_TRUTH_PATH.md` | Stale / superseded | Earlier attempt at a truth path | Superseded by this pass |
| `docs/archive/stale_docs/COMPOSABLE_METHODS_VISION.md` | Historical evidence | Important for Brain -> Scholar improvement-loop evolution | Do not treat as current contract |
| `docs/archive/stale_docs/TUTOR_NORTH_STAR_RULES.md` and related stale Tutor docs | Stale / superseded | Earlier working docs tied to previous naming and runtime states | Historical only |

## 4. Evolution Timeline

### Stage 1: Pre-CP-MSS and early Tutor framing

Evidence:

- `sop/archive/M0-planning.md` through `sop/archive/M6-wrap.md`
- `sop/archive/MASTER_PLAN_PT_STUDY.md`
- `docs/archive/stale_docs/system_map.md`

Summary:

- The system originally documented study flow with older M0-M6 language and Custom GPT-era assumptions.
- Obsidian, WRAP ingestion, and Anki were already central, but the modern native Tutor contract was not yet fully formed.

### Stage 2: Composable methods and YAML canon

Evidence:

- `sop/README.md`
- `docs/archive/stale_docs/COMPOSABLE_METHODS_VISION.md`
- `git log` entries around 2026-02-08 through 2026-02-21

Summary:

- The repo shifted away from triple-source method definitions toward YAML-based method and chain canon.
- Brain/Scholar roles started to sharpen around: Brain stores facts and telemetry, Scholar interprets patterns and proposes changes.

### Stage 3: CP-MSS control-plane hardening

Evidence:

- `conductor/tracks/CP_MSS_CONTROL_PLANE_HARDENING_20260217/*`
- `sop/library/17-control-plane.md`
- `sop/library/01-core-rules.md`

Summary:

- CP-MSS became the deterministic stage model.
- The dependency law `REFERENCE -> RETRIEVE` and category-first semantics were formalized as canon.

### Stage 4: Native Tutor, vault integration, and adaptive infrastructure

Evidence:

- `conductor/tracks/adaptive_mastery_20260220/*`
- `conductor/tracks/video_*`
- `git log` entries from 2026-02-20 through 2026-03-03

Summary:

- The native Tutor runtime replaced older Custom GPT assumptions.
- Obsidian vault integration moved toward CLI-first handling.
- Library/Tutor handoff, block artifacts, and adaptive telemetry became concrete runtime concerns.

### Stage 5: Vision lock, audit, and contract cleanup

Evidence:

- `conductor/tracks/tutor_vision_lock_20260301/*`
- `conductor/tracks/tutor-audit-remediation_20260302/*`
- `conductor/tracks/tutor-audit-hardening_20260305/*`
- `docs/root/SCHOLAR_TUTOR_ALIGNMENT_AUDIT_2026-03-04.md`
- `git log` entries from 2026-03-01 through 2026-03-06

Summary:

- Repo docs were rewritten around the native Tutor.
- Audit/remediation work exposed the need for one top-level canon instead of overlapping “mostly canonical” documents.
- This pass closes that documentation gap without pretending the system was always described this clearly.

## 5. Contradictions Resolved In This Pass

1. **Too many overlapping truth-path candidates**  
   `README.md`, `docs/README.md`, `docs/root/PROJECT_ARCHITECTURE.md`, `docs/root/TUTOR_OWNER_INTENT.md`, and `conductor/product.md` all carried part of the “what is Tutor?” burden. This pass gives that burden to one master canon.

2. **Library vs SOP confusion**  
   The repo already had disambiguation work, but the top-level truth path still did not fully separate:
   - Library = course materials / what Tutor teaches
   - SOP library = pedagogy / how Tutor teaches

3. **Brain vs Scholar ambiguity**  
   Some historical docs made Brain look like the adaptive intelligence layer itself. The current canon now locks:
   - Brain stores telemetry and operational truth
   - Scholar interprets what is working and proposes changes

4. **Obsidian and Anki semantics needed a stable product statement**  
   Runtime and method docs showed:
   - Obsidian as primary note home
   - Anki as method/chain-governed output
   but the top-level product docs did not state this cleanly enough.

## 6. Follow-Up Items (Do Not Treat As Already Shipped)

- Review `docs/root/PROJECT_ARCHITECTURE.md` end-to-end for remaining legacy M0-M6 / older endpoint sections that are still useful technically but too old in wording.
- Consider adding archive banners or frontmatter tags to `docs/archive/stale_docs/*` so historical-but-useful docs are less likely to be mistaken for active guidance.
- Run a second doc-consistency pass over any non-updated guide files that still talk about Tutor as if Anki were always-on or Brain were the pedagogy engine.
- Consider a Scholar-specific canon doc if the Scholar subsystem grows enough to need a stronger top-level contract of its own.
