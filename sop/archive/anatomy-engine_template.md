# Anatomy Learning Engine

## Purpose
Specialized protocol for regional anatomy learning. Enforces the correct learning sequence: Bones → Landmarks → Attachments → OIAN → Clinical. Prevents premature memorization of muscle lists before spatial understanding is solid.

---

## Primary Goal for Anatomy

> **Build a clean mental atlas of:**
> - Every exam-relevant bone landmark
> - Where each landmark sits in space
> - What muscles attach to that landmark
>
> **BEFORE trying to memorize OIAN lists.**
>
> OIAN should feel like a "read-off" from the mental atlas, not brute-force memorization.

---

## The Real Anatomy Learning Order

**Mandatory sequence for regional anatomy:**

```
1. BONES → 2. LANDMARKS → 3. ATTACHMENTS (O/I) → 4. ACTIONS (A) → 5. INNERVATION (N) → 6. CLINICAL
```

### Constraints

- ❌ **NOT ALLOWED:** Jumping directly to OIAN lists before bone + landmark mapping is complete
- ❌ **NOT ALLOWED:** Clinical patterns before OIAN is stable for main muscles
- ❌ **NOT ALLOWED:** Muscle-first or OIAN-first approaches (unless explicitly requested for quick review)

### Why This Order Works

| Phase | What It Builds |
|-------|----------------|
| Bones | The scaffold — what structures exist |
| Landmarks | The attachment points — where things connect |
| Attachments | The map — which muscles go where |
| Actions | The logic — what muscles do (derived from attachments) |
| Innervation | The wiring — what controls each muscle |
| Clinical | The application — what happens when things fail |

---

## Bone-First Attachment Loop

**The core engine for anatomy sessions:**

### Step 1: Select Region
Define the anatomical region for this session:
- "Pelvis & Hip"
- "Anterior Thigh"
- "Posterior Leg"
- "Rotator Cuff"
- etc.

### Step 2: List Exam-Required Bones + Landmarks
Pull directly from lab PDFs and Learning Objectives.

```
"For [region], what bones and landmarks are exam-relevant?"

Example — Posterior Hip:
- Ilium: iliac crest, PSIS, ASIS
- Ischium: ischial tuberosity, ischial spine, lesser sciatic notch
- Sacrum: sacral promontory
- Femur: greater trochanter, linea aspera
```

### Step 3: Run Landmark Pass (Visual-First)
For EACH landmark, complete this sequence:

```
LANDMARK: [Name]

1. VISUAL: What does it look like? Shape, size, texture
2. SPATIAL: Where is it? Superior/inferior, anterior/posterior, medial/lateral
3. NEIGHBORS: What's nearby? Relation to other landmarks
4. ATTACHMENTS: What muscles originate here? What inserts here?
```

**Do NOT add OIAN yet.** Just establish:
- Recognition (can you find it?)
- Location (where does it sit?)
- Connections (what attaches?)

### Step 4: Attach Muscles (Names Only First)
Still per-landmark:

```
"From [landmark], which muscles originate?"
"Which muscles insert at [landmark]?"
```

Build the attachment map before adding details:

| Landmark | Origins | Insertions |
|----------|---------|------------|
| Ischial tuberosity | Hamstrings (semimembranosus, semitendinosus, biceps femoris long head) | — |
| Greater trochanter | — | Gluteus medius, gluteus minimus, piriformis |

### Step 5: Layer OIAN (Only When Map Is Solid)
Now that landmark → attachment is established:

For each muscle attached to that landmark:
- **Origin:** Now trivial — it's the landmark you just mastered
- **Insertion:** Where does it go TO?
- **Action:** What movement does this attachment pattern create?
- **Nerve:** What innervates it?

```
MUSCLE: Biceps Femoris (Long Head)

O: Ischial tuberosity (you know this landmark)
I: Head of fibula
A: Knee flexion, hip extension, lateral rotation of flexed knee
N: Tibial portion of sciatic nerve (L5-S2)
```

### Step 6: Add Clinical Patterns (Last)
Only after OIAN is stable:

- What happens if this muscle/nerve is damaged?
- Gait changes?
- Functional deficits?
- Common injury patterns?

```
CLINICAL: Hamstring strain
- Mechanism: Eccentric overload during sprinting
- Signs: Posterior thigh pain, bruising, weakness in knee flexion
- Test: Resisted knee flexion, palpation at ischial tuberosity
```

---

## Visual-First Landmark Protocol

**All landmark learning is VISUAL-FIRST.**

### For Each New Landmark:

#### 1. Visual Recognition Cues
How to spot it in cadaver/lab images:
- Shape (bump, ridge, spine, notch, fossa)
- Size (large, small, subtle)
- Texture (rough, smooth)
- Position in the image

```
"The ischial tuberosity is the BIG, ROUGH bump at the bottom of the pelvis — 
it's what you sit on. In lab, look for the most prominent inferior projection 
of the ischium."
```

#### 2. Spatial Orientation
Where it sits in 3D space:
- Superior/inferior
- Anterior/posterior
- Medial/lateral
- Relation to nearby landmarks

```
"The ischial spine is ABOVE and MEDIAL to the ischial tuberosity.
Between them is the lesser sciatic notch."
```

#### 3. Attachment Importance
What makes this landmark matter:
- "Major origin hub for: [muscles]"
- "Major insertion hub for: [muscles]"
- Don't add full OIAN yet — just the connection map

```
"The ischial tuberosity is THE origin hub for all three hamstrings 
plus adductor magnus (hamstring part)."
```

### Metaphor Restriction

> **Metaphors and memory tricks may support visual/spatial understanding, but cannot REPLACE the actual bone/landmark picture. Visual-first recognition is mandatory.**

✅ Good: "The ischial tuberosity is like a rough seat cushion bump"
❌ Bad: "Just remember IT = hamstrings" (skips visual understanding)

---

## Rollback Rule

> **If the learner is struggling to recall OIAN, the system MUST roll back to:**
> 1. Visual landmark review
> 2. Attachment mapping
> 3. Then re-layer O/A/N

**Never push forward on OIAN if the landmark foundation is shaky.**

```
"You're struggling with hamstring insertions. Let's roll back.

Can you picture the ischial tuberosity? Point to where it is.
What muscles originate from there?

[Rebuild foundation, then return to OIAN]"
```

---

## Anatomy Session Flow

```
M0 (Planning) → Region selected, landmarks identified from LOs/labs

M2 (Prime) → List bones and landmarks for region (H1 scan)

M3 (Encode) → Run Landmark Pass
   ↓
   For each landmark:
   - Visual recognition
   - Spatial orientation  
   - Attachment mapping

M4 (Build) → Layer OIAN per muscle
   ↓
   For each muscle on that landmark:
   - O (from landmark)
   - I (where it goes)
   - A (what movement)
   - N (what nerve)
   ↓
   Add clinical patterns last

M6 (Wrap) → Review landmarks mastered, create cards
```

---

## Integration with Drawing Protocol

Anatomy drawing follows the same sequence:

1. **Draw bone outline first** (the scaffold)
2. **Mark landmarks** (the attachment points)
3. **Add muscle lines** from origin → insertion
4. **Label O/I points**
5. **Annotate with action arrows**

```
DRAW: Posterior Hip Attachments

BASE: Pelvis outline (posterior view)

STEP 1: Draw pelvis — ilium on top, ischium below
STEP 2: Mark PSIS (posterior superior iliac spine) — top of ilium
STEP 3: Mark ischial tuberosity — big bump at bottom
STEP 4: Mark greater trochanter of femur — lateral bump
STEP 5: Draw hamstring lines from ischial tuberosity → down toward knee
STEP 6: Draw glute med/min lines from ilium → to greater trochanter

LABEL: "O" at ischial tuberosity (hamstring origin)
LABEL: "I" at greater trochanter (glute insertion)

FUNCTION: Hamstrings extend hip & flex knee; glutes abduct & stabilize hip
```

---

## Quick Reference: Anatomy Learning Order

| Step | Focus | Question |
|------|-------|----------|
| 1 | Bones | What bones are in this region? |
| 2 | Landmarks | Where are the attachment points? |
| 3 | Attachments | What muscles connect here? |
| 4 | Actions | What do those attachments DO? |
| 5 | Nerves | What controls those muscles? |
| 6 | Clinical | What happens when they fail? |

**Violation check:** If you're memorizing OIAN without knowing where the landmarks are, you've skipped steps. Roll back.
