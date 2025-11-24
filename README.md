# PT Study SOP – v7.x Core

This repo stores my **PT Study System** so I never lose it between semesters or tool changes.

- **Chat engine:** ChatGPT (ChatLLM Teams)  
- **Content memory:** NotebookLM (slides, notes, recaps)  
- **Spaced recall:** Anki  
- **Source of truth for SOP:** This repo

## Files

- `sop_v7_core.md`  
  The current **Single-Session Script**, **Framework Library**, and **Storage/Resuming rules** (v7.x).

- `methods_index.md` *(planned)*  
  Index of optional methods (PIB, SLP, MFRST, CCC-AI, Systems Back-Track, etc.) and how they plug into v7.x.

- `changelog.md`  
  Human-readable summary of what changed between SOP versions.

- `old_versions/` *(optional)*  
  Archive of older SOPs and improvement plans (e.g., v6.8, v6.5 improvement plan).

## High-Level Idea

- Use **ChatGPT** to run structured, big-picture-first study sessions.  
- Use **NotebookLM** to store:  
  - Course slides/notes  
  - Recap blocks from each study session  
- Use **Anki** for spaced retrieval.  
- Use this **GitHub repo** to version-control the SOP itself.

When I change how I study, I update `sop_v7_core.md` and log it in `changelog.md`.

## Quickstart for a Study Session

1. Open `sop_v7_core.md` in this repo.  
2. Open ChatGPT (ChatLLM) and NotebookLM.  
3. Follow the **Single-Session Script**:  
   - Tell ChatGPT the course/module/topic.  
   - Fetch LOs + outline + summary from NotebookLM when prompted.  
   - Let ChatGPT build **Hierarchy + Mechanism** views.  
   - Do big-picture recall before any deep dive.  
   - End with:  
     - Anki cards,  
     - A recap block saved back into NotebookLM / OneNote.

The details are all in `sop_v7_core.md`.
