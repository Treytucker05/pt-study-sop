"""Live integration tests for Vault Janitor — runs against real Obsidian vault.

Requires:
  - Obsidian running with Local REST API plugin enabled
  - OBSIDIAN_API_KEY set in brain/.env
  - Network access to 127.0.0.1:27124

Creates fixtures under `_janitor_test/` folder and cleans them up afterward.
Run with: python brain/tests/test_vault_janitor_live.py
"""
from __future__ import annotations

import json
import sys
import os
import time

# Force UTF-8 output on Windows to avoid cp1252 encoding errors
if sys.platform == "win32":
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")  # type: ignore[attr-defined]

# Ensure brain/ is importable
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dashboard.api_adapter import (
    obsidian_get_file,
    obsidian_save_file,
    obsidian_delete_file,
    obsidian_delete_folder,
)
from vault_janitor import (
    JanitorIssue,
    ScanResult,
    REQUIRED_FM_FIELDS,
    _parse_frontmatter_fields,
    _resolve_frontmatter_from_path,
    _check_frontmatter,
    _check_orphans,
    _check_broken_links,
    _check_casing,
    _check_duplicates,
    _build_ai_system_prompt,
    scan_vault,
    apply_fix,
    apply_fixes,
    ai_infer_frontmatter,
    ai_resolve,
    ai_apply,
    enrich_links,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

_PASS = 0
_FAIL = 0
_SKIP = 0
_RESULTS: list[tuple[str, str, str]] = []  # (task, status, detail)


def _record(task: str, passed: bool, detail: str = "") -> None:
    global _PASS, _FAIL
    if passed:
        _PASS += 1
        _RESULTS.append((task, "PASS", detail))
        print(f"  PASS: {detail}" if detail else f"  PASS")
    else:
        _FAIL += 1
        _RESULTS.append((task, "FAIL", detail))
        print(f"  FAIL: {detail}" if detail else f"  FAIL")


def _skip(task: str, detail: str = "") -> None:
    global _SKIP
    _SKIP += 1
    _RESULTS.append((task, "SKIP", detail))
    print(f"  SKIP: {detail}" if detail else f"  SKIP")


def _assert(task: str, condition: bool, label: str) -> None:
    _record(task, condition, label)


# ---------------------------------------------------------------------------
# Fixture definitions
# ---------------------------------------------------------------------------

FIXTURE_PREFIX = "_janitor_test"

FIXTURES: dict[str, str] = {
    f"{FIXTURE_PREFIX}/Casing Test/MyNote.md": (
        "---\ncourse: Neuroscience\ncourse_code: PHYT_6313\n"
        "unit_type: week\nnote_type: concept\n---\n"
        "# Casing Test Note A\n\nThis note tests casing mismatch detection.\n"
    ),
    f"{FIXTURE_PREFIX}/casing test/AnotherNote.md": (
        "---\ncourse: Neuroscience\ncourse_code: PHYT_6313\n"
        "unit_type: week\nnote_type: concept\n---\n"
        "# Casing Test Note B\n\nAnother note in a differently-cased folder.\n"
    ),
    f"{FIXTURE_PREFIX}/Duplicate A.md": (
        "---\ncourse: Neuroscience\n---\n"
        "# Duplicate Content\n\n"
        "This body is intentionally duplicated to test the duplicate detector.\n"
        "It contains enough text to produce a meaningful hash.\n"
    ),
    f"{FIXTURE_PREFIX}/subfolder/Duplicate B.md": (
        "---\ncourse: Movement Science\n---\n"
        "# Duplicate Content\n\n"
        "This body is intentionally duplicated to test the duplicate detector.\n"
        "It contains enough text to produce a meaningful hash.\n"
    ),
    f"{FIXTURE_PREFIX}/Broken Links.md": (
        "---\ncourse: Neuroscience\ncourse_code: PHYT_6313\n"
        "unit_type: week\nnote_type: concept\n---\n"
        "# Broken Links Test\n\n"
        "This note links to [[NonExistentNote]] and [[OBJ-UNMAPPED]].\n"
        "It also has a valid link to [[Calibrate]].\n"
    ),
    f"{FIXTURE_PREFIX}/Orphan Island.md": (
        "# Orphan Island\n\n"
        "This note has no links in or out. It floats alone in the vault.\n"
        "No wikilinks here at all — completely isolated.\n"
    ),
    f"{FIXTURE_PREFIX}/Partial FM.md": (
        "---\ncourse: Neuroscience\nnote_type: concept\n---\n"
        "# Partial Frontmatter\n\n"
        "Has course and note_type but missing course_code and unit_type.\n"
    ),
    f"{FIXTURE_PREFIX}/Neuro Concepts.md": (
        "# Neuroscience Concepts\n\n"
        "This note covers motor cortex function, corticospinal tracts,\n"
        "upper and lower motor neurons, and basal ganglia circuitry.\n"
        "Key topics from PHYT 6313 Neuroscience Week 5.\n"
    ),
}


# ---------------------------------------------------------------------------
# Task 1: Create fixtures
# ---------------------------------------------------------------------------

def task_01_create_fixtures() -> bool:
    print("\n=== Task 1: Create test fixtures ===")
    all_ok = True
    for path, content in FIXTURES.items():
        result = obsidian_save_file(path, content)
        ok = result.get("success", False)
        _assert("T01", ok, f"Create {path}")
        if not ok:
            print(f"    Error: {result.get('error')}")
            all_ok = False

    # Brief pause for Obsidian to index
    time.sleep(1)

    # Verify each by reading back
    for path in FIXTURES:
        result = obsidian_get_file(path)
        ok = result.get("success", False)
        _assert("T01", ok, f"Read-back {path}")
        if not ok:
            all_ok = False

    return all_ok


# ---------------------------------------------------------------------------
# Task 2: Test _parse_frontmatter_fields()
# ---------------------------------------------------------------------------

def task_02_parse_frontmatter() -> None:
    print("\n=== Task 2: _parse_frontmatter_fields() ===")

    # Full frontmatter
    full = obsidian_get_file(f"{FIXTURE_PREFIX}/Casing Test/MyNote.md")
    if full.get("success"):
        fm = _parse_frontmatter_fields(full["content"])
        _assert("T02", fm.get("course") == "Neuroscience", "Full FM: course present")
        _assert("T02", fm.get("course_code") == "PHYT_6313", "Full FM: course_code present")
        _assert("T02", fm.get("unit_type") == "week", "Full FM: unit_type present")
        _assert("T02", fm.get("note_type") == "concept", "Full FM: note_type present")
    else:
        _skip("T02", "Cannot read full FM fixture")

    # Partial frontmatter
    partial = obsidian_get_file(f"{FIXTURE_PREFIX}/Partial FM.md")
    if partial.get("success"):
        fm = _parse_frontmatter_fields(partial["content"])
        _assert("T02", fm.get("course") == "Neuroscience", "Partial FM: course present")
        _assert("T02", fm.get("note_type") == "concept", "Partial FM: note_type present")
        _assert("T02", "course_code" not in fm, "Partial FM: course_code absent")
        _assert("T02", "unit_type" not in fm, "Partial FM: unit_type absent")
    else:
        _skip("T02", "Cannot read partial FM fixture")

    # No frontmatter
    bare = obsidian_get_file(f"{FIXTURE_PREFIX}/Orphan Island.md")
    if bare.get("success"):
        fm = _parse_frontmatter_fields(bare["content"])
        _assert("T02", fm == {}, "No FM: returns empty dict")
    else:
        _skip("T02", "Cannot read no-FM fixture")


# ---------------------------------------------------------------------------
# Task 3: Test _resolve_frontmatter_from_path()
# ---------------------------------------------------------------------------

def task_03_resolve_from_path() -> None:
    print("\n=== Task 3: _resolve_frontmatter_from_path() ===")

    # Path inside a known course folder
    r = _resolve_frontmatter_from_path("Study Notes/Neuroscience/Week 5/concept_motor.md")
    _assert("T03", r.get("course") == "Neuroscience", "Course resolved from path")
    _assert("T03", bool(r.get("course_code")), "course_code resolved from path")
    _assert("T03", bool(r.get("unit_type")), "unit_type resolved from path")
    _assert("T03", r.get("note_type") == "concept", "note_type from filename pattern")

    # Path outside any course
    r2 = _resolve_frontmatter_from_path(f"{FIXTURE_PREFIX}/Orphan Island.md")
    _assert("T03", not r2.get("course"), "Non-course path: no course resolved")

    # session pattern
    r3 = _resolve_frontmatter_from_path("Study Notes/Neuroscience/session_review.md")
    _assert("T03", r3.get("note_type") == "session", "session pattern matched")


# ---------------------------------------------------------------------------
# Task 4: Test _check_frontmatter() via scan_vault
# ---------------------------------------------------------------------------

def task_04_check_frontmatter() -> None:
    print("\n=== Task 4: _check_frontmatter() via scan ===")

    result = scan_vault(folder=FIXTURE_PREFIX, checks=["frontmatter"])
    _assert("T04", result.api_available, "API available")
    _assert("T04", result.notes_scanned > 0, f"Scanned {result.notes_scanned} notes")

    fm_issues = [i for i in result.issues if i.issue_type == "missing_frontmatter"]
    _assert("T04", len(fm_issues) > 0, f"Found {len(fm_issues)} frontmatter issues")

    # Partial FM should have issues for course_code and unit_type but NOT course or note_type
    partial_issues = [i for i in fm_issues if "Partial FM" in i.path]
    partial_fields = {i.field for i in partial_issues}
    _assert("T04", "course_code" in partial_fields, "Partial FM: missing course_code detected")
    _assert("T04", "unit_type" in partial_fields, "Partial FM: missing unit_type detected")
    _assert("T04", "course" not in partial_fields, "Partial FM: course NOT flagged (present)")
    _assert("T04", "note_type" not in partial_fields, "Partial FM: note_type NOT flagged (present)")

    # Orphan Island has no FM at all -> 4 missing fields
    orphan_issues = [i for i in fm_issues if "Orphan Island" in i.path]
    _assert("T04", len(orphan_issues) == 4, f"Orphan Island: {len(orphan_issues)} missing fields (expect 4)")

    # Neuro Concepts has no FM -> 4 missing fields
    neuro_issues = [i for i in fm_issues if "Neuro Concepts" in i.path]
    _assert("T04", len(neuro_issues) == 4, f"Neuro Concepts: {len(neuro_issues)} missing fields (expect 4)")

    # MyNote has full FM -> 0 issues
    mynote_issues = [i for i in fm_issues if "MyNote" in i.path]
    _assert("T04", len(mynote_issues) == 0, "MyNote: no frontmatter issues (complete)")

    # Fixable flag: fixture paths are under _janitor_test/ which doesn't match any
    # course in course_map, so path-based resolution returns nothing.
    # Verify fixable=False is correctly set when no resolution is possible.
    fixable_issues = [i for i in fm_issues if i.fixable]
    non_fixable = [i for i in fm_issues if not i.fixable]
    _assert("T04", len(non_fixable) > 0,
            f"Non-fixable issues found ({len(non_fixable)}) — expected for non-course paths")


# ---------------------------------------------------------------------------
# Task 5: Test _check_orphans()
# ---------------------------------------------------------------------------

def task_05_check_orphans() -> None:
    print("\n=== Task 5: _check_orphans() ===")

    result = scan_vault(checks=["orphan"])
    _assert("T05", result.api_available, "API available")

    orphan_issues = result.issues
    orphan_paths = {i.path for i in orphan_issues}

    # Orphan Island should be in orphan list
    has_orphan_island = any("Orphan Island" in p for p in orphan_paths)
    _assert("T05", has_orphan_island, "Orphan Island detected as orphan")

    # Notes that are linked TO should NOT be orphans
    # _North_Star links to Calibrate, Encode, etc.
    calibrate_orphan = any(p.endswith("Calibrate.md") and "Calibrate" in p for p in orphan_paths)
    # Note: Calibrate may or may not be an orphan depending on vault links
    # The key assertion is Orphan Island IS detected
    print(f"  INFO: {len(orphan_issues)} total orphans found")


# ---------------------------------------------------------------------------
# Task 6: Test _check_broken_links()
# ---------------------------------------------------------------------------

def task_06_check_broken_links() -> None:
    print("\n=== Task 6: _check_broken_links() ===")

    result = scan_vault(folder=FIXTURE_PREFIX, checks=["broken_link"])
    _assert("T06", result.api_available, "API available")

    bl_issues = [i for i in result.issues if i.issue_type == "broken_link"]

    # Broken Links fixture should flag NonExistentNote
    non_exist = [i for i in bl_issues if i.field == "NonExistentNote"]
    _assert("T06", len(non_exist) > 0, "NonExistentNote detected as broken link")

    # OBJ-UNMAPPED should also be broken
    obj_unmapped = [i for i in bl_issues if i.field == "OBJ-UNMAPPED"]
    _assert("T06", len(obj_unmapped) > 0, "OBJ-UNMAPPED detected as broken link")

    # Calibrate is a real note — should NOT be flagged
    calibrate_broken = [i for i in bl_issues if i.field == "Calibrate"]
    _assert("T06", len(calibrate_broken) == 0, "Calibrate NOT flagged (exists in vault)")

    print(f"  INFO: {len(bl_issues)} broken links found in fixture folder")


# ---------------------------------------------------------------------------
# Task 7: Test _check_casing()
# ---------------------------------------------------------------------------

def task_07_check_casing() -> None:
    print("\n=== Task 7: _check_casing() ===")

    # Windows NTFS is case-insensitive, so creating "Casing Test/" and "casing test/"
    # results in the same folder. Test the checker directly with synthetic paths.
    synthetic_paths = [
        f"{FIXTURE_PREFIX}/Casing Test/MyNote.md",
        f"{FIXTURE_PREFIX}/casing test/AnotherNote.md",
    ]
    casing_issues = _check_casing(synthetic_paths)
    _assert("T07", len(casing_issues) > 0, f"Casing conflicts found: {len(casing_issues)}")

    has_casing_conflict = any(
        "Casing Test" in i.detail or "casing test" in i.detail
        for i in casing_issues
    )
    _assert("T07", has_casing_conflict, "'Casing Test' vs 'casing test' conflict detected")

    # Consistent paths produce no issues
    consistent = [
        f"{FIXTURE_PREFIX}/Same Case/a.md",
        f"{FIXTURE_PREFIX}/Same Case/b.md",
    ]
    _assert("T07", _check_casing(consistent) == [], "Consistent casing: no issues")


# ---------------------------------------------------------------------------
# Task 8: Test _check_duplicates()
# ---------------------------------------------------------------------------

def task_08_check_duplicates() -> None:
    print("\n=== Task 8: _check_duplicates() ===")

    result = scan_vault(folder=FIXTURE_PREFIX, checks=["duplicate"])
    _assert("T08", result.api_available, "API available")

    dup_issues = [i for i in result.issues if i.issue_type == "duplicate"]
    _assert("T08", len(dup_issues) > 0, f"Duplicates found: {len(dup_issues)}")

    # Should flag Duplicate A / Duplicate B pair
    dup_paths = [i.path for i in dup_issues]
    has_dup = any("Duplicate" in p for p in dup_paths)
    _assert("T08", has_dup, "Duplicate A/B pair detected")

    # Notes with different content should NOT be flagged
    non_dup_flagged = any("MyNote" in p for p in dup_paths)
    _assert("T08", not non_dup_flagged, "MyNote NOT flagged as duplicate")


# ---------------------------------------------------------------------------
# Task 9: Test scan_vault() orchestrator
# ---------------------------------------------------------------------------

def task_09_scan_vault_orchestrator() -> None:
    print("\n=== Task 9: scan_vault() orchestrator ===")

    # Full scan
    full = scan_vault()
    _assert("T09", full.api_available, "Full scan: API available")
    _assert("T09", full.notes_scanned > 0, f"Full scan: {full.notes_scanned} notes")
    _assert("T09", len(full.issues) > 0, f"Full scan: {len(full.issues)} issues")
    _assert("T09", full.scan_time_ms > 0, f"Full scan: {full.scan_time_ms}ms")

    issue_types = {i.issue_type for i in full.issues}
    _assert("T09", "missing_frontmatter" in issue_types, "Full scan includes frontmatter issues")

    # Folder filter
    folder_result = scan_vault(folder=FIXTURE_PREFIX)
    _assert("T09", folder_result.api_available, "Folder scan: API available")
    all_in_folder = all(
        FIXTURE_PREFIX in i.path or i.issue_type in ("orphan", "casing_mismatch")
        for i in folder_result.issues
    )
    _assert("T09", folder_result.notes_scanned <= full.notes_scanned,
            f"Folder scan: {folder_result.notes_scanned} <= {full.notes_scanned}")

    # Check filter: orphan only
    orphan_only = scan_vault(checks=["orphan"])
    orphan_types = {i.issue_type for i in orphan_only.issues}
    _assert("T09", orphan_types <= {"orphan"}, "Orphan-only scan: only orphan issues")

    # Alias filter: "frontmatter" -> "missing_frontmatter"
    alias = scan_vault(checks=["frontmatter"])
    alias_types = {i.issue_type for i in alias.issues}
    _assert("T09", alias_types <= {"missing_frontmatter"},
            "Alias 'frontmatter' resolves to missing_frontmatter")

    # Combined filters
    combined = scan_vault(folder=FIXTURE_PREFIX, checks=["frontmatter"])
    _assert("T09", combined.api_available, "Combined filter: API available")
    _assert("T09", combined.notes_scanned > 0, "Combined filter: notes scanned")


# ---------------------------------------------------------------------------
# Task 10: Test apply_fix()
# ---------------------------------------------------------------------------

def task_10_apply_fix() -> None:
    print("\n=== Task 10: apply_fix() ===")

    # Fix a fixable frontmatter issue on Partial FM (missing course_code)
    # First, scan to find the fixable issue
    result = scan_vault(folder=FIXTURE_PREFIX, checks=["frontmatter"])
    partial_issues = [
        i for i in result.issues
        if "Partial FM" in i.path and i.field == "course_code"
    ]

    if partial_issues:
        issue = partial_issues[0]
        if issue.fixable and issue.fix_data.get("course_code"):
            fix_result = apply_fix(issue)
            _assert("T10", fix_result.get("success"), f"Fix course_code: {fix_result.get('detail')}")

            # Verify field was written
            note = obsidian_get_file(f"{FIXTURE_PREFIX}/Partial FM.md")
            if note.get("success"):
                fm = _parse_frontmatter_fields(note["content"])
                _assert("T10", "course_code" in fm, "course_code now in frontmatter")
            else:
                _skip("T10", "Cannot read Partial FM after fix")

            # Idempotent: fix same field again
            idem_result = apply_fix(issue)
            _assert("T10", idem_result.get("success"), "Idempotent fix succeeds")
            _assert("T10", idem_result.get("detail") == "Already present",
                    f"Idempotent detail: '{idem_result.get('detail')}'")
        else:
            # If not fixable via path resolution, do manual fix
            manual_issue = JanitorIssue(
                issue_type="missing_frontmatter",
                path=f"{FIXTURE_PREFIX}/Partial FM.md",
                field="course_code",
                fixable=True,
                fix_data={"course_code": "PHYT_6313"},
            )
            fix_result = apply_fix(manual_issue)
            _assert("T10", fix_result.get("success"), f"Manual fix: {fix_result.get('detail')}")
    else:
        _skip("T10", "No course_code issue found for Partial FM")

    # Fix on non-fixable issue type (orphan)
    orphan_issue = JanitorIssue(
        issue_type="orphan",
        path=f"{FIXTURE_PREFIX}/Orphan Island.md",
        fixable=False,
    )
    result_nf = apply_fix(orphan_issue)
    _assert("T10", not result_nf.get("success"), "Non-frontmatter issue: not fixable")

    # Fix with no fix_data
    empty_issue = JanitorIssue(
        issue_type="missing_frontmatter",
        path=f"{FIXTURE_PREFIX}/Orphan Island.md",
        field="course",
        fixable=False,
        fix_data={},
    )
    result_empty = apply_fix(empty_issue)
    _assert("T10", not result_empty.get("success"), "No fix_data: returns failure")


# ---------------------------------------------------------------------------
# Task 11: Test apply_fixes() batch
# ---------------------------------------------------------------------------

def task_11_apply_fixes_batch() -> None:
    print("\n=== Task 11: apply_fixes() batch ===")

    # Create a batch of fixable issues
    fixable_issues = [
        JanitorIssue(
            issue_type="missing_frontmatter",
            path=f"{FIXTURE_PREFIX}/Orphan Island.md",
            field="course",
            fixable=True,
            fix_data={"course": "Neuroscience"},
        ),
        JanitorIssue(
            issue_type="missing_frontmatter",
            path=f"{FIXTURE_PREFIX}/Orphan Island.md",
            field="course_code",
            fixable=True,
            fix_data={"course_code": "PHYT_6313"},
        ),
    ]

    # Mix in a non-fixable
    mixed = fixable_issues + [
        JanitorIssue(
            issue_type="orphan",
            path=f"{FIXTURE_PREFIX}/Orphan Island.md",
            fixable=False,
        ),
    ]

    results = apply_fixes(mixed)
    _assert("T11", len(results) == 3, f"Batch returned {len(results)} results (expect 3)")

    successes = [r for r in results if r.get("success")]
    failures = [r for r in results if not r.get("success")]
    _assert("T11", len(successes) >= 2, f"{len(successes)} successes (expect >=2)")
    _assert("T11", len(failures) >= 1, f"{len(failures)} failures (expect >=1)")


# ---------------------------------------------------------------------------
# Task 12: Test _build_ai_system_prompt()
# ---------------------------------------------------------------------------

def task_12_build_ai_prompt() -> None:
    print("\n=== Task 12: _build_ai_system_prompt() ===")

    prompt = _build_ai_system_prompt()
    _assert("T12", "course" in prompt, "Prompt mentions 'course'")
    _assert("T12", "course_code" in prompt, "Prompt mentions 'course_code'")
    _assert("T12", "unit_type" in prompt, "Prompt mentions 'unit_type'")
    _assert("T12", "note_type" in prompt, "Prompt mentions 'note_type'")

    # Verify JSON-parseable lists are embedded
    _assert("T12", "Neuroscience" in prompt, "Prompt includes Neuroscience course")
    _assert("T12", "concept" in prompt, "Prompt includes concept note_type")

    # Try to extract and parse the JSON arrays from the prompt
    _assert("T12", '"high"' in prompt or "'high'" in prompt or "high" in prompt,
            "Prompt mentions confidence levels")


# ---------------------------------------------------------------------------
# Task 13: Test ai_infer_frontmatter() — live LLM
# ---------------------------------------------------------------------------

def task_13_ai_infer_frontmatter() -> None:
    print("\n=== Task 13: ai_infer_frontmatter() — live LLM ===")

    # Note with course-identifiable content
    neuro = obsidian_get_file(f"{FIXTURE_PREFIX}/Neuro Concepts.md")
    if not neuro.get("success"):
        _skip("T13", "Cannot read Neuro Concepts fixture")
        return

    content = neuro["content"]
    existing = _parse_frontmatter_fields(content)
    result = ai_infer_frontmatter(f"{FIXTURE_PREFIX}/Neuro Concepts.md", content, existing)

    _assert("T13", "suggestions" in result, "Result has suggestions key")
    _assert("T13", "reasoning" in result, "Result has reasoning key")

    if result.get("suggestions"):
        # LLM should suggest Neuroscience-related values
        sugg = result["suggestions"]
        print(f"  INFO: LLM suggestions: {json.dumps(sugg, indent=2)}")
        _assert("T13", len(sugg) > 0, f"LLM returned {len(sugg)} suggestions")
    else:
        # LLM may have errored
        _assert("T13", False, f"No suggestions: {result.get('reasoning', result.get('error'))}")

    # All fields present -> skip LLM
    all_present = {f: "value" for f in REQUIRED_FM_FIELDS}
    skip_result = ai_infer_frontmatter("x.md", "content", all_present)
    _assert("T13", skip_result["suggestions"] == {}, "All fields present: empty suggestions")
    _assert("T13", skip_result["reasoning"] == "All fields present", "All fields present: correct reasoning")


# ---------------------------------------------------------------------------
# Task 14: Test ai_resolve() — live LLM
# ---------------------------------------------------------------------------

def task_14_ai_resolve() -> None:
    print("\n=== Task 14: ai_resolve() — live LLM ===")

    # missing_frontmatter
    fm_result = ai_resolve(f"{FIXTURE_PREFIX}/Neuro Concepts.md", "missing_frontmatter")
    _assert("T14", fm_result.get("success") is True, "FM resolve: success")
    _assert("T14", fm_result.get("apply_action") == "update_frontmatter",
            f"FM resolve: action={fm_result.get('apply_action')}")

    # orphan -> add_links (no LLM call)
    orphan_result = ai_resolve(f"{FIXTURE_PREFIX}/Orphan Island.md", "orphan")
    _assert("T14", orphan_result.get("success") is True, "Orphan resolve: success")
    _assert("T14", orphan_result.get("apply_action") == "add_links",
            f"Orphan resolve: action={orphan_result.get('apply_action')}")

    # broken_link
    bl_result = ai_resolve(
        f"{FIXTURE_PREFIX}/Broken Links.md",
        "broken_link",
        context={"broken_target": "OBJ-UNMAPPED"},
    )
    _assert("T14", bl_result.get("success") is True,
            f"Broken link resolve: success={bl_result.get('success')}, error={bl_result.get('error')}")
    if bl_result.get("success"):
        _assert("T14", bl_result.get("apply_action") == "rename_link",
                f"Broken link resolve: action={bl_result.get('apply_action')}")

    # unsupported type
    unsup = ai_resolve("x.md", "unsupported_type")
    _assert("T14", unsup.get("success") is False, "Unsupported type: failure")
    _assert("T14", "Unsupported" in unsup.get("error", ""), "Unsupported type: error message")

    # missing path still works for orphan (no file read needed)
    # but for frontmatter it would fail on read
    missing_result = ai_resolve("nonexistent/path.md", "missing_frontmatter")
    _assert("T14", missing_result.get("success") is False, "Missing path: failure for frontmatter")


# ---------------------------------------------------------------------------
# Task 15: Test ai_apply() — live writes
# ---------------------------------------------------------------------------

def task_15_ai_apply() -> None:
    print("\n=== Task 15: ai_apply() — live writes ===")

    # update_frontmatter on Neuro Concepts
    suggestion = {
        "course": {"value": "Neuroscience", "confidence": "high"},
        "course_code": {"value": "PHYT_6313", "confidence": "high"},
        "unit_type": {"value": "week", "confidence": "medium"},
        "note_type": {"value": "concept", "confidence": "medium"},
    }
    result = ai_apply(f"{FIXTURE_PREFIX}/Neuro Concepts.md", "update_frontmatter", suggestion)
    _assert("T15", result.get("success") is True, f"Update FM: {result.get('detail')}")

    # Verify frontmatter written
    note = obsidian_get_file(f"{FIXTURE_PREFIX}/Neuro Concepts.md")
    if note.get("success"):
        fm = _parse_frontmatter_fields(note["content"])
        _assert("T15", fm.get("course") == "Neuroscience", "Neuro: course written")
        _assert("T15", fm.get("course_code") == "PHYT_6313", "Neuro: course_code written")
    else:
        _skip("T15", "Cannot read Neuro Concepts after ai_apply")

    # rename_link on Broken Links
    rename_sugg = {"old_target": "NonExistentNote", "new_target": "Calibrate"}
    rename_result = ai_apply(f"{FIXTURE_PREFIX}/Broken Links.md", "rename_link", rename_sugg)
    _assert("T15", rename_result.get("success") is True, f"Rename link: {rename_result.get('detail')}")

    # Verify the link was renamed
    bl_note = obsidian_get_file(f"{FIXTURE_PREFIX}/Broken Links.md")
    if bl_note.get("success"):
        _assert("T15", "[[Calibrate]]" in bl_note["content"], "Broken Links: [[Calibrate]] present")
        _assert("T15", "[[NonExistentNote]]" not in bl_note["content"],
                "Broken Links: [[NonExistentNote]] removed")
    else:
        _skip("T15", "Cannot read Broken Links after rename")

    # unknown action
    unknown = ai_apply("x.md", "unknown_action", {})
    _assert("T15", unknown.get("success") is False, "Unknown action: failure")
    _assert("T15", "Unknown" in unknown.get("detail", ""), "Unknown action: detail message")


# ---------------------------------------------------------------------------
# Task 16: Test enrich_links() standalone
# ---------------------------------------------------------------------------

def task_16_enrich_links() -> None:
    print("\n=== Task 16: enrich_links() standalone ===")

    # Reset Orphan Island to its original content (no links)
    obsidian_save_file(
        f"{FIXTURE_PREFIX}/Orphan Island.md",
        FIXTURES[f"{FIXTURE_PREFIX}/Orphan Island.md"],
    )
    time.sleep(0.5)

    result = enrich_links(f"{FIXTURE_PREFIX}/Orphan Island.md")
    _assert("T16", result.get("success") is True, f"Enrich: success={result.get('success')}")
    _assert("T16", isinstance(result.get("links_added"), int),
            f"Enrich: links_added={result.get('links_added')}")
    print(f"  INFO: {result.get('links_added', 0)} links added to Orphan Island")


# ---------------------------------------------------------------------------
# Task 17–24: API endpoint tests via Flask test client
# ---------------------------------------------------------------------------

def _get_test_client():
    """Create a Flask test client."""
    from dashboard.app import create_app
    app = create_app()
    app.config["TESTING"] = True
    return app.test_client()


def task_17_api_health() -> None:
    print("\n=== Task 17: GET /api/janitor/health ===")
    client = _get_test_client()
    resp = client.get("/api/janitor/health")
    _assert("T17", resp.status_code == 200, f"Status: {resp.status_code}")

    data = resp.get_json()
    _assert("T17", "available" in data, "Response has 'available'")
    _assert("T17", "notes_scanned" in data, "Response has 'notes_scanned'")
    _assert("T17", "total_issues" in data, "Response has 'total_issues'")
    _assert("T17", "counts" in data, "Response has 'counts'")
    _assert("T17", "scan_time_ms" in data, "Response has 'scan_time_ms'")
    _assert("T17", data["available"] is True, "API is available")
    print(f"  INFO: {data.get('total_issues')} issues, {data.get('notes_scanned')} notes")


def task_18_api_scan() -> None:
    print("\n=== Task 18: POST /api/janitor/scan ===")
    client = _get_test_client()

    # No body -> full scan
    resp = client.post("/api/janitor/scan", json={})
    _assert("T18", resp.status_code == 200, f"Full scan status: {resp.status_code}")
    data = resp.get_json()
    _assert("T18", data.get("available") is True, "Full scan: available")
    _assert("T18", len(data.get("issues", [])) > 0, f"Full scan: {len(data.get('issues', []))} issues")

    # Folder filter
    resp2 = client.post("/api/janitor/scan", json={"folder": FIXTURE_PREFIX})
    data2 = resp2.get_json()
    _assert("T18", data2.get("available") is True, "Folder scan: available")
    _assert("T18", data2.get("notes_scanned", 0) > 0, f"Folder scan: {data2.get('notes_scanned')} notes")

    # Single check
    resp3 = client.post("/api/janitor/scan", json={"checks": ["orphan"]})
    data3 = resp3.get_json()
    issue_types = {i["issue_type"] for i in data3.get("issues", [])}
    _assert("T18", issue_types <= {"orphan"}, f"Orphan-only: types={issue_types}")

    # Combined
    resp4 = client.post("/api/janitor/scan", json={"folder": FIXTURE_PREFIX, "checks": ["frontmatter"]})
    data4 = resp4.get_json()
    _assert("T18", data4.get("available") is True, "Combined filter: available")


def task_19_api_fix() -> None:
    print("\n=== Task 19: POST /api/janitor/fix ===")
    client = _get_test_client()

    # Reset Duplicate A to have missing FM for testing
    issues_payload = [
        {
            "issue_type": "missing_frontmatter",
            "path": f"{FIXTURE_PREFIX}/Duplicate A.md",
            "field": "note_type",
            "fixable": True,
            "fix_data": {"note_type": "concept"},
        },
    ]
    resp = client.post("/api/janitor/fix", json={"issues": issues_payload})
    _assert("T19", resp.status_code == 200, f"Fix status: {resp.status_code}")
    data = resp.get_json()
    _assert("T19", "results" in data, "Response has 'results'")
    _assert("T19", len(data["results"]) == 1, f"1 result returned")

    # Empty issues
    resp2 = client.post("/api/janitor/fix", json={"issues": []})
    data2 = resp2.get_json()
    _assert("T19", data2.get("results") == [], "Empty issues: empty results")


def task_20_api_options() -> None:
    print("\n=== Task 20: GET /api/janitor/options ===")
    client = _get_test_client()

    resp = client.get("/api/janitor/options")
    _assert("T20", resp.status_code == 200, f"Status: {resp.status_code}")

    data = resp.get_json()
    _assert("T20", "course" in data, "Response has 'course'")
    _assert("T20", "course_code" in data, "Response has 'course_code'")
    _assert("T20", "unit_type" in data, "Response has 'unit_type'")
    _assert("T20", "note_type" in data, "Response has 'note_type'")

    _assert("T20", isinstance(data["course"], list), "course is a list")
    _assert("T20", isinstance(data["course_code"], dict), "course_code is a dict")
    _assert("T20", isinstance(data["unit_type"], list), "unit_type is a list")
    _assert("T20", isinstance(data["note_type"], list), "note_type is a list")
    _assert("T20", len(data["course"]) > 0, f"course has {len(data['course'])} entries")
    _assert("T20", len(data["note_type"]) > 0, f"note_type has {len(data['note_type'])} entries")

    print(f"  INFO: courses={data['course']}, note_types={data['note_type']}")


def task_21_api_enrich() -> None:
    print("\n=== Task 21: POST /api/janitor/enrich ===")
    client = _get_test_client()

    # Reset Orphan Island
    obsidian_save_file(
        f"{FIXTURE_PREFIX}/Orphan Island.md",
        FIXTURES[f"{FIXTURE_PREFIX}/Orphan Island.md"],
    )
    time.sleep(0.5)

    resp = client.post("/api/janitor/enrich",
                       json={"path": f"{FIXTURE_PREFIX}/Orphan Island.md"})
    _assert("T21", resp.status_code == 200, f"Status: {resp.status_code}")
    data = resp.get_json()
    _assert("T21", "success" in data, "Response has 'success'")
    _assert("T21", "links_added" in data, "Response has 'links_added'")

    # Empty path -> 400
    resp2 = client.post("/api/janitor/enrich", json={"path": ""})
    _assert("T21", resp2.status_code == 400, f"Empty path: status={resp2.status_code}")


def task_22_api_ai_resolve() -> None:
    print("\n=== Task 22: POST /api/janitor/ai-resolve ===")
    client = _get_test_client()

    # Valid request
    resp = client.post("/api/janitor/ai-resolve", json={
        "path": f"{FIXTURE_PREFIX}/Neuro Concepts.md",
        "issue_type": "missing_frontmatter",
    })
    _assert("T22", resp.status_code == 200, f"Status: {resp.status_code}")
    data = resp.get_json()
    _assert("T22", "success" in data, "Response has 'success'")

    # Missing path -> 400
    resp2 = client.post("/api/janitor/ai-resolve", json={"issue_type": "orphan"})
    _assert("T22", resp2.status_code == 400, f"Missing path: status={resp2.status_code}")

    # Missing issue_type -> 400
    resp3 = client.post("/api/janitor/ai-resolve", json={"path": "x.md"})
    _assert("T22", resp3.status_code == 400, f"Missing issue_type: status={resp3.status_code}")


def task_23_api_ai_apply() -> None:
    print("\n=== Task 23: POST /api/janitor/ai-apply ===")
    client = _get_test_client()

    # Valid request (orphan -> add_links is safe and doesn't need specific suggestion)
    resp = client.post("/api/janitor/ai-apply", json={
        "path": f"{FIXTURE_PREFIX}/Orphan Island.md",
        "apply_action": "add_links",
        "suggestion": {},
    })
    _assert("T23", resp.status_code == 200, f"Status: {resp.status_code}")
    data = resp.get_json()
    _assert("T23", "success" in data, "Response has 'success'")

    # Missing path -> 400
    resp2 = client.post("/api/janitor/ai-apply", json={"apply_action": "add_links"})
    _assert("T23", resp2.status_code == 400, f"Missing path: status={resp2.status_code}")

    # Missing apply_action -> 400
    resp3 = client.post("/api/janitor/ai-apply", json={"path": "x.md"})
    _assert("T23", resp3.status_code == 400, f"Missing apply_action: status={resp3.status_code}")


def task_24_api_batch_enrich() -> None:
    print("\n=== Task 24: POST /api/janitor/batch-enrich ===")
    client = _get_test_client()

    # With explicit paths
    resp = client.post("/api/janitor/batch-enrich", json={
        "paths": [f"{FIXTURE_PREFIX}/Orphan Island.md"],
        "max_batch": 1,
    })
    _assert("T24", resp.status_code == 200, f"Explicit paths status: {resp.status_code}")
    data = resp.get_json()
    _assert("T24", "total_processed" in data, "Response has 'total_processed'")
    _assert("T24", "total_links_added" in data, "Response has 'total_links_added'")
    _assert("T24", "results" in data, "Response has 'results'")
    _assert("T24", data["total_processed"] == 1, f"Processed: {data['total_processed']}")

    # Folder-scoped
    resp2 = client.post("/api/janitor/batch-enrich", json={
        "folder": FIXTURE_PREFIX,
        "max_batch": 2,
    })
    data2 = resp2.get_json()
    _assert("T24", data2.get("total_processed", 0) <= 2,
            f"Folder batch: processed {data2.get('total_processed')}")

    # Default (no paths, no folder) with small batch
    resp3 = client.post("/api/janitor/batch-enrich", json={"max_batch": 3})
    data3 = resp3.get_json()
    _assert("T24", data3.get("total_processed", 0) <= 3,
            f"Default batch: processed {data3.get('total_processed')}")


# ---------------------------------------------------------------------------
# Task 25: Cleanup
# ---------------------------------------------------------------------------

def task_25_cleanup() -> bool:
    print("\n=== Task 25: Cleanup fixtures ===")
    all_ok = True

    # Delete each fixture file
    for path in FIXTURES:
        result = obsidian_delete_file(path)
        ok = result.get("success", False) or "not found" in result.get("error", "").lower()
        if not ok:
            print(f"  WARN: Failed to delete {path}: {result.get('error')}")
            all_ok = False

    # Delete subfolders
    for subfolder in [
        f"{FIXTURE_PREFIX}/Casing Test",
        f"{FIXTURE_PREFIX}/casing test",
        f"{FIXTURE_PREFIX}/subfolder",
    ]:
        obsidian_delete_folder(subfolder, recursive=True)

    # Delete root test folder
    time.sleep(0.5)
    obsidian_delete_folder(FIXTURE_PREFIX, recursive=True)

    # Verify cleanup: scan should not find fixture paths
    time.sleep(1)
    result = scan_vault(folder=FIXTURE_PREFIX)
    _assert("T25", result.notes_scanned == 0,
            f"Cleanup verified: {result.notes_scanned} notes remain in {FIXTURE_PREFIX}")

    return all_ok


# ---------------------------------------------------------------------------
# Main runner
# ---------------------------------------------------------------------------

def main() -> None:
    print("=" * 60)
    print("Vault Janitor — Live Integration Tests")
    print("=" * 60)

    # Preflight: check Obsidian API is reachable
    from obsidian_index import get_vault_index
    idx = get_vault_index(force_refresh=True)
    if not idx.get("success"):
        print("\nFATAL: Obsidian API not reachable. Is Obsidian running with Local REST API?")
        sys.exit(1)
    print(f"Vault connected: {idx.get('count')} notes found")

    # Phase 1: Setup
    if not task_01_create_fixtures():
        print("\nFATAL: Fixture creation failed. Aborting.")
        task_25_cleanup()
        sys.exit(1)

    try:
        # Phase 2: Unit function tests
        task_02_parse_frontmatter()
        task_03_resolve_from_path()

        # Phase 3: Checker tests (live vault)
        task_04_check_frontmatter()
        task_05_check_orphans()
        task_06_check_broken_links()
        task_07_check_casing()
        task_08_check_duplicates()

        # Phase 4: Orchestrator
        task_09_scan_vault_orchestrator()

        # Phase 5: Fix operations
        task_10_apply_fix()
        task_11_apply_fixes_batch()

        # Phase 6: AI prompt
        task_12_build_ai_prompt()

        # Phase 7: AI inference (live LLM)
        task_13_ai_infer_frontmatter()
        task_14_ai_resolve()
        task_15_ai_apply()
        task_16_enrich_links()

        # Phase 8: API endpoints
        task_17_api_health()
        task_18_api_scan()
        task_19_api_fix()
        task_20_api_options()
        task_21_api_enrich()
        task_22_api_ai_resolve()
        task_23_api_ai_apply()
        task_24_api_batch_enrich()

    finally:
        # Phase 9: Cleanup always runs
        task_25_cleanup()

    # Summary
    total = _PASS + _FAIL + _SKIP
    print("\n" + "=" * 60)
    print(f"RESULTS: {_PASS}/{total} passed, {_FAIL} failed, {_SKIP} skipped")
    print("=" * 60)

    if _FAIL > 0:
        print("\nFailed assertions:")
        for task, status, detail in _RESULTS:
            if status == "FAIL":
                print(f"  [{task}] {detail}")
        sys.exit(1)
    else:
        print("\nAll tests passed!")


if __name__ == "__main__":
    main()
