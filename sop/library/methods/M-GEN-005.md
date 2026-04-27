---
id: M-GEN-005
name: Why-Chain
stage: ENCODE
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-GEN, encode]
---

# M-GEN-005 — Why-Chain

## Summary
Have the learner start with one bounded claim, ask why 3-5 times in succession, and use each answer as the premise for the next. The method stays explanation-first, rejects circular links, and ends with explicit verification instead of fluent but unchecked causal talk.

**Not for:** passive reading, copying answers, or letting the tutor do the cognitive work for the learner.

## Core Steps
1. **Write the Initial Statement or Fact** — define the bounded claim to interrogate
2. **Ask Why Is This True** — generate the first causal answer as a new statement
3. **Ask Why About Your Answer** — go one level deeper
4. **Repeat Until You Hit 3 to 5 Levels or Bedrock Knowledge** — keep chaining unless deeper explanation truly requires new learning
5. **Verify Chain Accuracy with Source Material** — check every link before closing

## Inputs
- Initial statement or fact to interrogate
- Source material for verification

## Required Outputs
- `Why-chain document (3-5 linked explanations)`
- `Depth level reached`
- `Verification status`

## Knob Schema
```yaml
knobs:
  guidance_level: medium
  delivery_mode: stepwise
  fade_intensity: minimal
  output_layout: labeled_sections
  explanation_density: focused
presets:
  exam_cram:
    guidance_level: light
    delivery_mode: one_shot
    fade_intensity: minimal
    output_layout: bullets
    explanation_density: lean
  deep_mastery:
    guidance_level: high
    delivery_mode: interactive
    fade_intensity: adaptive_light
    output_layout: labeled_sections
    explanation_density: detailed
  quick_review:
    guidance_level: light
    delivery_mode: one_shot
    fade_intensity: minimal
    output_layout: table
    explanation_density: lean
  clinical_bridge:
    guidance_level: medium
    delivery_mode: stepwise
    fade_intensity: adaptive_light
    output_layout: table
    explanation_density: focused
```

## Preset Behavior
- `exam_cram` — one-shot, fastest chain pass. Produce exactly 3 why links, one bedrock or uncertainty line, and one short verification line.
- `deep_mastery` — interactive, full depth pass. Keep separate sections for starting claim, why levels, circularity or gap notes, bedrock decision, and verification status.
- `quick_review` — one-shot refresh pass. Render the output as a compact table with `premise | why-answer | verification status` columns.
- `clinical_bridge` — stepwise applied causal pass. Use a clinical reasoning table with `fact/finding | first why | deeper why | implication | source check` columns so the chain stays tied to practice.

## Runtime Prompt
```text
You are running M-GEN-005 (Why-Chain) in the ENCODE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: Why-chain document, Depth level reached, and Verification status.
Have the learner start with one bounded statement, ask why 3-5 times in succession, and turn each answer into the next premise. Reject circular answers, stop only after at least 3 levels or clear bedrock knowledge, and verify every link against the source before closing. Do not answer the why questions for the learner.
Preset behavior:
- exam_cram: one-shot; 3 why links; one bedrock or uncertainty line; one verification line.
- deep_mastery: interactive; separate sections for claim, why levels, gap notes, bedrock decision, and verification.
- quick_review: one-shot refresh; compact premise-why-verification table.
- clinical_bridge: stepwise; applied fact -> why -> deeper why -> implication -> source-check table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves claim -> why layers -> bedrock decision -> verification and waits.
```

## Evidence
- **Citation:** Pressley, McDaniel, Turnure, Wood, and Ahmad (1987); Pressley, Symons, McDaniel, Snyder, and Turnure (1988); O'Reilly, Symons, and MacLatchy-Gaudet (1998); Dunlosky, Rawson, Marsh, Nathan, and Willingham (2013); Novak, Bailey, Blinsky, Soffe, Patterson, Ockey, and Jensen (2022); Jáñez, Parra-Domínguez, Gajate Bajo, and Guzmán-Ordaz (2025)
- **Finding:** Why-Chain is best supported as an elaborative-interrogation method that improves learning when learners must generate explanatory answers to why-prompts instead of rereading or paraphrasing facts. The classic elaborative-interrogation studies show that asking why can improve learning of confusing or factual material when each answer adds new information, and comparison work suggests that the benefit depends on explanation quality rather than on the prompt alone. Dunlosky's review supports elaborative interrogation as a moderate-utility strategy with clear boundary conditions, and recent classroom work sharpens those conditions further: active why-questioning can work in live or virtual settings, but recent implementation research shows that self-generated interrogation helps only when the prompts are used well and can even hurt when learners produce weak or inappropriate explanations. The practical implication for this method is to force each answer into a new statement, reject circular links, require at least 3 levels unless bedrock is explicit, and verify the finished chain against the source instead of trusting fluent-sounding explanations.
- **Source:** `https://doi.org/10.1037/0278-7393.13.2.291`; `https://doi.org/10.1037/0022-0663.80.3.268`; `https://doi.org/10.1006/ceps.1997.0977`; `https://doi.org/10.1177/1529100612453266`; `https://doi.org/10.1128/jmbe.00232-21`; `https://doi.org/10.1080/02702711.2025.2482627`
- **Needs research:** `false`

## Related Methods
- [[M-GEN-006]] — Similar self-explanation move when the learner needs a freer explanatory format
- [[M-GEN-002]] — Teach-back fallback if oral explanation helps surface the same gaps
- [[M-GEN-007]] — Mechanism trace if the chain needs a more explicit process sequence

## Changelog
- **v1.1** — migrated the method to the stage-first production metadata and cleaned up the legacy prompt surface while preserving the original claim -> why layers -> verification flow.
- **v1.2** — upgraded the evidence stack to stronger elaborative-interrogation, comparison, and recent classroom implementation sources; rebuilt the note into the current template; made the four presets produce clearly distinct chain formats and depths; tightened the runtime prompt; and preserved the original logic, outputs, and constraints.

### Summary of Changes
- Reframed the method as a bounded elaborative-interrogation chain instead of a generic repeated-why prompt.
- Upgraded the evidence stack from a single Dunlosky review citation to a broader set of classic elaborative-interrogation experiments, comparison research, and recent classroom implementation studies.
- Rebuilt the preset behavior so each mode now produces a distinct why-chain artifact:
  - `exam_cram` uses a 3-link sprint chain.
  - `deep_mastery` uses separated why-level, gap, and verification sections.
  - `quick_review` uses a compact premise-why-verification table.
  - `clinical_bridge` uses an applied implication table.
- Tightened the facilitation prompt so it is shorter, explicit about circularity rejection and bedrock stopping, and strict about source verification.
- Preserved the original core flow: choose the starting statement, ask why, keep going 3-5 levels or until bedrock, then verify the chain against the source.
