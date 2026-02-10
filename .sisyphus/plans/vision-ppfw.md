# Add VISION_PPFW Genesis Document

## TL;DR

> **Quick Summary**: Create the foundational "Genesis Document" (`docs/root/VISION_PPFW.md`) that captures the system's overall vision via the PPFW (Paradigm, Principles, Frameworks, Workflows) stack, and cross-reference it from 3 existing index files.
> 
> **Deliverables**:
> - `docs/root/VISION_PPFW.md` — new file (user-provided content)
> - `docs/README.md` — add Feature→Doc row + System References entry
> - `docs/root/README.md` — add to Contents list
> - `sop/library/00-overview.md` — add cross-reference after North Star Vision
> 
> **Estimated Effort**: Quick
> **Parallel Execution**: YES — 1 wave (create file) then 1 wave (3 cross-ref edits)
> **Critical Path**: Task 1 → Tasks 2, 3, 4 (parallel)

---

## Context

### Original Request
User wants to add their "Genesis Document" to the repo — a PPFW (Paradigm, Principles, Frameworks, Workflows) distillation that captures the theoretical foundation, agent blueprint, execution hierarchy, and master prompt for the PT Study system.

### Interview Summary
**Key Discussions**:
- File name: `VISION_PPFW.md` (user chose over `GENESIS.md` and `PHILOSOPHY.md`)
- Location: `docs/root/` (alongside other foundational docs)
- Cross-references: YES — update `docs/README.md`, `docs/root/README.md`, and `sop/library/00-overview.md`
- Content: User provided verbatim — no interpretation needed

**Research Findings**:
- `docs/root/` contains 9 existing .md files (architecture, guides, concept maps)
- `docs/README.md` is the canonical docs index with Feature→Doc mapping table (line 15-26) and System References section (line 39-47)
- `docs/root/README.md` has a Contents list (lines 6-12) enumerating folder files
- `sop/library/00-overview.md` has a "North Star Vision" section (lines 10-17) — natural insertion point
- Existing `COMPOSABLE_METHODS_VISION.md` at root covers a different (more specific) scope — no conflict

### Metis Review
**Identified Gaps** (addressed):
- `docs/root/README.md` Contents list update was missed in initial planning — now included as Task 3
- Cross-reference wording needed specification — resolved with concrete text in each task
- `CONCEPT_MAP_FLOW.md` is missing from `docs/root/README.md` Contents — not our scope, don't fix

---

## Work Objectives

### Core Objective
Add the PPFW Genesis Document to the repo as the theoretical foundation, and ensure it's discoverable from all relevant index files.

### Concrete Deliverables
- 1 new file: `docs/root/VISION_PPFW.md`
- 3 edited files: `docs/README.md`, `docs/root/README.md`, `sop/library/00-overview.md`

### Definition of Done
- [x] `docs/root/VISION_PPFW.md` exists and contains all 4 PPFW sections
- [x] `docs/README.md` links to it from Feature→Doc table AND System References
- [x] `docs/root/README.md` lists it in Contents
- [x] `sop/library/00-overview.md` references it from North Star Vision section
- [x] `git diff --name-only` shows exactly these 4 files and nothing else

### Must Have
- Verbatim user content in the new file (no AI rewording)
- All cross-references use relative paths
- File ends with single trailing newline

### Must NOT Have (Guardrails)
- Do NOT reorganize existing documentation structure
- Do NOT update `COMPOSABLE_METHODS_VISION.md` or any other files beyond the 4 specified
- Do NOT add placeholder sections like "## Future Work" or "## TODO"
- Do NOT modify any SOP library content beyond the one cross-reference line
- Do NOT add the vision content to multiple places (single source of truth)

---

## Verification Strategy (MANDATORY)

### Test Decision
- **Infrastructure exists**: YES (pytest in `brain/tests/`)
- **User wants tests**: NO — this is documentation only
- **QA approach**: Automated bash verification (grep checks)

---

## Execution Strategy

### Parallel Execution Waves

```
Wave 1 (Start Immediately):
└── Task 1: Create docs/root/VISION_PPFW.md [no dependencies]

Wave 2 (After Wave 1):
├── Task 2: Update docs/README.md [depends: 1]
├── Task 3: Update docs/root/README.md [depends: 1]
└── Task 4: Update sop/library/00-overview.md [depends: 1]

Critical Path: Task 1 → any of Tasks 2/3/4
Parallel Speedup: Tasks 2, 3, 4 are independent of each other
```

### Dependency Matrix

| Task | Depends On | Blocks | Can Parallelize With |
|------|------------|--------|---------------------|
| 1 | None | 2, 3, 4 | None (sole Wave 1 task) |
| 2 | 1 | None | 3, 4 |
| 3 | 1 | None | 2, 4 |
| 4 | 1 | None | 2, 3 |

### Agent Dispatch Summary

| Wave | Tasks | Recommended Agents |
|------|-------|-------------------|
| 1 | 1 | `delegate_task(category="quick", load_skills=["git-master"])` |
| 2 | 2, 3, 4 | Same agent continues (sequential edits are fast enough) |

---

## TODOs

- [x] 1. Create `docs/root/VISION_PPFW.md`

  **What to do**:
  - Create the file at `docs/root/VISION_PPFW.md` with the user's verbatim content
  - Add a document header with title and brief context line
  - Include all 4 sections:
    1. The PPFW Distillation (research targets table)
    2. The Root Agent Blueprint (Brain, Scholar, Tutor)
    3. The Execution Hierarchy (Macro, Meso, Micro)
    4. The Live System Initialization (master prompt blockquote)
  - Ensure file ends with single trailing newline

  **The exact content to write** (copy verbatim — do NOT paraphrase):

  ```markdown
  # VISION: PPFW Stack (Genesis Document)

  The theoretical and scientific foundation for the PT Study OS. This document distills the complex learning science theories into a clean **PPFW (Paradigm, Principles, Frameworks, Workflows)** stack. It serves as the "research map" for the Scholar and the architectural rationale for every design decision in the system.

  > **Relationship to other docs:**
  > - For the operational system built on this foundation, see `sop/library/00-overview.md`
  > - For the composable method library, see `sop/library/15-method-library.md`
  > - For the product architecture, see `docs/root/PROJECT_ARCHITECTURE.md`

  ---

  ## 1. The PPFW Distillation (Research Targets)

  Use these four buckets to conduct your "deep dive" into learning science. This is how the **Scholar** populates the system with high-quality methods.

  | Tier | Component | Research Focus for the "Scholar" |
  | --- | --- | --- |
  | **P** | **Paradigm** | **The Worldview:** Research *Constructivism*, *Connectivism*, and *Metacognition*. Your system views learning as "Mental Strength Training"—look for research on *Cognitive Load Theory* and *Desirable Difficulty*. |
  | **P** | **Principles** | **The Rules:** Research *Active Recall*, *Spaced Repetition (SRS)*, *Interleaving*, and *Dual Coding*. These are the non-negotiables that make any Micro-action effective. |
  | **F** | **Frameworks** | **The Mesos:** Research the *Prism/Weaver/Examiner* model, *Syntopical Reading*, and *Bloom's Taxonomy*. These provide the structure for your 6 phases (Prime → Overlearn). |
  | **W** | **Workflows** | **The Micros:** Research specific tactics like *Feynman Technique*, *Zettelkasten*, *Mermaid Flowcharting*, and *Socratic Questioning*. These are the interchangeable parts you "tweak." |

  ---

  ## 2. The Root Agent Blueprint

  These three agents are the "hardware" of your system.

  * **The Brain (Database):** Holds the "Source Truth" (uploaded materials) and the "Performance Log" (your scores and error types).
  * **The Scholar (Architect):** Researches the Abstraction Ladder and builds the Macro Chains. It is the "Admin" of the rules.
  * **The Tutor (Interface):** The only part you interact with during study. It executes the MAs and enforces the **Source-Lock** guardrails.

  ---

  ## 3. The Execution Hierarchy

  1. **Macro (The Chain):** A sequence of Mesos (e.g., `PRIME → ENCODE → RETRIEVE`).
  2. **Meso (The Phase):** A functional bucket with a specific "mode" of teaching (e.g., *Interrogate* mode is aggressive/skeptical).
  3. **Micro (The Tweak):** The specific Micro-Action (MA) chosen for that phase (e.g., using a *Timeline Lens* vs. a *System Lens*).

  ---

  ## 4. The Live System Initialization

  *The "Master Prompt" for turning a new AI chat into the Tutor agent.*

  > ### SYSTEM INITIALIZATION: MODULAR LEARNING ENGINE
  >
  > **ROLE:** You are the **TUTOR** agent in a three-part system (Brain, Scholar, Tutor). Your goal is to lead me through high-fidelity, source-locked study sessions.
  >
  > **MASTER RULES (GLOBAL):**
  > 1. **SOURCE-LOCK:** You are in a closed-circuit system. Use **ONLY** uploaded materials. If info is missing, state: "Not defined in provided material."
  > 2. **CITATION MANDATE:** Every claim, definition, or answer must be cited: `[Wk#, Slide#]` or `[Doc Name, Pg#]`.
  > 3. **SOCRATIC PERSONA:** Act as a "Mental Personal Trainer." Prioritize **Desirable Difficulty**. Do not give answers; give hints and ask diagnostic questions.
  > 4. **FIDELITY CHECK:** Ensure terminology matches the instructor's verbatim phrasing. Label any of your own synthesis as **"INFERRED."**
  >
  > **OPERATIONAL MODES (MESOS):**
  > * **PRIME:** Prioritize "Big Picture" deconstruction (Lenses).
  > * **ENCODE:** Focus on verbatim capture and atomic units.
  > * **INTERROGATE:** Act as a skeptic; find logical gaps and prerequisites.
  > * **RETRIEVE:** Zero-feedback mode. Pure active recall.
  > * **REFINE:** Detailed feedback loop and error logging.
  > * **OVERLEARN:** High-speed, interleaved practice across all topics.
  >
  > **SESSION START:** I will provide the materials. Once uploaded, I will give you a **MACRO CHAIN** (e.g., `PRIME → ENCODE`) and specify which **MICRO-ACTIONS (MA-01 to MA-30)** to execute.
  > **Acknowledge and wait for data upload.**
  ```

  **Must NOT do**:
  - Do NOT paraphrase, rewrite, or "improve" the user's content
  - Do NOT add sections beyond what's specified above
  - Do NOT add emojis

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single file creation with provided content, no complexity
  - **Skills**: [`git-master`]
    - `git-master`: For the commit at the end

  **Parallelization**:
  - **Can Run In Parallel**: NO (must be created before cross-references)
  - **Parallel Group**: Wave 1 (sole task)
  - **Blocks**: Tasks 2, 3, 4
  - **Blocked By**: None

  **References**:

  **Pattern References** (existing code to follow):
  - `docs/root/PROJECT_ARCHITECTURE.md:1-10` — Header style and formatting conventions for docs/root files
  - `COMPOSABLE_METHODS_VISION.md:1-10` — Example of another vision document's structure

  **Acceptance Criteria**:

  ```bash
  # File exists and contains PPFW content
  test -f docs/root/VISION_PPFW.md && echo "EXISTS"
  # Assert: Output is "EXISTS"

  # Contains all 4 main sections
  grep -c "^## [1-4]\." docs/root/VISION_PPFW.md
  # Assert: Output is "4"

  # Contains the PPFW table
  grep -q "Paradigm.*Worldview" docs/root/VISION_PPFW.md && echo "TABLE OK"
  # Assert: Output is "TABLE OK"

  # Contains the master prompt blockquote
  grep -q "SYSTEM INITIALIZATION: MODULAR LEARNING ENGINE" docs/root/VISION_PPFW.md && echo "PROMPT OK"
  # Assert: Output is "PROMPT OK"
  ```

  **Commit**: YES (group with Tasks 2, 3, 4)
  - Message: `docs: add VISION_PPFW genesis document with PPFW stack foundation`
  - Files: `docs/root/VISION_PPFW.md`, `docs/README.md`, `docs/root/README.md`, `sop/library/00-overview.md`
  - Pre-commit: verification grep commands above

---

- [x] 2. Add cross-reference in `docs/README.md`

  **What to do**:
  - Add a new row to the Feature → Doc Quick Reference table (after line 25, before the `|` table ends):
    ```
    | Vision & Theory | `docs/root/VISION_PPFW.md` |
    ```
  - Add a new entry to the System References section (after the last entry around line 47):
    ```
    - [Vision: PPFW Stack](root/VISION_PPFW.md)
    ```

  **Must NOT do**:
  - Do NOT reorder existing table rows
  - Do NOT modify any existing entries
  - Do NOT add more than these 2 insertions

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Two small insertions in one file
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 3, 4)
  - **Parallel Group**: Wave 2 (with Tasks 3, 4)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `docs/README.md:15-26` — Existing Feature→Doc table format (match column widths and style)
  - `docs/README.md:39-47` — Existing System References list format (match link style)

  **Acceptance Criteria**:

  ```bash
  # Feature table has the new row
  grep "Vision.*Theory.*VISION_PPFW" docs/README.md && echo "TABLE ROW OK"
  # Assert: Output contains the grep match + "TABLE ROW OK"

  # System References has the new entry
  grep "\[Vision: PPFW Stack\]" docs/README.md && echo "SYSREF OK"
  # Assert: Output contains the grep match + "SYSREF OK"

  # No other changes (only 2 new lines added)
  git diff docs/README.md | grep "^+" | grep -v "^+++" | wc -l
  # Assert: Output is "2"
  ```

  **Commit**: YES (grouped with Task 1, 3, 4)

---

- [x] 3. Add to Contents list in `docs/root/README.md`

  **What to do**:
  - Add a new bullet to the Contents list (after `SYSTEM_INVENTORY.md`, before the blank line):
    ```
    - `VISION_PPFW.md`
    ```
  - Insert in alphabetical position (after `SYSTEM_INVENTORY.md`, which is correct alphabetically since V > S)

  **Must NOT do**:
  - Do NOT fix the missing `CONCEPT_MAP_FLOW.md` entry (out of scope)
  - Do NOT change the "Contents" heading or any other content

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line insertion
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 4)
  - **Parallel Group**: Wave 2 (with Tasks 2, 4)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `docs/root/README.md:6-12` — Existing Contents list format (match bullet style: `- \`FILENAME.md\``)

  **Acceptance Criteria**:

  ```bash
  # Contents list includes VISION_PPFW.md
  grep "VISION_PPFW.md" docs/root/README.md && echo "CONTENTS OK"
  # Assert: Output contains "VISION_PPFW.md" + "CONTENTS OK"

  # Only 1 new line added
  git diff docs/root/README.md | grep "^+" | grep -v "^+++" | wc -l
  # Assert: Output is "1"
  ```

  **Commit**: YES (grouped with Tasks 1, 2, 4)

---

- [x] 4. Add cross-reference in `sop/library/00-overview.md`

  **What to do**:
  - After the "North Star Vision" bullet list (after line 17, the last bullet about "No Phantom Outputs"), add a blank line and then:
    ```
    For the theoretical foundation and PPFW paradigm stack underlying this system, see [VISION_PPFW.md](../../docs/root/VISION_PPFW.md).
    ```

  **Must NOT do**:
  - Do NOT modify any existing North Star Vision bullets
  - Do NOT change anything else in this file
  - Do NOT add this as a bullet point (it should be a standalone line, not part of the list)

  **Recommended Agent Profile**:
  - **Category**: `quick`
    - Reason: Single line insertion
  - **Skills**: [`git-master`]

  **Parallelization**:
  - **Can Run In Parallel**: YES (with Tasks 2, 3)
  - **Parallel Group**: Wave 2 (with Tasks 2, 3)
  - **Blocks**: None
  - **Blocked By**: Task 1

  **References**:

  **Pattern References**:
  - `sop/library/00-overview.md:10-18` — North Star Vision section (insert after line 17)
  - Relative path from `sop/library/` to `docs/root/` is `../../docs/root/`

  **Acceptance Criteria**:

  ```bash
  # Cross-reference exists
  grep "VISION_PPFW" sop/library/00-overview.md && echo "XREF OK"
  # Assert: Output contains the grep match + "XREF OK"

  # Link path is correct (relative)
  grep "../../docs/root/VISION_PPFW.md" sop/library/00-overview.md && echo "PATH OK"
  # Assert: Output contains the path + "PATH OK"

  # Only 2 new lines added (blank line + reference line)
  git diff sop/library/00-overview.md | grep "^+" | grep -v "^+++" | wc -l
  # Assert: Output is "2"
  ```

  **Commit**: YES (grouped with Tasks 1, 2, 3)

---

## Commit Strategy

| After Task | Message | Files | Verification |
|------------|---------|-------|--------------|
| All (1-4) | `docs: add VISION_PPFW genesis document with PPFW stack foundation` | `docs/root/VISION_PPFW.md`, `docs/README.md`, `docs/root/README.md`, `sop/library/00-overview.md` | All grep checks from acceptance criteria |

---

## Success Criteria

### Verification Commands
```bash
# 1. New file exists with all sections
test -f docs/root/VISION_PPFW.md && echo "FILE OK"
grep -c "^## [1-4]\." docs/root/VISION_PPFW.md  # Expected: 4

# 2. docs/README.md updated
grep "Vision.*Theory.*VISION_PPFW" docs/README.md && echo "TABLE OK"
grep "\[Vision: PPFW Stack\]" docs/README.md && echo "SYSREF OK"

# 3. docs/root/README.md updated
grep "VISION_PPFW.md" docs/root/README.md && echo "CONTENTS OK"

# 4. sop/library/00-overview.md updated
grep "../../docs/root/VISION_PPFW.md" sop/library/00-overview.md && echo "XREF OK"

# 5. No unintended file changes
git diff --name-only | sort
# Expected output (exactly):
#   docs/README.md
#   docs/root/README.md
#   docs/root/VISION_PPFW.md
#   sop/library/00-overview.md
```

### Final Checklist
- [x] All "Must Have" present (verbatim content, relative paths, trailing newline)
- [x] All "Must NOT Have" absent (no reorganization, no extra files, no placeholders)
- [x] Exactly 4 files touched, no more
