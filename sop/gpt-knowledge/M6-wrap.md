# M6: Wrap (v9.2 dev)

 Purpose: End-of-session consolidation in 2-10 minutes: recall, error capture, cards, and next-review plan. Reflection and optimization align with the PEIRRO Core Learning Module's Refine and Overlearn phases.

---
## Wrap Toolkit (pick 2-3 actions)
- 3-Question Recap: key takeaways, biggest error/confusion, what to change next time.
- One-Minute Paper: 60s summary from memory (no notes), then check/fill.
- Teach-Back: 1-2 min aloud/recorded explanation of core idea.
- Error Log Entry: list each miss + correct concept/solution; tag for re-quiz.
- Cards: create Anki-style cards for weak anchors/misses (required in Wrap).
- Image drill misses -> cards (from manual unlabeled -> labeled flow).
- Glossary: capture 1-2 sentence definitions for new terms per region.

## Calibration
- Quick test (1-3 recalls) + confidence ratings; note over/underconfidence.

## Spacing / Next-Step Template
- Review 1: ~24h later (5-10 min, active recall).
- Review 2: ~3 days (10 min, mixed questions/recall).
- Review 3: ~7 days (10-15 min, fuller self-test/teach-back).
- Successive relearning: require 2-3 correct recalls across spaced sessions before "mastered"; then extend interval.

## Timing
- Standard session (30-60 min): 5-10 min wrap.
- Micro-session (<15 min): 2-3 min wrap (one recall + schedule next review).

## Risks & Mitigations
- Overlong wrap -> cap time; timer; pick 1-2 high-yield actions.
- Shallow summary -> write from memory first; then check.
- Miscalibrated confidence -> always pair ratings with a quick test.
- Ignored outputs -> surface wrap notes at next session start; set reminders.
- Fatigue -> if tired, do one recall + schedule next review, then stop.

## Known Pitfalls to Capture in Error Log
- Jumping ahead before confirming imagery.
- Image not tied to meaning/function.
- Orbicularis Oris recall weakness (resolved, watch for relapse).
- Missing "word + meaning together" step.
- Jim Kwik Sound -> Function -> Image -> Lock flow not followed.

## Exit Condition
- Cards created for misses/weak anchors; next review scheduled; glossary entries captured; errors logged; confidence vs performance checked.


## Calibration Check
- Predict your score (0-100%) on today's target.
- Answer one application question.
- Compare prediction vs actual; if overconfident -> schedule sooner review (24h).

---

## Brain Prompt Generator — JSON Output (MANDATORY)

At the end of every WRAP phase, you MUST output two JSON objects for Brain ingestion. Use the current system date automatically. Format all text fields as semicolon-separated lists (no line breaks).

### 1️⃣ Tracker JSON (for study dashboards)
Lightweight format for quick metrics and tracking:

```json
{
  "date": "YYYY-MM-DD",
  "topic": "Main topic covered",
  "mode": "Core",
  "duration": 45,
  "understanding": 4,
  "retention": 4,
  "system_performance": 5,
  "what_worked": "Summarize effective methods; semicolon-separated",
  "what_needs_fixing": "Summarize gaps; semicolon-separated",
  "anchors": "Key concepts/hooks created; semicolon-separated",
  "notes": "Any insights or next steps; semicolon-separated"
}
```

### 2️⃣ Enhanced JSON (for canonical Brain archive)
Comprehensive format capturing all runtime canon and WRAP protocol elements:

```json
{
  "date": "YYYY-MM-DD",
  "topic": "Main topic covered",
  "mode": "Core",
  "duration": 45,
  "understanding": 4,
  "retention": 4,
  "system_performance": 5,
  "what_worked": "Detailed notes on effective study methods and insights; semicolon-separated",
  "what_needs_fixing": "Detailed list of knowledge gaps and process issues; semicolon-separated",
  "anchors": "Key hooks, metaphors, or memory locks created during KWIK/Encode; semicolon-separated",
  "anki_cards": "Anki cards created or planned; semicolon-separated",
  "glossary": "New or critical term definitions added during session; semicolon-separated",
  "runtime_notes": "Process or behavior notes (KWIK rule enforcement, Wrap meta-corrections, etc.); semicolon-separated",
  "wrap_watchlist": "Recurring weak areas to revisit during spaced review; semicolon-separated",
  "clinical_links": "Clinical or applied connections tied to session topic; semicolon-separated",
  "next_session": "Next session plan, focus, or materials; semicolon-separated",
  "spaced_reviews": "Review1=YYYY-MM-DD; Review2=YYYY-MM-DD; Review3=YYYY-MM-DD",
  "notes": "Additional reflections, meta observations, or future tasks; semicolon-separated"
}
```

### JSON Output Rules
1. **Always generate both JSONs** at the end of M6 WRAP phase — no exceptions.
2. **Use current system date** for the "date" field automatically.
3. **Mode must match session mode:** Core, Sprint, or Drill.
4. **Semicolon-separated lists** for all text fields (no line breaks within values).
5. **Label outputs clearly** as "Tracker JSON" and "Enhanced JSON" in the output.
6. **Include runtime behavior corrections** in Enhanced JSON when applicable (e.g., KWIK flow enforced, Seed-Lock triggered).
7. **Include Anki integration notes** when cards were created or planned.
8. **Spaced review dates** must be calculated: Review1=+1 day, Review2=+3 days, Review3=+7 days.
9. **Maintain compatibility** with Brain Session Log ingestion scripts (field names must match schema v9.2).
