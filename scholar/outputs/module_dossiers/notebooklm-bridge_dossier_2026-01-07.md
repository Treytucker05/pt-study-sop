# Module Dossier — NotebookLM Bridge

- Path: `sop/gpt-knowledge/notebooklm-bridge.md`
- Phase: Framework / Bridge
- Last Updated: 2026-01-07

## 1. Operational Contract

- **Purpose:** Enforce factual grounding and source-lock protocol via external packets.
- **Trigger(s):** Planning phase; factual query lacking local source.
- **Required Inputs:** Source Packet (excerpts + citations).
- **Required Outputs:** Grounded teaching; citation-backed claims.
- **Exit Criteria:** Protocol established: "From my sources only."
- **Failure Modes / Drift Risks:** Hallucination (AI uses internal training data instead of source); skipping citation check; ignoring missing differentiators.

## 2. Pedagogy Mapping

- **Retrieval Practice:** [N/A]
- **Spacing/Interleaving:** [N/A]
- **Cognitive Load:** [PASS] - Source-Lock limits the search space, reducing extraneous noise.
- **Metacognition:** [PASS] - Flags "Unverified" content when sources are missing.

## 3. Evidence Map

- **Grounding and Hallucination**: RAG (Retrieval-Augmented Generation) frameworks significantly reduce error rates in medical LLM applications.
- **Cognitive Load**: Information foraging is reduced when sources are pre-processed (Source: Sweller).

## 4. Improvement Candidates (Rabbit Holes Allowed)

- "Deep Citation Check": Force the student to copy the citation *into* their teach-back to ensure they read it.
- "Source Gap Alarm": If a question isn't in the source, AI should provide the NotebookLM prompt to find it.

## 5. Promotion Candidates (MAX 3)

1. **[Source Gap Prompting]**: If the agent cannot find a fact in the Source Packet, it MUST provide the specific prompt for the student to run in NotebookLM.

## 6. Guardrails (What Must Not Change)

- The "Hard Rule": No factual assertions without a Packet.
- Citation requirement.
