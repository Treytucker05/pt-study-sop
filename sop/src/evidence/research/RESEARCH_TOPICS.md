# Research Backlog: System Architecture Audit (v9.2)

## PART 1: BROAD EXPLORATION (The "Wide Lens")
*Goal: Find new structures to handle topics where current Engines might struggle.*

### 1. New Engine Research
*   [ ] **The Procedure Engine:** Current "Concept Engine" is declarative. Research "Cognitive Apprenticeship" (Collins/Brown) for teaching physical skills (e.g., goniometry, transfers) via text.
*   [ ] **The Case Engine:** Research "Case-Based Reasoning" (Kolodner). Should we add a mode for solving complex patient vignettes (SOAP note logic) distinct from M8 Diagnosis?
*   [ ] **The Debate Engine:** Research "Dialectical Learning." Should we add a "Devil's Advocate" mode to force defense of clinical choices?
*   [ ] **The Math/Physics Engine:** Research "Polya’s Problem Solving Principles." Does Biomechanics need a distinct flow (Given -> Find -> Formula -> Solve) different from Anatomy?

### 2. Alternative Hierarchies
*   [ ] **Network vs. Tree:** Research "Rhizomatic Learning." When is the strict H1 (System -> Subsystem) too rigid? Should we introduce "Concept Maps" (cross-linking) alongside "Tree Maps"?
*   [ ] **Chronological Structures:** Research "Narrative Structuring." Is "Time-Course" (Onset -> Acute -> Chronic) a better default for Pathology than M2 (Trigger -> Mechanism)?

---

## PART 2: DEEP VALIDATION (The "Zoom Lens")
*Goal: Validate the specific v9.2 components against learning science.*

### 3. The Engines (Content Architecture)
*   [ ] **Anatomy Engine (OIANA+):**
    *   **Target:** "Visual-First" & Bruner Enforcement (Iconic -> Symbolic).
    *   **Question:** Does showing the image *before* the name reliably improve retrieval speed for adults, or is it just for novices?
    *   **Target:** "Bone-First" sequence.
    *   **Question:** Does anchoring muscles to bones first actually facilitate faster learning than "Region-First" (learning all tissues in a slice)?
*   [ ] **Concept Engine (Gagné/Merrill):**
    *   **Target:** The "Identity -> Context -> Mechanism -> Boundary" flow.
    *   **Question:** Is this flow superior to "Inquiry-Based" (Problem -> Solution) for abstract topics like Law or Code?

### 4. The Frameworks (H/M/Y)
*   [ ] **H1 System (Hierarchy):**
    *   **Target:** `System -> Subsystem -> Component`.
    *   **Question:** Does this break down for "Systemic" diseases (e.g., Lupus) that affect multiple subsystems simultaneously?
*   [ ] **M2 Trigger (Mechanism):**
    *   **Target:** `Trigger -> Mechanism -> Result`.
    *   **Question:** Is this linear flow sufficient for "Feedback Loops" (Homeostasis)? Should we default to M6 for all Physiology?
*   [ ] **Y-Series (Context):**
    *   **Target:** `Y1 Generalist` (What is it -> What does it do -> Fail state).
    *   **Question:** Is this the scientifically optimal "minimum viable context" for new terms?

### 5. The Core Loop Mechanisms
*   [ ] **Seed-Lock:**
    *   **Target:** User *must* supply the hook; AI cannot lecture.
    *   **Question:** At what point does "Generation Fatigue" set in? Should we auto-suggest hooks after 45 mins?
*   [ ] **Stop Rule (Wait-for-Retrieval):**
    *   **Target:** No answers in the same message as questions.
    *   **Question:** Does this friction cause drop-off? Compare "Errorful Retrieval" vs. "Worked Examples" for initial acquisition.
*   [ ] **Level Gating (L2 -> L4):**
    *   **Target:** The "10-year-old explanation" requirement.
    *   **Question:** Does "simplification" (L2) actually correlate with clinical competence (L4), or are they separate skills?

---

## PART 3: ARCHIVE (Completed in v9.1)
*   M0-planning (modules/M0-planning-research.md)
*   M2-prime (modules/M2-prime-research.md)
*   M3-encode (modules/M3-encode-research.md)
*   M4-build (modules/M4-build-research.md)
*   M5-modes (modules/M5-modes-research.md)
*   M6-wrap (modules/M6-wrap-research.md)
