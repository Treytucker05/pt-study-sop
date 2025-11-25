# PT Study SOP v8 — usage with ChatGPT Custom GPT

This repo is organized so you can drop the v8 package into a Custom GPT and keep it source-locked. Use the files below and follow the instructions to ensure the agent reads only what you provide and runs the correct flow.

## Files to upload to your Custom GPT
Upload these eight v8 files (from `releases/v8/PT_Study_SOP_v8/`):
1) `Runtime_Prompt.md` (the ready-to-run system/runtime prompt)
2) `Master_Index.md` (table of contents)
3) `Module_1_Core_Protocol.md`
4) `Module_2_Triage_Rules.md`
5) `Module_3_Framework_Selector.md`
6) `Module_4_Session_Recap_Template.md`
7) `Module_5_Troubleshooting.md`
8) `Module_6_Framework_Library.md`

Optional historical context (do not upload unless you need v7 references):
- `V7.4`
- `sop_v7_core.md`
- `methods_index.md`

## How to instruct the Custom GPT (Source-Lock)
When configuring the Custom GPT:
1) Set the knowledge base to ONLY the eight v8 files above.
2) In system instructions, include:
   - “Source-lock: read and cite only the uploaded v8 files. If needed info is missing, ask the user to supply it. Do not invent or use outside knowledge.”
   - “Follow `Runtime_Prompt.md` as the governing runtime instructions.”
   - “When running sessions, follow the order: Triage (Module_2) -> Core Protocol (Module_1) using frameworks (Module_3, Module_6) -> Troubleshooting (Module_5) -> Recap (Module_4).”
3) Add a short check at session start: “Confirm Source-Lock is active and list the available v8 files.”

## Running a session (what the GPT should do)
1) Triage: Use `Module_2_Triage_Rules.md` to pick mode and scope based on time/topic.
2) Core flow: Drive the MAP -> LOOP -> WRAP process from `Module_1_Core_Protocol.md`.
3) Frameworks: Pull prompts/frameworks from `Module_3_Framework_Selector.md` and `Module_6_Framework_Library.md` as needed.
4) Troubleshooting: If the user stalls or feels lost, use `Module_5_Troubleshooting.md`.
5) Recap: Generate the recap using `Module_4_Session_Recap_Template.md`.
6) Always cite the exact file/section used; if missing info, ask for it instead of guessing.

## Quick upload checklist
- Create a new Custom GPT.
- Upload the 8 v8 files listed above.
- Paste the Source-Lock instructions (bullet 2 in “How to instruct the Custom GPT”) into the system prompt.
- Start a session; the GPT should announce it is running PT Study SOP v8 and that Source-Lock is active.

## Tips
- Keep only v8 files in the knowledge base to avoid mixing old versions.
- If you update the repo, replace the uploaded files with the new versions and restate Source-Lock.
- For portability, you can also upload the zip (`releases/v8/PT_Study_SOP_v8.zip`) to another tool, but for Custom GPTs, use the extracted 8 files above.
