# Chain - Exam Cram

## When to use
Use this when the exam is close and you need the highest-yield review path fast.

## Before you start
- Stay in the same chat for the whole chain.
- Upload the class files before Prompt 1.
- Run the prompts below in order, one at a time.
- If you must switch chats, paste the last output before continuing.
- For every prompt, the model should use only the uploaded files.
- If the files are weak, incomplete, or contradictory, the model should clearly separate:
  - Supported by source
  - Best inference
  - Missing source
- If key source is missing, the model should say exactly what is missing instead of inventing content.

### Prompt 1 - Cut scope and build the cram session
```text
Using only the uploaded class files, build the smallest useful study plan for an upcoming exam.

Produce exactly these sections:
1. Exam Scope Cut
2. Highest-Yield Topics
3. 60-90 Minute Study Plan
4. What To Skip
5. Next 2 Review Touches

Rules:
- Assume I need maximum score gain, not completeness.
- Cut aggressively.
- Highest-Yield Topics should be 3-6 items.
- The study plan should be a short time-blocked sequence.
- The 2 review touches should be brief and realistic.
```

After this prompt: study only the cut scope, not the full unit.

### Prompt 2 - Build the fast anchor
```text
Using only the uploaded class files, create one compact exam-cram anchor for the active scope.

Produce exactly these sections:
1. Core Frame
2. High-Yield Facts
3. Confusable Contrasts
4. Classic Traps
5. Last-Minute Recall Cues

Rules:
- Keep it as compact as possible.
- Bias toward questions that are likely to show up on an exam.
- "Confusable Contrasts" should be the main differences I must not mix up.
- "Classic Traps" should be the easiest ways to miss points.
```

After this prompt: use this as the base reference for the rest of the cram chain.

### Prompt 3 - Teach only the confusables
```text
Using only the uploaded class files, teach me the highest-risk confusable concepts from the active exam scope.

For each contrast, give exactly:
1. Shared Bucket
2. Key Difference
3. Signature Clue
4. Classic Trap

Rules:
- Cover only the top 4-6 contrasts.
- Keep each contrast short.
- Focus on discrimination, not broad explanation.
- Use source-grounded wording when it helps.
```

After this prompt: keep the signature clues and classic traps in front of you.

### Prompt 4 - Build the retrieval set
```text
Using only the uploaded class files, build a compact retrieval set for the active exam scope.

Produce exactly these sections:
1. Rapid Recall Questions
2. Confusable Questions
3. Coverage Check

Rules:
- 10-15 questions total.
- Questions should be short and testable from memory.
- Mix direct recall and discrimination prompts.
- Coverage Check should show whether the high-yield topics were all touched.
- Do not answer the questions yet.
```

After this prompt: use the questions closed-note.

### Prompt 5 - Score the misses and repair them
```text
I have now attempted the retrieval set. Using only the uploaded class files plus my misses, help me do a fast repair pass.

Produce exactly these sections:
1. Top Misses
2. Why Each Miss Happened
3. Prevention Cue
4. What To Re-test In 15 Minutes

Rules:
- Focus only on the highest-value misses.
- "Why Each Miss Happened" should be short and specific.
- "Prevention Cue" should be concrete enough to block the same error next time.
- Keep the re-test set small.
```

After this prompt: re-test only the repaired misses.

### Prompt 6 - Close the cram session
```text
Using the work from this session, help me close the cram block.

Produce exactly these sections:
1. 3 Things I Must Remember
2. 1 Muddy Point
3. 1 Next Action
4. 1 Follow-Up Question For Tomorrow

Rules:
- Keep it brutally short.
- Make the next action specific.
- Do not add new content.
```

After this chain finishes, open a **new chat**, paste your Custom Instructions, and use this prompt to teach the weak areas interactively:
'Based on the artifact we just created, help me understand the weakest areas. Teach me one concept at a time with checks. Use my normal tutoring rules.'
