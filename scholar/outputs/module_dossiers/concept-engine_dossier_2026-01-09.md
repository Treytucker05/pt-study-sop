# Module Dossier - Concept Engine
- Path: sop/gpt-knowledge/concept-engine.md (canonical), sop/engines/concept-engine.md (reference, deprecated)
- Phase: Engine
- Last Updated: 2026-01-09

## 1. Operational Contract
- Purpose: Default flow for abstract/non-spatial topics (law, coding, history, clinical reasoning, etc.) using Gagné/Merrill Component Display Theory sequence: identity → context → mechanism → boundary → application.
- Triggers: Non-anatomy topic; user requests concept learning; M3/M4 encoding phase for abstract domains.
- Required Inputs: Topic/concept to learn; source packet (optional but preferred per Source-Lock); user's prior knowledge level; process/algorithm if applicable (triggers mechanism emphasis).
- Required Outputs: L2 definition with hook; hierarchical context placement (H-series map); mechanism explanation (input→process→output or premise→logic→conclusion); boundary differentiation (example vs near-miss); application problem with user answer and verification.
- Exit Criteria: User can state definition, place it in context, explain mechanism, distinguish from near neighbor, and solve one application item.
- Failure Modes / Drift Risks: Skipping generation-first protocol (teaching before asking); omitting boundary/differentiation step (weak discrimination); failing to enforce "wait-generate-validate" pattern; overloading with detail (>6 bullets/2 paragraphs without user request); proceeding without Source-Lock verification for factual claims.

## 2. Pedagogy Mapping
(Evaluate using scholar/knowledge/pedagogy_audit.md categories)

- Retrieval Practice: PASS - Protocol explicitly requires "ASK user for their initial take at each step (generation-first)" before providing scaffolds. Application step requires user to produce answer before AI verification. However, missing explicit pre-test component for known topics.
- Spacing/Interleaving: PARTIAL - Exit condition confirms mastery but no explicit "next review" scheduling mentioned (delegated to M6-wrap). Boundary step provides discrimination practice but no interleaving across multiple concepts within session.
- Cognitive Load: PASS - Concise output guidance (≤6 bullets or 2 short paragraphs unless user requests more), step-by-step structure (5 ordered stages), minimal scaffold approach. Formatting kept clean per protocol.
- Metacognition: PARTIAL - Application step provides implicit calibration (user answers, AI verifies), but no explicit confidence ratings requested. No reflection step within engine (delegated to M6-wrap).
- Transfer & Application: PASS - Application step explicitly included (5th stage); mechanism step supports transfer by explaining process/causality; boundary step aids discrimination transfer.
- Interleaving/Discrimination: PARTIAL - Boundary step (Differentiation) provides direct comparison with "near neighbor" and "Example vs. Near-miss" contrast, supporting discrimination. However, no explicit interleaving across multiple topics within Concept Engine session (would need M5-modes integration).
- Errorful Learning: PARTIAL - Protocol allows user blanks ("If blank, provide minimal scaffold, then have them restate") but no explicit error categorization (Conceptual vs. Recall). No rollback rule specified.
- Source Grounding: PASS - Protocol states "Mark unverified if no source provided," enforcing Source-Lock discipline. However, integration rules allow proceeding with strategy-only guidance when sources incomplete.
- Feedback Quality: PARTIAL - Application step includes verification with "minimal explanation," but protocol doesn't specify immediate vs. delayed feedback, or whether feedback is corrective (explaining why) vs. judgmental.

## 3. Evidence Map

- Component Display Theory (CDT) - Gagné/Merrill: Concept Engine follows CDT's primary presentation forms: generality (Identity/Definition), instance (Application), and relationships (Context/Hierarchy, Mechanism, Boundary). CDT research supports this structure for concept acquisition (Merrill, 1983; Gagné, 1985).
- Generation Effect: Protocol's "generation-first" requirement (ASK before providing) aligns with generation effect literature showing that producing information enhances retention compared to passive reading (Slamecka & Graf, 1978; Bertsch et al., 2007).
- Elaborative Interrogation: Mechanism step (Input→Process→Output, Premise→Logic→Conclusion) prompts causal reasoning, consistent with elaborative interrogation research showing "why" questions improve learning (Pressley et al., 1987; Dunlosky et al., 2013).
- Contrast Cases / Discrimination Learning: Boundary step (Example vs. Near-miss) aligns with contrastive case-based learning literature showing that comparing similar cases improves discrimination (Gentner et al., 2003; Schwartz et al., 2011).
- Worked Examples & Problem Solving: Application step (problem→user answer→verification) combines problem-solving practice with immediate feedback, consistent with worked example effect and expertise reversal literature (Sweller & Cooper, 1985; Kalyuga et al., 2001).
- Cognitive Load Theory: Concise output guidance (≤6 bullets/2 paragraphs) and step-by-step sequencing aligns with CLT principles of managing intrinsic load through chunking and extraneous load through format constraints (Sweller et al., 2011).

## 4. Improvement Candidates (Rabbit Holes Allowed)

- Add explicit pre-test checkpoint: Before starting Definition step, ask "What do you already know about [concept]?" to activate prior knowledge and skip mastered components (metacognition + efficiency).
- Strengthen error categorization: When user produces incorrect answer in Application step, explicitly label error type (Conceptual misunderstanding vs. Recall failure) to guide remediation strategy.
- Add interleaving prompt: After completing one concept, suggest "Let's compare this with [related concept] before moving on" to force discrimination across concepts (not just within concept boundary step).
- Integrate confidence calibration: After Application step verification, ask "On scale 1-5, how confident were you in your answer?" then compare to actual performance (calibration training).
- Expand Mechanism variants: Current protocol mentions "Premise → Logic → Conclusion" for legal/humanities but could add more domain-specific mechanism templates (e.g., legal: "Rule → Exception → Application"; coding: "Input → Algorithm → Output → Edge Cases").
- Add spacing scheduler: Include explicit "Review this concept in [X] days" recommendation after exit condition met, rather than delegating entirely to M6-wrap.
- Boundary step enhancement: Current "one near neighbor" could be expanded to "two near neighbors" for stronger discrimination, or use "distractors" (common misconceptions) as near-misses.

## 5. Promotion Candidates (MAX 3)
(Actionable, ONE-change-only)

1. **Add pre-test checkpoint to Definition step**: Before providing L2 definition, ask "What do you already know about [concept]?" If user demonstrates adequate knowledge, skip to Context or Mechanism step. This activates prior knowledge, improves metacognition, and increases efficiency for review sessions.
2. **Enhance Boundary step with errorful learning**: When user misidentifies near-miss as the concept, explicitly label this as "Discrimination Error" and prompt: "Why did this seem similar? What's the key difference?" This strengthens error categorization and discrimination learning.
3. **Add explicit confidence calibration after Application**: After Application step verification, ask "On scale 1-5, how confident were you in your answer before I verified it?" Then compare to actual performance. This improves metacognitive calibration, which is currently PARTIAL in pedagogy mapping.

## 6. Guardrails (What Must Not Change)

- Source-Lock: Must continue marking outputs "unverified if no source provided." Do not proceed with factual claims without source verification, though strategy-only guidance is allowed.
- Generation-First Protocol: The "ASK user for their initial take at each step" must remain. Do not revert to "teaching first" pattern.
- Order Enforcement: The 5-step sequence (Definition → Context → Mechanism → Boundary → Application) must remain fixed. Each step builds on previous; do not reorder.
- Concise Output Rule: ≤6 bullets or 2 short paragraphs unless user requests more. This prevents cognitive overload and maintains efficiency.
- Domain Adaptations: Legal/humanities "Premise → Logic → Conclusion" and process/algorithm emphasis rules are domain-specific optimizations; preserve these conditional branches.
- Integration Rule: "IF topic ≠ anatomy: use Concept Engine" is the primary routing logic; do not change this boundary condition.
