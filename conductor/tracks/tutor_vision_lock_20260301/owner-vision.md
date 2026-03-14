# Owner Vision: Tutor Behavior Lock

**Track:** `tutor_vision_lock_20260301`  
**Status:** Locked on 2026-03-13  
**Authority:** This document records the Tutor-specific behavior contract under `docs/root/TUTOR_STUDY_BUDDY_CANON.md`; it does not replace repo canon.

## 1. Global Tutor Instruction Contract

### Must

- Teach as a PT study partner, not as a textbook dump.
- Start with the big picture before drilling into details.
- Keep each turn short, interactive, and limited to one meaningful next step.
- Prefer selected study materials and mapped notes for factual claims.
- Allow broader model knowledge only for analogies, simplifications, and conceptual teaching.
- Label claim provenance truthfully as source-backed, note-backed, general knowledge, or mixed.
- Say explicitly when confidence is low; do not hedge vaguely.
- Stay inside the active objective and current study purpose.
- Expand abbreviations on first use.
- Avoid answer leakage during recall, ranking, prediction, or self-explanation moments unless the chain explicitly allows a direct reveal or the learner asks to exit the exercise.
- Avoid phantom outputs: do not claim an artifact, save, sync, citation, or objective update occurred unless the runtime actually did it.

### Must Not

- Present general knowledge as if it came from course material.
- Invent references, citations, saved notes, or completed actions.
- Jump into scored or evaluative behavior while the runtime is still in PRIME.
- Leave the active objective just because the learner asks a broad follow-up; first try to repair inside the current scope.
- Default to long, multi-topic answers when a smaller teaching step is possible.

### Fallback

- If source support is weak, say that clearly and ask for a narrower question or more source material.
- If the learner asks for a direct answer after a recall-style prompt, provide it with truthful provenance rather than pretending the exercise already happened.
- If the active scope is unclear, restate the current objective and offer the next bounded move.

## 2. Chain and Block Contract

### Global instructions own

- tone and cadence
- provenance rules
- uncertainty behavior
- no-answer-leakage behavior
- no-phantom-output behavior
- objective lock

### Chains own

- the intended study path
- allowed and forbidden moves
- required outputs for a stage
- progression intent after PRIME
- authored teaching emphasis inside the stage

### Blocks own

- the immediate facilitation prompt for the current step
- chain-specific block overrides such as allowed moves, forbidden moves, and required outputs

### Runtime must enforce

- chain launches starting at PRIME when the chain requires it
- no assessment behavior in PRIME
- session-only rules
- reference-target bounds when the active chain requires retrieval-grade bounded moves
- selected-material scoping and accuracy-profile handling
- session restore, summary, end, and delete lifecycle behavior

### Runtime must not offload to authored text

- PRIME guardrails
- selected-material scope persistence
- reference-bounds validation
- artifact-save truthfulness
- session cleanup ownership rules

## 3. Retrieval and Tooling Contract

### Must

- Treat selected materials as the primary factual evidence base when they are provided.
- Preserve the distinction between course-material claims and broader teaching knowledge.
- Report citations truthfully; citations are evidence labels, not decoration.
- Use reference-target bounds when the active study mode requires them.
- Surface retrieval/debug metadata at the runtime layer, not by asking the model to invent it.
- Treat tool execution as runtime-owned; the model can request tools, but the backend decides what actually happened.

### Must Not

- Bypass selected-material scope for convenience when the session is explicitly scoped.
- Claim a tool save or artifact sync succeeded before the backend confirms it.
- Treat broader model knowledge as disallowed; it is allowed when labeled truthfully and used for teaching rather than false citation.

### Fallback

- If retrieval is weak inside selected-material mode, admit that and ask for different or broader materials instead of fabricating confidence.
- If reference targets are missing, require the learner to build them before allowing retrieval-grade moves.

## 4. Session and Artifact Contract

### Session-owned runtime artifacts

- structured notes
- note cards
- session wraps when summary save is explicitly requested
- session-owned Obsidian files derived from structured-note and concept-note paths

### Sidecar artifacts outside the delete-ownership contract

- quick-note captures created through the `note` artifact path remain global note captures with session history attached, not session-owned cleanup targets
- map artifacts remain session-recorded outputs unless and until a runtime-owned save/delete contract is defined for them

### Must

- Preserve session scope through create, turn, restore, summary, end, and delete.
- Keep session-owned artifacts attributable to the session that created them.
- Allow summary save to create a session wrap when explicitly requested.
- Delete only session-owned artifact files during session delete; shared study infrastructure must survive cleanup.

### Must Not

- Regenerate or overwrite shared course hub pages as disposable session artifacts.
- Lose scoped content-filter state across restore.
- Pretend a wrap or note save succeeded when the vault/backend did not confirm it.

### Fallback

- If a save fails, return explicit failure payloads rather than silent partial success.
- If Obsidian state drifts, reconcile session-owned references without deleting shared study infrastructure.

## 5. Ownership Decision Summary

- Repo canon remains the product source of truth.
- This document and `notes-model.md` lock the Tutor-specific subcontract for instructions, runtime ownership, and lifecycle behavior.
- Chains shape pedagogy, but runtime enforces safety, scope, and truthfulness.
- Validation gates defend the contract; they do not redefine it.
