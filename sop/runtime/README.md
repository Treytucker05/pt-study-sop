# CustomGPT Setup (v9.5)

Three things to paste/upload into your Custom GPT. All files are in this directory.
Canonical runtime stage model is CP-MSS v1.0 (`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`).

## 1. Custom Instructions
**File:** `custom_instructions.md`
**Where:** CustomGPT → Configure → Instructions field
**What:** All behavioral rules, gates, pacing, phases.

## 2. Runtime Prompt
**File:** `runtime_prompt.md`
**Where:** Paste as the **first user message** when starting a session.
**What:** Session-level config — planning phase, entry questions, commands, wrap format.

## 3. Knowledge Files
**Folder:** `knowledge_upload/`
**Where:** CustomGPT → Configure → Knowledge → Upload (in order)

| # | File | Content |
|---|------|---------|
| 1 | `00_INDEX_AND_RULES.md` | Core rules + NotebookLM bridge |
| 2 | `01_MODULES_M0-M6.md` | Session flow (M0-M6) + modes |
| 3 | `02_FRAMEWORKS.md` | Control-plane stage framework + KWIK + H/M/Y/Levels (legacy term mapping included where needed) |
| 4 | `03_ENGINES.md` | Anatomy Engine + Concept Engine |
| 5 | `04_LOGGING_AND_TEMPLATES.md` | Logging schema + templates |
| 6 | `05_EXAMPLES_MINI.md` | Command reference + examples |

## Rebuild

If you edit any `sop/library/` file, regenerate everything:

```bash
python sop/tools/build_runtime_bundle.py
```

Source of truth: `sop/library/`. These runtime files are generated artifacts.
