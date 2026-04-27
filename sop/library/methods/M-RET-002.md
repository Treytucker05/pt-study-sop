---
id: M-RET-002
name: Sprint Quiz
stage: RETRIEVE
status: validated
version: '1.6'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, RET, retrieve]
---

# M-RET-002 — Sprint Quiz

## Summary
Run a rapid closed-note quiz that pressures short-answer retrieval, records misses, and flags shaky wins before routing the learner onward. The method stays diagnostic and fast instead of expanding into explanation.

**Not for:** This is not for open-note review, answer-reveal first workflows, or deep teaching. Use CONSOLIDATE if the learner needs an anchor first.

## Core Steps
1. **Quiz Setup** — Set the topic scope, question count, and closed-note rule before starting
2. **Start Timer** — Start the sprint timer and begin the rapid question block
3. **Commit Answers** — Require a committed answer for each item before any comparison or reveal
4. **Score Responses** — Mark correct and incorrect responses only after the committed attempt is complete
5. **Flag Weak Anchors** — Mark uncertain-but-correct items as weak anchors for later review
6. **Calculate RSR and Route** — Calculate RSR, list misses, and name what needs re-encoding next

## Inputs
- Topic or concept set for quiz
- Tutor AI (or pre-made question set)
- Timer (5 min recommended)
- Scoring tracker (correct/incorrect tally)

## Required Outputs
- `RSR percentage (correct/total)`
- `List of missed questions with correct answers`
- `Weak anchor flags (uncertain but correct items)`
- `Topics needing re-encoding`

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
- `exam_cram` — Fastest sprint. Use 10 high-yield questions, terse score bullets, and only the most decision-relevant misses and weak anchors.
- `deep_mastery` — Fullest sprint. Use 15 questions, keep a fuller per-item score trace, and return a richer weak-anchor and routing analysis.
- `quick_review` — Refresh sprint. Use 10-12 questions and present the result as a compact score table with one-line route guidance.
- `clinical_bridge` — Applied sprint. Use rapid applied prompts or mini-scenarios and show misses, weak anchors, and route decisions in a short clinical-style table.

## Runtime Prompt
```text
You are running M-RET-002 (Sprint Quiz) in the RETRIEVE stage.
Use only the loaded source. Ask only for missing required inputs.
Produce: RSR percentage, List of missed questions with correct answers, Weak anchor flags, and Topics needing re-encoding.
Run a short closed-note quiz with attempt-first answers, then score it cleanly and route from the pattern. Keep it fast, do not teach during the quiz, and flag uncertain correct answers separately from stable wins.
Preset behavior:
- exam_cram: one-shot; 10 questions; terse bullets; only the biggest misses and weak anchors.
- deep_mastery: interactive; 15 questions; fuller per-item trace and richer routing analysis.
- quick_review: one-shot refresh; 10-12 questions; compact score table plus one route call.
- clinical_bridge: stepwise; applied prompts or mini-scenarios with misses and route decisions in a short table.
If no preset is specified, use the default knobs. One-shot returns the full artifact in one bounded reply; interactive or stepwise mode moves quiz -> scoring -> routing and waits.
```

## Evidence
- **Citation:** Yang, Luo, Vadillo, Yu, and Shanks (2021); Agarwal, Nunes, and Blunt (2021); Little and McDaniel (2015); Walsh and Horgan (2024)
- **Finding:** Sprint Quiz is best supported as a short, high-frequency retrieval block that samples recall quickly enough to expose both clean misses and weak anchors. Meta-analytic retrieval-practice evidence supports brief quiz-like testing for retention gains, classroom reviews support frequent low-stakes quizzing when it yields actionable follow-up, and transfer-oriented quiz research shows that the format can reveal whether knowledge is stable or merely familiar. The practical implication for this method is to keep the block short, force direct answers before feedback, and log both outright misses and hesitant correct responses so the next routing move is based on evidence rather than impressions.
- **Source:** `https://doi.org/10.1037/bul0000309; https://doi.org/10.1007/s10648-021-09595-9; https://doi.org/10.1037/a0021782; https://doi.org/10.1007/s11251-024-09680-w`
- **Needs research:** `false`

## Related Methods
- [[M-REF-003]] — Quiz misses are easier to analyze against a compact anchor
- [[M-OVR-001]] — Exit tickets can capture what remained muddy after the sprint

## Changelog
- **v1.5** — prior production draft normalized the stage-first structure and preserved the original sprint-quiz flow.
- **v1.6** — upgraded the evidence stack to stronger, method-relevant sources; added the standard knob schema plus four clearly distinct presets; tightened the runtime prompt; rebuilt the markdown note into the current production template; and preserved the original method logic, steps, outputs, and constraints.

## Summary of Changes
- Upgraded the evidence stack around rapid retrieval quizzing, low-stakes classroom testing, and actionable routing.
- Sharpened the four presets so they now differ in question load, pacing, and output shape.
- Tightened the facilitation prompt around attempt-first sprint behavior and explicit weak-anchor capture.
- Rebuilt the markdown note into the current template while keeping the original sprint-quiz logic intact.
