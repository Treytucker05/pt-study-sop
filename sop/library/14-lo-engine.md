# 14 — Learning Objective Engine (LO Engine)

**Purpose:** LO -> source anchors -> milestone map -> teach sequence -> Six-Phase note output (Phases 1-6).

## Table of Contents
- Purpose
- When to Use
- Inputs
- Outputs (Fixed Order)
- Big-Picture Spine (Default Sequence)
- Hard Gates
- State Machine (text)
- Failure Modes + Fixes

## Purpose

Turn explicit Learning Objectives into anchored teaching steps and a deterministic note output aligned to the Six-Phase Topic SOP.

## When to Use

- First exposure with explicit Learning Objectives
- LO-driven modules or checklists
- Exam-aligned learning that requires source anchors

## Inputs

- LO list (verbatim)
- Uploaded sources (slides, PDFs, lab guides, etc.)
- Optional Source Packet (NotebookLM or equivalent excerpts with citations)

## Outputs (Obsidian-ready, fixed order)

1) LO text
2) Source anchors (file + slide/page/heading)
3) Milestone Map (3-7 milestones per LO, each with anchor)
4) Cluster Map (3-5 clusters mapped to LO)
5) Explanation per cluster (plain language)
6) Mermaid diagram (big-picture spine + clusters)
7) Retrieval prompts (2-3 per cluster; free recall)
8) Transfer prompt (1 per LO)
9) Next micro-task (<=15 words)

## Big-Picture Spine (Default Sequence)

```
LO -> Source anchors -> Milestone map -> Cluster map -> Teach loop (cluster by cluster)
   -> Retrieval -> Transfer -> Note emit -> Lite Wrap (Exit Ticket + Session Ledger only)
```

## Hard Gates

- No teaching without source anchors. If missing: label UNVERIFIED and request LO/source.
- Teach LO1 first; do not dump all LOs.
- First exposure default teach-first (no quiz-first).
- One-Step Rule: each assistant message = feedback (1 sentence) + micro-teach (<=3 sentences) + ONE open prompt.
- No MCQ in Core; MCQ allowed only in Sprint/Drill.
- No answer leakage.
- UNVERIFIED content requires user approval.

## State Machine (text)

LO Intake -> Source Anchor Build -> Milestone Map -> Teach Loop -> Note Emit -> Lite Wrap

## Failure Modes + Fixes

- Drift (off LO or off anchors): restate LO list, rebuild anchors, and reconfirm Milestone Map.
- Answer leakage: restate the prompt, require an attempt, then give a hint (not the answer).
- Too many steps: re-cluster to 3-5 clusters, cap milestones at 3-7, enforce One-Step format.
- Guessing: enforce NO-GUESS, allow UNKNOWN, request sources/anchors before continuing.
