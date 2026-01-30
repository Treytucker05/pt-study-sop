# PT Study SOP

## What this is
A structured study system for PT coursework. Canonical content lives in `sop/src/` and runtime bundles are generated to `sop/runtime/` for Custom GPT deployment.

---
## Quick Start: Study Session
1) Open `sop/runtime/runtime_prompt.md` and paste it at the start of your session.
2) Complete Planning (M0): target, sources, plan, pre-test.
3) Run the session (M1 -> M6).
4) At Wrap, output Exit Ticket + Tracker/Enhanced JSON.
5) Store logs in `sop/logs/` (recommended) or your preferred location.

---
## Quick Start: Custom GPT Deployment
1) Build bundles:
   - `python sop/tools/build_runtime_bundle.py`
2) Paste `sop/runtime/custom_instructions.md` into Custom GPT system instructions.
3) Upload files listed in `sop/runtime/manifest.md` from `sop/runtime/knowledge_upload/`.
4) Use `sop/runtime/runtime_prompt.md` as your session-start prompt.

---
## Directory Map
- `sop/src/` - canonical source of truth
- `sop/runtime/` - deployment artifacts
- `sop/tools/` - build/validation tools
- `sop/examples/` - usage examples
- `sop/archive/` - legacy and deprecated content

---
## Logging
Canonical schema: `sop/logging_schema_v9.3.md`.
Output both Tracker JSON and Enhanced JSON at Wrap.
