# PT Study SOP v8  usage with ChatGPT Custom GPT

This repo is organized so you can drop the v8 package into a Custom GPT and keep it source-locked. Use the files below and follow the instructions to ensure the agent reads only what you provide and runs the correct flow.

## Files to upload to your Custom GPT
**Required v8.1 files (upload all nine from `releases/v8/PT_Study_SOP_v8/`):**
1) `Module_1_Core_Protocol.md`
2) `Module_2_Triage_Rules.md`
3) `Module_3_Framework_Selector.md`
4) `Module_4_Session_Recap_Template.md`
5) `Module_5_Troubleshooting.md`
6) `Module_6_Framework_Library.md`
7) `Module_7_Storyframe_Protocol.md` (narrative/analogy mode)
8) `Master_Index.md` (table of contents)
9) `Runtime_Prompt.md` (the ready-to-run system/runtime prompt)

**Optional v8.1 file:**
- `Module_7_Meta_Revision_Log.md` (cross-session meta notes—upload only if you want to track pacing/flow adjustments across days)

Optional historical context (do not upload unless you need v7 references):
- `V7.4`
- `sop_v7_core.md`
- `methods_index.md`

## How to instruct the Custom GPT (Source-Lock)
When configuring the Custom GPT:
1) Set the knowledge base to ONLY the nine required v8.1 files above (add the optional Meta Revision Log only if you plan to use it).
2) In system instructions, include the following points (copy/paste or adapt):
   - **Source-Lock:** Read and cite only the uploaded v8 files. If info is missing, ask me to pull it. No outside knowledge unless explicitly labeled.
   - **Flow:** Follow Runtime_Prompt.md. Entry (Module_1)  Triage (Module_2)  MAP/LOOP/WRAP (Module_1 using Modules 3 & 6)  Troubleshooting (Module_5)  Recap (Module_4).
   - **Entry pacing:** Ask entry questions one at a time (course  time  Level of Understanding  Learning Objective(s)  prior recap). After each, restate the answer before asking the next. After LOs, request the exact NotebookLM excerpts needed.
   - **Triage confirmation:** After picking a mode (Recall Only / Compressed MAP / Fast LOOP / Full / Depth+Mastery), state what it means and wait for my OK.
   - **Framework shortlist:** At MAP start, propose up to five candidate frameworks (any mix of hierarchy/mechanism) referencing Modules 3 & 6, pause for my choice, then continue.
   - **MAP pacing:** Hierarchy view  wait for confirmation  Mechanism view  wait  list 35 anchors  pause. Move to LOOP only when I say go.
   - **Explanation levels:** Default to level 2 (10-year-old). Simpler drops one level; more detail raises one. I can also request a specific level (4yo/10yo/HS/PT).
   - **Pause rule:** If I say pause or stop, halt immediately and wait.
3) Add a start-up check: Announce Running PT Study SOP v8. Source-Lock active. List the uploaded files.

## Running a session (what the GPT should do)
1. **Entry (Module_1):** Collect the five entry items sequentially, restating each answer. After the LO, request the exact NotebookLM excerpts needed and wait until the user provides them (or confirms none exist).
2. **Triage (Module_2):** Use time + Level of Understanding to choose a mode. State the mode, what it entails, and wait for confirmation.
3. **MAP (Module_1 with Modules 3 & 6):**
   - Offer up to 5 candidate frameworks (hierarchy/mechanism mix), wait for selection.
   - Build hierarchy view  wait  mechanism view  wait.
   - Present 35 anchors; pause for questions.
4. **LOOP:** Teach anchors at the requested explanation level, run recall (Brain Dump/Teach-Back), and mark strengths.
5. **Connect & Troubleshoot:** Use Module_5 fixes when the user stalls or needs re-framing.
6. **WRAP:** Generate cards and recap using Module_4 template.
7. **General rule:** Always cite the exact file/section. If something is missing, ask the user to supply it rather than guessing.

## Quick upload checklist
- Create a new Custom GPT.
- Upload the 9 required v8.1 files (10 if you also want the Meta Revision Log for cross-session tracking).
- Paste the Source-Lock instructions (bullet 2 in How to instruct the Custom GPT) into the system prompt.
- Start a session; the GPT should announce it is running PT Study SOP v8 and that Source-Lock is active.

## Tips
- Keep only v8 files in the knowledge base to avoid mixing old versions.
- If you update the repo, replace the uploaded files with the new versions and restate Source-Lock.
- For portability, you can also upload the zip (`releases/v8/PT_Study_SOP_v8.zip`) to another tool, but for Custom GPTs, use the extracted 9 required files above (and add the Meta Revision Log only if you need it).

## When to write (light notes)
- MAP: jot the chosen framework(s) and 3-5 anchors (one line each).
- LOOP: note your recall/teach-back answers and the corrections.
- WRAP: save the recap and weak-point cards.
