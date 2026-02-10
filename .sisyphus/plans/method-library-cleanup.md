# Method Library Cleanup

## TL;DR

> **Quick Summary**: Fix two minor housekeeping items in the method library — update a stale comment and register 132 logging fields to eliminate validator warnings.
> 
> **Deliverables**:
> - `brain/data/seed_methods.py` comment updated (34 → 36 blocks)
> - `sop/library/templates/session_log_template.yaml` extended with 132 method logging fields
> - Validator shows 0 warnings (down from 144)
> 
> **Estimated Effort**: Quick (15-20 minutes)
> **Parallel Execution**: NO - sequential (Task 2 depends on field extraction)
> **Critical Path**: Extract fields → Add to template → Verify

---

## Context

### Original Request
User asked for cleanup of minor items identified during system audit.

### Interview Summary
**Key Decisions**:
- Field format: Standard (name + inferred type)
- Field organization: Append unsorted to end of template
- No descriptions needed

**Research Findings**:
- 132 unique logging fields missing from template
- 144 total warnings (some fields appear in multiple methods)
- Validator only checks for `name` key presence

### Metis Review
**Identified Gaps** (addressed):
- Confirmed field count via extraction
- Confirmed comment location at line 35
- Locked scope to prevent creep (no descriptions, no reorganization)

---

## Work Objectives

### Core Objective
Eliminate validator warnings and update stale documentation to reflect current library state (36 methods).

### Concrete Deliverables
- `brain/data/seed_methods.py` line 35: "34 blocks" → "36 blocks"
- `sop/library/templates/session_log_template.yaml`: 132 new field entries appended

### Definition of Done
- [ ] `grep "36 blocks" brain/data/seed_methods.py` returns a match
- [ ] `python3 sop/tools/validate_library.py` shows "0 errors, 0 warnings"

### Must Have
- All 132 unique field names added to template
- Each field has `name` and `type` keys
- Comment reflects actual method count (36)

### Must NOT Have (Guardrails)
- DO NOT modify existing 17 session_fields entries (lines 1-82)
- DO NOT modify any method YAML files
- DO NOT modify validator logic
- DO NOT add descriptions (out of scope)
- DO NOT reorganize or alphabetize existing fields

---

## Verification Strategy

### Test Decision
- **Infrastructure exists**: YES (validate_library.py)
- **User wants tests**: Manual verification via validator
- **Framework**: Python validator script

### Automated Verification

**Pre-work baseline** (capture current state):
```bash
python3 sop/tools/validate_library.py 2>&1 | grep "logging_field" | wc -l
# Expected: 144
```

**Post-work verification**:
```bash
python3 sop/tools/validate_library.py 2>&1 | tail -3
# Expected: "OK — 0 errors, 0 warnings"
```

---

## Execution Strategy

### Sequential Execution

```
Task 1: Update seed_methods.py comment
    ↓
Task 2: Extract 132 unique field names from validator output
    ↓
Task 3: Add fields to session_log_template.yaml
    ↓
Task 4: Run validator to confirm 0 warnings
```

No parallelization — tasks are sequential and fast.

---

## TODOs

- [ ] 1. Update seed_methods.py comment

  **What to do**:
  - Edit `brain/data/seed_methods.py` line 35
  - Change `"34 blocks"` to `"36 blocks"`

  **Must NOT do**:
  - Modify any other lines
  - Change the hardcoded METHOD_BLOCKS list

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line edit, trivial change
  - **Skills**: `[]`
    - No special skills needed

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: None
  - **Blocked By**: None

  **References**:
  - `brain/data/seed_methods.py:35` - Line to edit

  **Acceptance Criteria**:
  ```bash
  grep -n "Atomic Method Blocks" brain/data/seed_methods.py
  # Assert: Output shows "36 blocks" on line 35
  ```

  **Commit**: YES
  - Message: `fix(seed): update method block count comment (34 → 36)`
  - Files: `brain/data/seed_methods.py`

---

- [ ] 2. Extract unique logging field names

  **What to do**:
  - Run validator and extract all unique field names
  - Save to temporary variable or file for Task 3

  **Command**:
  ```bash
  python3 sop/tools/validate_library.py 2>&1 | \
    grep "logging_field" | \
    sed "s/.*logging_field '\([^']*\)'.*/\1/" | \
    sort -u
  ```

  **Must NOT do**:
  - Modify any files during extraction

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Command execution, no coding
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 3
  - **Blocked By**: None

  **Acceptance Criteria**:
  ```bash
  # Command output has exactly 132 unique field names
  python3 sop/tools/validate_library.py 2>&1 | grep "logging_field" | sed "s/.*logging_field '\([^']*\)'.*/\1/" | sort -u | wc -l
  # Assert: 132
  ```

  **Commit**: NO (extraction only, no file changes)

---

- [ ] 3. Add logging fields to session_log_template.yaml

  **What to do**:
  - Open `sop/library/templates/session_log_template.yaml`
  - Append a new section comment: `# Method-specific logging fields (auto-extracted)`
  - Add all 132 fields in format:
    ```yaml
    - name: field_name
      type: <inferred_type>
      required: false
    ```
  - Type inference rules:
    - `*_count`, `*_depth`, `*_length` → `integer`
    - `*_percent`, `*_accuracy`, `*_rate` → `float`
    - `*_used`, `*_confirmed`, `*_completed` → `boolean`
    - Everything else → `string`

  **Must NOT do**:
  - Modify existing fields (lines 1-82)
  - Add descriptions
  - Reorganize or sort fields

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Mechanical append operation
  - **Skills**: `[]`

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential
  - **Blocks**: Task 4
  - **Blocked By**: Task 2

  **References**:
  - `sop/library/templates/session_log_template.yaml` - File to edit
  - Existing field format at lines 4-10 as pattern reference

  **Acceptance Criteria**:
  ```bash
  # Count new entries added
  grep -c "required: false" sop/library/templates/session_log_template.yaml
  # Assert: >= 132 (may be more if existing fields already have this)
  
  # Verify specific fields exist
  grep "term_encoded" sop/library/templates/session_log_template.yaml
  grep "retrieval_accuracy" sop/library/templates/session_log_template.yaml
  # Assert: Both return matches
  ```

  **Commit**: NO (commit with Task 4 after verification)

---

- [ ] 4. Verify and commit

  **What to do**:
  - Run validator to confirm 0 warnings
  - Commit both file changes together

  **Verification Command**:
  ```bash
  python3 sop/tools/validate_library.py 2>&1 | tail -3
  # Assert: "OK — 0 errors, 0 warnings"
  ```

  **Must NOT do**:
  - Commit if warnings remain
  - Modify files if validation fails (investigate instead)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Validation and commit
  - **Skills**: `["git-master"]`
    - git-master: For proper commit message

  **Parallelization**:
  - **Can Run In Parallel**: NO
  - **Parallel Group**: Sequential (final)
  - **Blocks**: None
  - **Blocked By**: Task 3

  **Acceptance Criteria**:
  ```bash
  python3 sop/tools/validate_library.py
  # Assert: Exit code 0, output shows "0 errors, 0 warnings"
  
  git log -1 --oneline
  # Assert: Shows cleanup commit
  ```

  **Commit**: YES
  - Message: `fix(sop): add 132 logging fields to session_log_template`
  - Files: `sop/library/templates/session_log_template.yaml`
  - Pre-commit: `python3 sop/tools/validate_library.py`

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| 1 | `fix(seed): update method block count comment (34 → 36)` | seed_methods.py | grep check |
| 4 | `fix(sop): add 132 logging fields to session_log_template` | session_log_template.yaml | validator = 0 warnings |

---

## Success Criteria

### Verification Commands
```bash
# Task 1: Comment updated
grep "36 blocks" brain/data/seed_methods.py
# Expected: Match found

# Task 4: Validator clean
python3 sop/tools/validate_library.py
# Expected: "OK — 0 errors, 0 warnings"
```

### Final Checklist
- [ ] seed_methods.py shows "36 blocks" in comment
- [ ] session_log_template.yaml has 132 new field entries
- [ ] Validator shows 0 warnings
- [ ] Both changes committed
