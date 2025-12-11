# PT Study SOP v9.2 – Structure & Component Plan (working)

Purpose: Outline what v9.2 will contain (modes, modules, engines, prompts, tooling, packaging) before promotion. Use this as the source-of-truth map while building.

## Modes & Presets
- Core, Sprint, Drill (v9.1 baseline).
- Light mode preset (10–15 min): landmarks → attachments; ~5 recalls; wrap 1–3 cards.
- Quick Sprint preset (20–30 min): landmarks → attachments → OIANA+; ~8–10 recalls; wrap 3–5 cards.
- Mode thresholds & fatigue rules: ~80–90% mastery → advance; <70% → remediate; break guidance baked into M5 + runtime prompt.

## Modules (M0–M6) with 9.2 changes
- M0 Planning: Evidence blurb, 7-step checklist, quick/micro templates, pre-test reminder.
- M1 Entry: (no major change planned; align wording with new presets if needed.)
- M2 Prime: Prime Toolkit, timing/feedback rules, unlabeled-image prime fallback (worksheet/labels) note.
- M3 Encode: Encode Toolkit, fading guidance, timing, risks.
- M4 Build: Build Toolkit, difficulty ramp, timing, risks; interleaving/spacing/variability emphasis.
- M5 Modes: Updated rules/playbooks/switching criteria; add Light/Quick Sprint presets; fatigue thresholds.
- M6 Wrap: Wrap Toolkit, spacing/next-step template, calibration checklist, error log + schedule next review.
- Module 3 (new triage/scope) from PLAN_v9.2_dev remains optional—park unless pulled into scope.

## Engines / Systems
- Anatomy Engine (OIANA+): add Arterial Supply step, per-muscle artery field, artery recall question, mnemonic command, glossary capture.
- Image recall drill: manual-first flow (unlabeled → identify → reveal → log misses → cards); live fetch parked until external service available.
- Stall/Recovery (ladder) from PLAN_v9.2_dev: least-to-most recovery path; include in prompts/runtime if scoped in.
- Recap/Wrap engine: enforce card creation; split lab vs written anchors; integrate image drill outputs and glossary notes.

## Prompts / GPT Runtime
- Runtime prompt updates: pre-test reminder, mark unverified answers, OIANA+ arterial, mnemonic command, Light/Quick Sprint presets, manual image-drill instructions, wrap card requirement.
- `gpt-knowledge/` refresh: MASTER, modules M0–M6, M-series/H-series references as needed.

## Content & Libraries
- Content stubs under `sop/content/` (landmarks/, drawings/, clinical/) – skeletal in 9.2 unless time permits.
- Glossary/micro-dictionary store (decision: per-region file vs unified glossary) to be finalized during implementation.

## Tooling
- `scripts/analyze_logs.py` for baselines (anchors/cards/stalls; missing fields; CSV + text).
- `scripts/build_release.py` (or .ps1) for reproducible packaging of `releases/v9.2/` with checksums.
- `sop/working/RELEASING.md` to document commands, tests, checksum, README link updates.

## Packaging & Migration Plan
- Build in place under `sop/` + `brain/` (dev). Do not touch `releases/v9.1/` until promotion.
- Create `releases/v9.2/` staging when feature-complete.
- Promotion step: move current `v9.1/` to `LEGACY VERSIONS/v9.1/`; drop new `v9.2/` into root slot; update root README and pointers.
- Tag release and archive checksums.

## Parking Lot / Future
- Live image fetch (labeled + unlabeled pairs) gated on external service + calendar integration.
- Calendar integration for spaced reviews and image-drill scheduling.
- Dashboard v2 visuals (heat map, readiness gauge, spacing alerts, confidence vs performance, timeline) – may live in Brain track.
