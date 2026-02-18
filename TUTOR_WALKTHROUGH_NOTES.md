# Tutor Page Walkthrough Notes

**Date:** 2026-02-18  
**Status:** In Progress  
**Page:** /tutor  
**System:** CP-MSS v1.0 (Control Plane)

---

## Completed Fixes

### 1. Layout - Always Show Sidebar
- Changed from full-screen wizard to split view with sidebar
- SETUP/CHAT buttons visible immediately

### 2. Study Materials - Server-Side Filtering
- Fixed EBP course materials not showing
- Changed to pass `course_id` to API

### 3. Library Dropdown - Course Names
- Shows "EBP (PHYT 6220)" instead of just code

### 4. File Names - Show Only Filename
- Extracts filename from full path
- Shows "Search Assignment.docx" instead of full Windows path

### 5. Study Materials - Width Constraint (TEMPORARY FIX)
- Added `max-w-[200px]` to filename span to prevent overflow
- **Note:** This is a temporary fix - UI needs proper layout redesign

---

## Current Step: Tutor Wizard - Step 2 (Chain Selection)

**Location:** `/tutor` → Click "NEXT" after selecting course

### Pre-built Chain Selection

Three options available:
1. **PRE-BUILT** - Pick a chain template
2. **CUSTOM** - Build your own chain  
3. **AUTO** - System picks for you

### Template Chains (Control Plane v1.0)

**First Exposure Chains:**
| Chain | Duration | Stages | Use Case |
|-------|----------|--------|----------|
| `C-FE-STD` | 35 min | PRIME→CALIBRATE→ENCODE→REFERENCE→RETRIEVE | Standard first exposure |
| `C-FE-MIN` | 20 min | PRIME→REFERENCE→RETRIEVE→OVERLEARN | Low energy / short time |
| `C-FE-PRO` | 45 min | PRIME→ENCODE→REFERENCE→RETRIEVE | Lab/procedure learning |

**Chain Selection Modes:**
1. **PRE-BUILT** - Pick from template chains above
2. **CUSTOM** - Build your own chain (respects Dependency Law: REF before RET)
3. **AUTO** - System uses `brain/selector.py` to pick based on 7 Knobs (assessment_mode, time, energy, etc.)

**Dependency Law:** All chains enforce REFERENCE before RETRIEVE (no retrieval without targets).

---

## Next: To Be Continued...
