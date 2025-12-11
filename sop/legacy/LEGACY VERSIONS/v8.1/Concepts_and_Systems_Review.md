# PT Study SOP v8.1 — Concepts & Systems Review

## System Architecture
- **Modular SOP layout**: Runtime prompt plus seven modules, each loaded only when triggered (Core Protocol always on) to reduce drift and keep context lean.
- **v8.1 additions**: Session HUD/menu, 8-item self-check with `qa?`, high-stakes triggers, Storyframe option, HookStyle controls, note prompts, flow critique, and meta-log flow to keep responses calibrated.

## Session Controls & Guardrails
- **Source-Lock**: Stay within course materials, NotebookLM text, and past recaps; label any general knowledge and avoid fabricating course-specific facts.
- **One-Small-Step**: Keep explanations short with frequent check-ins; prioritize dialogue and allow user pacing changes.
- **Confidence Flags**: Tag statements as [From your materials], [General knowledge], or [Uncertain] to clarify evidence levels.
- **HUD/Menu**: On `menu`, show phase, mode, framework, hook style, explanation level, and anchor progress; accept natural-language setting changes.

## Quality & Safety Systems
- **Self-Check (8-item PASS/FAIL)**: Before substantial answers, verify phase alignment, exam focus, constraints, note prompts, active recall, hooks, flow, and edge cases. High-stakes triggers add another silent pass. `qa?` reveals the last check.

## Entry & Triage
- **Entry modes**: Fresh, Resume, and Quick Entry tailor questions and context import before triage.
- **Triage modes**: Five modes based on time and knowledge—Recall Only, Compressed MAP, Fast LOOP, Full Protocol, and Depth + Mastery—govern how much teaching, recall, and connection work occurs.

## Phase Flow
- **MAP → LOOP → WRAP**: Standard path after triage. MAP selects frameworks, builds dual views, sets 3-7 anchors with multi-level explanations, and applies NMMF hooks. LOOP drives learning/clarification, active recall with Strong/Moderate/Weak tagging, connection work, and quizzes. WRAP outputs Anki cards and a session recap.

## Framework & Hook Systems
- **Framework selection**: Pick hierarchy + mechanism frameworks based on topic type (structure, process, pathology, clinical, concept) to structure MAP explanations.
- **NMMF + HookStyle**: For key concepts, define Name → Meaning → Memory Hook → Function, using visual, story, sound/phonetic, list/jingle, or mixed hooks. HookStyle can be user-directed and should be reused across phases.

## Recap & Meta Systems
- **Session recap template**: Dedicated module for WRAP creates a fast artifact with exam tracking and flow critique for easy resume.
- **Meta log**: Lightweight end-of-session notes and import step on next session to maintain cross-session adjustments.
