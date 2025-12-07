# Archive Directory Map

Quick guide to what lives here and what’s safe to prune or cold‑store.

- `current_v8/` – v8.x artifacts, including `v8.6_swarm_import` pulled from the old Swarm repo. Keep if you may reference v8 behavior.
- `legacy.zip` – v7–v8 historical snapshots and docs, packed for storage (was `legacy/`). Keep for rollback/reference; unzip only when needed.
- `pt_study_brain/` – small backup of an older Brain bundle (very small). Keep or cold‑store.
- `pt_study_brain_v8.zip` – fuller v8 Brain app snapshot (includes DB/logs), packed for storage (was `pt_study_brain_v8/`). Keep for provenance; unzip only when needed.
- `releases/` – historical release packages. Keep as immutable history; can be zipped if not actively used.
- `RESTRUCTURE_PLAN_v9.md` – planning notes for the v9 restructuring.

General rule: nothing here is required for day‑to‑day v9.1 use; it’s reference/rollback material. Zip and offload older subfolders if you need space, but keep at least one v8 snapshot for provenance.
