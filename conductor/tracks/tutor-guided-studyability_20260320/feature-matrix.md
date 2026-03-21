# Tutor Feature Matrix

Purpose: baseline map for guided studyability passes.

Status vocabulary:
- `landed`
- `partial`
- `missing`
- `drifted`

Source vocabulary:
- `canon`
- `planned`
- `discussed`

Required vocabulary:
- `required`
- `optional`
- `polish`

| ID | Stage | Feature | Source | Status | Required | Evidence | Notes |
|---|---|---|---|---|---|---|---|
| F-LA-001 | Launch | Workflow recents table with open and resume actions | canon | landed | required | `README.md`, `TutorWorkflowLaunchHub.tsx` | Core entry surface for ongoing work. |
| F-LA-002 | Launch | Delete stale workflows from the launch table | canon | landed | optional | `docs/root/TUTOR_TODO.md`, `TutorWorkflowLaunchHub.tsx`, `api_tutor_workflows.py` | Recently added; important for cleanup, not for studying itself. |
| F-LA-003 | Launch | Thin start/resume panel with readiness and recent sessions | canon | landed | required | `README.md`, `TutorStartPanel.tsx` | Still relevant when no workflow is open. |
| F-LA-004 | Launch | Brain-owned handoff into Tutor shell | canon | landed | required | `README.md`, `pages/tutor.tsx` | Should feel clean and context-correct. |
| F-LA-005 | Launch | Schedule-aware launch context | planned | partial | optional | `pages/tutor.tsx`, `README.md` | Exists in wiring, but not yet a smooth first-class study flow. |
| F-PR-001 | Priming | Setup focused on class plus materials in scope | canon | landed | required | `TutorWorkflowPrimingPanel.tsx`, `docs/root/TUTOR_TODO.md` | Current setup flow was simplified recently. |
| F-PR-002 | Priming | Source viewer for selected materials | canon | landed | required | `PrimingMaterialReader.tsx` | Must support actual study prep. |
| F-PR-003 | Priming | PRIME extraction for `Learning Objectives`, `Study Spine`, `Hierarchical Map`, `Summary`, `Terms` | canon | landed | required | `TutorWorkflowPrimingPanel.tsx`, `api_tutor_workflows.py` | Main artifact bundle. |
| F-PR-004 | Priming | Source-linked rerun and per-source previews | canon | landed | required | `TutorWorkflowPrimingPanel.tsx`, `docs/root/TUTOR_TODO.md` | Important for correcting one bad source without resetting everything. |
| F-PR-005 | Priming | Advanced chain and workflow context controls | canon | landed | optional | `TutorWorkflowPrimingPanel.tsx` | Present but visually demoted. |
| F-PR-006 | Priming | Tutor handoff notes and readiness | canon | landed | required | `TutorWorkflowPrimingPanel.tsx` | Closeout section before Tutor stage. |
| F-PR-007 | Priming | Full chain viewer and real per-method execution | discussed | missing | optional | recent Tutor discussion, current `TutorWorkflowPrimingPanel.tsx` | Current chain is still more label/prompt than true executor. |
| F-PR-008 | Priming | Studio tools and popout workflow inside Priming | discussed | missing | optional | recent Tutor discussion | Desired but not currently wired into Priming. |
| F-TU-001 | Tutor | Live chat/runtime workspace | canon | landed | required | `TutorChat.tsx`, `TutorWorkflowRuntimePanel.tsx` | Core live study surface. |
| F-TU-002 | Tutor | TEACH-first control-plane runtime | canon | partial | required | `README.md`, `api_tutor_turns.py`, `TutorTopBar.tsx` | Stage exists, but smooth learner-facing behavior still needs real testing. |
| F-TU-003 | Tutor | Visible stage state and workflow stepper | canon | landed | required | `TutorWorkflowStepper.tsx`, `TutorShell.tsx` | Must stay consistent through stage changes. |
| F-TU-004 | Tutor | Timer slices, block progression, and chain progress | canon | landed | required | `TutorWorkflowRuntimePanel.tsx`, `useTutorSession.ts` | Key runtime execution controls. |
| F-TU-005 | Tutor | Per-message save exact/editable and feedback capture | canon | landed | optional | `TutorChat.tsx`, workflow redesign/depth tracks | Runtime capture is present but needs usability validation. |
| F-TU-006 | Tutor | Learner-facing TEACH packet clarity | planned | partial | required | TEACH upgrade work, `api_tutor_turns.py`, `TutorTopBar.tsx` | Current repo says TEACH is first-class, but live clarity may still drift. |
| F-PO-001 | Polish | Mandatory review stage before publish | canon | landed | required | `README.md`, `TutorWorkflowPolishStudio.tsx` | Core workflow contract. |
| F-PO-002 | Polish | Polish workspace with captured notes, feedback, and memory capsule queues | canon | landed | required | `TutorWorkflowPolishStudio.tsx` | Main review/staging surface. |
| F-PO-003 | Polish | Polish Assist for summary, QA, rewrite, and card candidates | canon | landed | optional | workflow depth track, `TutorWorkflowPolishStudio.tsx` | Needs real usefulness validation. |
| F-PO-004 | Polish | Embedded workspace tools during review | planned | partial | optional | workflow redesign/depth tracks | Present in foundation form, may not feel fully integrated. |
| F-FS-001 | Final Sync | Final sync stage with publish closeout | canon | landed | required | `TutorWorkflowFinalSync.tsx`, `README.md` | Final workflow stage. |
| F-FS-002 | Final Sync | Publish approved notes to Obsidian | canon | landed | required | `TutorWorkflowFinalSync.tsx`, workflow redesign track | Key closeout behavior. |
| F-FS-003 | Final Sync | Publish card outputs to Anki path | canon | landed | optional | `TutorWorkflowFinalSync.tsx`, workflow redesign track | Not every session requires cards. |
| F-FS-004 | Final Sync | Durable publish results with retry-safe recovery | canon | landed | required | workflow redesign track, backend workflow APIs | Important for trust and recoverability. |
| F-FS-005 | Final Sync | Brain learner snapshot and workflow analytics closeout | canon | landed | optional | `BrainHome.tsx`, workflow analytics APIs | Downstream telemetry feature, not direct study blocker. |
| F-CR-001 | Cross-stage | Real smoothness across `Launch -> Priming -> Tutor -> Polish -> Final Sync` | planned | partial | required | staged workflow canon, prior stabilization loop | This is the main reason for the guided studyability loop. |
| F-CR-002 | Cross-stage | Support pages only when they block studying | canon | landed | optional | plan default, repo truth | Keep this loop Tutor-scoped unless a blocker forces expansion. |
