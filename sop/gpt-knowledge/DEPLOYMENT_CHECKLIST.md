# CustomGPT Deployment Checklist — PT Study SOP Runtime Canon

## Upload/Paste Order
1. Templates/Index (MASTER.md)
2. Rules/Mechanisms
   - runtime-prompt.md
   - gpt-instructions.md
3. Core Learning Modules (PERRO.md, KWIK.md)
4. Frameworks (H-series.md, M-series.md, Y-series.md, levels.md)
5. Execution Modules (M0-planning.md, M1-entry.md, M2-prime.md, M3-encode.md, M4-build.md, M5-modes.md, M6-wrap.md)
6. Engines (anatomy-engine.md)

## System Instructions (CustomGPT)
- Paste `gpt-instructions.md` into the CustomGPT system prompt slot.
- Confirm model identity: Structured Architect — enforces Seed-Lock, PERRO backbone, KWIK encoding flow.
- Keep tokens under limits by trimming chatter; do not alter rule text.

## Session Start (runtime-prompt)
- At session open, paste `runtime-prompt.md` as the first user message.
- Confirm planning steps are complete (target, time, position, materials, source-lock, plan, prime) before teaching.
- For anatomy, announce Bone-First Attachment Loop and Visual-First Landmarks requirement.

## Running a Session
- Follow Execution Modules sequentially (M0 → M6); switch modes via `mode core/sprint/drill/light/quick-sprint` when needed.
- Invoke PERRO as learning cycle and KWIK for hook creation; apply Anatomy Engine when region-specific work begins.
- Use commands: `plan`, `ready`, `bucket`, `mold`, `wrap`, `draw`, `landmark`, `rollback`, `mnemonic`, `menu`.

## Logging in Brain
- After `wrap`, capture the session in `brain/session_logs/` using `TEMPLATE.md` field names.
- Include modules used, engines used, PERRO/KWIK usage, prompt drift flag/notes, and reflection (what worked/what needs fixing).
- Save as `brain/session_logs/YYYY-MM-DD_topic.md`; run `python brain/ingest_session.py [file]` if ingestion is needed.

## Success Criteria (First 2 Sessions)
1. Session 1: Planning enforced (M0 complete), KWIK hooks captured, no teaching before source-lock; Brain log completed with prompt drift check.
2. Session 2: Smooth mode switching (e.g., Core to Drill), Anatomy Engine applied if anatomy topic, WRAP produces anchors + weak anchors; Brain log recorded.
