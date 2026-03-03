# SOP Runtime Bundle (Legacy)

> **The Custom GPT tutor is deprecated.** The tutor is now a native Flask application
> built into `brain/dashboard/api_tutor.py`. These runtime files are historical artifacts
> from when the tutor was a ChatGPT Custom GPT.

Canonical runtime stage model is CP-MSS v1.0 (`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`).

## Current Tutor

The native tutor consumes method blocks and chains directly from the database
(seeded from `sop/library/methods/*.yaml` and `sop/library/chains/*.yaml`).
No Custom GPT upload step is needed.

## Legacy Files (Historical Reference Only)

| File | Original Purpose |
|------|-----------------|
| `custom_instructions.md` | Custom GPT system instructions field |
| `runtime_prompt.md` | First-message session prompt |
| `knowledge_upload/` | Knowledge files uploaded to Custom GPT |

## Rebuild

If you edit any `sop/library/` file, regenerate the method library markdown:

```bash
python sop/tools/build_runtime_bundle.py
```

Source of truth: `sop/library/`. These runtime files are generated artifacts.
