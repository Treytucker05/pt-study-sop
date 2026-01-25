# Module Dossier - Runtime Prompt
- Path: sop/gpt-knowledge/runtime-prompt.md
- Phase: Infrastructure / Runtime
- Last Updated: 2026-01-07

## 1. Operational Contract
- Purpose: Provide a session-level runtime prompt that enforces planning, Seed-Lock behavior, anatomy sequencing, and mode selection.
- Trigger(s): Start of each study session; when a fresh runtime context is needed.
- Required Inputs: Target, position, materials, source-lock, plan, 1-3 item prime, focus/energy, mode selection, resume state.
- Required Outputs: Plan of attack, prime results, selected mode, and a clear command surface for the session.
- Exit Criteria: Planning completed, prime completed, and mode selected before teaching begins.
- Failure Modes / Drift Risks: Quick Question path bypasses planning; Source-Lock/NotebookLM requirement is not explicit; command list omits /fade; Seed-Lock lacks explicit resonance check (KWIK).

## 2. Pedagogy Mapping
- Retrieval Practice: [PASS] - PRIME pre-test and Sprint mode require recall before teaching.
- Spacing/Interleaving: [PARTIAL] - Resume prompt exists but no explicit spacing schedule or interleaving cue.
- Cognitive Load: [PASS] - Planning and fixed anatomy order reduce extraneous load.
- Metacognition: [PASS] - Focus/energy rating and mode selection prompt self-assessment.
- Dual Coding / Visual: [PASS] - Visual-first landmarks and drawing commands reinforce spatial encoding.

## 3. Evidence Map
- Testing effect: Retrieval practice improves long-term retention (Roediger & Karpicke, 2006, Psychological Science). PDF: https://learninglab.psych.purdue.edu/downloads/2006/2006_Roediger_Karpicke_PsychSci.pdf
- Pretesting effect: Pretests with feedback and timing conditions can enhance later learning (Journal of Cognition, The Pretesting Effect: Exploring the Impact of Feedback and Final Test Timing). PDF: https://journalofcognition.org/articles/455/files/687f6aa6dcf5d.pdf

## 4. Improvement Candidates (Rabbit Holes Allowed)
- Add an explicit Source-Lock / NotebookLM Source Packet gate to align with gpt-instructions and reduce unverified answers.
- Clarify when the Quick Question path is allowed (e.g., only for short, source-backed questions) to prevent bypassing planning.
- Sync command list with hidden shortcuts (add /fade or remove the mention).

## 5. Promotion Candidates (MAX 3)
1. [Source-Lock Gate] Add a single sentence to the runtime prompt requiring a NotebookLM Source Packet before non-anatomy teaching.
2. [Quick Question Guard] Require a 1-line source citation when choosing Quick Question mode.

## 6. Guardrails (What Must Not Change)
- Planning before teaching (target, sources, plan, prime).
- Seed-Lock requirement (user-generated hooks).
- Anatomy Bone-First Attachment Loop and visual-first landmarks.
- Mode selection and command table as the primary interface.
