# Dashboard Wiring Checklist (2026-01-12)

Legend: Displayed? = visible in dashboard or status; Used? = actively feeds loop or planning.

| Artifact | Displayed? | Used? | Evidence | Notes |
|---|---|---|---|---|
| questions_needed / resolved / answered | Yes | Yes | `scholar/outputs/STATUS.md`, `scholar/workflows/orchestrator_run_prompt.md`, `brain/dashboard/routes.py` | Resolved questions prevent repeats; answered questions required by runbook. |
| proposals (promotion_queue) | Yes | Partially | `scholar/outputs/promotion_queue/`, `brain/dashboard/routes.py` | Requires manual approval; not auto-applied. |
| approved/rejected proposals | Yes | Partially | `brain/dashboard/routes.py`, `brain/db_setup.py` | Stored in DB; used for implementation bundle generation. |
| digests | Yes | Partially | `brain/dashboard/routes.py`, `brain/dashboard/scholar.py` | Save -> plan_update + proposal_seeds; generation alone does not persist. |
| gap_analysis | Indirect | Yes | `brain/dashboard/scholar.py` | Feeds "Topics to Review" in weekly digest. |
| system_health reports | Indirect | Partial | `scholar/outputs/reports/system_health_2026-01-12.md` | Used by humans; not auto-ingested into plans unless summarized in digest. |
| plan_updates | Indirect | Partial | `brain/dashboard/routes.py` | Generated on digest save; requires manual application to SOP files. |
| research_notebook | Indirect | Yes | `brain/dashboard/scholar.py`, `scholar/outputs/research_notebook/` | Feeds digest key findings. |

Disconnects (needs work)
- System health and gap analyses do not automatically update SOP; they depend on manual plan edits.
- Digest generation does not persist unless the save endpoint is used.
