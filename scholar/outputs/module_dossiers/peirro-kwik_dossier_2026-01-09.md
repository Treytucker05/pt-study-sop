# Module Dossier - PEIRRO and KWIK Frameworks
- Path: sop/gpt-knowledge/PEIRRO.md, sop/gpt-knowledge/KWIK.md (canonical); sop/gpt-knowledge/M3-encode.md, sop/gpt-knowledge/runtime-prompt.md, sop/gpt-knowledge/gpt-instructions.md, sop/gpt-knowledge/M5-modes.md (integration)
- Phase: Framework
- Last Updated: 2026-01-09

## 1. Operational Contract
- Purpose: PEIRRO defines the end-to-end learning cycle (Prepare -> Encode -> Interrogate -> Retrieve -> Refine -> Overlearn). KWIK defines the encoding flow for hooks/terms (Sound -> Function -> Image -> Resonance -> Lock) inside PEIRRO's Encode step.
- Triggers: Start or repeat a learning cycle in Core/Sprint/Drill modes; use KWIK whenever a new term, label, or hook needs encoding (typically M3 Encode).
- Required Inputs: Target topic and source packet (Source-Lock); learner's prior knowledge and readiness; list of terms/structures to encode; phonetic seed and true function/meaning for each term.
- Required Outputs: Encoded hooks with resonance-confirmed imagery; retrieval attempts and outcomes; error corrections during Refine; overlearning plan or handoff to M6 Wrap scheduling.
- Exit Criteria: Learner can recall and explain targets without cues; errors are corrected and re-tested; hooks are locked; overlearning review cadence is set or handed off to Wrap.
- Failure Modes / Drift Risks: Skipping Prepare or pretest (teaching before activation); KWIK used without function-first meaning; skipping resonance confirmation; advancing without gating; using KWIK outside Encode or during Retrieve; no explicit error typing in Refine; overlearning step omitted or collapsed into a single massed pass.

## 2. Pedagogy Mapping
(Evaluate using scholar/knowledge/pedagogy_audit.md categories)

- Retrieval Practice: PASS - PEIRRO includes an explicit Retrieve step and Encode requires generation-first prompts.
- Spacing/Interleaving: PARTIAL - Overlearn implies spacing, but cadence is not explicit inside PEIRRO/KWIK and relies on M6 for scheduling; interleaving is not specified.
- Cognitive Load: PASS - Both frameworks use stepwise gating and function-first sequencing to reduce extraneous load.
- Metacognition: PARTIAL - Resonance check offers a lightweight calibration step, but no explicit confidence ratings or reflection prompts are required.
- Transfer & Application: PARTIAL - Transfer is implied via Interrogate and Build integration, but the framework does not require applied problems or clinical transfer within PEIRRO/KWIK.
- Interleaving/Discrimination: PARTIAL - KWIK enforces correct meaning vs imagery, but does not require contrast sets or cross-topic interleaving.
- Errorful Learning: PARTIAL - Refine targets errors, yet lacks explicit error typing (recall vs conceptual) or rollback rules.
- Source Grounding: PARTIAL - Source-Lock is enforced at the system level, but PEIRRO/KWIK themselves do not explicitly reference citation gating.
- Feedback Quality: PARTIAL - Refine implies corrective feedback, but timing and specificity are not specified.

## 3. Evidence Map

- Testing effect (Roediger and Karpicke, 2006; Testing effect overview): supports explicit Retrieve step and effortful recall as a driver of retention.
- Elaborative interrogation (Pressley et al., 1987; elaborative interrogation overview): supports the Interrogate step for why/how reasoning during encoding.
- Dual-coding theory (Paivio, 1991; dual-coding theory overview): supports Sound + Function + Image pairing in KWIK.
- Keyword mnemonic research (Dunlosky et al., 2013 review of learning techniques): supports sound-alike plus imagery hooks as a vocabulary/term encoding method.
- Spacing effect (Cepeda et al., 2006; spacing effect overview): supports Overlearn and the need for distributed review rather than massed practice.
- Overlearning retention effects (Driskell, Willis, and Copper, 1992): supports continued practice beyond initial mastery for durability.

## 4. Improvement Candidates (Rabbit Holes Allowed)

- Add a short pretest checkpoint in Prepare to separate known vs unknown items and skip redundant encode cycles.
- Add explicit error typing in Refine (recall vs conceptual) with targeted remediation prompts.
- Add confidence calibration after Retrieve (1-5 rating) to track metacognitive accuracy.
- Add a minimum spacing rule inside Overlearn (e.g., schedule next review rather than only repeating in-session).
- Add an interleaving prompt after a KWIK sequence ("compare with a near neighbor term") to improve discrimination.
- Make Source-Lock gating explicit inside PEIRRO/KWIK when factual claims are made.

## 5. Promotion Candidates (MAX 3)
(Actionable, ONE-change-only)

1. **Add confidence rating after Retrieve:** After each Retrieve pass, prompt "How confident were you (1-5)?" and compare to accuracy to improve calibration.
2. **Add error typing in Refine:** Label errors as Recall vs Conceptual and require a brief correction step tied to the error type.
3. **Add explicit spacing handoff in Overlearn:** Require a next-review timebox (e.g., 1-3-7 day schedule) or explicit handoff to M6 Wrap scheduling.

## 6. Guardrails (What Must Not Change)

- PEIRRO remains the learning cycle backbone; do not reorder or skip steps.
- KWIK order is fixed: Sound -> Function -> Image -> Resonance -> Lock with user gating at each step.
- Function-first rule: meaning before imagery; imagery must be tied to true function.
- No teaching before Prepare and Source-Lock are confirmed.
- KWIK stays in Encode only; no KWIK during Retrieve or testing phases.
- Brain schema and logging formats remain unchanged; hooks must be logged before advancing.
