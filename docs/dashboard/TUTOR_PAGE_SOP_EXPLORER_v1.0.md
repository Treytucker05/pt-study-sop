# Tutor Page â€” SOP Explorer (Dashboard Spec) v1.0

**Purpose:** Repurpose the Dashboard **Tutor** page into a structured, read-only **SOP Explorer** so you and Scholar can browse the SOP easily and reference it with deep links.

This matches current workflow: tutoring happens in **Custom GPT**, not in the dashboard.

---

## 1. Goals

1. Show a **structured breakdown** of SOP content (modules/engines/frameworks/templates/workload/rules/examples/evidence).
2. Show the **runtime bundle** (what the Custom GPT actually uses).
3. Show the **production GPT bundle** (packaged mirror) for reference.
4. Show **SOP-adjacent tutor docs** (prompts/instructions/schemas).
5. Enable **Scholar â†” SOP linking** with stable deep links + SOPRef objects.
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
- No â€œany file under sop/â€.
- Only allowlisted paths.

### 3.3 Item types
Each item includes:
- `id` (stable)
- `title` (UI label)
- `path` (repo-relative, `/` separators)
- `type` (`md | json | txt | file | dir`)
- `tags` (for filtering later)

---

## 4. SOPRef linking contract (Scholar â†’ Tutor page)

Scholar proposals/questions can reference SOP sections using:

```json
{
  "path": "sop/library/05-session-flow.md",
  "anchor": "M3: Encode (Attach Meaning)",
  "label": "Session Flow -> M3: Encode"
}
```

Tutor page supports deep links:

- `/tutor?path=<repo-relative-path>`
- optional `#<heading>` anchor

Example:
- `/tutor?path=sop/library/05-session-flow.md#M3:%20Encode%20(Attach%20Meaning)`

---

## 5. Backend API (Option A: Flask serves files)

### 5.1 Endpoints

#### `GET /api/sop/index`
Returns the manifest JSON (`sop/sop_index.v1.json`).

#### `GET /api/sop/file?path=<repo-relative-path>`
Returns allowlisted content only:

```json
{
  "path": "sop/library/05-session-flow.md",
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
- reject files above a size cap (2â€“5MB)
- return 404 for non-allowlisted paths (to avoid leaking that a file exists)

---

## 6. Frontend UI requirements (Tutor page)

### 6.1 Layout
- **Left panel:** navigation tree (Group â†’ Section â†’ Item)
- **Main panel:** markdown viewer (render headings, lists, code blocks, tables)
- **Top controls:** Copy buttons

### 6.2 Viewer controls
- Copy content
- Copy deep link
- Copy SOPRef

### 6.3 Behavior
- Default open: `default_group` from the manifest (currently `library`).
- If URL includes `?path=...`, auto-open that file.
- If URL includes `#Anchor`, scroll after markdown renders.

---

## 7. SOP index manifest (source of truth)

The SOP Explorer is backed by `sop/sop_index.v1.json` (committed). The backend will only serve files whose `path` appears in this manifest.

Guidelines:
- Keep `path` repo-relative with `/` separators.
- Only allowlist explicit files (no directory browsing).
- Canonical SOP source is `sop/library/`. `sop/runtime/` is generated output.

Current manifest excerpt:

```json
{
  "version": "sop-index-v1",
  "default_group": "library",
  "groups": [
    {
      "id": "library",
      "title": "SOP Library (C:\\pt-study-sop\\sop\\library)",
      "root_hint": "sop/library/",
      "sections": [
        {
          "id": "library_files",
          "title": "Library Files",
          "items": [
            { "id": "library_05_session_flow", "title": "05 Session Flow", "path": "sop/library/05-session-flow.md", "type": "md", "tags": ["library"] }
          ]
        }
      ]
    }
  ]
}
```

Edit `sop/sop_index.v1.json` to add groups/sections/items (the backend allowlist comes from this file).

---
## 8. Implementation milestones (PR-sized)

### PR-01 â€” Add manifest + validator
- Add `sop/sop_index.v1.json`
- Add `scripts/validate_sop_index.py` (checks existence + duplicates)
- Add this spec file to `docs/dashboard/`

**Done when**
- validator passes with 0 missing/duplicate allowlisted files

### PR-02 â€” Add Flask SOP API (allowlist-based)
- Implement:
  - `GET /api/sop/index`
  - `GET /api/sop/file?path=...`
- Enforce allowlist strictly from manifest

**Done when**
- SOP file reads work
- non-allowlisted reads are blocked

### PR-03 â€” Replace Tutor page with SOP Explorer UI
- Load index
- Render tree
- Render markdown content

**Done when**
- browsing Modules/Engines/Frameworks/Templates works end-to-end

### PR-04 â€” Deep links + anchor scrolling + copy tools
- `?path=...` opens file
- `#Anchor` scrolls
- Copy content / deep link / SOPRef

**Done when**
- copied link opens correct file and section

### PR-05 â€” Scholar links (optional for this slice)
- Render SOPRefs in Scholar UI as links into Tutor page

**Done when**
- proposals/questions can link to SOP sections

---

## 9. Manual test checklist
- [ ] `/api/sop/index` returns manifest JSON
- [ ] `/api/sop/file?path=sop/library/05-session-flow.md` returns content
- [ ] `/api/sop/file?path=GoogleCalendarTasksAPI.json` is blocked
- [ ] Tutor page shows tree + content
- [ ] Deep link loads correct file
- [ ] Anchor link scrolls correctly
- [ ] Copy SOPRef returns correct JSON

---

