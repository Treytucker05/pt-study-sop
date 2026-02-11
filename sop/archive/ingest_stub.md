# Ingest Stub (Optional)

This repo does not include a Brain ingestion script. If you use an external ingestor, it should accept the Tracker JSON and Enhanced JSON defined in `sop/src/templates/logging_schema_v9.2.md`.

## Expected Interface
- Input: one Tracker JSON and one Enhanced JSON per session.
- Validation: keys must match schema v9.2; reject unknown keys.
- Storage: store by date and topic; keep raw JSON for audit.

If you add a real ingestor later, update this stub and the deployment checklist.
