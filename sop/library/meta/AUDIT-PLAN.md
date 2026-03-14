# PT Study OS — Full System Audit Plan
**Created:** 2026-02-28 | **Status:** In Progress

---

## Known Mismatches (from Chrome + Code audit)

| # | Area | Live App | SOP Docs | Code | Action |
|---|------|----------|----------|------|--------|
| 1 | **Topic field** | ✅ Step 1 has it | ❌ Not documented | ✅ In TutorWizard.tsx | Add to SOP 05 |
| 2 | **Mode selector** | ✅ Handled inside Tutor chat | ⚠️ Says Step 3 UI | ✅ In code | Update SOP — mode is set in-session, not Wizard |
| 3 | **Model selector** | ✅ Handled inside Tutor chat | ❌ Not documented | ✅ In code | Document in SOP |
| 4 | **Web search toggle** | ✅ Handled inside Tutor chat | ❌ Not documented | ✅ In code | Document in SOP |
| 5 | **Chain count** | 19 chains | 15 documented | 15 YAML files | Export 4 DB-only chains to YAML |
| 6 | **Custom Instructions** | ✅ In Settings modal | ❌ Not documented | Unknown | Document in SOP |
| 7 | **Recent Sessions** | ✅ Strip in Step 1 | ❌ Not documented | Unknown | Document in SOP |

---

## Audit Checklist

### A. SOP Library Files (docs accuracy)

| File | Status | Notes |
|------|--------|-------|
| 00-overview.md | ✅ Updated v10.0 | Done this session |
| 01-core-rules.md | ✅ Updated | Done this session |
| 02-learning-cycle.md | ✅ Updated | Done this session |
| 03-frameworks.md | ⬜ Not audited | Check for M0-M6 refs |
| 04-engines.md | ⬜ Not audited | Check for M0-M6 refs |
| 05-session-flow.md | ⚠️ Needs fixes | Add Topic field, resolve mode selector |
| 06-modes.md | ✅ Updated | Done this session |
| 07-workload.md | ⬜ Not audited | Check for M0-M6 refs |
| 08-logging.md | ⬜ Not audited | Check for M0-M6 refs |
| 09-templates.md | ⬜ Not audited | Check for M0-M6 refs |
| 10-deployment.md | ⬜ Not audited | |
| 11-examples.md | ⬜ Not audited | |
| 12-evidence.md | ⬜ Not audited | |
| 13-custom-gpt-system-instructions.md | ⬜ Not audited | |
| 14-lo-engine.md | ✅ Updated | Done this session |
| 15-method-library.md | ⚠️ Needs update | Chain count 15→19, add 4 missing chains |
| 16-research-terms.md | ⬜ Not audited | |
| 17-control-plane.md | ⬜ Not audited | Check for M0-M6 refs |

### B. Chain YAML Source Files

| Chain (Live App) | YAML Exists? | Action |
|------------------|-------------|--------|
| Anatomy Deep Dive | ✅ C-AD-001 | Verify content matches |
| Clinical Reasoning | ✅ C-CR-001 | Verify |
| Clinical Reasoning Intake | ✅ C-CI-001 | Verify |
| DEPTH | ✅ C-DP-001 | Verify |
| Exam Prep | ✅ C-EP-001 | Verify |
| First Exposure (Core) | ✅ C-FE-001 | Verify |
| First Exposure: Minimal | ❌ Missing | Export from DB |
| First Exposure: Procedure | ❌ Missing | Export from DB |
| First Exposure: Standard | ❌ Missing | Export from DB |
| Low Energy | ✅ C-LE-001 | Verify |
| Mastery Review | ✅ C-MR-001 | Verify |
| Pathophysiology Intake | ✅ C-PI-001 | Verify |
| SWEEP | ✅ C-SW-001 | Verify |
| Top-Down Narrative Mastery | ❌ Missing | Export from DB |
| Visual Encoding | ✅ C-VE-001 | Verify |
| Quick Drill/Flash | ✅ C-QD/QF-001 | Verify |
| Data Analysis | ✅ C-DA-001 | Verify |
| Research Synthesis | ✅ C-RS-001 | Verify |

### C. Frontend Components (code vs live behavior)

Priority components to audit:

| Component | What to Check |
|-----------|--------------|
| TutorWizard.tsx | ✅ Resolved — mode/model/webSearch handled in Tutor chat |
| TutorChat.tsx | Chain execution flow matches SOP Phase 2 |
| TutorChainBuilder.tsx | "Build your own chain" tab behavior |
| ChainBuilder.tsx | Method block drag/drop, stage tagging |
| MaterialSelector.tsx | File types supported vs documented |
| MaterialUploader.tsx | Upload flow matches Step 1 description |
| MethodBlockCard.tsx | Block schema matches SOP 15 |
| MethodAnalytics.tsx | Analytics tab on Methods page |
| ObsidianVaultBrowser.tsx | Vault integration behavior |
| StepConfirm.tsx (or inline) | Step 3 render logic for hidden fields |

### D. Backend Routes

| Area | What to Check |
|------|--------------|
| Chain API | GET/POST/PUT/DELETE chains — do YAML and DB stay in sync? |
| Session API | Start/stop/wrap — does it follow Wizard→Chain→Wrap? |
| Method API | Block CRUD — 46 blocks match SOP? |
| Materials API | Upload/parse — supported formats match docs? |
| Settings API | Custom Instructions save/load |
| LO Engine API | Is it wired up or orphaned? |
| Obsidian API | Vault path resolution, file save |

### E. Database vs YAML Source of Truth

- [ ] Which is authoritative — DB or YAML files?
- [ ] Are chains seeded from YAML on startup, or independent?
- [ ] Can users create chains that only live in DB? (Build your own tab)
- [ ] Method blocks: 46 in SOP — how many in DB?

---

## Execution Order

1. **Quick wins** — Fix known mismatches (#1, #5, #6, #7 from table above)
2. **Update SOP for mode/model/web-search** — Document that these are set in-session via Tutor chat, not Wizard
3. **Audit remaining SOP files** — Files 03, 04, 07-13, 16, 17 for M0-M6 refs and accuracy
4. **Export 4 missing chain YAMLs** — Pull from DB, create YAML source files
5. **Frontend component audit** — Walk each component against SOP descriptions
6. **Backend route audit** — Map all API endpoints, verify behavior
7. **DB/YAML sync check** — Determine source of truth, document sync strategy

---

## Resolved

**Mode/Model/Web Search:** ✅ These are handled inside the Tutor chat session itself, not in the Wizard UI. SOP docs need updating to reflect this — mode is selected in-session, not at Wizard Step 3.
