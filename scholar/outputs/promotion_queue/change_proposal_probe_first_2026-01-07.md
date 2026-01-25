# Change Proposal — Probe-First Core Mode Gating

- RFC ID: RFC-20260107-002
- Date: 2026-01-07
- Scope: `sop/gpt-knowledge/M2-prime.md`
- Status: Draft

## 1. Goal Description

Invert the gating logic of Core Mode (M2 Prime) from "AI Teaching-First" to "User Probing-First."

## 2. Evidence

- **Brain Telemetry**: Session Log 2025-12-11 shows the user sitting through a landmark scan for material he already mostly knew, leading to "Session Bloat" and passive friction.
- **Pedagogy Literature**: The "Pre-testing Effect" (Psychonomic Society 2024) demonstrates that attempting retrieval *before* learning enhances focus and long-term retention.
- **Expertise Reversal Effect**: Detailed scans for concepts the student already knows act as "Extraneous Load" (Sweller 2024).

## 3. Proposed Changes

- **Target File**: `sop/gpt-knowledge/M2-prime.md`
- **Change**: Mandate that "Prediction Prompts" (Retrieval) MUST occur before the "H1-series System Scan" (Instruction).
- **Logic**:
  1. Identify bucket.
  2. Ask: "Based on the name [X], what 2-3 components do you *predict* are inside?"
  3. User attempts prediction.
  4. AI provides H1 scan only to fill gaps or confirm.

## 4. Risks & Guardrails

- **Risk**: User might stall if they have ZERO prior knowledge.
- **Mitigation**: Gated Platter (Metaphor -> Scaffold) should remain available as an escape hatch.
- **Guardrail**: **Source-Lock**. AI must not confirm a prediction unless it is explicitly in the Source Packet.

## 5. Verification Plan

- See `experiment_probe_first_2026-01-07.md`.
