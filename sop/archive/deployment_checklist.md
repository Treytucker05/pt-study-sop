# Deployment Checklist (Custom GPT)

## Build Runtime Bundle
- Run: `python sop/tools/build_runtime_bundle.py`
- Confirm files created in `sop/runtime/knowledge_upload/`.

## Upload/Paste Order
1) Paste `sop/gpt_custom_instructions_study_os_v9.3.md` into the Custom GPT system instructions.
2) Upload knowledge files from `sop/runtime/knowledge_upload/` (see `sop/runtime/manifest.md`).
3) At session start, paste `sop/runtime/runtime_prompt.md` as the first user message.
4) Use `sop/gpt_prompt_weekly_rotational_plan.md` for weekly planning.
5) Use `sop/gpt_prompt_exit_ticket_and_wrap.md` for wrap outputs if needed.

## Session Run
- Enforce Planning (M0) before teaching.
- Use PEIRRO as the learning cycle; use KWIK for encoding hooks.
- Use Anatomy Engine for anatomy topics.
- Switch modes with `mode core/sprint/light/quick-sprint/drill`.

## Logging
- At Wrap, output Exit Ticket + 1-3-7-21 schedule + Tracker JSON + Enhanced JSON.
- Schema: `sop/logging_schema_v9.3.md`.
- Store logs in your chosen log folder; if using a Brain ingestion tool, see `sop/tools/ingest_stub.md`.

## Success Criteria (first 2 sessions)
1) Planning enforced; source-lock and pre-test completed; no teaching before plan.
2) Wrap produces Exit Ticket + JSON logs; spacing scheduled; cards captured.
