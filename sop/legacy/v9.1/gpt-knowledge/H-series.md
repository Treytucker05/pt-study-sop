# H-Series — Priming/Mapping Frameworks

## Purpose
Expose structure and parts BEFORE memorization. Used in M2 (Prime) phase to map territory.

---

## H1: System (Default Priming Tool)

### Pattern
```
System → Subsystem → Component → Element → Cue
```

### When to Use
- Starting a new topic
- Complex system with multiple parts
- Need to see hierarchy

### Example: Shoulder Complex
```
System: Shoulder Complex
├── Joints
│   ├── Glenohumeral (GH)
│   ├── Acromioclavicular (AC)
│   ├── Sternoclavicular (SC)
│   └── Scapulothoracic
├── Bones
│   ├── Humerus
│   ├── Scapula
│   └── Clavicle
├── Muscles
│   ├── Rotator Cuff (SITS)
│   ├── Deltoid
│   └── Scapular stabilizers
└── Ligaments
    ├── GH ligaments
    └── Coracoclavicular
```

### Instruction
"Let me scan this system. I'll list the parts — don't memorize yet, just see the territory."

---

## H2: Anatomy (Opt-In Only)

### Pattern
```
Structure → Function → Behavior → Outcome
```

### When to Use
- **Only when user explicitly requests** traditional anatomy order
- Medical curriculum that requires structure-first approach
- User prefers this over function-first

### Default Override
The system defaults to **Function → Structure** (know what it DOES before what it IS).

H2 is hidden unless user says:
- "Use traditional anatomy order"
- "Structure first"
- "Switch to H2"

### Example: Biceps Brachii (H2 Order)
```
Structure: Two-headed muscle, long head from supraglenoid, short head from coracoid
Function: Elbow flexion, supination, shoulder flexion
Behavior: Strongest supination when elbow at 90°
Outcome: When weak → decreased supination power, carrying difficulty
```

### Compared to Function-First (Default)
```
Function: Flexes elbow, supinates forearm, assists shoulder flexion
Structure: Two heads — long (supraglenoid), short (coracoid) → radial tuberosity
Hook: "Biceps = Bottle opener muscle" (supination opens bottles)
```

---

## Using H-Series

### In Prime Phase
```
AI: "Let me run a System Scan (H1) on [topic]..."
[Lists hierarchy]
AI: "Group these into 2-3 buckets. Don't memorize — just bucket."
```

### Bucket Examples
After H1 scan, user might bucket:
- By function (movers vs stabilizers)
- By location (anterior vs posterior)
- By importance (high-yield vs detail)

---

## Quick Reference

| Framework | Pattern | Use For |
|-----------|---------|---------|
| H1 (System) | System → Subsystem → Component | Mapping complex topics |
| H2 (Anatomy) | Structure → Function → Behavior | Traditional order (opt-in) |

**Default: Function-first framing using M-Series after H1 mapping.**

## RAG / Verification
- Prefer source-backed scans; if no user-provided sources, mark items as unverified.
- Keep the scan tight: 2 short paragraphs **or** up to 6 bullets unless the user explicitly asks for more.

## Bucket Menus (quick prompts)
- Spatial (anterior/posterior/superior/inferior), Mechanism, Compare/contrast, Workflow, Timeline.
- After the H1 scan, ask the user to pick 2�4 buckets before encoding.

