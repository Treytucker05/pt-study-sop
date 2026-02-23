# TUTOR NORTH STAR & SESSION CONTROL RULES
**Status:** Canonical / Locked
**Purpose:** Defines the deterministic session-start sequence, objective governance, and context boundaries to prevent LLM planning drift.

## 1. The North Star Gate
- **Ruling:** **Hard Gate.** The tutor MUST retrieve and validate the module's North Star document before generating any session plan.
- **Why:** Prevents plan generation from partial or hallucinated context. If missing, the tutor halts study planning and strictly triggers a `build_north_star` workflow.

## 2. Canonical North Star Path & Format
- **Ruling:** Path: `Study notes/<Class>/<Module or week>/<Subtopic>/_North_Star.md`.
- **Why:** This matches the live vault schema for the class → module/week → subtopic hierarchy and deterministic local retrieval.

## 3. Conflict Resolution: Instructor vs. Source
- **Ruling:** **Instructor Objectives ALWAYS win.**
- **Why:** We need one absolute authority for planning. Source material is just fuel; the instructor syllabus defines the exam. If source text exceeds the objective's scope, the tutor truncates or ignores the text.

## 4. Objective Status Model
- **Ruling:** Strict Enum: `["not_started", "active", "needs_review", "mastered"]`.
- **Why:** The agent cannot mathematically route sessions or calculate completion percentages without consistent state semantics. Free-text statuses are banned.

## 5. Minimum Objective Coverage
- **Ruling:** **100% Objective Mapping.**
- **Why:** Every concept introduced in this session must explicitly map to an active objective. In `module_all`, this means all nodes stay tied to the module objective set; in `single_focus`, ties are limited to the focus objective until expansion is authorized.

## 6. North Star Auto-Refresh
- **Ruling:** **Event-Driven (Detected Changes Only).**
- **Why:** Balances freshness vs. noise. Re-synthesizing the North Star file every session wastes tokens and risks overwriting stable progress. It only updates when an objective transitions state (e.g., `active` -> `mastered`) or new syllabus text is added.

## 7. Context History Loading
- **Ruling:** **N-1 (Last 1 Session) + Targeted Links.** 
- **Why:** Loading all history destroys the context window. At session start, the tutor loads exactly three things: the overarching North Star, the exact JSON from the immediately preceding session, and any `follow_up_targets` matching today's concepts.

## 8. Missing Objective IDs (Hard-Fail vs. Fallback)
- **Ruling:** **Graceful Fallback.** 
- **Why:** We cannot brick a study session because a syllabus PDF parsed poorly. If source material lacks mapped IDs, the tutor groups it under a synthetic ID (e.g., `OBJ-UNMAPPED`), proceeds with the session, and tags it for user review.

## 9. Required PRIME Methods
- **Ruling:** **M-PRE-010 (Learning Objectives Primer)** is mandatory and runs first.
- **Companion Rule:** In PRIME for first-contact material, **M-PRE-010 must be paired with **M-PRE-008** to create a structural overview before moving to ENCODE.
- **Why:** Anchors the student to the objective immediately, setting a consistent, goal-oriented default learning experience before dense text is introduced.

## 10. Assessment Boundary (PRIME vs. CALIBRATE)
- **Ruling:** **CONFIRMED.** 
- **Why:** PRIME is 100% non-assessment (orientation/teaching only). The first scored probe strictly occurs in CALIBRATE.

## 11. Visual Scaffold Law
- **Ruling:** **CONFIRMED.** 
- **Why:** PRIME = Tutor *provides* the scaffold. ENCODE = Learner *produces* or manipulates the scaffold from memory. Enforces strict method-stage clarity.

## 12. Schema Constraints
- **Ruling:** **CONFIRMED.** 
- **Why:** Strict wiki-link validation (`[[Concept Name]]`) is required at artifact creation. Keep generation deterministic and safe for Obsidian graph operations.
