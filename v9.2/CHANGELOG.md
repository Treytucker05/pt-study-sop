
## [9.2-dev] - 2025-12-09 "Resonance Gated Encode"

### Added
- Process Corrections: Word+Meaning before imagery; Jim Kwik Sound -> Function -> Image -> Lock; one-step gating with resonance confirmation; function-first ordering; mandatory resonance check.
- Enforcement checklist in M3 Encode; known pitfalls surfaced in M6 Wrap.
- Seed-Lock now requires resonance confirmation before advancement.

### Fixed
- Error log now calls out common slips: advancing before imagery confirmation, image not tied to meaning, Orbicularis Oris recall weakness, missing Word+Meaning step, and missing Jim Kwik flow alignment.

---
## [9.1] - 2025-12-05 "Structured Architect + Anatomy Engine"

### Added
- **M0 Planning Phase** â€” Mandatory planning before teaching starts
  - Target exam/block identification
  - Source-Lock (explicit material declaration)
  - 3-5 step plan of attack
- **Anatomy Learning Engine** â€” Bone-first protocol for anatomy
  - Mandatory order: Bones â†’ Landmarks â†’ Attachments â†’ OIAN â†’ Clinical
  - Visual-first landmark recognition
  - Rollback rule for OIAN struggles
- **Drawing Protocol** â€” AI-generated drawing instructions
- **Condensed GPT Instructions** â€” Under 8k character limit (`gpt-instructions-short.md`)
- **Packaged Release** â€” All files in `releases/v9.1/`
- **Brain v9.1 Schema** â€” Extended database with anatomy tracking
  - Planning phase fields
  - Anatomy-specific fields (region, landmarks, muscles, rollback events)
  - Calibration tracking
- **Gap Analysis** â€” `GAP_ANALYSIS.md` documenting known gaps
- **Research Topics** â€” `RESEARCH_TOPICS.md` with 21 learning science topics
- **Next Steps** â€” `NEXT_STEPS.md` implementation checklist

### Changed
- Session flow now starts with M0 Planning Phase
- GPT instructions split into full version and condensed version
- Brain database migrated from v8 to v9.1 schema
- Session template updated with new fields
- Resume generator includes readiness score and spacing analysis

### Constraints Added
- âŒ NO jumping to OIAN before landmarks mapped
- âŒ NO clinical patterns before OIAN stable
- âŒ NO muscle-first approaches for anatomy

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

v9.2 (dev) – WIP: arterial supply step (OIANA+), Light/Quick Sprint presets, mnemonic command, glossary capture, manual image drill (no live fetch), runtime prompt updates.

v9.2 (dev) – updated runtime prompt, modes, anatomy engine, and modules M0/M2/M3/M4/M6; regenerated PT_Study_SOP_v9.2_DEV.md

v9.2 (dev) – MASTER updated with OIANA+, arterial step, Light/Quick Sprint, mnemonics, manual image drill, glossary, pre-test rule.

v9.2 (dev) – added concept-engine (non-anatomy), M4 /fade scaffolding, M0 glossary scan, role-switching at M1, M6 calibration check; regenerated PT_Study_SOP_v9.2_DEV.md.

v9.2 (dev) – added H3–H8, M-SRL/ADDIE/STAR, Y-series file; regenerated bundle with concept engine and /fade updates.

