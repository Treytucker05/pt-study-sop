# Proposal Running Sheet

- Generated: 2026-01-14 16:03:14
- Sources: `scholar/outputs/promotion_queue/`, `scholar/outputs/proposals/`

## Synthesis
- Total proposals: 51
- Evidence drift flags: 8
- Missing path flags: 0

### By target system
- PT Study Brain Dashboard v3.0: 4
- Scholar Orchestrator (v9.2 meta-system): 3
- Tutor v9.2 (production): 32
- Unknown: 12

## Review + Final Check Flow
1) Review each proposal summary and evidence paths.
2) Record decisions in the Decision/Owner/Next columns.
3) Re-run this script for the final check (decisions are preserved).
4) Any proposal with Evidence Drift = Yes should be re-reviewed before implementation.

## Proposal Table
| ID | Summary | Target | Queue | Priority | Status | Evidence Drift | Missing Paths | Decision | Owner | Next | Source |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| BI-01 | Ensure `/api/upload` uses `ingested_files` checksums so duplicate uploads do not create duplicate sessions. | Tutor v9.2 (production) | promotion_queue | - | Draft | Yes | No |  |  |  | `scholar\outputs\promotion_queue\brain_ingest_plus_resume_proposal_seed_2026-01-12.md` |
| BI-02 | Add a validation gate that blocks logs that still match the template or contain only placeholders. | Tutor v9.2 (production) | promotion_queue | - | Draft | Yes | No |  |  |  | `scholar\outputs\promotion_queue\brain_ingest_plus_resume_proposal_seed_2026-01-12.md` |
| BI-03 | Embed a small metadata block in the resume output to expose schema version and recency. | Tutor v9.2 (production) | promotion_queue | - | Draft | Yes | No |  |  |  | `scholar\outputs\promotion_queue\brain_ingest_plus_resume_proposal_seed_2026-01-12.md` |
| change_proposal_mastery_count_2026-01-07 | Change Proposal — Successive Relearning Mastery Count | Unknown | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\change_proposal_mastery_count_2026-01-07.md` |
| change_proposal_probe_first_2026-01-07 | Change Proposal — Probe-First Core Mode Gating | Unknown | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\change_proposal_probe_first_2026-01-07.md` |
| change_proposal_semantic_kwik_2026-01-07 | Change Proposal — Semantic-Lead KWIK Flow | Unknown | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\change_proposal_semantic_kwik_2026-01-07.md` |
| UI-01 | Align top-nav tabs and panels with ARIA tab semantics so assistive tech receives accurate active-state cues. | PT Study Brain Dashboard v3.0 | promotion_queue | Priority 1 | Draft | Yes | No |  |  |  | `scholar\outputs\promotion_queue\dashboard_ui_proposal_seed_2026-01-12.md` |
| UI-02 | Provide accessible text descriptions for canvas charts and an explicit label for the trends period control. | PT Study Brain Dashboard v3.0 | promotion_queue | Priority 2 | Draft | Yes | No |  |  |  | `scholar\outputs\promotion_queue\dashboard_ui_proposal_seed_2026-01-12.md` |
| UI-03 | Switch the mode distribution chart to a bar chart to improve quantitative comparison accuracy. | PT Study Brain Dashboard v3.0 | promotion_queue | Priority 3 | Draft | Yes | No |  |  |  | `scholar\outputs\promotion_queue\dashboard_ui_proposal_seed_2026-01-12.md` |
| UI-04 | Stop auto-collapsing overview detail panels on every tab switch to reduce navigation friction. | PT Study Brain Dashboard v3.0 | promotion_queue | Priority 4 | Draft | Yes | No |  |  |  | `scholar\outputs\promotion_queue\dashboard_ui_proposal_seed_2026-01-12.md` |
| experiment_mastery_count_2026-01-07 | Experiment Design — Mastery Count Tracking | Unknown | promotion_queue | - | Unknown | No | No |  |  |  | `scholar\outputs\promotion_queue\experiment_mastery_count_2026-01-07.md` |
| experiment_probe_first_2026-01-07 | Experiment Design — Probe-First Gating | Unknown | promotion_queue | - | Unknown | No | No |  |  |  | `scholar\outputs\promotion_queue\experiment_probe_first_2026-01-07.md` |
| experiment_semantic_kwik_2026-01-07 | Experiment Design — Semantic-Lead KWIK | Unknown | promotion_queue | - | Unknown | No | No |  |  |  | `scholar\outputs\promotion_queue\experiment_semantic_kwik_2026-01-07.md` |
| M0-01 | Require one "If [trigger], then [action]" line in the M0 plan output to reduce plan drift. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m0_proposal_seed_2026-01-12.md` |
| M0-02 | Add an explicit PRIME pre-test evidence field to session logs to remove compliance ambiguity. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m0_proposal_seed_2026-01-12.md` |
| M0-03 | Require a single line stating when the next retrieval check will occur. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m0_proposal_seed_2026-01-12.md` |
| M1-01 | Add labeled anchors to the 1-10 focus/energy scale to improve readiness calibration. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m1_proposal_seed_2026-01-12.md` |
| M1-02 | Insert a short retrieval probe before confirming mode to align with pretesting evidence. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m1_proposal_seed_2026-01-12.md` |
| M1-03 | Require a one-line goal and timebox restatement to reinforce scope adherence. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m1_proposal_seed_2026-01-12.md` |
| M2-01 | Gate the H1 scan behind a required prediction prompt to reduce passive drift and activate prior knowledge. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m2_proposal_seed_2026-01-12.md` |
| M2-02 | Set a strict H1 scan length cap (3-4 bullets) to reduce extraneous load during priming. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m2_proposal_seed_2026-01-12.md` |
| M2-03 | Prefer diagram labeling or concept mapping before text scans to strengthen schema activation. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m2_proposal_seed_2026-01-12.md` |
| M3-01 | Clarify M3 ordering so function-first gating happens before phonetic hooks and imagery. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m3_proposal_seed_2026-01-12.md` |
| M3-02 | Add explicit self-explanation and immediate generation checks to the source M3 exit criteria. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m3_proposal_seed_2026-01-12.md` |
| M3-03 | Make worked example -> near-transfer pairs an explicit option for complex or novice encoding tasks. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m3_proposal_seed_2026-01-12.md` |
| M4-01 | Align the runtime four-stage difficulty ramp with the source L1-L4 teach-back gates to remove drift. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m4_proposal_seed_2026-01-12.md` |
| M4-02 | Ensure the source M4 module explicitly prompts for interleaving and spacing to prevent blocked practice drift. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m4_proposal_seed_2026-01-12.md` |
| M4-03 | Add a cross-session retrieval rule to align M4 successive relearning with research. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m4_proposal_seed_2026-01-12.md` |
| M5-01 | Add Light and Quick Sprint presets to the source M5 module as time-boxed variants of Core/Sprint. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m5_proposal_seed_2026-01-12.md` |
| M5-02 | Make the Sprint fail-first sequence explicit in the runtime M5 description. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m5_proposal_seed_2026-01-12.md` |
| M5-03 | Add a single downshift rule to reduce Sprint frustration and improve mode switching. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m5_proposal_seed_2026-01-12.md` |
| M6-01 | Clarify the canonical wrap output contract to resolve JSON vs markdown drift. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m6_proposal_seed_2026-01-12.md` |
| M6-02 | Make a brief recall-first action mandatory at wrap before ratings/reflection. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m6_proposal_seed_2026-01-12.md` |
| M6-03 | Add explicit date/time/cue prompts to strengthen spaced review follow-through. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m6_proposal_seed_2026-01-12.md` |
| M6-04 | Make calibration ratings actionable with a brief recall check. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\m6_proposal_seed_2026-01-12.md` |
| SLIP-001 | Add mastery counter to session log template and ingestion pipeline. | Unknown | promotion_queue | - | Unknown | No | No |  |  |  | `scholar\outputs\promotion_queue\proposal_2026-01-12_scholar_loop_integration.md` |
| SLIP-002 | Add interleaved planning check to M0 planning. | Unknown | promotion_queue | - | Unknown | No | No |  |  |  | `scholar\outputs\promotion_queue\proposal_2026-01-12_scholar_loop_integration.md` |
| SLIP-003 | Auto-save digests (or enforce save step) to ensure plan updates are always generated. | Unknown | promotion_queue | - | Unknown | No | No |  |  |  | `scholar\outputs\promotion_queue\proposal_2026-01-12_scholar_loop_integration.md` |
| SLIP-004 | Add data freshness warnings to health and digest outputs. | Unknown | promotion_queue | - | Unknown | No | No |  |  |  | `scholar\outputs\promotion_queue\proposal_2026-01-12_scholar_loop_integration.md` |
| RP-01 | Establish a lightweight, repeatable evaluation harness to baseline and track retrieval quality. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\rag_pipeline_proposal_seed_2026-01-12.md` |
| RP-02 | Combine lexical and dense retrieval with a reranker to improve recall and evidence alignment. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\rag_pipeline_proposal_seed_2026-01-12.md` |
| RP-03 | Replace fixed-size chunking with section-aware chunks that preserve titles and metadata. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\rag_pipeline_proposal_seed_2026-01-12.md` |
| RP-04 | Remove `rag_docs` entries for deleted study files to prevent stale retrieval. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\rag_pipeline_proposal_seed_2026-01-12.md` |
| SO-01 | Require a plan update artifact before a run can be marked complete. | Scholar Orchestrator (v9.2 meta-system) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\scholar_orchestrator_proposal_seed_2026-01-12.md` |
| SO-02 | Make question resolution and research notes mandatory before run completion. | Scholar Orchestrator (v9.2 meta-system) | promotion_queue | - | Draft | Yes | No |  |  |  | `scholar\outputs\promotion_queue\scholar_orchestrator_proposal_seed_2026-01-12.md` |
| SO-03 | Define a single, canonical safe_mode behavior and reference it everywhere. | Scholar Orchestrator (v9.2 meta-system) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\scholar_orchestrator_proposal_seed_2026-01-12.md` |
| TE-01 | Add a retrieval-first gate so learners attempt an answer before explanations. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\tutor_engine_proposal_seed_2026-01-12.md` |
| TE-02 | Standardize feedback into task, process, and next-step guidance. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\tutor_engine_proposal_seed_2026-01-12.md` |
| TE-03 | Fill course/topic/source-lock/turn-number fields for analytics. | Tutor v9.2 (production) | promotion_queue | - | Draft | No | No |  |  |  | `scholar\outputs\promotion_queue\tutor_engine_proposal_seed_2026-01-12.md` |
| change_proposal_core_mode_probe_refine_lock_2026-01-07 | Change Proposal — Core Mode Gating Inversion | Unknown | proposals | - | Draft | No | No |  |  |  | `scholar\outputs\proposals\change_proposal_core_mode_probe_refine_lock_2026-01-07.md` |
| experiment_core_mode_probe_refine_lock_2026-01-07 | Experiment Design — Core Mode Gating Inversion | Unknown | proposals | - | Proposed | No | No |  |  |  | `scholar\outputs\proposals\experiment_core_mode_probe_refine_lock_2026-01-07.md` |
