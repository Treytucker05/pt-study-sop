# Changelog

All notable changes to the PT Study SOP.

---

## [9.1] - 2025-12-05 "Structured Architect + Anatomy Engine"

### Added
- **M0 Planning Phase** — Mandatory planning before teaching starts
  - Target exam/block identification
  - Source-Lock (explicit material declaration)
  - 3-5 step plan of attack
- **Anatomy Learning Engine** — Bone-first protocol for anatomy
  - Mandatory order: Bones → Landmarks → Attachments → OIAN → Clinical
  - Visual-first landmark recognition
  - Rollback rule for OIAN struggles
- **Drawing Protocol** — AI-generated drawing instructions
- **Condensed GPT Instructions** — Under 8k character limit (`gpt-instructions-short.md`)
- **Packaged Release** — All files in `releases/v9.1/`
- **Brain v9.1 Schema** — Extended database with anatomy tracking
  - Planning phase fields
  - Anatomy-specific fields (region, landmarks, muscles, rollback events)
  - Calibration tracking
- **Gap Analysis** — `GAP_ANALYSIS.md` documenting known gaps
- **Research Topics** — `RESEARCH_TOPICS.md` with 21 learning science topics
- **Next Steps** — `NEXT_STEPS.md` implementation checklist

### Changed
- Session flow now starts with M0 Planning Phase
- GPT instructions split into full version and condensed version
- Brain database migrated from v8 to v9.1 schema
- Session template updated with new fields
- Resume generator includes readiness score and spacing analysis

### Constraints Added
- ❌ NO jumping to OIAN before landmarks mapped
- ❌ NO clinical patterns before OIAN stable
- ❌ NO muscle-first approaches for anatomy

### Removed
- Deleted duplicate `brain/dashboard_web_new.py` in favor of the primary dashboard entry point.
- Removed redundant `archive/v8.6_backup/` snapshot and old archive ZIP to reduce clutter.
- Trimmed archived session log PDFs, keeping the markdown sources only.

---

## [9.0] - 2025-12-05 "Structured Architect"

### Added
- Complete system restructure with clean `sop/` directory
- Renumbered modules M1-M6 (fixed gap from v8.6)
- Methods library with learning science documentation
  - Desirable difficulties
  - Metacognition
  - Elaborative interrogation
  - Retrieval practice
  - Drawing for anatomy
- Frameworks directory (H-series, M-series, levels)
- Examples directory (gated-platter, sprint-dialogue, commands)
- Single MASTER.md replacing Master Plan + Master Index

### Changed
- Separated Brain system from SOP files
- Archived v8.6 and legacy files
- Consolidated documentation

---

## [8.6] - 2025-11 "Active Architect"

### Features
- M1 Entry, M2 Prime, M4 Encode, M5 Build, M6 Wrap modules
- H-Series (H1, H2) priming frameworks
- M-Series (M2, M6, M8) encoding frameworks
- Seed-Lock mechanism
- Gated Platter for stalls
- Level gating (L1-L4)
- Sprint/Core/Drill modes

### Known Issues
- Module numbering gap (no M3)
- Documentation drift between Master Plan and Master Index
- Duplicate Brain folders

---

## [8.x] - 2025-10 to 2025-11

- v8.5.1 Spotter Prime
- v8.4 Tutor Edition
- v8.1 Archive
- Progressive development of PERRIO protocol

---

## [7.x] - 2025-09 to 2025-10

- v7.4 Initial structured approach
- v7.3 Single-session format
- v7.1 Concise and full versions
- Foundation of Seed-Lock and level gating

---

## Version Naming

| Version | Codename |
|---------|----------|
| 9.1 | Structured Architect + Anatomy Engine |
| 9.0 | Structured Architect |
| 8.6 | Active Architect |
| 8.5.1 | Spotter Prime |
| 8.4 | Tutor Edition |
