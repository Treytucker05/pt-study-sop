# Master Rotational Interleaving System (v9.3)

## Assumptions
- You have 3 technical classes and 2 lighter/reading-heavy classes.
- Rotation is a spacing and distribution heuristic, not a guarantee.
- Interleaving is used within a class for confusable categories.

---
## Part 1: Weekly 3+2 schedule
- Cluster A (technical): 3 classes.
- Cluster B (light/reading): 2 classes.

Weekly rhythm:
- Mon/Wed/Fri: Deep work on Cluster A + 15 min review of Cluster B.
- Tue/Thu/Sat: Deep work on Cluster B + 15 min review of Cluster A.
- Sun: Weekly review and metacognition.

---
## Part 2: Operational definition of interleaving
Interleaving is for discrimination among confusable items within a class.
Examples:
- Similar muscle actions and insertions in the same region.
- Look-alike pathways or steps in a mechanism.

Use interleaving after initial understanding, not during first exposure.

---
## Part 3: Sandwich method (pre / active / post)
Pre-lecture skim (10-15 min):
- Scan headings and objectives.
- Write 5 pretest questions.
- Write 1 prior-knowledge link.

Active encoding (during lecture/reading):
- Keep a minimal structure map.
- Add one small diagram.
- Add one example and one boundary case.

Post-lecture (within 24h):
- Answer 3 why/how prompts.
- Do 5 retrieval prompts from memory.
- Create cards for misses.

---
## Part 4: Spaced retrieval 1-3-7-21 (heuristic)
Default schedule:
- R1 = +1 day
- R2 = +3 days
- R3 = +7 days
- R4 = +21 days

Adaptive spacing rule:
- Red (struggled): move the next review sooner.
- Yellow (effortful success): keep standard spacing.
- Green (easy): extend the next interval.

---
## Part 5: Retrospective timetable (R/Y/G)
| Item | R1 (+1d) | Status | R2 (+3d) | Status | R3 (+7d) | Status | R4 (+21d) | Status | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| [Concept] | YYYY-MM-DD | R/Y/G | YYYY-MM-DD | R/Y/G | YYYY-MM-DD | R/Y/G | YYYY-MM-DD | R/Y/G | [notes] |

---
## Part 6: RSR-Adaptive Spacing

Adjust spacing intervals automatically based on retrieval success rate (RSR) at session start. Manual R/Y/G override is always preserved.

### Decision Rules
| RSR at review | Adjustment | Rationale |
| --- | --- | --- |
| **≥ 80%** | Extend next interval by +25% | Strong retrieval — push spacing outward |
| **50–79%** | Keep standard interval | Effortful but successful — maintain |
| **< 50%** | Compress next interval by −50% | Weak retrieval — review sooner |

### Bounds
- Minimum interval: 12 hours (never schedule closer than half a day)
- Maximum interval: 60 days (cap to prevent drift)

### Decision Tree
```
RSR >= 80%?
  YES → next_interval = current_interval × 1.25 (cap at 60d)
  NO  → RSR >= 50%?
           YES → next_interval = current_interval (no change)
           NO  → next_interval = current_interval × 0.50 (floor at 12h)

Manual override?
  YES → use R/Y/G adjustment instead (same as Part 4 rules)
  NO  → use RSR-adaptive result
```

### Example
- Standard R2 = +3 days. RSR at R2 = 90%. → R3 = 3 × 1.25 = 3.75 days ≈ +4 days.
- Standard R3 = +7 days. RSR at R3 = 40%. → R4 = 7 × 0.50 = 3.5 days ≈ +4 days (compressed).

RSR-adaptive runs automatically when RSR is logged. If RSR is not captured (e.g., Light mode with no retrieval), fall back to standard 1-3-7-21 heuristic.

---
## Minimal daily playbooks
10-15 min:
- 1 micro target
- 3-5 retrieval prompts
- 1 exit ticket line

20-30 min:
- 1 small bucket
- 5-8 retrieval prompts
- 2-3 cards + exit ticket

45-60 min:
- 2-3 buckets
- 10-15 retrieval prompts
- full exit ticket + schedule reviews
