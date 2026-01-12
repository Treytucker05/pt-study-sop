# Questions Needed - 2026-01-12_071621

Q: Should probe-before-teach be mandatory even when the learner has zero prior exposure, or is a short teach-first exception acceptable?
A: Probe-before-teach is mandatory to establish a baseline and prime the learner. For zero exposure, the probe should be a "Pre-study Scan" request (e.g., "Scan the material and list 3 questions"), not a knowledge test. No teach-first exceptions.

Q: Should template-only logs be blocked or quarantined at ingest to reduce audit noise?
A: Block/Quarantine them. Empty logs are not valid study data and dilute metrics.

Q: Should duplicate session logs be auto-deduped or left as-is for traceability?
A: Auto-dedupe based on content hash or timestamp. Traceability is preserved by the original file existence, but the DB should only hold unique sessions.
