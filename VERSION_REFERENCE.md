# Study SOP Version Reference (Detailed)

## v8.x Series

### v8.6 — Active Architect (current)
- **Persona & Guardrails:** Active Architect role that enforces priming-first, Seed-Lock with the Gated Platter fallback, and a Phonetic Override before defining hard terms; operates in tight user-led loops and defers carding to WRAP. 【F:current/v8.6/Custom_GPT_Instructions.md†L1-L26】
- **Startup Script:** State/motivation check → scope confirmation → mode pick (Diagnostic Sprint vs Core) → mandatory System Scan priming; fallbacks cover missing topic (ask for syllabus/notes), missing Seed (supply Raw L1 metaphor the user must edit), or panic (force Sprint). Commands: `menu`, `lock`, `mold`, `wrap`. 【F:current/v8.6/Runtime_Prompt.md†L1-L23】
- **Core Loop (MAP → LOOP):** Prime with H-series bucket listing and explicit “don’t memorize—bucket” message; Encode one bucket at a time with function-first framing and Phonetic Override; Gate demands a user Seed or uses Gated Platter; Build escalates L1→L4 with a mandatory Level 2 teach-back gate before Level 4; loops advance only on user-ready cues. 【F:current/v8.6/modules/Module_1_Core_Protocol.md†L1-L41】
- **Modes:** Diagnostic Sprint runs fail-first testing that only teaches on a miss and forces a phonetic hook before retries; Core Mode follows Prime→Encode→Gate→Build; Drill Mode rebuilds weak buckets with user examples/hooks. 【F:current/v8.6/modules/Module_2_Modes.md†L1-L21】
- **Framework Library:** Quick cues for H1/H2 priming and M2/M6/M8/Y1 encoding, with global Function→Structure override and opt-in H2; pedagogy levels L1–L4 and phonetic bridge guidance. 【F:current/v8.6/modules/Module_6_Framework_Library.md†L1-L48】
- **WRAP/Recap:** Operator script reviews locked anchors with user hooks, lets the user select which items become Anki cards, co-drafts Q/A around the user hooks, and only generates/export cards in WRAP. 【F:current/v8.6/modules/Module_4_Recap_Engine.md†L3-L25】
- **Example Flows:** Includes dialogues for enforcing Gated Platter, fail-first Sprint, a heart Core walkthrough, and a ready/bucket/mold/wrap command cheat sheet. 【F:current/v8.6/modules/Module_5_Example_Flows.md†L1-L49】

### v8.5.1 — Spotter Prime (archive)
- **Persona & Guardrails:** Spotter/Molder identity—user supplies all seeds; Seed-Lock forbids AI-generated hooks; phonetic bridge used on struggles; one-step pacing and source discipline. 【F:archive/legacy/v8.5.1_Spotter_Prime/Custom_GPT_Instructions.md†L1-L24】
- **Startup & Runtime:** State check plus Seed commitment before any teaching; runtime rules default to M2 trigger→mechanism framing, zero hints, mandatory molding questions on struggle, phonetic prompts, and commands `menu/lock/mold`. 【F:archive/legacy/v8.5.1_Spotter_Prime/Runtime_Prompt.md†L1-L19】
- **Core Protocol:** MAP uses M2 to frame function-first blueprints; LOOP restates seed, locks until user affirms, troubleshoots with phonetic or molding questions, layers minimal scaffolding, applies zero-hint validation, then iterates; wrap recaps user-confirmed anchors. 【F:archive/legacy/v8.5.1_Spotter_Prime/Module_1_Core_Protocol.md†L1-L28】
- **Frameworks:** Function→Structure override with opt-in H2; defaults to M2 and Y1 with access to H1/H2, M6, M8; phonetic bridge as a required pedagogical tool. 【F:archive/legacy/v8.5.1_Spotter_Prime/Module_6_Framework_Library.md†L1-L22】

### v8.5.1 — pre–safe-deploy
- **Persona & Guardrails:** Spotter posture with explicit readiness check, Seed-Lock (polish only), phonetic bridge, and zero-hint validation; single-thought output pacing. 【F:archive/legacy/v8.5.1_pre_safe_deploy/Custom_GPT_Instructions.md†L3-L22】
- **Core Protocol:** Entry confirms state and seed commitment; MAP defaults to M2 with function-before-structure, user seed capture; LOOP locks until user seed, troubleshoots via phonetic or molding questions, builds onto seed, zero-hint verifies then molds failures; WRAP recaps confirmed anchors. 【F:archive/legacy/v8.5.1_pre_safe_deploy/Module_1_Core_Protocol.md†L1-L34】
- **Frameworks:** Global function-before-structure rule with M2 default; Y1 alternative; opt-in H2 “Traditionalist” only on explicit request; M6/M8 for safety/triage and molding prompts to tie function back to structure. 【F:archive/legacy/v8.5.1_pre_safe_deploy/Module_6_Framework_Library.md†L1-L24】

### v8.4 — Tutor Edition (Neuro-Edition)
- **Prime Directives:** Always run SOP v8.4 with question-first tutoring, Safety Override (never stall, default to safest action), strict one-step output, high-energy tone, source-lock, and a neuro-learning startup check before topic requests. 【F:archive/legacy/v8.4_Tutor_Edition/Custom_GPT_Instructions.md†L1-L36】
- **Core Protocol:** MAP proposes frameworks (Y1/M2/H2) and supplies an immediate Level 1 metaphor, then co-validates anchors before LOOP; LOOP delivers Level 2 teach, requests user hook/teamwork, escalates to Level 4 PT detail, validates with 50/50 teach-back vs quiz, then WRAPs with storyframe + Anki. 【F:archive/legacy/v8.4_Tutor_Edition/Module_1_Core_Protocol.md†L1-L29】
- **Triage Modes:** Sprint enforces Word→Cue→Meaning with hook-first constraint and MC/keyword validation; Core uses Silver Platter MAP then Level 2→user hook→Level 4 plus 50/50 validation; Drill is pure testing with Anti-Polish, mixing explain-why and solve-this and outputting weak-point lists. Switching favors Sprint when urgent, Core for depth, Drill when user brings notes. 【F:archive/legacy/v8.4_Tutor_Edition/Module_2_Triage_Rules.md†L1-L37】
- **Framework Selection:** Analyzes topic type to propose two codes (H-series, M-series, or Y-series), defaults to Y1/M2 when uncertain, and gives quick hits by domain (anatomy H2, physiology M6, rehab M3, diagnosis M8). 【F:archive/legacy/v8.4_Tutor_Edition/Module_3_Framework_Selector.md†L1-L27】
- **Framework Library:** Full H1–H8, M1–M8, and Y1–Y5 catalogue with L1–L4 pedagogy and storyframe guidance, defaulting to Y1 or M2 when unsure. 【F:archive/legacy/v8.4_Tutor_Edition/Module_6_Framework_Library.md†L1-L37】

### v8.3 — High-Speed refactor (changelog-only)
- **Release Notes:** High-Speed refactor removing Modules 5 & 7, consolidating triage into Sprint/Core/Drill, adding Safety Override, and adopting Silver Platter MAP; listed as fully supported but package not stored in repo. 【F:archive/legacy/changelog.md†L9-L18】

### v8.2 — Renamed to v8.3 (changelog-only)
- **Release Notes:** Same High-Speed refactor (Safety Override, Silver Platter MAP, Sprint/Core/Drill) noted on release day; version was renamed to v8.3. 【F:archive/legacy/changelog.md†L21-L29】

### v8.1.1 — Prime/Sprint menus
- **Changelog Highlights:** Introduces Prime Mode for pure priming, Sprint Mode, stepwise entry menus, hook autonomy/design rules, quiz delivery discipline, and PERO alignment with coverage/retrieval gates; notes file modifications across the package. 【F:archive/legacy/changelog.md†L33-L59】

### v8.1 — HUD + QA expansion (package not stored)
- **Changelog Highlights:** Adds session HUD/menu with natural-language toggles, silent 8-item self-check (`qa?`), high-stakes triggers, storyframe integration, hook style control, surface-then-structure pacing, note prompts, flow critique, and meta-log flow. 【F:archive/legacy/changelog.md†L61-L115】

### v8.0 — Modular restructure (not stored)
- **Changelog Highlight:** Cited as prior modular SOP with triage and framework selector before v8.1 overhaul; package absent from repo. 【F:archive/legacy/changelog.md†L122-L128】

## v7.x Series

### v7.4 — Single-Session SOP
- **Guardrails:** Source-Lock & Ask-Don’t-Guess plus One-Small-Step enforced at session start; non-PT knowledge requires user permission and labeling. 【F:archive/legacy/V7.4.md†L10-L26】
- **Flight Plan:** MAP handles context/time/LoU, source intake, and Smart Prime (hierarchy + mechanism views, NMMF with PES hooks); LOOP teaches anchors with frameworks, runs active recall with S/M/W labels, connects/interleaves with cases, and quizzes for coverage; WRAP outputs weak-point Anki, recap sheet, and save/resume instructions. 【F:archive/legacy/V7.4.md†L28-L71】
- **Entry Modes:** Fresh vs Resume flows with scripted prompts for course/topic/time/LoU, NotebookLM source requests, recap handling, and resume options prioritizing weak points. 【F:archive/legacy/V7.4.md†L73-L142】
- **Smart Prime Details:** Dual hierarchy/mechanism maps, per-LO 10yo and teacher explanations, 3–7 anchors with hooks, NMMF binding, and PES to force user-generated hooks reused later. 【F:archive/legacy/V7.4.md†L144-L236】

### v7.3 — Single-Session SOP
- **Checklist Overview:** MAP clarifies context/time/LoU, source-locks to NotebookLM materials and prior recaps, builds hierarchy+mechanism views, defines 3–7 anchors with NMMF and PES hooks; LOOP teaches anchor-by-anchor, runs brain dumps/teach-backs with S/M/W labels, connects/interleaves, and quizzes for full coverage; WRAP outputs weak-point Anki and reusable recap. 【F:archive/legacy/v7.3.md†L1-L40】
- **Entry & Governance:** Trigger phrases launch SOP with Source-Lock & Ask-Don’t-Guess, One-Small-Step, and verification gates; AI scripts context questions, source requests, recap ingestion, and resume choices before Smart Prime. 【F:archive/legacy/v7.3.md†L42-L100】

### v7.2 — Concise operational SOP
- **Version Delta:** Adds NMMF (Name→Meaning→Memory Hook→Function), Hook Integration Rule (reuse hooks in teaching/recall/cards/recap), and Personal Encoding Step (user edits/owns hooks) to the MAP→LOOP→WRAP model. 【F:archive/legacy/Concise Study SOP 7.1.txt†L1-L76】
- **Operational Flow:** Session setup clarifies course/topic/time/LoU and source-locks to project files; Smart Prime defines 3–7 anchors using function/structure or mechanism frameworks, supplies 10yo and short explanations plus mechanism-linked hooks; Hook reuse rules force consistent hooks across teaching, recall, cards, and recaps with user overrides. 【F:archive/legacy/Concise Study SOP 7.1.txt†L29-L132】

### v7.1 — Baseline MAP/LOOP/WRAP (changelog)
- **Changelog Note:** Establishes MAP + LOOP + WRAP with active recall as the foundational structure for later versions; details recorded historically in changelog. 【F:archive/legacy/changelog.md†L147-L155】
