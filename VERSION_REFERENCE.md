# Study SOP Version Reference (Detailed)

## v8.x Series

### Cross-version comparison (8.x)
- **Guardrails:** 8.6 keeps Seed-Lock + Gated Platter + Phonetic Override; 8.5.1 Spotter variants enforce Seed-Lock/no AI hooks; 8.4 adds Safety Override with one-step tutoring; 8.3/8.2 collapse modules and lean on Safety Override + Silver Platter MAP; 8.1.x rely on HUD/self-check/HookStyle controls without Seed-Lock. 【F:current/v8.6/Custom_GPT_Instructions.md†L1-L26】【F:archive/legacy/v8.5.1_Spotter_Prime/Custom_GPT_Instructions.md†L1-L24】【F:archive/legacy/v8.4_Tutor_Edition/Custom_GPT_Instructions.md†L1-L36】【F:archive/legacy/changelog.md†L9-L29】【F:archive/legacy/changelog.md†L61-L115】
- **Entry & Commands:** 8.6 and Spotter use `menu/lock/mold/wrap`; 8.4 routes via Sprint/Core/Drill prompts; 8.1.x use HUD/menu + stepwise entry; changelog-only 8.3/8.2 reuse Sprint/Core/Drill with Silver Platter start. 【F:current/v8.6/Runtime_Prompt.md†L1-L23】【F:archive/legacy/v8.5.1_Spotter_Prime/Runtime_Prompt.md†L1-L19】【F:archive/legacy/v8.4_Tutor_Edition/Module_2_Triage_Rules.md†L1-L37】【F:archive/legacy/changelog.md†L9-L29】【F:archive/legacy/changelog.md†L33-L59】

### v8.6 — Active Architect (current)
- **Persona & Guardrails:** Active Architect enforces priming-first, Seed-Lock with Gated Platter fallback, phonetic overrides before defining difficult terms, and delayed carding until WRAP; works in tight user-led loops. 【F:current/v8.6/Custom_GPT_Instructions.md†L1-L26】
- **Startup Script:** State/motivation check → scope confirmation → mode pick (Diagnostic Sprint vs Core) → mandatory System Scan priming; fallbacks: request syllabus/notes if no topic, offer Raw Level 1 Metaphor the user must edit if no Seed, force Sprint if panic. Commands: `menu`, `lock`, `mold`, `wrap`. 【F:current/v8.6/Runtime_Prompt.md†L1-L23】
- **Core Loop (MAP → LOOP):** Prime with H-series bucket listing and a “don’t memorize—bucket” cue; Encode one bucket at a time with function-first framing and phonetic check-ins; Gate requires a user Seed or invokes Gated Platter; Build escalates L1→L4 with a Level 2 teach-back prerequisite for Level 4; loops advance only on user-ready cues. 【F:current/v8.6/modules/Module_1_Core_Protocol.md†L1-L41】
- **Modes:** Diagnostic Sprint runs fail-first checks that only teach on a miss and forces phonetic hooks before retry; Core follows Prime→Encode→Gate→Build; Drill rebuilds weak buckets with user-supplied examples/hooks. 【F:current/v8.6/modules/Module_2_Modes.md†L1-L21】
- **Framework Library:** Quick cues for H1/H2 priming and M2/M6/M8/Y1 encoding with a global Function→Structure override and opt-in H2; pedagogy levels L1–L4 plus phonetic bridge guidance. 【F:current/v8.6/modules/Module_6_Framework_Library.md†L1-L48】
- **WRAP/Recap:** Operator script reviews locked anchors with user hooks, lets the user choose which items become Anki cards, co-drafts Q/A around those hooks, and only generates/exports cards in WRAP. 【F:current/v8.6/modules/Module_4_Recap_Engine.md†L3-L25】
- **Example Flows:** Dialogues for enforcing Gated Platter, fail-first Sprint, a heart Core walkthrough, and a ready/bucket/mold/wrap command cheat sheet. 【F:current/v8.6/modules/Module_5_Example_Flows.md†L1-L49】

### v8.5.1 — Spotter Prime (archive)
- **Persona & Guardrails:** Spotter/Molder identity—user must supply all seeds; Seed-Lock forbids AI-created hooks; phonetic bridge required on struggles; one-step pacing and source discipline. 【F:archive/legacy/v8.5.1_Spotter_Prime/Custom_GPT_Instructions.md†L1-L24】
- **Startup & Runtime:** State check plus Seed commitment before any teaching; runtime defaults to M2 trigger→mechanism framing with zero hints, mandatory molding questions on struggle, phonetic prompts, and commands `menu/lock/mold`. 【F:archive/legacy/v8.5.1_Spotter_Prime/Runtime_Prompt.md†L1-L19】
- **Core Protocol:** MAP frames function-first blueprints with M2; LOOP restates seed, locks until user affirms, troubleshoots via phonetic or molding questions, layers minimal scaffolding, applies zero-hint validation, then iterates; WRAP recaps user-confirmed anchors only. 【F:archive/legacy/v8.5.1_Spotter_Prime/Module_1_Core_Protocol.md†L1-L28】
- **Frameworks:** Function→Structure override with opt-in H2; defaults to M2 and Y1 with access to H1/H2, M6, M8; phonetic bridge is a mandatory pedagogical tool. 【F:archive/legacy/v8.5.1_Spotter_Prime/Module_6_Framework_Library.md†L1-L22】

### v8.5.1 — pre–safe-deploy
- **Persona & Guardrails:** Spotter posture with explicit readiness check, Seed-Lock (polish only), phonetic bridge, zero-hint validation, and single-thought output pacing. 【F:archive/legacy/v8.5.1_pre_safe_deploy/Custom_GPT_Instructions.md†L3-L22】
- **Core Protocol:** Entry confirms state and seed commitment; MAP defaults to M2 with function-before-structure seed capture; LOOP locks until user seed, troubleshoots via phonetic or molding questions, builds onto the seed, zero-hint verifies, then molds failures; WRAP recaps confirmed anchors. 【F:archive/legacy/v8.5.1_pre_safe_deploy/Module_1_Core_Protocol.md†L1-L34】
- **Frameworks:** Function-before-structure rule with M2 default, Y1 alternative, opt-in H2 “Traditionalist” only on request, plus M6/M8 for safety/triage and molding prompts to tie function back to structure. 【F:archive/legacy/v8.5.1_pre_safe_deploy/Module_6_Framework_Library.md†L1-L24】

### v8.4 — Tutor Edition (Neuro-Edition)
- **Prime Directives:** Question-first tutoring with Safety Override (never stall, pick the safest action), strict one-step output, high-energy tone, source-lock, and a neuro-learning startup check before topic requests. 【F:archive/legacy/v8.4_Tutor_Edition/Custom_GPT_Instructions.md†L1-L36】
- **Core Protocol:** MAP proposes frameworks (Y1/M2/H2) and supplies an immediate Level 1 metaphor, then co-validates anchors before LOOP; LOOP delivers Level 2 teach, requests user hook/teamwork, escalates to Level 4 PT detail, validates with 50/50 teach-back vs quiz, then WRAPs with storyframe + Anki. 【F:archive/legacy/v8.4_Tutor_Edition/Module_1_Core_Protocol.md†L1-L29】
- **Triage Modes:** Sprint enforces Word→Cue→Meaning with hook-first constraint and MC/keyword validation; Core uses Silver Platter MAP then Level 2→user hook→Level 4 plus 50/50 validation; Drill is pure testing with Anti-Polish, mixing explain-why and solve-this and outputting weak-point lists. Switching favors Sprint when urgent, Core for depth, Drill when user brings notes. 【F:archive/legacy/v8.4_Tutor_Edition/Module_2_Triage_Rules.md†L1-L37】
- **Framework Selection:** Analyzes topic type to propose two codes (H-series, M-series, or Y-series), defaults to Y1/M2 when uncertain, and gives quick hits by domain (anatomy H2, physiology M6, rehab M3, diagnosis M8). 【F:archive/legacy/v8.4_Tutor_Edition/Module_3_Framework_Selector.md†L1-L27】
- **Framework Library:** Full H1–H8, M1–M8, and Y1–Y5 catalogue with L1–L4 pedagogy and storyframe guidance, defaulting to Y1 or M2 when unsure. 【F:archive/legacy/v8.4_Tutor_Edition/Module_6_Framework_Library.md†L1-L37】

### v8.3 — High-Speed refactor (changelog-only)
- **What’s documented:** High-Speed refactor removing Modules 5 & 7, consolidating triage into Sprint/Core/Drill, and adding Safety Override to the Custom Instructions. Entry is Silver Platter MAP (immediate scaffolding, no waiting) with Sprint/Core/Drill routing; package folder noted but absent in repo. 【F:archive/legacy/changelog.md†L9-L18】
- **Operational reconstruction:** Start with 8.4’s Sprint/Core/Drill triage prompts and Safety Override guardrail; apply Silver Platter MAP by delivering a Level 1 metaphor + Level 2 scaffold without waiting for a seed, then lock and mold via Sprint/Core depending on urgency; omit Modules 5/7 (troubleshooting/meta-log) and keep one-step tutoring from 8.4. 【F:archive/legacy/v8.4_Tutor_Edition/Module_2_Triage_Rules.md†L1-L37】【F:archive/legacy/v8.4_Tutor_Edition/Module_1_Core_Protocol.md†L1-L29】【F:archive/legacy/changelog.md†L9-L18】

### v8.2 — Renamed to v8.3 (changelog-only)
- **What’s documented:** Same High-Speed refactor (Safety Override, Silver Platter MAP, Sprint/Core/Drill) on release day; version was renamed to v8.3, and no distinct artifacts remain. 【F:archive/legacy/changelog.md†L21-L29】
- **Operational reconstruction:** Mirror v8.3’s steps: Silver Platter MAP (seedless Level 1 + Level 2 scaffold, then lock), Safety Override, and Sprint/Core/Drill routing lifted from 8.4; exclude Modules 5/7 and keep 8.4’s one-step tutoring tone. 【F:archive/legacy/changelog.md†L21-L29】【F:archive/legacy/v8.4_Tutor_Edition/Module_2_Triage_Rules.md†L1-L37】

### v8.1.1 — Prime/Sprint menus
- **Modes & Timing:** Prime Mode (15–20 min/module, scan-only priming), Sprint Mode (20–30 min/topic, hooks + single recall), plus Recall Only, Compressed MAP, Fast LOOP, Full Protocol, and Depth + Mastery. HUD shows Phase, Mode, Framework, HookStyle, Level, and Anchor progress. 【F:archive/legacy/v8.1_archive/Master_Index.md†L22-L78】【F:archive/legacy/v8.1_archive/Master_Index.md†L92-L112】
- **Entry Menus & Commands:** Step-by-step menu replaces interrogation: acknowledge version → course/topic → mode selection → materials → prior recap/meta-log; `menu` displays HUD, `qa?` surfaces silent QA. 【F:archive/legacy/v8.1_archive/Master_Index.md†L22-L58】【F:archive/legacy/changelog.md†L33-L59】
- **Guardrails & QA:** 8-item silent self-check on every answer, high-stakes triggers, hook autonomy/design rules (list elements before hook, never censor user hooks), quiz discipline (one question at a time, no hints). 【F:archive/legacy/changelog.md†L33-L115】
- **Core Flow:** MAP builds dual views plus 3–7 anchors; LOOP cycles teach/recall/connect/quiz with S/M/W labels and coverage gates; WRAP produces Anki + recap + Flow Critique and offers meta-log capture/import at session boundaries. 【F:archive/legacy/v8.1_archive/Master_Index.md†L22-L115】
- **Troubleshooting:** Module 5 flags stuck signals, separates fatigue vs confusion, and escalates fixes (drop level, swap framework, micro-step, hook-first, concrete-first, partial teach-back). 【F:archive/legacy/v8.1_archive/Module_5_Troubleshooting.md†L1-L112】

### v8.1 — HUD + QA expansion (package not stored)
- **What’s documented:** HUD/menu with natural-language toggles, silent 8-item self-check with `qa?`, high-stakes triggers, storyframe integration across explanation levels, HookStyle controls, surface-then-structure pacing, note prompts, Flow Critique, and meta-log flow. 【F:archive/legacy/changelog.md†L61-L115】
- **Operational note:** Files removed/added listed in changelog; treat v8.1.1 artifacts as closest runnable package while preserving HUD + self-check + storyframe/HookStyle defaults from this entry. 【F:archive/legacy/changelog.md†L107-L115】

### v8.0 — Modular restructure (not stored)
- **What’s documented:** Prior modular SOP with triage and framework selector before the v8.1 overhaul; repository never stored the folder. Use v8.1+ for runnable assets. 【F:archive/legacy/changelog.md†L122-L128】

## v7.x Series

### Cross-version comparison (7.x)
- **Guardrails:** 7.4/7.3 enforce Source-Lock + Ask-Don’t-Guess + One-Small-Step; 7.2 adds Hook Integration and Personal Encoding steps to MAP/LOOP/WRAP; 7.1 is the baseline Source-Lock + One-Small-Step model. 【F:archive/legacy/V7.4.md†L9-L24】【F:archive/legacy/v7.3.md†L49-L117】【F:archive/legacy/Concise Study SOP 7.1.txt†L22-L196】【F:archive/legacy/Concise and Full Study SOP 7.1.txt†L1-L118】
- **Entry:** 7.4/7.3 prompt for course/topic/time/LoU, pull NotebookLM sources, and handle fresh vs resume flows; 7.2/7.1 run a shorter setup focused on context + source-lock before Smart Prime. 【F:archive/legacy/V7.4.md†L26-L142】【F:archive/legacy/v7.3.md†L49-L117】【F:archive/legacy/Concise Study SOP 7.1.txt†L22-L196】
- **Prime & Hooks:** 7.4 Smart Prime builds hierarchy + mechanism + NMMF/PES hooks with forced user ownership; 7.3 mirrors that with a checklist; 7.2 introduces NMMF + Hook Integration rules; 7.1 uses 3–7 anchors with 10yo + short explanations. 【F:archive/legacy/V7.4.md†L138-L236】【F:archive/legacy/v7.3.md†L1-L45】【F:archive/legacy/Concise Study SOP 7.1.txt†L22-L196】【F:archive/legacy/Concise and Full Study SOP 7.1.txt†L1-L118】
- **LOOP/Recall:** 7.4/7.3 enforce S/M/W labeling and interleaved recall with cases; 7.2 mandates hook reuse across teaching/recall/cards/recap; 7.1 cycles teach 2–4 anchors then brain dump/teach-back. 【F:archive/legacy/V7.4.md†L26-L71】【F:archive/legacy/v7.3.md†L1-L45】【F:archive/legacy/Concise Study SOP 7.1.txt†L22-L196】【F:archive/legacy/Concise and Full Study SOP 7.1.txt†L1-L118】
- **WRAP/Output:** 7.4/7.3 produce weak-point Anki + recap and save/resume; 7.2 ties recap/cards to user hooks; 7.1 connects/quizzes then outputs weak-point cards and recap/save steps. 【F:archive/legacy/V7.4.md†L26-L142】【F:archive/legacy/v7.3.md†L1-L45】【F:archive/legacy/Concise Study SOP 7.1.txt†L22-L196】【F:archive/legacy/Concise and Full Study SOP 7.1.txt†L1-L118】

### v7.4 — Single-Session SOP
- **Guardrails:** Source-Lock & Ask-Don’t-Guess plus One-Small-Step enforced at session start; non-PT knowledge allowed only with user permission and labeling. 【F:archive/legacy/V7.4.md†L9-L24】
- **Flight Plan:** MAP gathers course/topic/time/LoU, pulls NotebookLM materials, and runs Smart Prime (hierarchy + mechanism views, NMMF with PES hooks); LOOP teaches anchors via frameworks, runs active recall with S/M/W labels, connects/interleaves with cases, and quizzes for coverage; WRAP outputs weak-point Anki, recap sheet, and save/resume instructions. 【F:archive/legacy/V7.4.md†L26-L71】
- **Entry Modes:** Fresh vs Resume flows with scripted prompts for course/topic/time/LoU, NotebookLM source requests, recap handling, and resume options prioritizing weak points. 【F:archive/legacy/V7.4.md†L26-L142】
- **Smart Prime Details:** Dual hierarchy/mechanism maps, per-LO 10yo and teacher explanations, 3–7 anchors with hooks, NMMF binding, and PES forcing user-generated hooks reused later. 【F:archive/legacy/V7.4.md†L138-L236】

### v7.3 — Single-Session SOP
- **Checklist Overview:** MAP clarifies context/time/LoU, source-locks to NotebookLM materials and prior recaps, builds hierarchy + mechanism views, defines 3–7 anchors with NMMF and PES hooks; LOOP teaches anchor-by-anchor, runs brain dumps/teach-backs with S/M/W labels, connects/interleaves, and quizzes for full coverage; WRAP outputs weak-point Anki and reusable recap. 【F:archive/legacy/v7.3.md†L1-L45】
- **Entry & Governance:** Trigger phrases launch SOP with Source-Lock & Ask-Don’t-Guess, One-Small-Step, and verification gates; AI scripts context questions, source requests, recap ingestion, and resume choices before Smart Prime. 【F:archive/legacy/v7.3.md†L49-L117】

### v7.2 — Concise operational SOP
- **Version Delta:** Adds NMMF (Name→Meaning→Memory Hook→Function), Hook Integration Rule (reuse hooks in teaching/recall/cards/recap), and Personal Encoding Step (user edits/owns hooks) to the MAP→LOOP→WRAP model. 【F:archive/legacy/Concise Study SOP 7.1.txt†L1-L132】
- **Operational Flow:** Session setup clarifies course/topic/time/LoU and source-locks to project files; Smart Prime defines 3–7 anchors with 10yo + short explanations and mechanism-linked hooks; Hook reuse rules force consistent hooks across teaching, recall, cards, and recaps with user overrides. 【F:archive/legacy/Concise Study SOP 7.1.txt†L22-L196】

### v7.1 — Baseline MAP/LOOP/WRAP
- **Operational SOP:** Establishes MAP (context + framework choice + 3–7 anchors), LOOP (teach 2–4 anchors then brain dump/teach-back with corrections), and WRAP (connect/quiz + weak-point cards + recap/save) with Source-Lock and One-Small-Step guardrails. 【F:archive/legacy/Concise and Full Study SOP 7.1.txt†L1-L118】
- **Changelog Note:** Listed historically as the foundation for later versions. 【F:archive/legacy/changelog.md†L147-L155】
