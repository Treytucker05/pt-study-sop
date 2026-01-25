# Change Proposal — Core Mode Gating Inversion

- ID: RFC-20260107-001
- Date: 2026-01-07
- Status: Draft
- Proposer: The Scholar
- Target: `sop/gpt-knowledge/M-series.md`, `sop/gpt-knowledge/runtime-prompt.md`

## 1. Problem Observation

The current Tutor Core Mode follows a "Teach -> Explain -> Lock" workflow. In practice, this results in significant pedagogical drift toward passive content delivery, leading to excessive session durations and reduced germane cognitive load. Even with Source-Lock enforced, the Tutor defaults to "teaching" concepts the user may already know.

### Evidence (Brain Logs)

- **Artifact:** `brain/session_logs/2025-12-11_geriatrics_normal_vs_common_abnormal.md`
- **Excerpt 1:** "Plan of Attack: 1) System-by-system slide-only teaching 2) Micro-step L2 gating (teach -> explain -> lock)" (Lines 14-15)
- **Excerpt 2:** "Extremely slow, micro-step teaching with L2 teach-back before terminology" (Line 76)
- **Excerpt 3:** "Duration: 165" (Line 6) - Significant time overhead for a single recap topic.
- **Excerpt 4:** "Clarify 'AI teaches first' earlier in Core Mode" (Line 81) - Suggests the Tutor has internalized a teaching-first identity.

## 2. Proposed Change (ONE change only)

**Invert the Gating Logic:** Implement a mandatory "Probe Before Teach" rule. The Tutor MUST probe the user's existing knowledge of a content chunk *before* providing any explanation or slide summary.

- **Old Workflow:** [Review Source] -> [Summarize/Explain] -> [Check Understanding] -> [Lock]
- **New Workflow:** [Review Source] -> [Probe Knowledge/Pre-test] -> [Correct/Refine Explanations] -> [Lock]

## 3. Pedagogy Evidence

- **Retrieval Practice:** Asking questions before providing answers (pre-testing) improves long-term retention even when the learner fails the pre-test.
- **Cognitive Load Theory:** Pre-testing identifies prior knowledge, allowing the system to skip redundant explanations (reducing extraneous load).
- **Desirable Difficulty:** Forcing retrieval early increases germane load and improves calibration.

## 4. What Must Not Change

- **Source-Lock:** All probes and refinements must still be grounded in the allowlisted Source Packet.
- **Log Schema:** The `Execution Details` and `Anchors Locked` structure in session logs remains unchanged.

## 5. Risk Analysis

- **Risk:** High-difficulty probes might frustrate students with low prior knowledge.
- **Mitigation:** Allow "I don't know" or "Explain first" as valid user responses to trigger the traditional teaching fallback immediately.

## 6. Experiment Plan

- **Control:** Current "Teach -> Explain" logic (v9.2 defaults).
- **Test:** "Probe -> Refine" logic (Inverted Gating).
- **N:** 10 sessions.
- **Metrics:**
  - Primary: Session duration (target 30% reduction).
  - Secondary: Next-day recall accuracy (% correct on cold quiz).
  - Feedback: User friction rating (1-5).
- **Abort Criteria:** >25% increase in user-reported friction or "Abandon Session" events.
