# PT Study SOP v7.2 – Methods Index

**Purpose:** Comprehensive index of all methods, protocols, and techniques used in the PT Study SOP v7.2

**Last Updated:** November 24, 2025

---

## Table of Contents

1. [Core Framework Methods](#core-framework-methods)
2. [Memory & Encoding Methods](#memory--encoding-methods)
3. [Active Recall Methods](#active-recall-methods)
4. [Teaching & Explanation Methods](#teaching--explanation-methods)
5. [Assessment & Validation Methods](#assessment--validation-methods)
6. [Output Generation Methods](#output-generation-methods)
7. [Adaptation & Troubleshooting Methods](#adaptation--troubleshooting-methods)
8. [Governance & Control Methods](#governance--control-methods)

---

## Core Framework Methods

### MAP → LOOP → WRAP Framework

**Reference:** [Core SOP Section 0](./sop_v7_core.md#0-session-overview--map--loop--wrap)

**Description:** The three-phase study session structure

**Components:**

- **MAP (Warm-up):** Session setup + anchor building
- **LOOP (Work sets):** Teaching + active recall cycles
- **WRAP (Cool-down):** Integration + assessment + outputs

**When to Use:** Every study session

**Key Principle:** Treat studying like physical training – warm up, work hard, cool down

---

### Framework Selection Method

**Reference:** [Core SOP Section 1](./sop_v7_core.md#1-triggers--setup-map-step-1)

**Description:** Choosing the right organizational framework for your topic

**Available Frameworks:**

1. **Structure → Function → Clinical Tie**
   - Best for: Anatomy, histology, structural topics
   - Example: "The brachial plexus (structure) innervates the upper extremity (function), and damage causes specific motor/sensory deficits (clinical)"

2. **Mechanism → Outcome → Clinical**
   - Best for: Pathophysiology, pharmacology, disease processes
   - Example: "Dopamine depletion in substantia nigra (mechanism) causes bradykinesia and rigidity (outcome), leading to Parkinson's symptoms (clinical)"

3. **Input → Process → Output**
   - Best for: Pathways, metabolic processes, signal cascades
   - Example: "Sensory input (input) travels through dorsal column pathway (process) to reach cortex for conscious perception (output)"

4. **Slide Order**
   - Best for: When lecture sequence is already logical
   - Use when other frameworks don't fit naturally

**Selection Process:**

1. AI suggests default framework based on topic type
2. User can accept or request alternative
3. Stick with chosen framework throughout session

---

### Anchor Definition Method

**Reference:** [Core SOP Section 2](./sop_v7_core.md#2-smart-prime--build-the-map-anchors)

**Description:** Creating 3–7 big-picture concepts to scaffold learning

**Anchor Criteria:**

- Meaningful and distinct
- Connected by chosen framework
- Represents key structures, mechanisms, or categories

**Anchor Outputs:**

1. **10-year-old explanation** (1–2 sentences)
2. **Short explanation** (2–4 sentences using framework)
3. **Optional hook/analogy** (mechanism-linked)

**Example:**

```
Anchor: Astrocytes

10-year-old: Star-shaped brain cells that take care of neurons

Short: Astrocytes are star-shaped glial cells (structure) that provide 
nutrients to neurons, maintain the blood-brain barrier, and regulate 
extracellular ion balance (function). When damaged, they contribute to 
neuroinflammation and glial scarring (clinical tie).

Hook: "Mom cells" – they feed, protect, and clean up after neurons
```

---

### Level of Understanding (LoU) Assessment

**Reference:** [Core SOP Section 2](./sop_v7_core.md#2-triggers--entry)

**Description:** Gauging user's baseline knowledge to adjust teaching approach

**LoU Levels:**

| Level | Description | Adjustments |
|-------|-------------|-------------|
| **None/Low** | First exposure or very fuzzy | Heavier Smart Prime, more teaching, simpler explanations, scaffolded recall |
| **Moderate** | Seen before, some gaps | Standard Smart Prime, regular recall cycles, focus on weak spots |
| **High** | Mostly solid, need refinement | Brief Prime, more recall/quiz, application questions |

**Assessment Method:**

- Ask user directly at session start
- Adjust based on performance during session
- If user struggles more than expected, dial back complexity

---

## Memory & Encoding Methods

### NMMF (Name → Meaning → Memory Hook → Function)

**Reference:** [Core SOP Section 2.5](./sop_v7_core.md#25--name--meaning--memory-hook--function-nmmf)

**Description:** Systematic approach to learning and remembering terminology

**Four Components:**

1. **Name**
   - State term exactly as in source material
   - Example: "Astrocyte"

2. **Meaning**
   - Etymology or "sounds like" explanation
   - Example: "Astro- = star (star-shaped cells)"

3. **Memory Hook**
   - Simple image/metaphor tied to mechanism
   - Example: "Mom cells – feed, protect, clean"

4. **Function**
   - One-sentence description connected to hook
   - Example: "Astrocytes are 'mom cells' that feed and protect neurons while cleaning up the neuronal environment"

**When to Use:**

- For every anchor with a name worth memorizing
- Especially for complex terminology
- When user has struggled with similar terms before

**Benefits:**

- Reduces cognitive load
- Binds terminology → mechanism → hook in one chunk
- Creates strong retrieval cues

---

### Hook Integration Rule (HIR)

**Reference:** [Core SOP Section 2.6](./sop_v7_core.md#26--hook-integration-rule-hir)

**Description:** Mandatory reuse of memory hooks across all learning phases

**Five Integration Points:**

1. **Initial Teaching**
   - Use hook when first explaining concept
   - Example: "Remember, astrocytes are your 'mom cells'…"

2. **Recall Prompts**
   - Cue with hook during Brain Dump/Teach-Back
   - Example: "Explain what the 'mom cells' do again"

3. **Anki Cards**
   - Include hook on back of flashcard
   - Example: "Hook: mom cells (feed, protect, clean)"

4. **Recap Sheet**
   - List under "Memory Devices & Hooks" section
   - Group by anchor

5. **Consistency**
   - Use same hook throughout session
   - Update everywhere if user changes hook

**Key Principle:**

Hooks are not optional decorations – they're permanent retrieval cues that must be reinforced consistently.

**Avoid:**

- Hook drift (changing hook mid-session)
- One-off hooks that aren't reused
- Random analogies not tied to mechanism

---

### Personal Encoding Step (PES)

**Reference:** [Core SOP Section 2.7](./sop_v7_core.md#27--personal-encoding-step-pes)

**Description:** User-generated or user-modified hooks for active encoding

**Process:**

1. **AI presents NMMF** with default hook

2. **AI prompts user:**
   - "What does this name/idea remind *you* of?"
   - "Do you like this hook, or would another image work better?"
   - "If you had to explain this to a friend, what picture would you use?"

3. **User responds:**
   - Adopts AI's hook, **or**
   - Tweaks it, **or**
   - Creates entirely new hook

4. **AI locks in user's version:**
   - Updates NMMF block
   - Uses user's hook in all subsequent teaching, recall, cards, recap

5. **If user is blank:**
   - AI offers 1–2 candidate hooks
   - User picks or modifies one

**Example:**

```
AI: "I'm calling astrocytes 'mom cells.' Does that work for you?"

User: "I like 'support staff' better – like the crew that keeps a 
theater running."

AI: "Perfect! We'll use 'support staff' as your hook. Astrocytes are 
the support staff that keep neurons functioning smoothly."
```

**Benefits:**

- Forces active encoding (not passive acceptance)
- Creates personally meaningful associations
- Dramatically increases retention
- Makes learning feel natural and memorable

**Key Principle:**

The best hook is the one the user creates or chooses themselves.

---

### Hook Quality Criteria

**Reference:** Throughout Core SOP

**Description:** Standards for effective memory hooks

**Good Hooks Are:**

1. **Mechanism-Linked**
   - Connected to actual function/behavior
   - Not random or superficial
   - Example: "Mom cells" works because astrocytes actually feed, protect, and clean

2. **Simple & Vivid**
   - Easy to visualize
   - Concrete, not abstract
   - Example: "Insulation crew" for oligodendrocytes

3. **Personally Meaningful**
   - Resonates with user's experience
   - User-generated or user-approved
   - Example: User who works in theater prefers "support staff" over "mom cells"

4. **Stable**
   - Used consistently throughout session
   - Doesn't drift or change
   - Updated everywhere if modified

5. **Retrievable**
   - Easy to recall under pressure
   - Works as a cue during exams
   - Example: "What do the 'brain doctors' do?" → microglia functions

**Poor Hooks:**

- Random associations ("sounds like asteroid")
- Overly complex metaphors
- Not tied to mechanism
- Changed frequently
- Imposed without user buy-in

---

## Active Recall Methods

### Brain Dump Protocol

**Reference:** [Core SOP Section 3](./sop_v7_core.md#3-loop--teach--recall--correct--repeat)

**Description:** Free recall of everything learned about a chunk

**Process:**

1. **Setup:**
   - User closes notes
   - AI gives prompt: "Tell me everything you remember about [X]"

2. **Recall:**
   - User recalls freely
   - No notes, no prompts
   - AI listens silently

3. **Evaluation:**
   - After user finishes, AI compares to anchor list
   - Labels each anchor: Strong / Moderate / Weak

4. **Correction:**
   - AI provides brief corrections for missed/wrong items
   - Uses 10-year-old explanation + hook

**When to Use:**

- After teaching 2–4 anchors
- When user prefers unstructured recall
- To assess overall retention

**Benefits:**

- Tests pure retrieval strength
- Reveals what's actually stuck vs. what felt familiar
- Builds confidence when successful

**Cuing Strategy:**

If user blanks completely:

- Use hook as cue: "What do the 'mom cells' do?"
- Or framework cue: "What's the structure? The function?"
- Then let user continue

---

### Teach-Back Protocol

**Reference:** [Core SOP Section 3](./sop_v7_core.md#3-loop--teach--recall--correct--repeat)

**Description:** Structured explanation as if teaching a novice

**Process:**

1. **Setup:**
   - User closes notes
   - AI gives prompt: "Teach me [mechanism/pathway/structure] as if I'm a novice"

2. **Teaching:**
   - User explains step-by-step
   - Uses framework (Structure → Function, Mechanism → Outcome, etc.)
   - AI can give gentle prompts if sequence breaks

3. **Evaluation:**
   - AI assesses accuracy and completeness
   - Labels anchors: Strong / Moderate / Weak

4. **Correction:**
   - AI provides specific feedback
   - "You got steps 1 and 3 but skipped step 2 (X)"
   - Reinforces with hook if relevant

**When to Use:**

- For processes, pathways, mechanisms
- When user prefers structured recall
- To practice explaining for exams

**Benefits:**

- Forces logical sequencing
- Reveals gaps in understanding
- Practices exam-style explanations
- Builds teaching skills

**Hook Integration:**

AI can prompt with hooks:

- "Walk me through the 'gas vs brake' pathways"
- "Explain the 'insulation crew' process"

---

### Recall Timing Method

**Reference:** [Core SOP Section 5](./sop_v7_core.md#5-active-recall-loop-phase--detailed)

**Description:** When to trigger active recall during LOOP phase

**Default Timing:**

- After ~2–4 anchors or one subtopic

**Adjust Earlier (1–2 anchors) if:**

- User seems overloaded
- LoU was None/Low
- Material is very complex
- User requests more frequent checks

**Adjust Later (4–6 anchors) if:**

- User is cruising
- LoU is High
- Material is straightforward
- User wants faster pace

**Key Principle:**

Never stay in input mode too long. Frequent recall beats long teaching blocks.

---

### Strength Labeling System

**Reference:** [Core SOP Section 3](./sop_v7_core.md#3-loop--teach--recall--correct--repeat)

**Description:** Tracking retention strength for each anchor

**Three Levels:**

| Label | Criteria | Action |
|-------|----------|--------|
| **Strong** | Correct at least twice in different contexts; confident, complete | Light review; optional card if critical |
| **Moderate** | Partial recall or hesitations; mostly right but gaps | Targeted review; card for important items |
| **Weak** | Missed or clearly wrong; blanked or confused | Priority review; always gets a card |

**Tracking Method:**

- Label after each recall attempt
- Update based on quiz performance
- Use labels to drive card generation

**Key Principle:**

Weak-point-driven review – focus on what you actually missed, not random review.

---

### Comprehensive Recall Rule

**Reference:** [Core SOP Section 7](./sop_v7_core.md#7-quiz--validate)

**Description:** Ensuring every anchor is tested at least once

**Rule:**

No anchor considered "covered" unless it has appeared in:

- Brain Dump, **or**
- Teach-Back, **or**
- Quiz question

**Implementation:**

- Track which anchors have been tested
- If anchor hasn't appeared in recall, include in quiz
- Ensures no gaps slip through

**Key Principle:**

Active recall gate – no topic is solid until you've retrieved it from memory.

---

## Teaching & Explanation Methods

### Chunk Size Adaptation

**Reference:** [Core SOP Section 3](./sop_v7_core.md#3-loop--teach--recall--correct--repeat)

**Description:** Adjusting teaching chunk size based on performance

**If Recall Is Poor or User Says "This Is Heavy":**

- **Shrink chunks:**
  - Fewer anchors per teaching block (1–2 instead of 2–4)
  - Slower, more detailed explanation
  - More frequent micro-checks

- **Add scaffolding:**
  - More cued recall
  - Simpler language
  - More hooks/analogies

**If Recall Is Strong:**

- **Expand chunks:**
  - More anchors per block (4–6 instead of 2–4)
  - Faster pace
  - More integration questions

- **Increase challenge:**
  - Application questions
  - Cross-topic connections
  - Mini cases

**Key Principle:**

Adapt to user's cognitive load in real time. Respect working memory limits.

---

### Depth Control Method

**Reference:** [Core SOP Section 4](./sop_v7_core.md#4-learn--clarify-teaching-phase)

**Description:** Managing level of detail in explanations

**Default Depth:**

Minimal depth to support:

- Exam questions
- Clinical reasoning
- PT practice

**Add One Layer When:**

- User asks "why?"
- Understanding requires it
- Mechanism aids retention

**Stop Adding Depth When:**

- User seems overloaded
- Detail isn't exam-relevant
- Time is limited

**External Information:**

- Only on explicit user permission
- Clearly labeled as external
- Tied back to course material

**Key Principle:**

Default to exam/clinical depth. Add layers only when helpful, one at a time.

---

### Micro-Check Method

**Reference:** [Core SOP Section 4](./sop_v7_core.md#4-learn--clarify-teaching-phase)

**Description:** Small retrieval questions during teaching

**Examples:**

- "What does this structure do again?"
- "What happens when this mechanism fails?"
- "Which nerve root was that?"

**Purpose:**

- Reduce jump into full Brain Dump
- Catch misunderstandings early
- Keep user engaged
- Build retrieval strength incrementally

**Frequency:**

- Every 2–3 minutes during teaching
- After introducing new term or concept
- When transitioning between anchors

**Key Principle:**

Frequent small retrievals beat infrequent large ones.

---

### Simplification Strategies

**Reference:** [Core SOP Section 4](./sop_v7_core.md#4-learn--clarify-teaching-phase)

**Description:** Making complex concepts accessible

**Strategies:**

1. **10-Year-Old Explanation**
   - Strip jargon
   - Use concrete language
   - Focus on core idea

2. **Hook/Analogy**
   - Tie to familiar concept
   - Make it visual
   - Connect to mechanism

3. **Framework Application**
   - Break into Structure → Function → Clinical
   - Or Mechanism → Outcome → Clinical
   - Makes relationships explicit

4. **Micro-Steps**
   - Break process into 3–5 tiny steps
   - Teach one at a time
   - Confirm understanding before next

5. **Visual/Spatial**
   - Describe location
   - Use directional language
   - Create mental map

**When to Use:**

- User says "I don't get it"
- User asks "Explain like I'm 10"
- Repeated errors on same concept
- User seems frustrated

**Key Principle:**

Simplify first, then reintroduce formal terms once intuition is built.

---

## Assessment & Validation Methods

### Quiz Design Method

**Reference:** [Core SOP Section 7](./sop_v7_core.md#7-quiz--validate)

**Description:** Creating effective validation quizzes

**Quiz Structure:**

- **3–5 questions** per session
- Mix of question types
- Map each question to specific anchors

**Question Types:**

1. **Short-Answer Recall**
   - "What are the main functions of astrocytes?"
   - Tests pure retrieval

2. **Mechanism Explanation**
   - "Explain how dopamine depletion leads to Parkinson's symptoms"
   - Tests understanding of process

3. **Mini Case**
   - "Patient has bradykinesia, rigidity, and resting tremor. What's the likely mechanism?"
   - Tests application

4. **Hook-Based**
   - "Using the 'gas vs brake' analogy, explain what happens if the brake fails"
   - Tests hook integration

**Coverage Rule:**

- Every anchor must appear in at least one question
- If anchor wasn't in Brain Dump/Teach-Back, it must be in quiz

**Feedback:**

- Immediate and specific
- Tie back to framework and hook
- Update strength labels based on performance

---

### Integration Assessment

**Reference:** [Core SOP Section 6](./sop_v7_core.md#6-connect--expand-integration-phase)

**Description:** Testing ability to connect concepts

**Methods:**

1. **Cross-Topic Bridges**
   - "How does this relate to what we learned about [previous topic]?"
   - Tests network building

2. **Clinical Application**
   - "Patient has [symptoms]. What structure/mechanism is affected?"
   - Tests real-world reasoning

3. **Framework Chains**
   - "Walk me through Structure → Function → Clinical tie for this system"
   - Tests framework mastery

4. **Tiny Cases**
   - Present scenario
   - User identifies mechanism
   - Discusses PT implications

**When to Use:**

- After at least one recall pass
- Before final quiz
- When LoU is Moderate/High

**Key Principle:**

Isolated facts are useless. Test connections and applications.

---

## Output Generation Methods

### Anki Card Generation Rules

**Reference:** [Core SOP Section 8](./sop_v7_core.md#8-outputs--cards-and-recap-detailed)

**Description:** Creating effective flashcards

**Card Sources:**

- All Weak anchors
- Important Moderate anchors
- Critical/high-yield anchors (even if Strong, if user requests)

**Card Format:**

**Front:**

- Short, precise, exam-style cue
- Example: "What are the main functions of astrocytes?"

**Back:**

- Concise answer (bullet points or short paragraph)
- **Hook reminder** if there is one
- Example:
  ```
  1. Provide nutrients to neurons
  2. Maintain blood-brain barrier
  3. Regulate extracellular ion balance
  4. Remove excess neurotransmitters
  
  Hook: "Mom cells" (feed, protect, clean)
  ```

**Tags:**

- Format: `<Course>::<Module>::<Topic>::<Subtopic>`
- Example: `Neuroscience::CNS::GlialCells::Astrocytes`

**Difficulty Balance:**

- Mostly moderate/challenging items
- Few easier review items if needed
- Focus on weak points, not random coverage

**Workflow:**

1. AI generates card list
2. User reviews:
   - Accept all
   - Edit wording
   - Remove or add items
3. Finalize/export for Anki

---

### Recap Sheet Structure

**Reference:** [Core SOP Section 8](./sop_v7_core.md#8-outputs--cards-and-recap-detailed)

**Description:** One-page session summary for active recall

**Sections:**

1. **Title + Date**
   - Example: "Glial Cells – CNS Module 9 | November 24, 2025"

2. **Anchor Summary**
   - Bullets under framework headings
   - Example:
     ```
     Structure → Function → Clinical Tie
     
     1. Astrocytes
        - Star-shaped support cells
        - Feed neurons, maintain BBB, regulate ions, clean neurotransmitters
        - Damage → neuroinflammation, glial scarring
     ```

3. **Memory Devices & Hooks**
   - Listed under relevant anchor
   - Example:
     ```
     - Astrocytes = "Mom cells" (feed, protect, clean)
     - Microglia = "Brain doctors" (immune response)
     - Oligodendrocytes = "Insulation crew" (myelin wrappers)
     ```

4. **Weak Points / Next Time**
   - Short bullet list of trouble spots
   - Example:
     ```
     - Review oligodendrocyte vs Schwann cell differences
     - Practice drawing myelination process
     - Connect to MS pathophysiology
     ```

**Style:**

- Short bullets (often framable as prompts)
- Designed for active recall, not passive re-reading
- One page maximum

**Format:**

- OneNote-ready (or any note-taking system)
- Plain text or markdown
- Easy to scan and use for future sessions

---

## Adaptation & Troubleshooting Methods

### Overload Detection

**Reference:** [Core SOP Section 9](./sop_v7_core.md#9-troubleshooting--stuck-handling)

**Description:** Recognizing when user is cognitively overloaded

**Signs:**

- Repeated "I don't get it"
- Same question asked multiple ways
- Silence / blank Brain Dumps
- Increased errors over time
- User says "this is heavy" or "I'm lost"

**Interventions:**

1. **Name It**
   - "This chunk seems heavy; let's adjust"
   - Normalizes struggle

2. **Offer Options** (user chooses):
   - Swap framework
   - Zoom in on one step
   - Build a small map
   - Recap what's known before tackling gap

3. **Micro-Steps**
   - Break into 3–5 tiny steps
   - Teach one at a time with confirmation

4. **Simpler Language**
   - Replace jargon with concrete language
   - Use or refine hooks
   - Reintroduce formal terms once intuitive

**Key Principle:**

Cognitive overload is normal. Adjust immediately, don't push through.

---

### Fast Mode Adaptation

**Reference:** [Core SOP Section 5 & 11](./sop_v7_core.md#5-fast--exam-crunch-mode-1530-minutes)

**Description:** Adjusting SOP for time-constrained sessions (15–30 minutes)

**Trigger:**

- User says "Fast mode [topic]"
- Session time ≤30 minutes

**Adjustments:**

**MAP:**

- 3–5 ultra-brief anchors (1–2 sentences each)
- One main framework only
- Quick NMMF for key terms

**LOOP:**

- Teach minimal detail
- 1–2 Brain Dumps or quick Q&A
- Skip extended teaching

**WRAP:**

- 2–3 high-yield quiz questions
- 3–10 key cards (with hooks)
- Half-page recap: must-know anchors + mnemonics only

**Trade-Off:**

- Fast Mode = coverage and emergency prep, **not full mastery**
- Label outcomes clearly: "This was a fast review, not full mastery"
- Plan for deeper review later if time allows

**When to Use:**

- Exam next session
- Quick refresh before clinical
- Limited study window
- Emergency prep

---

### Framework Switching

**Reference:** [Core SOP Section 9](./sop_v7_core.md#9-troubleshooting--stuck-handling)

**Description:** Changing organizational framework mid-session

**When to Switch:**

- User says current framework isn't clicking
- Repeated confusion despite explanations
- User suggests alternative organization

**How to Switch:**

1. **Acknowledge:**
   - "This framework doesn't seem to be working. Let's try another angle."

2. **Offer alternatives:**
   - If using Structure → Function, try Mechanism → Outcome
   - If using slide order, try system-based

3. **Rebuild anchors:**
   - Quickly reorganize anchors under new framework
   - Update NMMF if needed

4. **Continue:**
   - Resume LOOP with new framework

**Key Principle:**

Framework is a tool, not a rule. Switch if it helps understanding.

---

## Governance & Control Methods

### Source-Lock Protocol

**Reference:** [Core SOP Section 6 & 10](./sop_v7_core.md#6-always-on-rules-short-version)

**Description:** Restricting content to Project files only

**Rule:**

Use **only** files in this Project for course content.

**Exceptions:**

- User explicitly requests external sources
- Clearly label external info as such
- Tie back to course material

**Purpose:**

- Ensures accuracy to your specific coursework
- Prevents confusion from conflicting sources
- Keeps focus on exam-relevant material

**Implementation:**

- AI scans Project files only
- Ignores external knowledge unless requested
- If uncertain, asks user for clarification

---

### Active Recall Gate

**Reference:** [Core SOP Section 6 & 10](./sop_v7_core.md#6-always-on-rules-short-version)

**Description:** No topic considered "covered" without recall

**Rule:**

User must attempt active recall (Brain Dump, Teach-Back, or quiz) before moving on.

**Implementation:**

- After teaching 2–4 anchors, prompt recall
- Don't teach new material until recall is done
- Track which anchors have been tested

**Purpose:**

- Prevents illusion of competence
- Ensures actual learning, not just exposure
- Builds retrieval strength

**Key Principle:**

If you haven't retrieved it from memory, you haven't learned it.

---

### One-Small-Step Rule

**Reference:** [Core SOP Section 6 & 10](./sop_v7_core.md#6-always-on-rules-short-version)

**Description:** Small chunks, frequent checks

**Rule:**

- Avoid long monologues
- Pause regularly to check understanding
- Encourage interruption and questions

**Implementation:**

- Teach 2–4 anchors, then pause
- Ask micro-check questions
- Invite user to stop and ask questions

**Purpose:**

- Respects working memory limits
- Catches misunderstandings early
- Keeps user engaged

**Key Principle:**

Small steps beat big leaps. Frequent feedback beats delayed correction.

---

### Summary & Save Rule

**Reference:** [Core SOP Section 6 & 10](./sop_v7_core.md#6-always-on-rules-short-version)

**Description:** Every session ends with outputs

**Rule:**

Every session must produce:

1. **Anki cards** for weak/critical items (with hooks)
2. **One-page recap** (with hooks)

**Purpose:**

- Locks in learning
- Sets up spaced repetition
- Creates review materials
- Documents weak points for next session

**Implementation:**

- Generate outputs before ending session
- User reviews and approves/tweaks
- Export for Anki and OneNote

**Key Principle:**

No session is complete without outputs. Learning without review materials is wasted effort.

---

## Quick Reference Table

| Method | When to Use | Key Benefit | Reference |
|--------|-------------|-------------|----------|
| **MAP → LOOP → WRAP** | Every session | Structured, repeatable framework | [Section 0](./sop_v7_core.md#0-session-overview--map--loop--wrap) |
| **NMMF** | For every key term | Reduces cognitive load, creates hooks | [Section 2.5](./sop_v7_core.md#25--name--meaning--memory-hook--function-nmmf) |
| **HIR** | When hook exists | Reinforces retrieval cues | [Section 2.6](./sop_v7_core.md#26--hook-integration-rule-hir) |
| **PES** | After NMMF | Active encoding, personal meaning | [Section 2.7](./sop_v7_core.md#27--personal-encoding-step-pes) |
| **Brain Dump** | After 2–4 anchors | Tests pure retrieval | [Section 3](./sop_v7_core.md#3-loop--teach--recall--correct--repeat) |
| **Teach-Back** | For processes/mechanisms | Tests understanding + sequencing | [Section 3](./sop_v7_core.md#3-loop--teach--recall--correct--repeat) |
| **Strength Labeling** | After each recall | Drives weak-point review | [Section 3](./sop_v7_core.md#3-loop--teach--recall--correct--repeat) |
| **Quiz** | End of WRAP | Validates all anchors tested | [Section 7](./sop_v7_core.md#7-quiz--validate) |
| **Anki Cards** | End of session | Spaced repetition for weak points | [Section 8](./sop_v7_core.md#8-outputs--cards-and-recap-detailed) |
| **Recap Sheet** | End of session | Active recall review material | [Section 8](./sop_v7_core.md#8-outputs--cards-and-recap-detailed) |
| **Fast Mode** | Time ≤30 min | Emergency prep, coverage | [Section 5](./sop_v7_core.md#5-fast--exam-crunch-mode-1530-minutes) |
| **Overload Detection** | When user struggles | Prevents cognitive overload | [Section 9](./sop_v7_core.md#9-troubleshooting--stuck-handling) |
| **Source-Lock** | Always | Accuracy to coursework | [Section 6](./sop_v7_core.md#6-always-on-rules-short-version) |
| **Active Recall Gate** | Always | Ensures actual learning | [Section 6](./sop_v7_core.md#6-always-on-rules-short-version) |
| **One-Small-Step** | Always | Respects working memory | [Section 6](./sop_v7_core.md#6-always-on-rules-short-version) |

---

## Cross-Reference to Core SOP

For detailed implementation of any method, see:

- [Core SOP Documentation](./sop_v7_core.md) – Complete operational guide
- [README](./README.md) – Project overview and quick start
- [Changelog](./changelog.md) – Version history

---

*End of Methods Index*
