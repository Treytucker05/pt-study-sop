# Chain - Weekly Review & Maintenance

## When to use
Use this once a week when the material has already been studied and now needs upkeep, retrieval, and weak-spot repair.

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

### Prompt 1 - Set the weekly review targets
```text
Using only the uploaded class files and whatever I already know about my weak spots, build a weekly review plan.

Produce exactly these sections:
1. This Week's Targets
2. Main Review Block
3. Short Follow-Up Reviews
4. What Not To Spend Time On

Rules:
- Assume this is maintenance, not first-time learning.
- Keep the target list short.
- Main Review Block should be one realistic session plan.
- Short Follow-Up Reviews should be brief.
```

After this prompt: work only the chosen targets this week.

### Prompt 2 - Run a quick readiness check
```text
Using only the uploaded class files, generate a short readiness check for the weekly targets.

Produce exactly these sections:
1. 3-5 Quick Check Questions
2. What Good Performance Would Look Like
3. Most Likely Failure Pattern

Rules:
- Keep the check short.
- Mix direct recall and one confusable item if relevant.
- Do not answer the questions.
```

After this prompt: answer the questions closed-note and keep your misses.

### Prompt 3 - Interleave the confusable topics
```text
Using only the uploaded class files, build a short mixed-practice block for the weekly targets.

Produce exactly these sections:
1. Mixed Question Set
2. Topic Labels Hidden From Me
3. What To Track While Answering

Rules:
- Use 2-3 related topics only.
- Questions should be mixed, not grouped by topic.
- "What To Track While Answering" should include both answer accuracy and what topic I thought each item belonged to.
- Do not answer the questions.
```

After this prompt: do the mixed set closed-note and mark both content errors and mix-ups.

### Prompt 4 - Turn the misses into repair notes
```text
Using only the uploaded class files plus my recent misses, build a repair sheet.

Produce exactly these sections:
1. Wrong Answer
2. Correct Answer
3. Why I Mixed It Up
4. Prevention Cue

Rules:
- Use one row per important miss.
- Be specific.
- Prevention Cue should be short and reusable.
- Focus on recurring or high-value misses.
```

After this prompt: keep only the repair rows that matter enough to revisit next week.

### Prompt 5 - Close the maintenance loop
```text
Using the repair sheet and this week's work, help me close the maintenance cycle.

Produce exactly these sections:
1. What Is Stable Now
2. What Still Needs Work
3. 3-4 Review Cards
4. Next Week's Carry-Forward Items

Rules:
- Keep the cards atomic.
- Next Week's Carry-Forward Items should be the smallest useful set.
- Do not add new teaching.
```

After this chain finishes, open a **new chat**, paste your Custom Instructions, and use this prompt to teach the weak areas interactively:
'Based on the artifact we just created, help me understand the weakest areas. Teach me one concept at a time with checks. Use my normal tutoring rules.'
