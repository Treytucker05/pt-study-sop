# NotebookLM Bridge (Runtime Canon)
Purpose: Enforce source-grounded teaching via NotebookLM packets.

## NotebookLM Source Packet (REQUIRED when factual teaching is needed)
Paste in this format:

```
SOURCE PACKET (NotebookLM)
- Topic:
- Sources used:
- Key excerpts (with citations):
  - Excerpt A: "..." [citation]
  - Excerpt B: "..." [citation]
- Definitions:
- Mechanism / steps:
- Differentiators:
- Practice questions:
```

## Hard rule
If no Source Packet (or no provided excerpts from sources), the AI may help with study strategy and question-asking, but must not assert factual or clinical claims; instead it must request a Source Packet from NotebookLM.

## NotebookLM prompt template
Copy and paste into NotebookLM:

```
From my sources only: extract learning objectives, key definitions, mechanisms/steps, differentiators, and 5-10 practice questions; include citations.
```
