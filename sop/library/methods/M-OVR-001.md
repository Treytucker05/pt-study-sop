---
id: M-OVR-001
name: Exit Ticket
stage: OVERLEARN
status: validated
version: '1.2'
created: '2026-04-07'
updated: '2026-04-21'
tags: [method, M-OVR, overlearn]
---

# M-OVR-001 — Exit Ticket

## Summary
Close the session with a short exit ticket that captures what was learned, what is still muddy, and what the learner will do next. The method stays brief, turns closure into a reusable handoff, and avoids drifting into new teaching.

**Not for:** initial teaching, discovery, or broad remediation. Use `EXPLAIN` or `CONSOLIDATE` first if understanding is not already present.

## Core Steps
1. **Answer Question 1** — blurt 3-5 key takeaways from memory
2. **Answer Question 2** — name 1-2 specific muddy points
3. **Answer Question 3** — commit to one concrete next action
4. **Review Against Session Materials** — add only critical missed points
5. **Convert Muddy Points** — turn them into next-session questions
6. **Log Exit Ticket** — save the closure artifact for reuse

## Inputs
- Completed study session
- Exit ticket template (3 questions)
- Session notes or artifacts for reference

## Required Outputs
- `Exit ticket (all 3 questions answered)`
- `Key takeaways list (3-5 specific items)`
- `Muddy points or weak anchors identified`
- `Next action commitment (specific and actionable)`
- `Questions for next session`

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
- `exam_cram` — one-shot, fastest closure pass. Return one terse ticket, 3 bullet takeaways, 1 muddy point, 1 concrete next action, and 1 next-session question.
- `deep_mastery` — interactive, fuller closure pass. Walk through each question separately, verify the blurt against notes, allow 1-2 muddy points, and end with a richer handoff section for the next session.
- `quick_review` — one-shot refresh closure. Compress the ticket into a compact `Learned | Muddy | Next` table plus one short next-session question block.
- `clinical_bridge` — stepwise applied closure. Render the ticket as a handoff matrix with takeaway, risk if missed, next action, and next-session question so the closure points directly to the next practical rep.

## Runtime Prompt
```text
You are running M-OVR-001 (Exit Ticket) in the OVERLEARN stage.
Use only the loaded source and session context. Ask only for missing required inputs.
Produce: Exit ticket, Key takeaways list, Muddy points or weak anchors identified, Next action commitment, and Questions for next session.
Close the session with the three mandatory questions: what did I learn, what's still muddy, and what's my next action. Keep the ticket brief, specific, and source-grounded; verify the next action passes the 15-minute test; convert muddy points into next-session questions; do not drift into new teaching.
Preset behavior:
- exam_cram: one-shot; terse bullets; 3 takeaways, 1 muddy point, 1 next action, 1 next-session question.
- deep_mastery: interactive; labeled sections; walk each question in sequence, verify against notes, and end with a fuller handoff.
- quick_review: one-shot refresh; compact Learned-Muddy-Next table plus one short follow-up question block.
- clinical_bridge: stepwise; handoff matrix with takeaway, risk if missed, next action, and next-session question.
If no preset is specified, use the default knobs. One-shot returns the full closure artifact in one bounded reply; interactive or stepwise mode moves ticket -> review -> next-session questions and waits.
```

## Evidence
- **Citation:** Black and Wiliam (1998); Hattie and Timperley (2007); Wisniewski, Zierer, and Hattie (2020); Rodriguez, le Roux, and Melville (2024); MacDermott, Mornah, and MacDermott (2024); Pai (2024)
- **Finding:** Exit Ticket is best supported as a brief formative-closure method that captures evidence of learning, uncertainty, and next-step action before a session ends. Black and Wiliam's foundational review supports frequent classroom checks that generate usable evidence for instructional adjustment, while Hattie and Timperley, reinforced by Wisniewski and colleagues, support feedback that makes the gap and the next move actionable rather than generic. Recent classroom studies on iteratively designed exit tickets, marketing-course exit tickets, and end-of-lesson formative checks used to revise statistics instruction suggest that short aligned exit tickets can improve reflective performance, engagement, and instructional adjustment when prompts are specific and the teacher actually uses the responses. The practical implication for this method is to keep the ticket short, require concrete takeaways plus muddy points plus one near-term action, and turn the closure into a reusable handoff for the next session instead of a vague recap.
- **Source:** `https://doi.org/10.1080/0969595980050102`; `https://doi.org/10.3102/003465430298487`; `https://doi.org/10.3389/fpsyg.2019.03087`; `https://doi.org/10.1080/87567555.2024.2355210`; `https://doi.org/10.1080/10528008.2024.2438624`; `https://doi.org/10.1080/26939169.2024.2321241`
- **Needs research:** `false`

## Related Methods
- [[M-RET-001]] — Brain dumps inform what is still retrievable
- [[M-REF-003]] — A compact anchor helps turn muddy points into future checks

## Changelog
- **v1.1** — migrated structural metadata to the stage-first architecture: stage/category now use `OVERLEARN`, the subcategory is `exit-ticket`, and tags were aligned to overlearning-first metadata.
- **v1.2** — upgraded the evidence stack to stronger formative-assessment, feedback, and recent exit-ticket classroom studies; replaced the legacy note layout with the current template; added the standard knob schema plus four distinct presets; tightened the runtime prompt; and preserved the original method logic, steps, outputs, and constraints.
