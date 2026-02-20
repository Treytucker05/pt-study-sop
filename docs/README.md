# Docs

Central documentation for the PT Study system.
Canonical learning/runtime system: **CP-MSS v1.0** (`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`).
If a doc conflicts with CP-MSS definitions, follow `sop/library/17-control-plane.md`.

## Docs Sync Policy (Single Source Of Truth)
- Dev/run/build/test workflow: `docs/root/GUIDE_DEV.md`
- SOP quick start: `README.md`
- Agent instructions: `AGENTS.md`, `CLAUDE.md` (repo) and `C:\Users\treyt\.claude\CLAUDE.md` (global)
- Canonical docs index: `docs/README.md`

Basic alignment is enforced by `python scripts/check_docs_sync.py` (CI).

## Feature → Doc Quick Reference

| Feature | Doc(s) |
|---------|--------|
| Control Plane (CP-MSS v1.0) | `sop/library/17-control-plane.md` |
| Calendar/Tasks | `docs/calendar_tasks.md` |
| Dashboard UI | `docs/dashboard/DASHBOARD_WINDOW_INVENTORY.md`, `docs/full-ui-api-audit-2026-01-22.md` |
| Scholar | `docs/brain_scholar_map.md` |
| SOP System | `sop/library/00-overview.md` |
| Architecture | `docs/root/PROJECT_ARCHITECTURE.md` |
| Data Contracts | `docs/contracts/INDEX.md` |
| Tutor/SOP Explorer | `docs/dashboard/TUTOR_PAGE_SOP_EXPLORER_v1.0.md` |
| Vision & Theory | `docs/root/VISION_PPFW.md`, `docs/root/PPFW_RESEARCH_LOG.md` |
| Brain System | `docs/root/PROJECT_ARCHITECTURE.md` (Brain section) |
| Composable Methods | `sop/library/15-method-library.md` |
| Release Process | `docs/release/RELEASE_PROCESS.md` |

## Project Hub

- [Project Hub](project/INDEX.md) — redirects to conductor for planning and execution

## Product

- [PRD](prd/PT_STUDY_OS_PRD_v1.0.md)
- [Tutor SOP Explorer](dashboard/TUTOR_PAGE_SOP_EXPLORER_v1.0.md)
- [Dashboard Window Inventory](dashboard/DASHBOARD_WINDOW_INVENTORY.md)

## System References

- [System Map](system_map.md)
- [Calendar/Tasks Integration](calendar_tasks.md)
- [Architecture](root/PROJECT_ARCHITECTURE.md)
- [Agent Strategy](AGENT_STRATEGY.md)
- [User Guide](root/GUIDE_USER.md)
- [Dev Guide](root/GUIDE_DEV.md)
- [Architecture Guide](root/GUIDE_ARCHITECTURE.md)
- [Concept Map: Typical Session Flow](root/CONCEPT_MAP_FLOW.md)
- [Vision: PPFW Stack](root/VISION_PPFW.md)
- [PPFW Research Log](root/PPFW_RESEARCH_LOG.md)

## Schemas & Contracts

- [Contracts Index](contracts/INDEX.md)
- [Acceptance Tests](tests/)

## SOP

- SOP manifest: `../sop/sop_index.v1.json`

## Other

- [Design Ideas](design/IDEAS.md)
- [Release Process](release/RELEASE_PROCESS.md)
- [Roadmap](roadmap/)
- [Repo Hygiene](project/REPO_HYGIENE.md)
