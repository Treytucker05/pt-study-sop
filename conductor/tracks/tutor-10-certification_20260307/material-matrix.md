# Material Intake Matrix

## Scope

Supported 10/10 material classes:

- PDF
- PPTX
- DOCX
- TXT/MD
- MP4
- folder sync
- selected-material scoping during tutor turns

## Certification Matrix

| Material Class | Upload / Sync | Extraction | `rag_docs` Persistence | Selected-Material Scope | Status |
|---|---|---|---|---|---|
| PDF | certification test added | covered via extractor + upload path | certification test added | covered by selected-material retrieval tests | green |
| PPTX | certification test added | upload path covered with mocked extraction | certification test added | covered by selected-material retrieval tests | green |
| DOCX | certification test added | upload path covered with mocked extraction | certification test added | covered by selected-material retrieval tests | green |
| TXT/MD | certification test added | native/plain extraction path covered | certification test added | covered by selected-material retrieval tests | green |
| MP4 | upload + process endpoint coverage present | dedicated video pipeline covered | upload row + process flow covered | linked processed transcript now expands under selected-material scope | green |
| Folder Sync | preview/start coverage added | sync ingestion covered | pruning stale rows and update/dedupe covered | selected-material retrieval uses the same scoped material-id contract after sync | green |

## Current Gate Notes

- `selected-material` turn coverage already exists heavily in `test_tutor_session_linking.py`
- the blocker resolved in this pass was stale folder-sync visibility
- the blocker resolved in this pass for MP4 was selected-scope expansion to linked processed transcript material
- MP4 process/enrich coverage relies on the existing dedicated video-process/video-bridge tests plus the new selected-scope bridge test
- Milestone 1 is green at the certification-artifact level and can hand off to Milestone 2
