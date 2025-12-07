# Archive Directory Map

Quick guide to what lives here and what’s safe to prune or cold‑store.

- `current_v8/` – v8.x artifacts, including `v8.6_swarm_import` pulled from the old Swarm repo. Keep if you may reference v8 behavior.
- `legacy/` – v7–v8 historical snapshots and docs. Safe to zip/cold‑store; keep for rollback/reference.
- `pt_study_brain/` – small backup of an older Brain bundle (very small). Keep or cold‑store.
- `pt_study_brain_v8/` – fuller v8 Brain app snapshot (includes DB/logs). Keep for provenance; can be zipped to save space.
- `releases/` – historical release packages. Keep as immutable history; can be zipped if not actively used.
- `RESTRUCTURE_PLAN_v9.md` – planning notes for the v9 restructuring.

General rule: nothing here is required for day‑to‑day v9.1 use; it’s reference/rollback material. Zip and offload older subfolders if you need space, but keep at least one v8 snapshot for provenance.
