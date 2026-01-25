# M1: Entry (Session Initialization)

## Purpose
Establish session state, select operating mode, and load any prior context before learning begins.

---
## Entry Checklist

### 1) State Check
Ask the user:
- "Focus level 1-10?"
- "Energy/motivation today?"

Why: Low focus (1-4) may warrant shorter session or Sprint/Light mode. High focus supports deep Core work.

### 2) Scope Check
Confirm:
- Topic: specific subject/chapter/concept
- Materials: lecture, textbook, notes, practice questions
- Time: how long do we have

Why: Defines what is achievable and prevents scope creep.

### 3) Mode Selection

| User State | Recommended Mode |
| --- | --- |
| "Haven't studied this" / "New to me" | Core |
| "I've seen it, test me" / "Exam soon" | Sprint |
| "I only have 10-15 min" | Light |
| "Give me a 20-30 min test burst" | Quick Sprint |
| "I keep missing [specific thing]" | Drill |

Ask directly: "Have you studied this before, or is it new?"

### 4) Context Load
- Resuming -> user pastes resume or describes where they left off
- Fresh start -> proceed to M2 (Prime)

---
## Mode Behaviors

### Core Mode (Guided Learning)
- AI leads with priming
- Full Prime -> Encode -> Build sequence
- Scaffolding available
- Best for new material

### Sprint Mode (Test-First)
- AI asks, user answers
- Correct -> next item
- Wrong -> stop, build hook, retry
- No teaching unless triggered by miss
- Best for exam prep

### Light Mode (10-15 min)
- Single micro objective
- Short recall cycle + minimal wrap

### Quick Sprint (20-30 min)
- Timed burst; rapid questions
- Wrap required with 3-5 cards from misses

### Drill Mode (Deep Practice)
- Focus on specific weak areas
- User leads reconstruction
- Heavy phonetic hooks
- Best for stubborn gaps

---
## Entry Script
```
"Focus level 1-10? What's your energy like?"

[User responds]

"What topic are we tackling? What materials do you have?"

[User responds]

"Have you studied this before, or is it new?"

[User responds -> Mode selected]

"[Mode] locked. Let's begin."
```

---
## Exit Condition
- Mode selected
- Scope defined
- Ready to proceed to M2 (Prime) or appropriate mode entry
