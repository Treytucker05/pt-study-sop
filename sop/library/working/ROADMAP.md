# PT Study SOP Roadmap (v9.1 baseline, v9.2-dev staging)

## Status
- v9.1 shipped (M0–M6, Anatomy Engine, Brain v9.1 schema, condensed GPT instructions, packaged release).
- Combined bundle: `sop/PT_Study_SOP_v9.1_ALL.md` (mirrored in `releases/v9.1/`).

## Gaps (open)
1) Brain analytics dashboard (web UI): topic heat map, readiness gauge, spacing alerts, confidence vs performance, session timeline.
2) Subject-specific engines: Clinical Pathology (next), Lifespan, Legal/Ethical, Exam Skills (create shared template first).
3) Content libraries: landmarks, pre-built drawings, OIAN quick refs, clinical pattern snippets; live under `sop/content/` (landmarks/drawings/clinical).
4) Exam tracking: define exams/blocks, coverage tracking, countdown/urgency, LO mapping (`brain/exams/`).
5) Integration tests for GPT behavior: scripted prompts, expected responses, sample transcripts (`sop/tests/` TBD).

## Next Steps
### Immediate (this week)
- Stand up CustomGPT using `releases/v9.1/PT_Study_SOP_v9.1_ALL.md` (or GPT-INSTRUCTIONS + gpt-knowledge if preferred).
- Run 3 real sessions; ingest; generate resume; capture friction notes in `sop/working/PLAN_v9.2_dev.md`.

### Short-term (next 2 weeks)
- Implement dashboard_web v2 with visuals in Gap #1.
- Stub content library skeleton under `sop/content/` (landmarks/, drawings/, clinical/).
- Add `sop/tests/` harness stub for GPT behavior checks (golden prompts).

### Medium-term (next month)
- Build pathology engine module (diagnosis reasoning with M8), then other engines.
- Add exam definitions and coverage tracking in `brain/exams/`.

### Ongoing
- Weekly: pick 1 item from `sop/RESEARCH_TOPICS.md`, update relevant methods doc, and test in-session.
- After each session: note what worked/what didn't; feed back into modules/prompts.

## Success Criteria
- Sessions run with Planning → Encode/Build → Wrap; logs ingest without errors.
- Readiness/resume reflects new sessions; dashboard v2 shows coverage + spacing alerts.
- At least one content library (landmarks or drawings) stubbed and usable.
- Pathology engine draft live and testable with M8 flows.


## Approved Enhancements for v9.2
1) Arterial Supply (OIANA): anatomy order becomes Bones → Landmarks → Attachments → Actions → Innervation → Arterial Supply → Clinical; require primary arterial supply per muscle; add recall question “Which artery supplies this muscle?”
2) Real Image Integration (web search): when visuals requested, fetch real atlas/cadaver/medical diagrams; two-image rule (labeled + unlabeled quiz).
3) Image Recall & Labeling Drills: after each region, run unlabeled → identify → reveal labeled → convert misses to cards (Wrap phase).
4) Light Mode / Quick Mode: short sessions — Light (10–15 min: landmarks → attachments; 5 recalls; quick wrap 1–3 cards). Sprint (20–30 min: landmarks → attachments → OIANA; 8–10 recalls; wrap 3–5 cards).
5) Mnemonics: command “Generate mnemonic options”; only after understanding confirmed; provide 3 options; avoid homophones unless requested.
6) Glossary / Micro-Dictionary: auto-capture terms per region; 1–2 sentence simple definitions; store per-region summary or unified glossary file.
