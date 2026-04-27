# Chain - Deep Mastery

## When to use
Use this when you want durable understanding, strong structure, and repeated repair over time.

## Before you start
- Stay in the same chat for the whole chain whenever possible.
- Upload the class files before Prompt 1.
- Run the prompts below in order.
- If you split the chain across sessions or chats, paste the last output before continuing.
- For every prompt, the model should use only the uploaded files.
- If the files are weak, incomplete, or contradictory, the model should clearly separate:
  - Supported by source
  - Best inference
  - Missing source
- If key source is missing, the model should say exactly what is missing instead of inventing content.

### Prompt 1 - Build the mastery plan
```text
Using only the uploaded class files, help me build a deep-mastery study plan.

Produce exactly these sections:
1. Scope And Horizon
2. Priority Topics
3. Session Sequence
4. Review Schedule
5. Adjustment Rules

Rules:
- Assume the goal is durable understanding, not short-term cramming.
- The scope should be realistic.
- Session Sequence should show the order of work across the next several study blocks.
- Review Schedule should include spaced revisits.
- Adjustment Rules should say what changes if I fall behind or if one topic is weak.
```

After this prompt: use it as the plan for the rest of the chain.

### Prompt 2 - Build the orientation layer
```text
Using only the uploaded class files, create the orientation layer for deep study.

Produce exactly these sections:
1. Frame Line
2. Big-Picture Summary
3. Must-Know Terms
4. Confusable Terms
5. What To Learn First

Rules:
- Keep the big picture clear before teaching details.
- Must-Know Terms should be 8-12 max.
- Confusable Terms should name the differences that matter most.
- "What To Learn First" should be a short ordered list.
```

After this prompt: keep the frame line and term list visible in every later session.

### Prompt 3 - Build the structural map
```text
Using only the uploaded class files, turn the topic into a clean hierarchical study map.

Output format: map

Produce:
- Topic title
- One parent concept
- 3-5 major pillars
- 2-4 branches under each pillar
- One legend block for confusable terms or abbreviations

Rules:
- Keep the structure crisp.
- Prefer fewer, stronger pillars over too many boxes.
- Use indentation and labels clearly.
- Do not drift into dense prose.
```

After this prompt: redraw the map in your own notes or drawing app and keep it as the standing study anchor.

### Prompt 4 - Teach the topic in layers
```text
Using only the uploaded class files, teach this topic in layers from surface understanding to deeper mechanism and application.

Produce exactly these sections:
1. Layer 1 - Simple What-It-Is
2. Layer 2 - Core Structure
3. Layer 3 - How It Works
4. Layer 4 - Common Confusions
5. Layer 5 - Practical Application

Rules:
- Each layer should build on the previous one.
- Keep the wording source-grounded.
- Make common confusions explicit.
- Do not collapse everything into one wall of text.
```

After this prompt: stop and make sure the map still matches the layered explanation.

### Prompt 5 - Stress-test the confusables
```text
Using only the uploaded class files, compare the most confusable ideas in the active scope.

Produce exactly these sections:
1. Comparison Table
2. Ranked Discriminators
3. Most Dangerous Confusions
4. What I Should Say To Keep Them Straight

Rules:
- Pick the 2-4 contrasts that matter most.
- Comparison Table should use meaningful rows, not generic ones.
- Ranked Discriminators should list the best high-yield differences first.
- "What I Should Say To Keep Them Straight" should be short and memorable.
```

After this prompt: add the top discriminators back onto your map or notes.

### Prompt 6 - Apply it to cases
```text
Using only the uploaded class files, help me apply the topic to one realistic case.

Produce exactly these sections:
1. Case Setup
2. Likely Presentation
3. What I Would Check Or Test
4. What I Would Do Next
5. Source Check

Rules:
- Keep the case concrete.
- Force a specific reasoning path.
- Source Check should flag where my reasoning would commonly go wrong.
- Do not turn this into generic clinical talk.
```

After this prompt: keep the source-check mistakes as repair targets.

### Prompt 7 - Calibrate and rank weaknesses
```text
Using only the uploaded class files and my recent case or recall errors, help me calibrate what is solid and what is weak.

Produce exactly these sections:
1. Strong Areas
2. Weak Areas
3. Overconfidence Risks
4. Top 3 Priorities To Repair
5. What To Review Soonest

Rules:
- Be honest and specific.
- Separate weak knowledge from weak confidence.
- The Top 3 Priorities should be strict and ranked.
- "What To Review Soonest" should be realistic.
```

After this prompt: repair only the top 3 priorities first.

### Prompt 8 - Repair and convert into long-term review
```text
Using only the uploaded class files and the top 3 weak areas, help me close the deep-mastery loop.

Produce exactly these sections:
1. Error Repair Table
2. Prevention Cues
3. 3-5 Review Cards
4. Next Spaced Review Dates

Rules:
- Error Repair Table should show the confusion, correction, and prevention cue.
- Review Cards should be atomic and retrieval-friendly.
- Next Spaced Review Dates should be simple and realistic.
- Do not add brand-new content.
```

After this chain finishes, open a **new chat**, paste your Custom Instructions, and use this prompt to teach the weak areas interactively:
'Based on the artifact we just created, help me understand the weakest areas. Teach me one concept at a time with checks. Use my normal tutoring rules.'
