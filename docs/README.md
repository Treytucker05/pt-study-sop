# Docs

Central documentation for the PT Study system.
Canonical learning/runtime system: **CP-MSS v1.0** (`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`).
If a doc conflicts with CP-MSS definitions, follow `sop/library/17-control-plane.md`.

## Docs Sync Policy (Single Source Of Truth)
- Dev/run/build/test workflow: `docs/root/GUIDE_DEV.md`
- SOP quick start: `README.md`
- Agent instructions: `AGENTS.md`, `CLAUDE.md` (repo) and `C:\Users\treyt\.claude\CLAUDE.md` (global)
- Canonical docs index: `docs/README.md`

## Feature Doc Quick Reference

| Feature | Doc(s) |
|---------|--------|
| Tutor Architecture (comprehensive) | `docs/TUTOR_ARCHITECTURE.md` |
| Control Plane (CP-MSS v1.0) | `sop/library/17-control-plane.md` |
| Calendar/Tasks | `docs/calendar_tasks.md` |
| Dashboard UI | `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md` |
| SOP System | `sop/library/00-overview.md` |
| Project Architecture | `docs/root/PROJECT_ARCHITECTURE.md` |
| Data Contracts | `docs/contracts/INDEX.md` |
| Tutor/SOP Explorer | `docs/dashboard/TUTOR_PAGE_SOP_EXPLORER_v1.0.md` |
| Tutor Video Ingest (MP4 -> RAG) | `docs/root/TUTOR_VIDEO_INGEST_PLAN.md` |
| Composable Methods (46 blocks) | `sop/library/15-method-library.md` |
| Vision and Theory | `docs/root/VISION_PPFW.md`, `docs/root/PPFW_RESEARCH_LOG.md` |
| Release Process | `docs/release/RELEASE_PROCESS.md` |

## Product

- [PRD](prd/PT_STUDY_OS_PRD_v1.0.md)
- [Tutor SOP Explorer](dashboard/TUTOR_PAGE_SOP_EXPLORER_v1.0.md)
- [Dashboard Window Inventory](dashboard/DASHBOARD_WINDOW_INVENTORY.md)
- [Project Hub](project/INDEX.md) (redirects to conductor)

## System References

- [Tutor Architecture](TUTOR_ARCHITECTURE.md) (10-section visual map with Mermaid diagrams)
- [Calendar/Tasks Integration](calendar_tasks.md)
- [Project Architecture](root/PROJECT_ARCHITECTURE.md)
- [Agent Strategy](AGENT_STRATEGY.md)
- [User Guide](root/GUIDE_USER.md)
- [Dev Guide](root/GUIDE_DEV.md)
- [Architecture Guide](root/GUIDE_ARCHITECTURE.md)
- [Concept Map: Session Flow](root/CONCEPT_MAP_FLOW.md)
- [Vision: PPFW Stack](root/VISION_PPFW.md)
- [PPFW Research Log](root/PPFW_RESEARCH_LOG.md)

## Schemas and Contracts

- [Contracts Index](contracts/INDEX.md)
- [Acceptance Tests](tests/)

## Tutor Docs (docs/root/TUTOR_*)

| Doc | Status | Purpose |
|-----|--------|---------|
| `TUTOR_TODO.md` | Active | Execution tracker with sprint backlog |
| `TUTOR_OWNER_INTENT.md` | Reference | Owner design intent for tutor system |
| `TUTOR_CATEGORY_DEFINITIONS.md` | Reference | Block category definitions |
| `TUTOR_METHOD_SELECTION_RULES.md` | Reference | Chain/method selection logic |
| `TUTOR_CONTROL_PLANE_CANON.md` | Reference | CP-MSS rationale and evidence |
| `TUTOR_OBSIDIAN_NOTE_RULES.md` | Reference | Vault write conventions |
| `TUTOR_PRIME_DRAFT_MATRIX.md` | Locked | PRIME method policy table |
| `TUTOR_VIDEO_INGEST_PLAN.md` | Reference | MP4 ingest pipeline design |
| `GUIDE_TUTOR_FLOW.md` | Reference | Tutor flow walkthrough |

## Other

- [Design Ideas](design/IDEAS.md)
- [Release Process](release/RELEASE_PROCESS.md)
- [Roadmap](roadmap/)
- [Repo Hygiene](project/REPO_HYGIENE.md)

## Archived Docs

Stale or superseded docs are in `docs/archive/`. Includes:
- `brain_scholar_map.md` (Jan 2026, references deleted files)
- `system_map.md` (references deprecated Custom GPT tutor)
- `CODEX_SUBAGENT_IMPLEMENTATION.md` (old Codex skills setup)
- `TUTOR_NORTH_STAR_RULES.md` (renamed to Map of Contents)
- `TUTOR_TRUTH_PATH.md` (superseded by TUTOR_TODO.md)
- `TUTOR_AUDIT_REMEDIATION.md` / `TUTOR_AUDIT_REPORT.md` (completed track artifacts)
- `TUTOR_METHOD_INTEGRITY_SMOKE.md` (one-off audit)
- `ROLE.md` (stale vault paths)
- `ARCHITECTURE_V2.md` (legacy V2 terminology)
