---
description: "Run analytics with the bq CLI and report results safely."
---

# Analytics (bq)

Prereqs: `bq` installed and authenticated.

Workflow:
1) Confirm dataset and time window if missing.
2) Run:
   - `bq query --use_legacy_sql=false "SELECT ..."`
3) Report:
   - The exact query
   - Result summary (rows/metrics)
   - Any assumptions or data gaps

Safety: never include secrets in prompts or logs.
