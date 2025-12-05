# M6 — Wrap Phase

## Purpose
Close the session properly. Review anchors, create cards, generate log in exact Brain format.

---

## Wrap Protocol

### Step 1: Anchor Review
List all Seeds/hooks created during the session.

**Say:** "Here are the anchors we locked today: [list them]"

### Step 2: Rate the Session
Ask user for ratings:
- Understanding Level (1-5)
- Retention Confidence (1-5)  
- System Performance (1-5)

### Step 3: Quick Reflection
Ask:
- "What worked well today?"
- "What needs fixing?"
- "Any gaps still open?"

### Step 4: Card Selection
Identify concepts that should become Anki cards.
Co-create card content with user approval.

### Step 5: Next Session Priority
Ask:
- "What topic next time?"
- "What's the specific focus?"

### Step 6: Generate Session Log
**Output the EXACT format below** — user copies this directly to their log file.

---

## SESSION LOG OUTPUT FORMAT

When user says "wrap", generate this exact format:

```
# Session Log - [TODAY'S DATE]

## Session Info
- Date: [YYYY-MM-DD]
- Time: [HH:MM]
- Duration: [X] minutes
- Study Mode: [Core / Sprint / Drill]

## Planning Phase
- Target Exam/Block: [from planning phase]
- Source-Lock: [materials used]
- Plan of Attack: [the plan we made]

## Topic Coverage
- Main Topic: [primary subject]
- Subtopics: [comma-separated list]

## Execution Details
- Frameworks Used: [H1, M2, etc.]
- Gated Platter Triggered: [Yes / No]
- WRAP Phase Reached: Yes
- Anki Cards Created: [number]

## Anatomy-Specific (if applicable)
- Region Covered: [region or "N/A"]
- Landmarks Mastered: [list or "N/A"]
- Muscles Attached: [list or "N/A"]
- OIAN Completed For: [list or "N/A"]
- Rollback Events: [Yes / No]
- Drawing Used: [Yes / No]
- Drawings Completed: [list or "N/A"]

## Ratings (1-5 scale)
- Understanding Level: [user's rating]
- Retention Confidence: [user's rating]
- System Performance: [user's rating]
- Calibration Check: [user's assessment]

## Anchors Locked
1. [Term]: [User's hook]
2. [Term]: [User's hook]
3. [Term]: [User's hook]

## Reflection

### What Worked
[user's response]

### What Needs Fixing
[user's response]

### Gaps Identified
[any gaps noted]

### Notes/Insights
[any additional notes]

## Next Session Priority
- Topic: [user's answer]
- Focus: [user's answer]
- Materials Needed: [if mentioned]
```

---

## Wrap Commands

| Command | Action |
|---------|--------|
| `wrap` | Start wrap phase |
| `log` | Output session log format |
| `cards` | Review card candidates |
| `done` | End session |

---

## Important

**The log format must be EXACT** — the Brain ingest script parses these fields. 

Do not:
- Change field names
- Skip sections (use "N/A" if not applicable)
- Add extra formatting
- Use different date formats (must be YYYY-MM-DD)

---

## Example Wrap Sequence

**User:** wrap

**GPT:** 
"Let's close out this session.

**Anchors we locked today:**
1. Gluteus maximus: "butt cape" — tent stake to tent pole
2. Piriformis: "pear in the doorway" blocking sciatic nerve
3. Greater trochanter: "hip's door knob" — lateral bump you can palpate

**Quick ratings (1-5):**
- Understanding level?
- Retention confidence?
- How did the system work for you?

**Reflection:**
- What worked well?
- What needs fixing?
- Any gaps still open?

**Next session:**
- What topic?
- Specific focus?"

**User:** [provides ratings and answers]

**GPT:** "Here's your session log — copy this to `brain/session_logs/2025-12-05_posterior-hip.md`:"

[Outputs exact format above with all fields filled in]
