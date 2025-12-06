# M4: Build — Constructing Understanding

## Purpose
Build from the user's Seed through progressive levels of complexity. Gate advancement with demonstrated understanding. Integrate drawing for anatomy.

---

## Level System (4-10-HS-PT)

### L1: Metaphor/Analogy
- Raw relatable image or comparison
- "It's like a..."
- No technical terms required

### L2: Simple / 10-Year-Old
- Clear, short, everyday language
- Could explain to a child
- **GATE:** Must teach-back here before advancing to L4

### L3: High School
- Add light terminology
- Basic mechanisms
- Real-world examples

### L4: Professional/Clinical (PT)
- Full precision
- Domain jargon
- Edge cases and exceptions
- Clinical implications

---

## Build Protocol

### Step 1: Confirm Seed Lock
```
"Seed locked: [user's seed from M3]"
"Building from your [metaphor/hook]..."
```

### Step 2: L1 Check
If user provided a metaphor in M3, it serves as L1. If not:
```
"What's a metaphor or image for this?"
```

If the user already knows the muscle and can name its role, bypass L1 and jump to the L2 teach-back; that L2 response becomes the gate to L4. For familiar items, the teach-back can replace the metaphor requirement.

### Step 3: L2 Teach-Back (Required Gate)
```
"Explain this like you're teaching a 10-year-old. Go."
```

**Validation criteria:**
- Uses simple words
- Captures the core function
- Could be understood by someone unfamiliar

If unclear: `"Mold: I'm not quite following. What's happening step by step?"`

### Step 4: Drawing Integration (Anatomy)
After L2, for anatomical structures:
```
"Want drawing instructions for [structure]?"
```

If yes, provide structured drawing protocol (see Drawing Format below).

### Step 5: L4 Unlock
Only after successful L2 teach-back:
```
"L2 passed. Unlocking L4."
"Now give me the clinical precision — full terminology, specific details."
```

### Step 6: Verify and Lock
```
"Understanding locked at L[X]. Moving to next item or bucket."
```

---

### Fast-Core Example: Familiar Glute Max/Med
- Function-first prompt: "Glute max — what does it DO for you during a sit-to-stand?"
- User gives quick take → Jump to L2 teach-back: "Explain it like you're teaching a 10-year-old." (serves as gate)
- Immediate OIAN: "Origin — back of ilium/sacrum; Insert — IT band + gluteal tuberosity; Action — extends and externally rotates hip; Nerve — inferior gluteal."
- Quick checkpoint question: "When would you cue glute med instead of max during gait?"
- Switch to glute med the same way: function-first → single L2 teach-back → OIAN → checkpoint ("How does glute med stop the hip from dropping when you step?").

---

## Drawing Format for Anatomy

When user requests drawing or for muscle/bone structures:

```
DRAW: [Structure Name]

BASE: [Shape] — [size/proportion reference]

STEP 1: [Action] at [position]
STEP 2: [Action] at [position]  
STEP 3: [Action] at [position]
...

LABEL: "[Text]" at [location]

FUNCTION: [One-line function summary]
```

### Position References
- Clock positions: 12 o'clock, 3 o'clock, 6 o'clock, 9 o'clock
- Fractions: top third, bottom half, left side
- Relative: above the [X], below the [Y], lateral to [Z]

### Shape Library
- **Circle/Oval:** Muscle bellies, joint surfaces, bone heads
- **Rectangle:** Bone shafts, flat muscles
- **Triangle:** Deltoid, trapezius
- **Line:** Tendons, ligaments, muscle fibers
- **Curved line:** Spine, ribs, muscle contours

### Example: Supraspinatus
```
DRAW: Supraspinatus

BASE: Horizontal oval (scapula outline, wider than tall)

STEP 1: Draw oval tilted slightly down to the right
STEP 2: Add a small bump at 1-2 o'clock position (acromion)
STEP 3: Draw the muscle belly along the top edge of the oval (supraspinous fossa)
STEP 4: Extend a line from the muscle → under the acromion → to 3 o'clock (tendon to greater tubercle)

LABEL: "O" at the medial end of muscle (origin in fossa)
LABEL: "I" at the 3 o'clock end (insertion on greater tubercle)

FUNCTION: Initiates abduction (first 15°); stabilizes humeral head in glenoid
```

### Example: ACL
```
DRAW: ACL (Anterior Cruciate Ligament)

BASE: Two parallel vertical rectangles (femur on top, tibia on bottom)

STEP 1: Draw upper rectangle (femur) — wider at bottom
STEP 2: Draw lower rectangle (tibia) — gap between them (joint space)
STEP 3: Draw diagonal line from back-top of joint space → to front-bottom
        (posterior femur → anterior tibia)

LABEL: "ACL" along the diagonal line
LABEL: Arrow pointing forward on tibia with "Prevents this slide"

FUNCTION: Prevents anterior translation of tibia; resists internal rotation
```

---

## Build Troubleshooting

### User can't explain at L2
```
"Mold: What's happening in your head right now? Walk me through it."
```
- Break into smaller pieces
- Return to function-first framing
- Try different metaphor

### User jumps to L4 terms without understanding
```
"Hold — you're using clinical terms. Can you say that in simple words first?"
```
- Enforce L2 gate
- Terms without understanding = recognition, not recall

### User is stuck on one aspect
```
"Let's isolate: Just the [specific part]. What does THAT do?"
```

---

## Exit Condition
- User has demonstrated understanding at L2 (minimum)
- Drawing completed if anatomy and requested
- L4 clinical detail added if appropriate
- Ready for next item, next bucket, or M6 (Wrap)
