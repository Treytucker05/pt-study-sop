# CP-MSS Control-Plane Hardening — Final Readout v1.0

**Track:** CP-MSS Control-Plane Hardening  
**Status:** Complete  
**Date:** 2026-02-17  
**Commits:** `ff8b5472` → `138e8b13` (main)

---

## 1. Objective

Finalize CP-MSS as a deterministic, auditable control-plane by enforcing canonical method/chain contracts, selector behavior, and telemetry requirements end-to-end.

---

## 2. Deliverables Summary

| Step | Deliverable | Status |
|------|-------------|--------|
| B0 | Baseline validation + export drift detection | Done |
| B1 | `control_stage` enforcement on all 46 methods | Done |
| B2 | Chain contract fields (`allowed_modes`, `gates`, `failure_actions`, `requires_reference_targets`) | Done |
| B3 | Retrieval dependency safety + violating chain reorder | Done |
| B4 | First Exposure chain mode coverage (8 modes × 15 chains) | Done |
| B5 | Deterministic selector policy module + 21 tests | Done |
| B6 | ErrorLog telemetry schema expansion + legacy compat | Done |
| B7 | Backend runtime wiring (selector bridge, session metadata, DB migrations) | Done |
| B8 | This readout | Done |

---

## 3. Evidence Table

| Check | Command | Result |
|-------|---------|--------|
| Library validation (strict) | `python sop/tools/validate_library.py --strict` | 0 errors, 0 warnings; 46 methods, 15 chains |
| Selector policy tests | `pytest sop/tests/test_selector_policy.py` | 21 passed |
| Library validator tests | `pytest sop/tests/test_validate_library.py` | 17 passed |
| Selector bridge tests | `pytest brain/tests/test_selector_bridge.py` | 17 passed |
| Full backend suite | `pytest brain/tests/` | 173 passed |
| Export regeneration | `python scripts/export_library_inventories.py` | 46 methods, 15 chains, 0 unknown IDs |
| Export drift check | `python scripts/check_exports_drift.py` | No drift detected |
| Frontend build | `npm run build` (dashboard_rebuild) | Clean (0 errors) |

---

## 4. Implementation Deltas

### 4.1 New Files Created (8)

| File | Purpose |
|------|---------|
| `sop/tools/selector_policy.py` | Deterministic chain selector: scoring, filtering, dependency enforcement |
| `sop/tests/test_selector_policy.py` | 21 tests for selector policy (all modes, stages, determinism, edge cases) |
| `brain/selector_bridge.py` | Bridge from brain/ runtime to `sop/tools/selector_policy.py` |
| `brain/tests/test_selector_bridge.py` | 17 tests for bridge contract, determinism, all 8 assessment modes |
| `sop/library/chains/C-AD-001.yaml` | New chain: Anatomy Deep-Dive |
| `sop/library/chains/C-CI-001.yaml` | New chain: Classification & Identification |
| `sop/library/chains/C-CR-001.yaml` | New chain: Computational Reasoning |
| + 8 more new chain YAMLs | Mode coverage (C-EP, C-MR, C-PI, C-QD, C-QF, C-VE + contract backfills) |

### 4.2 Modified Files — SOP Layer (key changes)

| File | What Changed |
|------|-------------|
| `sop/tools/validate_library.py` | +164 lines: chain contract enforcement, `control_stage` checks, dependency safety validation, strict mode |
| `sop/tools/models.py` | +37 lines: `control_stage` field on MethodBlock, chain contract fields on ChainConfig |
| `sop/tools/build_runtime_bundle.py` | Methods bundle generation includes new fields |
| `sop/library/08-logging.md` | ErrorLog schema expanded: `selector_policy_version`, `dependency_fix_applied`, `chain_id` columns |
| `sop/library/15-method-library.md` | Updated method/chain inventory tables |
| `sop/library/templates/ErrorLog.csv` | Header row updated with new telemetry columns |
| All 46 `sop/library/methods/*.yaml` | +1 line each: `control_stage` field added |
| All 15 `sop/library/chains/*.yaml` | Contract fields backfilled: `allowed_modes`, `gates`, `failure_actions`, `requires_reference_targets` |
| `sop/tests/test_validate_library.py` | +306 lines: comprehensive contract validation tests |
| `sop/runtime/` (3 files) | Regenerated bundles reflecting schema changes |
| `sop/tests/golden/` (2 files) | Golden files updated |

### 4.3 Modified Files — Backend Layer

| File | What Changed |
|------|-------------|
| `brain/dashboard/api_tutor.py` | `_ensure_selector_columns()` migration; `create_session()` auto-selects chain when `assessment_mode` provided; `end_session()` propagates selector metadata to brain sessions |
| `brain/dashboard/api_adapter.py` | `_ensure_sessions_selector_cols()` migration; selector columns in all session SELECT queries; `serialize_session_row()` includes `selectorChainId`/`selectorPolicyVersion` |

### 4.4 Schema Additions

**`tutor_sessions` table — 4 new columns:**
- `selector_chain_id TEXT` — YAML chain ID selected by policy (e.g. "C-FE-001")
- `selector_score_json TEXT` — JSON-serialized score tuple
- `selector_policy_version TEXT` — Policy version string (e.g. "v1.0")
- `selector_dependency_fix INTEGER DEFAULT 0` — Whether dependency enforcement modified the block list

**`sessions` table — 2 new columns:**
- `selector_chain_id TEXT` — Propagated from tutor_sessions on session end
- `selector_policy_version TEXT` — Propagated from tutor_sessions on session end

---

## 5. Architecture

```
sop/library/chains/*.yaml     sop/library/methods/*.yaml
         |                              |
         v                              v
  sop/tools/selector_policy.py    sop/tools/validate_library.py
  (deterministic selection)        (contract enforcement)
         |
         v
  brain/selector_bridge.py
  (runtime bridge, catalog cache)
         |
         v
  brain/dashboard/api_tutor.py
  (create_session auto-select → tutor_sessions)
         |
         v
  brain/dashboard/api_adapter.py
  (session queries → API responses)
```

**Selection flow:**
1. Frontend sends `POST /api/tutor/session` with `assessment_mode` (no explicit `method_chain_id`)
2. `api_tutor.create_session()` calls `selector_bridge.run_selector()`
3. Bridge loads chain catalog from YAML, calls `selector_policy.select_chain()`
4. Policy scores candidates by (mode_match, stage_match, mode_diversity, block_count, time_fit)
5. Result stored in `tutor_sessions` (chain_id, score, policy_version, dependency_fix)
6. On `end_session()`, metadata propagates to brain `sessions` table for analytics

---

## 6. Success Criteria Verification

| Criterion | Evidence |
|-----------|----------|
| Validation passes with zero errors in strict mode | `validate_library.py --strict` → 0 errors, 0 warnings |
| Selector tests and library validation tests pass | 38 SOP tests + 17 bridge tests = 55 tests, all passing |
| Export drift check reports no mismatches | `check_exports_drift.py` → No drift detected |
| Track plan remains current | plan.md updated with B0-B8 checked, verification snapshot current |

---

## 7. Known Limitations

- **Selector metadata is audit-only.** The selector recommends a chain but does not auto-assign `method_chain_id` (the DB integer). Manual chain selection always takes priority.
- **`facilitation_prompt` missing on all 46 methods.** This is a content authoring task, not a control-plane concern. Logged for future work.
- **No UI surface for selector metadata yet.** Session list and detail APIs return `selectorChainId`/`selectorPolicyVersion` but no frontend rendering. Deferred to a separate UI task.

---

## 8. Files Changed (82 total)

```
sop/tools/selector_policy.py              (+195 lines, new)
sop/tools/validate_library.py             (+164 lines)
sop/tools/models.py                       (+37 lines)
sop/tools/build_runtime_bundle.py         (+3 lines)
sop/tests/test_selector_policy.py         (+114 lines, new)
sop/tests/test_validate_library.py        (+306 lines)
sop/library/08-logging.md                 (+16 lines)
sop/library/15-method-library.md          (+22 lines)
sop/library/templates/ErrorLog.csv        (+6 lines)
sop/library/chains/*.yaml                 (15 files, contract fields + new chains)
sop/library/methods/*.yaml                (46 files, +control_stage)
sop/runtime/* + sop/tests/golden/*        (5 files, regenerated)
brain/selector_bridge.py                  (+116 lines, new)
brain/tests/test_selector_bridge.py       (+138 lines, new)
brain/dashboard/api_tutor.py              (+245 lines)
brain/dashboard/api_adapter.py            (+368 lines)
```

**Total: 82 files, +1,950 / -276 lines**
