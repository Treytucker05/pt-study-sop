# Module Audit - M0-M6 + bridges (2026-01-12)

## Scope
- Audit window: 2026-01-05 to 2026-01-12 (last 7 days)
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
- Gluteal region sessions used Visual-First Anatomy Engine and anchor metaphors; visual-first enforcement is repeatedly emphasized (2025-12-05).
- Sprint wrap session used MCQ sprinting and flagged source-lock drift between lab vs written materials; system performance rated 2 (2025-12-05).
- Lower limb session planned recall gates and reported low system performance plus requests for image-first support and 1-step gating in Core Mode (2025-12-08).
- Face encoding session used M3 Encode with one-step gating and created 10 Anki cards; WRAP not reached and remaining topics listed (2025-12-08).
- Exam prep used Extraction-Mode, teach-back, and sprint loops with strict source-lock; 120 Anki cards created with drawing support (2025-12-10).
- Geriatrics session used Clin-Path v8 and L2 teach-back; notes AI taught first due to zero prior exposure and used Sprint quizzes (2025-12-11).

## Data Quality Notes
- Template-only logs present: brain/session_logs/2025-12-08_assistant_help.md, brain/session_logs/2025-12-09_assistant_help.md.
- Duplicate or overlapping session record: brain/session_logs/2025_12_05_session_2_module_9.md overlaps with brain/session_logs/2025-12-05_Anatomy_gluteal_region_session2.md.
- Missing or placeholder fields appear in several logs (planning fields, ratings, anchors).

## Probe-Before-Teach Check
- No explicit pre-probe evidence in sampled logs; 2025-12-11 notes AI taught first due to zero prior exposure.

## High-Utility Technique Checklist (sample-based)
- Retrieval practice: present (Sprint MCQs, recall gates) in 2025-12-05, 2025-12-08, 2025-12-10, 2025-12-11.
- Spaced practice: not evidenced (Anki creation logged, but spaced sessions not recorded).
- Elaborative interrogation: not evidenced.
- Self-explanation: present (teach-back, ELI10/ELI4, L2 teach-back) in 2025-12-10 and 2025-12-11.
- Interleaved practice: unclear or not evidenced.

## Assumptions
- Anki creation implies future spaced practice but is not documented as executed.
- "Recall gates" in the plan were executed as intended, but sequence is not logged.
- Missing pre-probe notes may reflect documentation gaps rather than behavior gaps.

## Recommendations (one change each)
1. Add a required "Pre-probe attempted? Y/N + evidence" field to the session log template.
2. Add a required "Technique checklist used this session" line (retrieval, spaced, elaborative, self-explanation, interleaving).
3. Add an ingest guard that rejects template-only logs (placeholder text still present).
