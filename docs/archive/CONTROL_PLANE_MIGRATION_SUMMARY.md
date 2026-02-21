# Control Plane Migration Summary (CP-MSS v1.0)

**Completed:** 2026-02-18  
**Status:** ✅ FULLY OPERATIONAL

---

## Overview

The PT Study System has been successfully migrated from the legacy PEIRRO taxonomy to the **Control Plane Modular Study System (CP-MSS v1.0)**.

### Taxonomy Changes

| Legacy (PEIRRO) | New (Control Plane) | Block Count |
|-----------------|---------------------|-------------|
| Prepare | **PRIME** | 8 |
| (new) | **CALIBRATE** | 4 |
| Encode | **ENCODE** | 18 |
| Interrogate | **REFERENCE** | 4 |
| Retrieve | **RETRIEVE** | 9 |
| Refine + Overlearn | **OVERLEARN** | 3 |

**Total: 46 method blocks across 6 stages**

---

## Architecture Components

### 1. Constitution
**File:** `sop/library/17-control-plane.md`
- Defines the 6-stage pipeline
- Documents the Dependency Law
- Specifies the 7 Knobs for routing

### 2. Database
**Files:** `brain/db_setup.py`, `brain/data/seed_methods.py`
- `method_blocks` table uses `control_stage` column
- `error_logs` table for granular telemetry
- Helper functions: `log_error()`, `get_dominant_error()`, `get_error_stats()`

### 3. Chain Selector
**Files:** `brain/selector.py`, `brain/selector_bridge.py`
- Deterministic router based on 7 Knobs
- Error injection overrides (Confusion→high near_miss, Speed→hard timed, etc.)
- Returns `(chain_id, knob_overrides)`

### 4. Dependency-Safe Chains
**Files:** `sop/library/chains/C-FE-*.yaml`

| Chain | Duration | Stages | Use Case |
|-------|----------|--------|----------|
| `C-FE-STD` | 35 min | PRIME→CALIBRATE→ENCODE→REFERENCE→RETRIEVE | Standard first exposure |
| `C-FE-MIN` | 20 min | PRIME→REFERENCE→RETRIEVE→OVERLEARN | Low energy / short time |
| `C-FE-PRO` | 45 min | PRIME→ENCODE→REFERENCE→RETRIEVE | Lab/procedure learning |

**All chains enforce REFERENCE before RETRIEVE (Dependency Law).**

### 5. Frontend Support
**Files:** 
- `dashboard_rebuild/client/src/api.ts` - Type definitions
- `dashboard_rebuild/client/src/types/methods.ts` - Category types
- `dashboard_rebuild/client/src/lib/colors.ts` - CONTROL_PLANE_COLORS
- `dashboard_rebuild/client/src/lib/displayStage.ts` - Stage mapping
- `dashboard_rebuild/client/src/components/TutorWizard.tsx` - Chain display
- `dashboard_rebuild/client/src/components/TutorChainBuilder.tsx` - Chain builder
- `dashboard_rebuild/client/src/pages/methods.tsx` - Methods page

---

## Key Rules

### The Dependency Law
> No retrieval without targets. Every RETRIEVE stage must be preceded by REFERENCE (target generation).

This prevents the system from asking users to test themselves without first generating proper cues/question banks.

### The 7 Knobs
1. `assessment_mode` - procedure, classification, mechanism, etc.
2. `time_available_min` - Session duration budget
3. `energy` - low, medium, high
4. `retrieval_support` - maximal, guided, minimal
5. `interleaving_level` - blocked, mixed, full
6. `near_miss_intensity` - low, medium, high
7. `timed` - off, soft, hard

### Error Injection Overrides
| Error Type | Override |
|------------|----------|
| Confusion | `near_miss_intensity=high` |
| Speed | `timed=hard` |
| Rule | `near_miss_intensity=high` |
| Procedure | Force `C-FE-PRO` chain |

---

## Database Schema

### error_logs Table
```sql
CREATE TABLE error_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT NOT NULL,
    item_id TEXT,
    error_type TEXT,  -- Recall, Confusion, Rule, Representation, Procedure, Computation, Speed
    stage_detected TEXT,  -- PRIME, CALIBRATE, ENCODE, REFERENCE, RETRIEVE, OVERLEARN
    confidence TEXT,  -- H, M, L
    time_to_answer REAL,
    active_knobs TEXT,  -- JSON for A/B testing
    fix_applied TEXT,  -- e.g., M-ENC-010
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
);
```

**Indexes:** session_id, error_type, timestamp

---

## API Endpoints

| Endpoint | Description |
|----------|-------------|
| `GET /api/methods` | List all method blocks (46 total) |
| `GET /api/chains` | List all chains (18 total) |
| `POST /api/tutor/session` | Creates session with selector routing |

---

## Testing Verification

### Backend
```bash
# Verify method blocks
sqlite3 brain/data/pt_study.db "SELECT control_stage, COUNT(*) FROM method_blocks GROUP BY control_stage;"

# Verify error_logs
sqlite3 brain/data/pt_study.db "SELECT * FROM error_logs ORDER BY id DESC LIMIT 1;"
```

### Frontend
1. Open http://127.0.0.1:5000/methods
2. Check all 6 tabs show correct block counts:
   - PRIMING: 8 blocks
   - CALIBRATE: 4 blocks
   - ENCODING: 18 blocks
   - REFERENCE: 4 blocks
   - RETRIEVAL: 9 blocks
   - OVERLEARNING: 3 blocks

---

## Documentation Updated

| File | Status |
|------|--------|
| `README.md` | ✅ Updated with Control Plane overview |
| `AGENTS.md` | ✅ Added CP-MSS v1.0 section |
| `WALKTHROUGH_NOTES.md` | ✅ Added migration details |
| `SYSTEM_DOCUMENTATION.md` | ✅ Updated pipeline diagram |
| `TUTOR_WALKTHROUGH_NOTES.md` | ✅ Added C-FE chain info |
| `docs/README.md` | ✅ Added 17-control-plane.md reference |

---

## Migration Complete

The PT Study System is now a **closed-loop Intelligent Tutoring System** with:
- ✅ Biologically-validated 6-stage pipeline
- ✅ Deterministic routing based on 7 Knobs
- ✅ Error telemetry for HCWR calculation
- ✅ Dependency-safe chains (REF before RET)
- ✅ Full frontend/backend integration

**System Version: CP-MSS v1.0**
