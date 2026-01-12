# Module Audit - M0-M6 + bridges (2026-01-11)

## Scope
- Audit window: 2026-01-04 to 2026-01-11 (last 7 days)
- Session logs in window: none (template files only)
- Fallback sample (outside window):
  - brain/session_logs/2025-12-11_geriatrics_normal_vs_common_abnormal.md
  - brain/session_logs/2025-12-10_exam3_final_prep.md
  - brain/session_logs/2025-12-08_week11_face_encoding.md
  - brain/session_logs/2025-12-08_lower_limb_anatomy.md
  - brain/session_logs/2025-12-05_Anatomy_gluteal_region.md
  - brain/session_logs/2025-12-05_Anatomy_gluteal_region_session2.md
  - brain/session_logs/2025-12-05_session_3_wrap.md
- Modes observed: Core, Sprint
- Safe mode: false

## Facts (from logs)
- Geriatrics and exam prep sessions used teach-back and Sprint quizzes (2025-12-11, 2025-12-10).
- Exam prep used Extraction-Mode -> teach-back -> Sprint loops with strict source-lock (2025-12-10).
- Face encoding used M3 Encode with gating; WRAP not reached; remaining muscles and related systems listed (2025-12-08).
- Lower limb session planned recall gates but reported low system performance and requested mind maps, image-first steps, and 1-step M4 Build enforcement (2025-12-08).
- Gluteal sessions emphasize visual-first anchors and image-only study; planning and ratings fields are missing in some logs (2025-12-05).
- Sprint wrap session caught a missed item (pes anserinus) and flagged source-lock drift between lab vs written materials (2025-12-05).

## Data Quality Notes
- Template-only logs present: brain/session_logs/2025-12-08_assistant_help.md, brain/session_logs/2025-12-09_assistant_help.md.
- Duplicate or overlapping session record: brain/session_logs/2025_12_05_session_2_module_9.md overlaps with brain/session_logs/2025-12-05_Anatomy_gluteal_region_session2.md.

## Probe-Before-Teach Check
- No explicit pre-probe evidence in sampled logs; 2025-12-11 notes AI taught first due to zero prior exposure.

## High-Utility Technique Checklist (sample-based)
- Retrieval practice: present (Sprint MCQs, recall gates).
- Spaced practice: not evidenced (Anki creation noted, no spaced sessions logged).
- Elaborative interrogation: not evidenced.
- Self-explanation: present (teach-back, ELI10/ELI4).
- Interleaved practice: not evidenced or unclear.

## Assumptions
- Anki creation implies future spaced practice but is not documented as executed.
- Missing pre-probe notes reflect under-documentation or a practice gap.

## Recommendations (one change each)
1. Add a required "Pre-probe attempted? Y/N + evidence" field to the session log template.
2. Add a required "Technique checklist used this session" line (retrieval, spaced, elaborative, self-explanation, interleaving) to the session log template.
3. Add an ingest guard that rejects template-only logs (placeholder text still present).
