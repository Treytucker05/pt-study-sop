# Tutor Page — SOP Explorer (Dashboard Spec) v1.0

**Purpose:** Repurpose the Dashboard **Tutor** page into a structured, read-only **SOP Explorer** so you and Scholar can browse the SOP easily and reference it with deep links.

This matches current workflow: tutoring happens in **Custom GPT**, not in the dashboard.

---

## 1. Goals

1. Show a **structured breakdown** of SOP content (modules/engines/frameworks/templates/workload/rules/examples/evidence).
2. Show the **runtime bundle** (what the Custom GPT actually uses).
3. Show the **production GPT bundle** (packaged mirror) for reference.
4. Show **SOP-adjacent tutor docs** (prompts/instructions/schemas).
5. Enable **Scholar ↔ SOP linking** with stable deep links + SOPRef objects.
6. Ensure security: **no arbitrary file reads** via API.

---

## 2. Non-goals (v1)

- Editing SOP files from the dashboard UI
- Running tutoring in the dashboard UI
- Automatically rebuilding runtime bundles from the dashboard UI

---

## 3. Source-of-truth and data model

### 3.1 Canonical index file (manifest)
Add: `sop/sop_index.v1.json`

The Tutor page is generated from this index. The backend serves it at:

- `GET /api/sop/index`

### 3.2 Hard rule (security + correctness)
The backend must only serve file content if the file path exists in the manifest.

- No directory browsing.
- No “any file under sop/”.
- Only allowlisted paths.

### 3.3 Item types
Each item includes:
- `id` (stable)
- `title` (UI label)
- `path` (repo-relative, `/` separators)
- `type` (`md | json | txt | file | dir`)
- `tags` (for filtering later)

---

## 4. SOPRef linking contract (Scholar → Tutor page)

Scholar proposals/questions can reference SOP sections using:

```json
{
  "path": "sop/src/modules/M3-encode.md",
  "anchor": "Encoding Checklist",
  "label": "M3 Encode → Encoding Checklist"
}
```

Tutor page supports deep links:

- `/tutor?path=<repo-relative-path>`
- optional `#<heading>` anchor

Example:
- `/tutor?path=sop/src/modules/M3-encode.md#Encoding%20Checklist`

---

## 5. Backend API (Option A: Flask serves files)

### 5.1 Endpoints

#### `GET /api/sop/index`
Returns the manifest JSON (`sop/sop_index.v1.json`).

#### `GET /api/sop/file?path=<repo-relative-path>`
Returns allowlisted content only:

```json
{
  "path": "sop/src/modules/M3-encode.md",
  "content_type": "text/markdown",
  "content": "..."
}
```

### 5.2 Required security checks
Reject any request where:
- `path` is not in allowlist derived from manifest
- `path` contains `..`
- `path` is absolute
- `path` contains `\` (Windows backslash)

Optional hardening:
- reject files above a size cap (2–5MB)
- return 404 for non-allowlisted paths (to avoid leaking that a file exists)

---

## 6. Frontend UI requirements (Tutor page)

### 6.1 Layout
- **Left panel:** navigation tree (Group → Section → Item)
- **Main panel:** markdown viewer (render headings, lists, code blocks, tables)
- **Top controls:** Copy buttons

### 6.2 Viewer controls
- Copy content
- Copy deep link
- Copy SOPRef

### 6.3 Behavior
- Default open: `default_group` from the manifest (runtime).
- If URL includes `?path=...`, auto-open that file.
- If URL includes `#Anchor`, scroll after markdown renders.

---

## 7. SOP index manifest starter (drop-in)

Create `sop/sop_index.v1.json` using the following starter template and adjust as needed.

```json
{
  "version": "sop-index-v1",
  "default_group": "runtime",
  "groups": [
    {
      "id": "runtime",
      "title": "Runtime bundle (what Tutor actually uses)",
      "root_hint": "sop/runtime/",
      "sections": [
        {
          "id": "runtime_manifest",
          "title": "Manifest & deployment",
          "items": [
            { "id": "runtime_manifest_md", "title": "manifest.md", "path": "sop/runtime/manifest.md", "type": "md", "tags": ["runtime"] },
            { "id": "runtime_deployment_checklist", "title": "deployment_checklist.md", "path": "sop/runtime/deployment_checklist.md", "type": "md", "tags": ["runtime"] }
          ]
        },
        {
          "id": "runtime_instructions",
          "title": "Runtime instructions",
          "items": [
            { "id": "runtime_prompt", "title": "runtime_prompt.md", "path": "sop/runtime/runtime_prompt.md", "type": "md", "tags": ["runtime", "prompt"] },
            { "id": "runtime_custom_instructions", "title": "custom_instructions.md", "path": "sop/runtime/custom_instructions.md", "type": "md", "tags": ["runtime", "instructions"] }
          ]
        },
        {
          "id": "runtime_knowledge_upload",
          "title": "Knowledge upload bundle",
          "items": [
            { "id": "ku_00", "title": "00_INDEX_AND_RULES.md", "path": "sop/runtime/knowledge_upload/00_INDEX_AND_RULES.md", "type": "md", "tags": ["runtime"] },
            { "id": "ku_01", "title": "01_MODULES_M0-M6.md", "path": "sop/runtime/knowledge_upload/01_MODULES_M0-M6.md", "type": "md", "tags": ["runtime", "modules"] },
            { "id": "ku_02", "title": "02_FRAMEWORKS.md", "path": "sop/runtime/knowledge_upload/02_FRAMEWORKS.md", "type": "md", "tags": ["runtime", "frameworks"] },
            { "id": "ku_03", "title": "03_ENGINES.md", "path": "sop/runtime/knowledge_upload/03_ENGINES.md", "type": "md", "tags": ["runtime", "engines"] },
            { "id": "ku_04", "title": "04_LOGGING_AND_TEMPLATES.md", "path": "sop/runtime/knowledge_upload/04_LOGGING_AND_TEMPLATES.md", "type": "md", "tags": ["runtime", "templates"] },
            { "id": "ku_05", "title": "05_EXAMPLES_MINI.md", "path": "sop/runtime/knowledge_upload/05_EXAMPLES_MINI.md", "type": "md", "tags": ["runtime", "examples"] }
          ]
        }
      ]
    },

    {
      "id": "canonical",
      "title": "Canonical SOP (authoritative content)",
      "root_hint": "sop/src/",
      "sections": [
        {
          "id": "modules",
          "title": "Modules (M0–M6)",
          "items": [
            { "id": "m0", "title": "M0 Planning", "path": "sop/src/modules/M0-planning.md", "type": "md", "tags": ["canonical", "module"] },
            { "id": "m1", "title": "M1 Entry", "path": "sop/src/modules/M1-entry.md", "type": "md", "tags": ["canonical", "module"] },
            { "id": "m2", "title": "M2 Prime", "path": "sop/src/modules/M2-prime.md", "type": "md", "tags": ["canonical", "module"] },
            { "id": "m3", "title": "M3 Encode", "path": "sop/src/modules/M3-encode.md", "type": "md", "tags": ["canonical", "module"] },
            { "id": "m4", "title": "M4 Build", "path": "sop/src/modules/M4-build.md", "type": "md", "tags": ["canonical", "module"] },
            { "id": "m5", "title": "M5 Modes", "path": "sop/src/modules/M5-modes.md", "type": "md", "tags": ["canonical", "module"] },
            { "id": "m6", "title": "M6 Wrap", "path": "sop/src/modules/M6-wrap.md", "type": "md", "tags": ["canonical", "module"] }
          ],
          "mirrors": [{ "path": "sop/runtime/knowledge_upload/01_MODULES_M0-M6.md" }]
        },
        {
          "id": "engines",
          "title": "Engines",
          "items": [
            { "id": "anatomy_engine", "title": "Anatomy Engine", "path": "sop/src/engines/anatomy-engine.md", "type": "md", "tags": ["canonical", "engine"] },
            { "id": "concept_engine", "title": "Concept Engine", "path": "sop/src/engines/concept-engine.md", "type": "md", "tags": ["canonical", "engine"] }
          ],
          "mirrors": [{ "path": "sop/runtime/knowledge_upload/03_ENGINES.md" }]
        },
        {
          "id": "frameworks",
          "title": "Frameworks / breakdowns",
          "items": [
            { "id": "peirro", "title": "PEIRRO", "path": "sop/src/frameworks/PEIRRO.md", "type": "md", "tags": ["canonical", "framework"] },
            { "id": "kwik", "title": "KWIK", "path": "sop/src/frameworks/KWIK.md", "type": "md", "tags": ["canonical", "framework"] },
            { "id": "h_series", "title": "H-series", "path": "sop/src/frameworks/H-series.md", "type": "md", "tags": ["canonical", "framework"] },
            { "id": "m_series", "title": "M-series", "path": "sop/src/frameworks/M-series.md", "type": "md", "tags": ["canonical", "framework"] },
            { "id": "y_series", "title": "Y-series", "path": "sop/src/frameworks/Y-series.md", "type": "md", "tags": ["canonical", "framework"] },
            { "id": "levels", "title": "Levels", "path": "sop/src/frameworks/levels.md", "type": "md", "tags": ["canonical", "framework"] }
          ],
          "mirrors": [{ "path": "sop/runtime/knowledge_upload/02_FRAMEWORKS.md" }]
        },
        {
          "id": "workload",
          "title": "Workload",
          "items": [
            { "id": "rotational_interleaving", "title": "Rotational interleaving 3+2", "path": "sop/src/workload/rotational_interleaving_3plus2.md", "type": "md", "tags": ["canonical", "workload"] }
          ]
        },
        {
          "id": "templates",
          "title": "Templates (logging + tutor outputs)",
          "items": [
            { "id": "exit_ticket", "title": "exit_ticket.md", "path": "sop/src/templates/exit_ticket.md", "type": "md", "tags": ["canonical", "template"] },
            { "id": "session_log_template", "title": "session_log_template.md", "path": "sop/src/templates/session_log_template.md", "type": "md", "tags": ["canonical", "template"] },
            { "id": "study_metrics_log", "title": "study_metrics_log.md", "path": "sop/src/templates/study_metrics_log.md", "type": "md", "tags": ["canonical", "template"] },
            { "id": "weekly_plan_template", "title": "weekly_plan_template.md", "path": "sop/src/templates/weekly_plan_template.md", "type": "md", "tags": ["canonical", "template"] },
            { "id": "weekly_review_template", "title": "weekly_review_template.md", "path": "sop/src/templates/weekly_review_template.md", "type": "md", "tags": ["canonical", "template"] },
            { "id": "progress_tracker_template", "title": "progress_tracker_template.md", "path": "sop/src/templates/progress_tracker_template.md", "type": "md", "tags": ["canonical", "template"] },
            { "id": "retrospective_timetable", "title": "retrospective_timetable.md", "path": "sop/src/templates/retrospective_timetable.md", "type": "md", "tags": ["canonical", "template"] },
            { "id": "intake_template", "title": "intake_template.md", "path": "sop/src/templates/intake_template.md", "type": "md", "tags": ["canonical", "template"] },
            { "id": "post_lecture_elaboration_prompts", "title": "post_lecture_elaboration_prompts.md", "path": "sop/src/templates/post_lecture_elaboration_prompts.md", "type": "md", "tags": ["canonical", "template"] },
            { "id": "logging_schema_v92", "title": "logging_schema_v9.2.md", "path": "sop/src/templates/logging_schema_v9.2.md", "type": "md", "tags": ["canonical", "schema"] }
          ],
          "mirrors": [{ "path": "sop/runtime/knowledge_upload/04_LOGGING_AND_TEMPLATES.md" }]
        },
        {
          "id": "rules_examples",
          "title": "Runtime rules + examples",
          "items": [
            { "id": "runtime_rules", "title": "runtime_rules.md", "path": "sop/src/runtime_rules.md", "type": "md", "tags": ["canonical", "rules"] },
            { "id": "examples_mini", "title": "examples_mini.md", "path": "sop/src/examples_mini.md", "type": "md", "tags": ["canonical", "examples"] }
          ],
          "mirrors": [{ "path": "sop/runtime/knowledge_upload/05_EXAMPLES_MINI.md" }]
        },
        {
          "id": "breakdown_docs",
          "title": "Breakdown-style SOP docs",
          "items": [
            { "id": "material_ingestion", "title": "05_MATERIAL_INGESTION.md", "path": "sop/src/05_MATERIAL_INGESTION.md", "type": "md", "tags": ["canonical"] },
            { "id": "session_start", "title": "06_SESSION_START.md", "path": "sop/src/06_SESSION_START.md", "type": "md", "tags": ["canonical"] },
            { "id": "progress_tracking", "title": "07_PROGRESS_TRACKING.md", "path": "sop/src/07_PROGRESS_TRACKING.md", "type": "md", "tags": ["canonical"] },
            { "id": "master_plan", "title": "MASTER_PLAN_PT_STUDY.md", "path": "sop/src/MASTER_PLAN_PT_STUDY.md", "type": "md", "tags": ["canonical", "master"] }
          ]
        },
        {
          "id": "evidence",
          "title": "Evidence (NotebookLM bridge + research sources)",
          "items": [
            { "id": "evidence_dir", "title": "sop/src/evidence/ (folder)", "path": "sop/src/evidence/", "type": "dir", "tags": ["canonical", "evidence"] }
          ]
        }
      ]
    },

    {
      "id": "gpt_bundle",
      "title": "Production GPT bundle v9.3 (packaged mirror)",
      "root_hint": "gpt_bundle_v9.3/",
      "sections": [
        {
          "id": "bundle_manifest",
          "title": "Manifest",
          "items": [
            { "id": "bundle_manifest_md", "title": "manifest.md", "path": "gpt_bundle_v9.3/manifest.md", "type": "md", "tags": ["bundle"] }
          ]
        },
        {
          "id": "bundle_project_files",
          "title": "Project files",
          "items": [
            { "id": "bundle_00", "title": "00_INDEX_AND_RULES.md", "path": "gpt_bundle_v9.3/1_Project_Files/00_INDEX_AND_RULES.md", "type": "md", "tags": ["bundle"] },
            { "id": "bundle_01", "title": "01_MODULES_M0-M6.md", "path": "gpt_bundle_v9.3/1_Project_Files/01_MODULES_M0-M6.md", "type": "md", "tags": ["bundle"] },
            { "id": "bundle_02", "title": "02_FRAMEWORKS.md", "path": "gpt_bundle_v9.3/1_Project_Files/02_FRAMEWORKS.md", "type": "md", "tags": ["bundle"] },
            { "id": "bundle_03", "title": "03_ENGINES.md", "path": "gpt_bundle_v9.3/1_Project_Files/03_ENGINES.md", "type": "md", "tags": ["bundle"] },
            { "id": "bundle_04", "title": "04_LOGGING_AND_TEMPLATES.md", "path": "gpt_bundle_v9.3/1_Project_Files/04_LOGGING_AND_TEMPLATES.md", "type": "md", "tags": ["bundle"] },
            { "id": "bundle_05", "title": "05_EXAMPLES_MINI.md", "path": "gpt_bundle_v9.3/1_Project_Files/05_EXAMPLES_MINI.md", "type": "md", "tags": ["bundle"] }
          ]
        },
        {
          "id": "bundle_instructions_prompts",
          "title": "Instructions & prompts",
          "items": [
            { "id": "bundle_custom_instructions", "title": "gpt_custom_instructions_study_os_v9.3.md", "path": "gpt_bundle_v9.3/2_Instructions/gpt_custom_instructions_study_os_v9.3.md", "type": "md", "tags": ["bundle", "instructions"] },
            { "id": "bundle_runtime_prompt", "title": "runtime_prompt.md", "path": "gpt_bundle_v9.3/3_Prompts/runtime_prompt.md", "type": "md", "tags": ["bundle", "prompt"] },
            { "id": "bundle_weekly_plan_prompt", "title": "gpt_prompt_weekly_rotational_plan.md", "path": "gpt_bundle_v9.3/3_Prompts/gpt_prompt_weekly_rotational_plan.md", "type": "md", "tags": ["bundle", "prompt"] },
            { "id": "bundle_exit_ticket_prompt", "title": "gpt_prompt_exit_ticket_and_wrap.md", "path": "gpt_bundle_v9.3/3_Prompts/gpt_prompt_exit_ticket_and_wrap.md", "type": "md", "tags": ["bundle", "prompt"] }
          ]
        },
        {
          "id": "bundle_schema",
          "title": "Logging schema",
          "items": [
            { "id": "bundle_logging_schema", "title": "logging_schema_v9.3.md", "path": "gpt_bundle_v9.3/logging_schema_v9.3.md", "type": "md", "tags": ["bundle", "schema"] }
          ]
        }
      ]
    },

    {
      "id": "adjacent",
      "title": "SOP-adjacent tutor docs (current)",
      "root_hint": "sop/",
      "sections": [
        {
          "id": "adjacent_docs",
          "title": "Current SOP docs (root sop/)",
          "items": [
            { "id": "sop_logging_schema_v93", "title": "logging_schema_v9.3.md", "path": "sop/logging_schema_v9.3.md", "type": "md", "tags": ["adjacent", "schema"] },
            { "id": "master_exit_ticket_metrics", "title": "master_exit_ticket_and_study_metrics.md", "path": "sop/master_exit_ticket_and_study_metrics.md", "type": "md", "tags": ["adjacent"] },
            { "id": "master_rotational_interleaving", "title": "master_rotational_interleaving_system.md", "path": "sop/master_rotational_interleaving_system.md", "type": "md", "tags": ["adjacent"] },
            { "id": "gpt_custom_instructions_v93", "title": "gpt_custom_instructions_study_os_v9.3.md", "path": "sop/gpt_custom_instructions_study_os_v9.3.md", "type": "md", "tags": ["adjacent", "instructions"] },
            { "id": "gpt_prompt_weekly_plan", "title": "gpt_prompt_weekly_rotational_plan.md", "path": "sop/gpt_prompt_weekly_rotational_plan.md", "type": "md", "tags": ["adjacent", "prompt"] },
            { "id": "gpt_prompt_exit_ticket_wrap", "title": "gpt_prompt_exit_ticket_and_wrap.md", "path": "sop/gpt_prompt_exit_ticket_and_wrap.md", "type": "md", "tags": ["adjacent", "prompt"] },
            { "id": "sop_examples_dir", "title": "examples/ (folder)", "path": "sop/examples/", "type": "dir", "tags": ["adjacent", "examples"] }
          ]
        }
      ]
    },

    {
      "id": "legacy",
      "title": "Legacy / deprecated references",
      "sections": [
        {
          "id": "deprecated_pointer",
          "title": "Deprecated runtime pointer",
          "items": [
            { "id": "old_runtime_pointer", "title": "sop/gpt-knowledge/README.md", "path": "sop/gpt-knowledge/README.md", "type": "md", "tags": ["legacy", "deprecated"] }
          ]
        },
        {
          "id": "legacy_archives",
          "title": "Legacy archives and scans",
          "items": [
            { "id": "old_sop_zip", "title": "zclean-up/sop.zip", "path": "zclean-up/sop.zip", "type": "file", "tags": ["legacy"] },
            { "id": "old_repo_index", "title": "repo_index_2026-01-09.md", "path": "scholar/outputs/system_map/repo_index_2026-01-09.md", "type": "md", "tags": ["legacy"] }
          ]
        },
        {
          "id": "legacy_master_sop",
          "title": "Scholar MASTER_SOP consolidation (reference only)",
          "items": [
            { "id": "master_sop_dir", "title": "scholar/knowledge/MASTER_SOP/ (folder)", "path": "scholar/knowledge/MASTER_SOP/", "type": "dir", "tags": ["legacy", "reference"] }
          ]
        }
      ]
    }
  ]
}
```

---

## 8. Implementation milestones (PR-sized)

### PR-01 — Add manifest + validator
- Add `sop/sop_index.v1.json`
- Add `scripts/validate_sop_index.py` (checks existence + duplicates)
- Add this spec file to `docs/dashboard/`

**Done when**
- validator passes with 0 missing/duplicate allowlisted files

### PR-02 — Add Flask SOP API (allowlist-based)
- Implement:
  - `GET /api/sop/index`
  - `GET /api/sop/file?path=...`
- Enforce allowlist strictly from manifest

**Done when**
- SOP file reads work
- non-allowlisted reads are blocked

### PR-03 — Replace Tutor page with SOP Explorer UI
- Load index
- Render tree
- Render markdown content

**Done when**
- browsing Modules/Engines/Frameworks/Templates works end-to-end

### PR-04 — Deep links + anchor scrolling + copy tools
- `?path=...` opens file
- `#Anchor` scrolls
- Copy content / deep link / SOPRef

**Done when**
- copied link opens correct file and section

### PR-05 — Scholar links (optional for this slice)
- Render SOPRefs in Scholar UI as links into Tutor page

**Done when**
- proposals/questions can link to SOP sections

---

## 9. Manual test checklist
- [ ] `/api/sop/index` returns manifest JSON
- [ ] `/api/sop/file?path=sop/src/modules/M3-encode.md` returns content
- [ ] `/api/sop/file?path=GoogleCalendarTasksAPI.json` is blocked
- [ ] Tutor page shows tree + content
- [ ] Deep link loads correct file
- [ ] Anchor link scrolls correctly
- [ ] Copy SOPRef returns correct JSON

---
