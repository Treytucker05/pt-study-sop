# vault-redesign: Issues & Gotchas

## [2026-03-02] Session Start

### Pre-existing Issues (Known, Do Not Report as New)
- api_tutor.py has ~9 LSP type errors (baseline, pre-existing)
- tutor_rag.py has ~7 LSP attribute errors (pre-existing)
- These do NOT block our work

### Worktree
- Using main worktree: C:/pt-study-sop (HEAD = main branch)
- No separate branch needed for this work

### File Conflict Risk
- T1, T3, T5 all modify api_tutor.py — serialize or bundle
- T2 (frontend), T4 (obsidian_vault.py), T6 (vault_courses.yaml) are fully independent

### Frontend Build
- ALWAYS `cd dashboard_rebuild && npm run build` after frontend changes
- NEVER use npm run dev
- Build outputs to brain/static/dist/

### Obsidian CLI
- Requires Obsidian Desktop to be running
- IPC-based, ~50-200ms per call
- `is_available()` exists in obsidian_vault.py
- T4 adds retry with backoff
