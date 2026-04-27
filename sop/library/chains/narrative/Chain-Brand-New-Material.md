# Chain - Brand New Material

## When to use
Use this when the topic is truly new and you need orientation, vocabulary, and structure before deep studying.

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

### Prompt 1 - Big-picture orientation
```text
You are helping me orient to brand new material using only the uploaded class files.

Do not teach the full topic yet.
Do not assume background knowledge that is not clearly supported by the files.

Produce exactly these sections:
1. Frame Line
2. Big-Picture Summary
3. What This Unit Is Mainly About
4. What I Should Learn First

Rules:
- Keep this short and high-level.
- Focus on the central frame, not details.
- Big-Picture Summary should be 5-8 bullets max.
- "What I Should Learn First" should be 3-5 items max.

At the end, add one line called:
Carry Forward -> the single organizing idea I should keep visible for the rest of the chain.
```

After this prompt: keep the frame line and carry-forward idea visible.

### Prompt 2 - Terminology pretraining
```text
Using only the uploaded class files, extract the smallest set of terms I need before deeper study.

Produce exactly these sections:
1. Must-Know Terms
2. Confusable Terms
3. Terms I Can Ignore For Now

Rules:
- Must-Know Terms: 8-12 max.
- For each must-know term, give:
  - Term
  - Plain-English meaning
  - One memory cue
- Confusable Terms: list the pairs or groups most likely to get mixed up, with one-line differences.
- Terms I Can Ignore For Now: only include clearly low-priority details.
- Do not turn this into a lecture.

At the end, add one line called:
Carry Forward -> the 3-5 terms or contrasts I must keep beside me as a legend.
```

After this prompt: keep the term legend beside the topic.

### Prompt 3 - Pillar map
```text
Using only the uploaded class files, turn this topic into a clean pillar map.

Output format: map

Build the result as:
- Topic title
- One parent concept
- 3-5 main pillars
- Under each pillar, 2-4 short branch bullets

Rules:
- Keep it structural, not detailed.
- Use clear labels and indentation.
- Group ideas by how the source is organized, not by what sounds nice.
- Do not add unsupported content.
- If the source is messy, still force it into the clearest 3-5-pillar structure possible.

At the end, add one line called:
Carry Forward -> the 3 pillars that matter most if I had to remember this topic quickly.
```

After this prompt: lock the main pillars before adding more detail.

### Prompt 4 - Hierarchical organizer
```text
Using only the uploaded class files, refine the topic into a cleaner hierarchical organizer.

Output format: map

Build the result as:
- Topic
  - Parent concept
    - Pillar 1
      - representative branch
      - representative branch
    - Pillar 2
      - representative branch
      - representative branch
    - Pillar 3
      - representative branch
      - representative branch
    - Pillar 4 or 5 if needed

Rules:
- Keep only the highest-value branches.
- Use one parent concept only.
- Keep the hierarchy obvious.
- Prefer clarity over completeness.
- If two branches overlap, merge them.

At the end, add:
1. Final Study Map Summary -> 3-5 bullets
2. Weak or Missing Area -> the one part of the map that still feels unclear from the source
```

After this prompt: treat the output as the canonical first-pass study map.

### Prompt 5 - Visual refinement handoff
```text
Take the hierarchical organizer I already created and help me refine it into a cleaner visual map for study.

Do not change the core structure unless something is clearly redundant.

Produce exactly these sections:
1. Final Map Layout
2. What Goes In The Top Title Line
3. What Goes In Each Pillar
4. What Goes In A Small Legend Box
5. Visual Simplifications

Rules:
- Keep the map clean and spacious.
- Use 3-5 pillars only.
- Suggest what to shorten or merge.
- Legend box should contain confusable terms, abbreviations, or scope notes only.
- Do not add new teaching content.
```

After this prompt: redraw the final map in your own notes or drawing app.

After this chain finishes, open a **new chat**, paste your Custom Instructions, and use this prompt to teach the weak areas interactively:
'Based on the artifact we just created, help me understand the weakest areas. Teach me one concept at a time with checks. Use my normal tutoring rules.'
