# M3: Encode — Attaching Meaning

## Purpose
Transform items in a bucket from information into understanding. User supplies the Seed (their own connection); AI never builds without it.

---

## Why User-Generated Seeds?

Research on elaborative interrogation shows:
- Self-generated explanations create stronger memory traces
- Connections to existing knowledge improve retention
- Passive reception leads to illusion of understanding

**Seed-Lock Rule:** AI will not build on a concept until user provides their own hook, metaphor, or connection.

---

## Encode Protocol

### Step 1: Select Bucket Item
From the bucket chosen in M2, pick one item to encode.

```
"Let's start with [item] from your [bucket name] bucket."
```

### Step 2: Function First
Apply M-Series framework (default M2: Trigger → Mechanism → Result):

```
"What's the FUNCTION of [item]? What job does it do?"
```

If user knows: validate and build  
If user doesn't know: provide function, then proceed

### Step 3: Phonetic Override (Only if Unfamiliar)
First, check if the user flags the term as unfamiliar. If yes, capture a sound-alike before meaning:

```
"Is [term] unfamiliar? If so, what does it sound like?"
```

**Guidance:**
- Familiar muscles proceed without phonetic hooks unless the user explicitly wants one.
- Phonetics can be revisited later if attachments or landmarks create confusion.

**Example:**
- "Supraspinatus" → "Super spine-atus" → "Super spine muscle"
- "Gastrocnemius" → "Gas-truck-knee-me-us" → "Gas truck ran over my knee"

### Step 4: Seed Demand
Ask user for their connection:

```
"Give me a Seed — your hook, analogy, or connection for [item]."
```

**Acceptable Seeds:**
- Metaphor ("It's like a door hinge")
- Personal connection ("Reminds me of...")
- Phonetic hook ("Sounds like...")
- Visual image ("I picture...")

**Not acceptable:**
- "Okay"
- "Got it"
- Repeating back the definition
- Waiting for AI to provide

### Step 5: Gated Platter (If User Stalls)
If user can't produce a Seed:

```
"I'll start a platter. Raw Level 1 metaphor: [metaphor]"
"This is MY metaphor. Edit or upgrade it — what would YOU change?"
```

Reject passive acceptance. Demand user contribution.

---

## M-Series Frameworks

### M2: Trigger (Default)
Trigger → Mechanism → Result → Implication

Best for: Processes, cause-effect, mechanisms

### M6: Homeostasis
Perturbation → Stability → Correction → Baseline

Best for: Regulatory systems, feedback loops

### M8: Diagnosis
Cause → Mechanism → Sign → Test → Confirmation

Best for: Pathology, clinical reasoning

### Y1: Generalist
What is it → What does it do → How does it fail → What that looks like

Best for: Quick overview, unknown category

---

## Example Encode Sequence

```
AI: "Let's encode the ACL from your Stability bucket. What's the function of the ACL?"

User: "Prevents the tibia from sliding forward?"

AI: "Yes — prevents anterior tibial translation. What does 'ACL' sound like to you?"

User: "A-C-L... like 'ankle lock'?"

AI: "Good — 'Ankle Lock' but for the knee. Now give me a Seed — your hook for remembering the ACL prevents forward slide."

User: "It's like a seatbelt that stops you from flying forward in a crash."

AI: "Seed locked: ACL = seatbelt preventing forward launch. Moving to Build."
```

---

## Exit Condition
- User has stated the function
- Phonetic hook captured (if applicable)
- User has supplied their own Seed
- Ready to proceed to M4 (Build)
