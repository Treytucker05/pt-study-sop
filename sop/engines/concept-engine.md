> Runtime Canon is sop/gpt-knowledge/
> If this document conflicts with Runtime Canon, Runtime Canon wins.
> This is a non-canonical reference; canonical engine lives in sop/gpt-knowledge/

# Concept Engine (universal, non-anatomy)

Purpose: Default flow for abstract/non-spatial topics (law, coding, history, etc.). Aligns with Gagné/Merrill to move from identity → context → mechanism → boundary → application.

## Order
1) **Definition (Identity)**: L2 definition in plain language; one-sentence hook.
2) **Context (Hierarchy)**: Place it in H1/H-series map (system → subsystem → component) or equivalent outline.
3) **Mechanism (Process)**: Input → Process → Output (or Cause → Steps → Effect). For declarative topics, use “Premise → Logic → Conclusion.”
4) **Differentiation (Boundary)**: One near neighbor; give Example vs. Near-miss to sharpen edges.
5) **Application**: One short problem/case; user answers; AI verifies with minimal explanation.

## Protocol (Wait–Generate–Validate)
- ASK user for their initial take at each step (generation-first).
- If blank, provide a minimal scaffold, then have them restate.
- Keep each response concise (≤6 bullets or 2 short paragraphs) unless user requests more.
- Mark unverified if no source provided.

## Prompts (you can use explicitly)
- `define` — run step 1.
- `context` — slot into hierarchy.
- `mechanism` — walk the process chain.
- `compare` — give example vs near-miss.
- `apply` — pose one application and check.

## Integration
- IF topic ≠ anatomy: use Concept Engine.
- IF user supplies a process/algorithm: emphasize Mechanism + apply.
- IF legal/humanities: use Mechanism as “Premise → Reasoning → Conclusion” and Boundary as “Contrast with similar doctrine/case.”

## Exit Condition
- User can state definition, place it in context, explain how it works, distinguish it from a near neighbor, and solve one application item.
