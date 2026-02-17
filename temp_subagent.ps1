 = & .codex/skills/codex-subagent/scripts/codex-parent-settings.ps1
 = [0]
 = [1]
 = @'
[TASK CONTEXT]
You are analyzing exports/research_packet.md in C:\pt-study-sop.

[OBJECTIVES]
1. For methods M-RET-001 through M-RET-007, capture metadata fields: method_id, current_name, stage, best_stage, purpose, artifact inputs, artifact outputs, gates, and supported knobs.
2. From section  Full Chain Catalog capture every chain's chain_id and the ordered method_sequence.

[CONSTRAINTS]
- Keep each artifact input, artifact output, and gate bullet as its own string (no markdown bullets).
- Preserve the text exactly as it appears; do not paraphrase.

[OUTPUT FORMAT]
Return a JSON object with keys methods and chains.
- methods is an array of objects with keys: method_id, current_name, stage, best_stage, purpose, artifact_inputs (array of strings), artifact_outputs (array of strings), gates (array of strings), supported_knobs (array of strings).
- chains is an array of objects with keys: chain_id, method_sequence (array of method IDs in order).

[SUCCESS CRITERIA]
All 7 retrieval methods (M-RET-001..M-RET-007) and all 15 chains are present.

use subagents; use bq when asked; explain why; include ASCII diagram when helpful
