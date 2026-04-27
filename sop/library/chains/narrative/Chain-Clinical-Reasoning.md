# Chain - Clinical Reasoning

## When to use
Use this when the material is already familiar and you want to practice patient-specific reasoning, differential thinking, and next-step decisions.

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

### Prompt 1 - Set the case frame
```text
Using only the uploaded class files, help me set up a clinical reasoning session around one problem area.

Produce exactly these sections:
1. Clinical Focus
2. Main Decision Horizon
3. Safety-Critical Issues
4. What This Session Should Answer

Rules:
- Keep the focus narrow.
- Safety-Critical Issues should include red flags, urgent exclusions, or referral triggers if supported by the files.
- "What This Session Should Answer" should be 3-5 concrete questions.
```

After this prompt: keep the decision horizon and safety issues visible for the whole chain.

### Prompt 2 - Build the applied orientation layer
```text
Using only the uploaded class files, give me the applied orientation layer for this clinical topic.

Produce exactly these sections:
1. Big-Picture Clinical Frame
2. Must-Know Terms
3. Confusable Clinical Terms
4. What Usually Drives The Decision

Rules:
- Keep it practical.
- Must-Know Terms should be short and plain-English.
- Confusable Clinical Terms should highlight differences that matter in real cases.
- Do not lecture broadly.
```

After this prompt: keep the term list as the legend for the rest of the case work.

### Prompt 3 - Build the clinical map
```text
Using only the uploaded class files, turn this clinical topic into a clean reasoning map.

Output format: map

Build the result as:
- problem or patient context
- key subjective findings
- key objective findings
- main hypotheses
- differential branches
- red flags or referral triggers
- priority tests or measures
- likely treatment directions

Rules:
- Use clear indentation and headings.
- Keep it readable under pressure.
- Do not overload the map with low-yield detail.
- Make the differential branch structure obvious.
```

After this prompt: redraw the map in your own notes or drawing app if you want a cleaner case board.

### Prompt 4 - Separate the confusables
```text
Using only the uploaded class files, compare the most confusable diagnoses, impairments, or intervention paths in this topic.

Produce exactly these sections:
1. Comparison Table
2. Best Discriminators
3. Most Dangerous Mix-Ups
4. What Would Change My Next Step

Rules:
- Focus on differences that matter clinically.
- Use rows like presentation, red flags, testing, treatment direction, or prognosis when relevant.
- Keep the most useful discriminators easy to scan.
```

After this prompt: keep the most dangerous mix-ups visible during the case.

### Prompt 5 - Apply to one patient
```text
Using only the uploaded class files, give me one realistic patient application task.

Produce exactly these sections:
1. Patient Vignette
2. Likely Presentation
3. What I Should Test Or Check
4. What I Would Do First
5. What Could Make Me Wrong

Rules:
- Keep the vignette concrete.
- Force a specific reasoning path.
- "What Could Make Me Wrong" should flag common interpretation errors or missing checks.
- Do not answer with generic textbook prose.
```

After this prompt: attempt the case from memory before checking the output again.

### Prompt 6 - Walk through the case and score the reasoning
```text
Using only the uploaded class files and my case response, help me walk through the case and score the reasoning.

Produce exactly these sections:
1. My Main Interpretation
2. Best Alternative To Rule Out
3. Next Best Test Or Measure
4. Initial Management Direction
5. Error Tags
6. Corrective Feedback
7. One Targeted Follow-Up Case Question

Rules:
- Keep the case-specific logic explicit.
- Error Tags should be short and typed, such as missed red flag, wrong differential, weak test choice, or wrong priority.
- Corrective Feedback should be post-attempt only and tightly tied to the source.
```

After this prompt: keep the error tags and follow-up question.

### Prompt 7 - Turn the case into reusable clinical learning
```text
Using only the uploaded class files and the reasoning errors from this session, help me close the loop.

Produce exactly these sections:
1. High-Risk Error Review
2. Prevention Cues
3. What I Must Notice Faster Next Time
4. One Next Clinical Scenario To Revisit

Rules:
- Focus on safety, discrimination, and next-step accuracy.
- Prevention Cues should be short enough to recall under pressure.
- Do not add new teaching that was not needed by the case.
```

After this chain finishes, open a **new chat**, paste your Custom Instructions, and use this prompt to teach the weak areas interactively:
'Based on the artifact we just created, help me understand the weakest areas. Teach me one concept at a time with checks. Use my normal tutoring rules.'
