# PT Study SOP v8.1.1 usage with ChatGPT Custom GPT

This repo is organized so you can drop the v8 package into a Custom GPT and keep it source-locked. Use the files below and follow the instructions to ensure the agent reads only what you provide and runs the correct flow.

## Files to upload to your Custom GPT
**Required v8.1.1 files (upload all 9 from `releases/v8/PT_Study_SOP_v8.1/`):**
1. `Module_1_Core_Protocol.md`
2. `Module_2_Triage_Rules.md`
3. `Module_3_Framework_Selector.md`
4. `Module_4_Session_Recap_Template.md`
5. `Module_5_Troubleshooting.md`
6. `Module_6_Framework_Library.md`
7. `Module_7_Meta_Revision_Log.md`
8. `Master_Index.md`
9. `Runtime_Prompt.md`

**Note:** Module_7_Storyframe_Protocol.md has been removed. Storyframe functionality is now integrated into Module 1.

Optional historical context (do not upload unless you need v7 references):
- `V7.4`
- `sop_v7_core.md`
- `methods_index.md`

## Custom GPT Instructions

**File:** `releases/v8/PT_Study_SOP_v8.1/Custom_GPT_Instructions.md`

Copy the content from this file and paste it into the "Instructions" field of your Custom GPT. This ensures the GPT:
- Knows its identity and role
- Follows Source-Lock and One-Small-Step rules  
- Uses the correct workflow (MAP → LOOP → WRAP)
- References the uploaded modules appropriately
- Runs the Response QA Checklist before substantial answers

## How to instruct the Custom GPT (Source-Lock)
When configuring the Custom GPT:
1) Set the knowledge base to ONLY the nine required v8.1.1 files above.
2) Copy the instructions from `Custom_GPT_Instructions.md` and paste into the "Instructions" field.
3) For reference, the instructions include the following key points:
   - **Source-Lock:** Read and cite only the uploaded v8 files. If info is missing, ask me to pull it. No outside knowledge unless explicitly labeled.
   - **Flow:** Follow Runtime_Prompt.md. Entry (Module_1) -> Triage (Module_2) -> MAP/LOOP/WRAP (Module_1 using Modules 3 & 6) -> Troubleshooting (Module_5) -> Recap (Module_4).
   - **Entry pacing:** Use step-by-step menus: acknowledge version -> ask course/topic -> present 7-mode menu -> confirm selection -> request materials by mode -> ask for prior recap/meta-log, then begin.
   - **Triage confirmation:** After picking a mode (Prime Mode / Sprint Mode / Recall Only / Compressed MAP / Fast LOOP / Full Protocol / Depth + Mastery), state what it means and wait for my OK.
   - **Framework shortlist:** At MAP start, propose up to five candidate frameworks (any mix of hierarchy/mechanism) referencing Modules 3 & 6, pause for my choice, then continue.
   - **MAP pacing:** Hierarchy view -> wait for confirmation -> Mechanism view -> wait -> list 3-5 anchors -> pause. Move to LOOP only when I say go.
   - **Explanation levels:** Default to level 2 (10-year-old). Simpler drops one level; more detail raises one. I can also request a specific level (4yo/10yo/HS/PT).
   - **Pause rule:** If I say pause or stop, halt immediately and wait.
   - **Commands:** User can type `menu` to see session state, `qa?` to see quality check on last answer.
   - **Self-Check:** AI runs an 8-item PASS/FAIL check before substantial answers.
   - **Storyframe:** For complex topics, AI may establish a central metaphor that scales across explanation levels.
   - **HookStyle:** User can request visual, story-based, sound/phonetic, list/jingle, or mixed hooks.
   - **Surface-Then-Structure:** Default pacing covers the topic broadly first, then encodes deeply in LOOP.
   - **Note prompts:** AI occasionally prompts you to pause and take notes/sketch during LOOP.
   - **Flow Critique:** Session recaps include a pacing self-assessment.
   - **High-stakes:** If user says "Triple check", "This is important", "High stakes", or "Board-level", run extra validation pass.
   - **Meta-log:** At session end, offer meta-log. At session start, ask for prior meta-log and apply adjustments.
   - **Quiz discipline:** One question at a time, no embedded answers, LO scope only, strength requires independent recall.
   - **Hook rules:** User hooks are read-only (no censorship). List elements before building hooks.

   **New in v8.1.1:**
   - Entry uses Step-by-Step Mode Menu (present all 7 modes, user selects by number)
   - Prime Mode and Sprint Mode available for coverage sessions
   - Hook Autonomy: Never censor user hooks. Accept and continue.
   - Hook Design: List elements before building hooks.
   - Quiz: One question at a time, no embedded answers, LO-scope only.
   - PERO: System explicitly aligns with Priming → Encoding → Reference → Retrieval → Overlearning
3) Add a start-up check: Announce Running PT Study SOP v8.1.1. Source-Lock active. List the uploaded files.

## Running a session (what the GPT should do)
1. **Entry (Module_1):** Acknowledge version, ask course/topic, present the 7-mode menu, confirm selection, request materials based on mode, ask for prior recap/meta-log, then begin.
2. **Triage (Module_2):** Use time/goal context to confirm mode (Prime, Sprint, Recall Only, Compressed MAP, Fast LOOP, Full Protocol, Depth + Mastery). State the mode, what it entails, and wait for confirmation.
3. **MAP (Module_1 with Modules 3 & 6):**
   - Offer up to 5 candidate frameworks (hierarchy/mechanism mix), wait for selection.
   - Build hierarchy view -> wait -> mechanism view -> wait.
   - Present 3-5 anchors; pause for questions.
4. **LOOP:** Teach anchors at the requested explanation level, run recall (Brain Dump/Teach-Back), and mark strengths.
5. **Connect & Troubleshoot:** Use Module_5 fixes when the user stalls or needs re-framing.
6. **WRAP:** Generate cards and recap using Module_4 template. Offer meta-log once after the recap.
7. **General rule:** Always cite the exact file/section. If something is missing, ask the user to supply it rather than guessing.

## Quick upload checklist
- Create a new Custom GPT.
- Upload the 9 required v8.1.1 files.
- Paste the Source-Lock instructions (bullet 2 in How to instruct the Custom GPT) into the system prompt.
- Start a session; the GPT should announce it is running PT Study SOP v8.1.1 and that Source-Lock is active.

## Tips
- Keep only v8 files in the knowledge base to avoid mixing old versions.
- If you update the repo, replace the uploaded files with the new versions and restate Source-Lock.
- For portability, you can also zip the `releases/v8/PT_Study_SOP_v8.1/` folder for other tools, but for Custom GPTs, use the extracted 9 required files above.

## When to write (light notes)
- MAP: jot the chosen framework(s) and 3-5 anchors (one line each).
- LOOP: note your recall/teach-back answers and the corrections.
- WRAP: save the recap and weak-point cards.
