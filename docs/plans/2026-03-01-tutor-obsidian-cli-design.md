# Tutor Obsidian CLI Integration — Design

**Date:** 2026-03-01
**Status:** Approved
**Author:** Trey + Claude

## Problem

The tutor LLM has no ability to interact with Obsidian. It can pull context *in* via `build_context()` but can't push anything *out* — no creating folders, writing notes, extracting LOs, or building concept maps. The existing `obsidian_client.py` is read-only (search, read, list) and uses the REST API, which is inferior to the new official Obsidian CLI (v1.12+).

Additionally, the tutor has no instruction file telling it what tools are available or how to request vault operations. Each session starts without scaffolding — no folder structure, no LO extraction, no concept map.

## Goals

1. Full Obsidian CRUD via official CLI (v1.12+) — replace REST API entirely
2. Tutor instruction file that teaches the LLM its available tools
3. Scaffolding phase that sets up vault structure before active studying
4. Hierarchical note template matching Trey's learning style
5. End-to-end session flow: wizard → scaffold → study → wrap-up

## Non-Goals

- Obsidian plugin development
- Mobile/headless support (CLI requires desktop app running)
- Calendar sync or scheduling

---

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    TUTOR SESSION                         │
│                                                          │
│  Wizard ──→ Scaffolder ──→ Active Study ──→ Wrap-up     │
│  (exists)   (NEW)          (exists)        (exists)      │
└─────┬───────────┬──────────────┬────────────────────────┘
      │           │              │
      ▼           ▼              ▼
┌──────────────────────────────────────┐
│         TUTOR ENGINE                  │
│                                       │
│  tutor_instructions.md  (NEW)         │
│  ├─ Role & personality                │
│  ├─ Available tools (artifact cmds)   │
│  └─ Output format expectations        │
│                                       │
│  build_context() injects:             │
│  ├─ materials (RAG - exists)          │
│  ├─ instructions (YAML - exists)      │
│  ├─ notes (CLI search - UPGRADED)     │
│  └─ vault_state (NEW)                 │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│       VAULT MODULE (NEW)              │
│       brain/obsidian_vault.py         │
│                                       │
│  CLI commands (primary):              │
│  create, read, append, prepend,       │
│  move, delete, search, property:set,  │
│  backlinks, files, folders, tags      │
│                                       │
│  Eval commands (advanced):            │
│  vault.process(), vault.createFolder, │
│  vault.modify(), metadataCache,       │
│  fileManager.processFrontMatter       │
└──────────────┬───────────────────────┘
               │
               ▼
┌──────────────────────────────────────┐
│    OBSIDIAN DESKTOP (v1.12+)          │
│    CLI via IPC · No auth needed       │
│                                       │
│    Vault: C:\Users\treyt\Desktop\     │
│           Treys School\               │
└──────────────────────────────────────┘
```

### Why CLI over REST API

| Factor | REST API | CLI |
|--------|----------|-----|
| Search quality | ~55% (text-based) | ~85% (index-aware) |
| Write support | Needs 5+ new methods | Built-in |
| Move/rename | No native support | Native |
| Templates | Manual content writing | Native (`template=` param) |
| Properties | Raw PATCH | Native (`property:set`) |
| Auth | Bearer token + SSL cert skip | None (IPC) |
| Maintenance | Community plugin | Official first-party |
| Surgical edits | PATCH by heading/block | `vault.process()` via eval |

---

## Component 1: Vault Module (`brain/obsidian_vault.py`)

Single class wrapping all CLI commands via `subprocess.run`.

### Methods

**CRUD:**
- `create_note(name, content, folder, template, silent=True)` — `obsidian create`
- `read_note(file)` — `obsidian read`
- `append_note(file, content)` — `obsidian append`
- `prepend_note(file, content)` — `obsidian prepend`
- `replace_content(file, new_content)` — `obsidian eval` → `vault.modify()`
- `delete_note(path, permanent=False)` — `obsidian delete`

**Surgical Edit (via eval):**
- `replace_section(file, heading, content)` — `vault.process()` with heading detection via `metadataCache`
- `process_note(file, js_transform_fn)` — raw `vault.process()` (internal only)
- `set_property(file, key, value)` — `obsidian property:set`
- `remove_property(file, key)` — `obsidian property:remove`
- `process_frontmatter(file, js_fn)` — `fileManager.processFrontMatter` via eval

**Organize:**
- `move_note(path, new_name, new_folder)` — `obsidian move`
- `create_folder(path)` — `obsidian eval` → `vault.createFolder()`
- `copy_note(file, new_path)` — `obsidian eval` → `vault.copy()`

**Search & Discovery:**
- `search(query, limit=10)` — `obsidian search`
- `list_files(folder, format="json")` — `obsidian files`
- `list_folders()` — `obsidian folders`
- `get_file_info(file)` — `obsidian file`
- `get_backlinks(file)` — `obsidian backlinks`
- `get_links(file)` — `obsidian links`
- `get_orphans()` — `obsidian orphans`
- `get_unresolved()` — `obsidian unresolved`

**Metadata:**
- `get_tags(sort="count")` — `obsidian tags`
- `get_headings(file)` — `obsidian eval` → `metadataCache.getFileCache().headings`
- `get_tasks(filter)` — `obsidian tasks`

**Health:**
- `is_available()` — `obsidian version`
- `get_version()` — `obsidian version`

### Internal Design

- `_run(args, timeout=10)` — all CLI commands go through one method. JSON output parsing, error logging, graceful fallback.
- `_eval(code, timeout=15)` — all `obsidian eval` calls through one method. Wraps JS, parses output.
- Constructor takes `vault_name` — prepends `vault="Name"` to every command.
- `silent=True` default — don't open files in Obsidian UI.
- JSON output — all discovery/search commands request `format=json`.
- Error handling — non-zero exit → log warning, return graceful default (empty string/list). Never raises.

---

## Component 2: Tutor Instructions (`brain/tutor_instructions.md`)

Injected into every tutor LLM call as part of the system prompt. Three sections:

### A. Role & Personality
- PT study tutor for Trey
- Short, interactive, concise responses
- Top-down narrative style: big picture first, then layers
- Jim Kwik phonetic mnemonics, hand-drawn map prompts, brain dumps
- Multiple angles until "it clicks"

### B. Available Tools (Artifact Commands)

The LLM emits structured artifact blocks. The backend intercepts and executes via `ObsidianVault`.

Artifact command format:
```
:::vault:<operation>
key: value
key: value
:::
```

Supported operations:
- `:::vault:create` — name, folder, template, content
- `:::vault:append` — file, content
- `:::vault:prepend` — file, content
- `:::vault:replace-section` — file, heading, content
- `:::vault:property` — file, key, value
- `:::vault:search` — query, limit
- `:::vault:move` — path, name, folder

### C. Output Expectations
- Always use `[[wiki links]]` for cross-note terms
- Learning objectives as `- [ ]` checkboxes
- Hierarchical outline format for notes
- Concept maps in a structured linkable format

---

## Component 3: Scaffolding Flow

Runs between wizard completion and active studying. Creates Obsidian vault structure for a construct.

### Vault Structure Produced

```
Treys School/
└── <Course>/
    └── <Construct>/
        ├── _Index.md          ← Construct overview + LOs + concept map
        ├── <Sub-topic A>/
        │   ├── Lecture 1.md
        │   └── Lecture 2.md
        └── <Sub-topic B>/
            └── Lecture 3.md
```

### _Index.md Contents

- Frontmatter: course, construct, status, created, chain
- Concept map: wiki-linked overview of all sub-topics and their relationships
- Learning objectives: checkboxes extracted from materials, wiki-linked
- Sub-topic links: list of all lecture notes
- Session log: tutor appends session summaries here

### Scaffolding Steps

1. Wizard completes → passes course, topic, materials, chain_id
2. Check: does `_Index.md` exist for this construct?
   - YES → read it, inject as context, skip to active study
   - NO → continue to step 3
3. LLM reads materials via RAG, extracts: folder structure, LOs, key terms
4. LLM emits `:::vault:*:::` artifact commands to create structure
5. Backend executes via `ObsidianVault`
6. LLM presents structure to user: "Does this look right?"
7. User adjusts if needed → scaffold locked → active studying begins

### Design Decision

Scaffolding is a **core feature with chain hooks**:
- Scaffold check (step 2) happens every session — core
- Initial scaffold creation (steps 3-5) triggered by startup chains but uses core vault tools
- Non-startup chains skip creation but still read existing scaffold for context

---

## Component 4: Note Template

Obsidian template applied when creating lecture/session notes.

**File location:** `Templates/Study Session.md` in Obsidian vault (native template support via `obsidian create template="Study Session"`)

### Template Sections

| Section | Purpose | Maps to Learning Style |
|---------|---------|----------------------|
| Learning Objectives | LO checkboxes from materials/construct | Structured goals |
| Top-Down Overview | ELI4 big-picture narrative | Big picture first |
| Key Concepts | Hierarchical outline with wiki links | Top-down layered build |
| Connections | Cross-topic links, analogies | Multiple angles |
| Recall Check | Free recall brain dump zone | Post-learning brain dump |
| Gaps & Questions | What didn't click | Gap identification |
| Session Notes | Tutor appends summaries/artifacts | Session continuity |

### Frontmatter Properties

- `course`, `construct`, `topic` — hierarchy
- `status` — not-started / in-progress / reviewed / mastered
- `session_date` — auto-filled
- `chain` — which chain was used
- `tutor_session_id` — links to Brain session record

---

## Component 5: Session Start Protocol

End-to-end flow:

1. **Wizard** (exists) — pick course, topic, materials, chain
2. **Scaffold Check** (new, core) — does `_Index.md` exist?
3. **Scaffold Build** (new, chain-triggered) — create structure if needed
4. **Context Injection** (updated `build_context()`) — materials + instructions + notes + vault_state + tutor_instructions
5. **Active Study** (exists, enhanced) — chain executes with vault artifact commands
6. **Wrap-up** (exists, enhanced) — append session summary to `_Index.md`, update properties

### Code Changes

**Modified files:**
- `brain/tutor_context.py` — add `vault_state` to `build_context()`, swap `ObsidianClient` → `ObsidianVault`
- `brain/dashboard/api_tutor.py` — parse `:::vault:*:::` artifact commands, route to `ObsidianVault`
- `brain/tutor_engine.py` — inject `tutor_instructions.md` into system prompt

**New files:**
- `brain/obsidian_vault.py` (~200 lines) — CLI wrapper
- `brain/tutor_instructions.md` (~100 lines) — LLM tool awareness
- `brain/tests/test_obsidian_vault.py` — tests for CLI wrapper

**Deleted files:**
- `brain/obsidian_client.py` (170 lines) — replaced by CLI wrapper
- `brain/tests/test_obsidian_client.py` (10 tests) — replaced

**Vault files (created in Obsidian):**
- `Templates/Study Session.md` — note template

---

## Prerequisites

- Obsidian v1.12+ installed with CLI enabled (Settings → General → Command line interface)
- Catalyst license ($25 one-time, will be free later)
- `obsidian` command available on PATH
- Obsidian desktop running when tutor is used

---

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| CLI is 3 weeks old — could have bugs | Wrap all calls in try/except, graceful degradation |
| Obsidian not running → all vault ops fail | `is_available()` health check at session start, clear error message |
| `eval` with complex JS could be fragile | Keep eval usage minimal — only for `process`, `createFolder`, `metadataCache` |
| Artifact command parsing could miss edge cases | Strict regex parsing, log unparsed blocks for debugging |
| Large vault → slow CLI responses | Timeout per-call, async where possible |

---

## Open Questions (Resolved During Brainstorm)

1. ~~REST API vs CLI vs Headless?~~ → **CLI-only**
2. ~~Chain vs core for scaffolding?~~ → **Core with chain hooks**
3. ~~Note template format?~~ → **Hierarchical outline**
4. ~~Keep REST API for PATCH?~~ → **No, eval covers it**
