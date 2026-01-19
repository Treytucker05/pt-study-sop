# Pedagogy Audit Rubric (Scholar)

## How to use this rubric

Apply this rubric as a rigorous checklist when auditing session logs or Tutor module files. For each category, evaluate the target artifact and assign a score based on the criteria. Identify specific failure modes and conclude with exactly ONE primary recommendation for improvement.

## Scoring

- **PASS (2):** Fully meets criteria; high pedagogical fidelity.
- **PARTIAL (1):** Meets core intent but lacks rigor or contains minor ambiguity.
- **FAIL (0):** Neglects the mechanism; contains major ambiguity or active pedagogical harm.

---

## Rubric Categories

### 1) Retrieval Practice (Testing Effect)

**Intent:** Prioritize active recall over passive re-reading or content delivery.
**Checklist:**

- [ ] Are questions asked *before* definitions or explanations are provided?
- [ ] Does the system force the user to produce an answer rather than just acknowledge?
- [ ] Is there a "pre-test" component for known topics?
- [ ] Is there retrieval before explanation for every content chunk?
- [ ] Is the retrieval-feedback-retest cycle consistent and auditable?
**Failure Modes:**
- "Teaching first" (explaining content before asking a question).
- Leading questions that provide the answer.
- Binary check-ins (e.g., "Do you understand?") instead of production tasks.

### 2) Spaced Practice

**Intent:** Support long-term retention by distributing learning over time.
**Checklist:**

- [ ] Does the workflow generate "next review" timestamps?
- [ ] Is there a mechanism to resurface prior session errors in the current session?
- [ ] Does the "Wrap" phase explicitly schedule a follow-up?
**Failure Modes:**
- "One-and-done" sessions with no plan for re-testing.
- Focus exclusively on new material without interleaving old material.

### 3) Interleaving / Discrimination

**Intent:** Mix related topics to force learners to distinguish between similar concepts.
**Checklist:**

- [ ] Are similar structures (e.g., muscles with similar attachments) compared directly?
- [ ] Does the quiz phase alternate between different topics or levels?
- [ ] Are "differential diagnosis" or "boundary condition" questions present?
**Failure Modes:**
- Categorical blocking (studying only one muscle group/topic for 60 minutes).
- Lack of comparison between "look-alike" or "sound-alike" concepts.

### 4) Feedback Quality

**Intent:** Provide specific, timely, and corrective guidance.
**Checklist:**

- [ ] Is feedback provided immediately after an incorrect response?
- [ ] Is feedback corrective (explaining why) rather than just judgmental (Right/Wrong)?
- [ ] Does feedback avoid "the echo" (simply repeating back the user's correct answer)?
**Failure Modes:**
- Vague praise (e.g., "Great job!") with no specific reinforcement.
- Delayed feedback (waiting until the end of a block to correct an error).

### 5) Errorful Learning & Error Typing

**Intent:** Leverage errors as learning opportunities and categorize them for remediation.
**Checklist:**

- [ ] Are errors explicitly labeled (e.g., Conceptual vs. Recall)?
- [ ] Does the system encourage "failing forward" on difficult questions?
- [ ] Is there a "rollback" rule for repeated errors?
**Failure Modes:**
- Ignoring user errors or proceeding without correction.
- Treating all errors as "forgotten" (Recall) when they are actually "misunderstood" (Conceptual).

### 6) Transfer & Application

**Intent:** Move knowledge from abstract recall to clinical/patient-level reasoning.
**Checklist:**

- [ ] Are clinical vignettes or patient "stories" used?
- [ ] Does the system ask "What happens if <X> is injured?"
- [ ] Is there a "Functional behavioral" check (H2 behaviors)?
**Failure Modes:**
- Staying solely at the "Bones/Attachments" level without clinical context.

### 7) Cognitive Load Management

**Intent:** Minimize extraneous load (distraction) and maximize germane load (effortful learning).
**Checklist:**

- [ ] Is the formatting clean and free of unnecessary AI prose?
- [ ] Are instructions "step-by-step" rather than wall-of-text?
- [ ] Does the system use "fading" (reducing cues as mastery increases)?
**Failure Modes:**
- "Chatty" AI that adds 3 paragraphs of fluff to every interaction.
- Overwhelming the user with too many rules at once.

### 8) Metacognition & Calibration

**Intent:** Improve the learner's ability to judge their own knowledge.
**Checklist:**

- [ ] Does the system ask for confidence ratings?
- [ ] Is there a "reflection" step in the Wrap phase?
- [ ] Are "unverified claims" explicitly flagged for the user to check?
**Failure Modes:**
- Overconfidence (the system assuming the user knows it because they said "I got it").

### 9) Source Grounding (Source-Lock)

**Intent:** Ensure all information is anchored to the provided authority canon.
**Checklist:**

- [ ] Is the "Source-Lock" protocol (M0) explicitly followed?
- [ ] Does the system refuse to teach or answer if the Source Packet/Source-Lock is missing?
- [ ] Citations required for factual/clinical claims using Source Packet citation format?
- [ ] Allow strategy-only guidance without citations while withholding factual claims until sources exist?
- [ ] Is there a clear "Authoritative/Draft" distinction?
**Failure Modes:**
- Hallucination (AI providing anatomy facts not found in the uploaded sources).
- Drift (introducing outside mnemonics that conflict with the source).
- Provides numeric norms without Source Packet citation.
- Accepts excerpts without citations and proceeds.
- Uses outside knowledge when packet incomplete instead of requesting more excerpts.

### 10) Efficiency

**Intent:** Maximize learning payoff relative to time/effort overhead.
**Checklist:**

- [ ] Is the "Session Progress" clear?
- [ ] Does the system skip redundant steps for mastered content?
**Failure Modes:**
- "Process for the sake of process" (forcing a 10-step protocol for 1-step learning).

---

## Output Rule

Every audit must result in **ONE primary recommendation**. If systemic change is needed, it must be drafted as a single "ONE-change-only" candidate for the `scholar/TEMPLATES/change_proposal.md`.
