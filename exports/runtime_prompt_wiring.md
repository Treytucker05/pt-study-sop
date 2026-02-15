# Runtime Prompt Wiring

"
    "## Facilitation prompt injection

"
    "- `brain/data/seed_methods.py` → `generate_facilitation_prompt()` builds a block-specific prompt and stores it in `method_blocks.facilitation_prompt`.
"
    "- `brain/data/seed_methods.py` → `regenerate_prompts()` updates `facilitation_prompt` per YAML definition.
"
    "- `brain/dashboard/api_tutor.py` → `_build_chain_info()` and `_resolve_chain_blocks()` load `facilitation_prompt` into `current_block`.
"
    "- `brain/tutor_prompt_builder.py` → `_build_block_section()` uses `current_block.facilitation_prompt` if present, else renders a fallback `## Current Activity Block` section.
"
    "- `brain/tutor_prompt_builder.py` → `build_prompt_with_contexts()` assembles Tier 1 + mode policy + block section + chain section + materials.

"
    "## Chain context injection

"
    "- `brain/tutor_prompt_builder.py` → `_build_chain_section()` formats chain progress into `## Study Chain`.
"
    "- `brain/dashboard/api_tutor.py` → `send_turn()` passes `chain_info` + `current_block` into `build_prompt_with_contexts()`.

"
    "## Retrieved context wiring

"
    "- `brain/dashboard/api_tutor.py` → `send_turn()` constructs user prompt with `## Retrieved Context` and `## Chat History`.
"
    "- `brain/tutor_prompt_builder.py` → `build_prompt_with_contexts()` adds `## Additional Teaching Context` (SOP) and optional `## Retrieved Study Materials`.
"
    