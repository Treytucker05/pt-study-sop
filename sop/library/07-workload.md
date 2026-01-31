# Workload System: 3+2 Rotational Interleaving

## Overview

The workload system distributes study across 5 concurrent classes using a 3+2 cluster split with daily cross-review, the sandwich method for each session, and spaced retrieval at 1-3-7-21 day intervals.

**Key distinction:** The 3+2 rotation is *distributed practice* across classes. Interleaving is used *within* a class for confusable categories.

---

## Cluster Split

- **Cluster A** (3 classes): Most technical / highest cognitive load
- **Cluster B** (2 classes): Lighter / reading-heavy

---

## Weekly Rhythm

| Days | Deep Work | Cross-Review |
|------|-----------|--------------|
| Mon / Wed / Fri | Cluster A | 15 min Cluster B review |
| Tue / Thu / Sat | Cluster B | 15 min Cluster A review |
| Sunday | Weekly review + metacognition | -- |

### Setup Steps
1. Assign each class to Cluster A or B
2. Schedule deep work blocks on the matching days
3. Add a 15-min cross-review block from the opposite cluster
4. Sunday: run the weekly review template

---

## Interleaving (Within a Class)

Use interleaving to discriminate among confusable items:
- Similar muscle actions/insertions in the same region
- Look-alike pathways or mechanism steps

**Rule:** Use interleaving *after* initial understanding, never during first exposure.

---

## Sandwich Method (Pre / Active / Post)

### Pre-Lecture Skim (10-15 min)
- Scan headings and objectives
- Write 5 pretest questions
- Write 1 prior-knowledge link

### Active Encoding (during lecture/reading)
- Keep a minimal structure map
- Add one small diagram
- Add one example and one boundary case

### Post-Lecture (within 24 hours)
- Answer 3 why/how prompts
- Do 5 retrieval prompts from memory
- Create cards for misses

---

## Spaced Retrieval: 1-3-7-21

### Default Schedule

| Review | Interval |
|--------|----------|
| R1 | +1 day |
| R2 | +3 days |
| R3 | +7 days |
| R4 | +21 days |

### Manual R/Y/G Adjustment

| Status | Meaning | Action |
|--------|---------|--------|
| Red | Struggled | Move next review sooner |
| Yellow | Effortful success | Keep standard spacing |
| Green | Easy | Extend next interval |

### RSR-Adaptive Spacing

Automatically adjusts intervals based on retrieval success rate (RSR) at session start. Manual R/Y/G override always takes precedence.

| RSR at Review | Adjustment | Rationale |
|---------------|------------|-----------|
| >= 80% | Extend interval +25% | Strong retrieval |
| 50-79% | Keep standard interval | Effortful but successful |
| < 50% | Compress interval -50% | Weak retrieval |

**Bounds:** Min 12 hours, max 60 days.

```
RSR >= 80% → next = current x 1.25 (cap 60d)
RSR 50-79% → next = current (no change)
RSR < 50%  → next = current x 0.50 (floor 12h)
Manual override? → use R/Y/G rules instead
```

**Examples:**
- Standard R2 = +3 days. RSR at R2 = 90%. → R3 = 3 × 1.25 = 3.75 days ≈ +4 days.
- Standard R3 = +7 days. RSR at R3 = 40%. → R4 = 7 × 0.50 = 3.5 days ≈ +4 days (compressed).

**Fallback:** If RSR is not captured (e.g., Light mode), use standard 1-3-7-21.

### Retrospective Timetable

| Item | R1 (+1d) | Status | R2 (+3d) | Status | R3 (+7d) | Status | R4 (+21d) | Status | Notes |
|------|----------|--------|----------|--------|----------|--------|-----------|--------|-------|
| [Concept] | YYYY-MM-DD | R/Y/G | YYYY-MM-DD | R/Y/G | YYYY-MM-DD | R/Y/G | YYYY-MM-DD | R/Y/G | [notes] |

---

## Daily Playbooks

| Time | Scope | Retrieval | Wrap |
|------|-------|-----------|------|
| 10-15 min | 1 micro target | 3-5 prompts | 1 exit ticket line |
| 20-30 min | 1 small bucket | 5-8 prompts | 2-3 cards + exit ticket |
| 45-60 min | 2-3 buckets | 10-15 prompts | Full exit ticket + schedule reviews |

---

## Sunday Weekly Review

- **Wins:** What worked this week
- **Gaps:** What needs fixing
- **Backlog:** Items to roll forward
- **Load check:** Intrinsic / extraneous / germane notes
- **Next-week plan:** Cluster assignments and priorities

---

## GPT Prompt: Weekly Rotational Plan

Use this prompt template when generating a weekly study plan with GPT.

**Inputs to ask for:**
- List of classes and which are technical vs light.
- Exam dates and current weak areas.
- Available study windows (Mon-Sun).
- Confusable categories within each class (for interleaving).

**Output:**
- Cluster A (3 technical) and Cluster B (2 light).
- Weekly schedule:
  - Mon/Wed/Fri: Cluster A deep work + 15 min Cluster B review.
  - Tue/Thu/Sat: Cluster B deep work + 15 min Cluster A review.
  - Sun: weekly review and metacognition.
- Interleaving note: list confusable categories to mix within each class.
- Spaced review plan (1-3-7-21 heuristic) with red/yellow/green adjustment.

**Evidence nuance:**
- 3+2 rotation is spacing/distribution across classes.
- Interleaving is for discrimination among confusables within a class.
- No numeric forgetting or guaranteed gains claims.

Reference schema: `08-logging.md`. Note: spacing/review scheduling is a Planner/Dashboard/Calendar responsibility, not produced by the tutor at Wrap.
