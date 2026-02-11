# NotebookLM Bridge

## Purpose
Enforce source-grounded teaching via NotebookLM source packets.

---
## NotebookLM Source Packet (required for factual teaching)
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

If excerpts are provided without citations, request citations before teaching.

---
## Hard Rule
If no Source Packet (or no provided excerpts from sources), the AI may help with study strategy and question-asking, but must not assert factual or clinical claims. It must request a Source Packet from NotebookLM.

If the packet lacks definitions/mechanisms/differentiators needed to answer, request additional excerpts.

---
## NotebookLM Prompt Template
```
From my sources only: extract learning objectives, key definitions, mechanisms/steps, differentiators, and 5-10 practice questions; include citations.
```
