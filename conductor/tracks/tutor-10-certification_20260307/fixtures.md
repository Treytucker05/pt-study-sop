# Deterministic Fixture Plan

## Material Fixture Sets

| Fixture ID | Class | Purpose | Pass Target |
|---|---|---|---|
| `FX-MAT-PDF-001` | PDF | document upload + retrieval grounding | visible, extracted, persisted, cited from selected-material turns |
| `FX-MAT-PPTX-001` | PPTX | slide-deck upload/scope | visible, extracted, persisted, retrievable by `material_ids` |
| `FX-MAT-DOCX-001` | DOCX | syllabus/guide style ingest | visible, extracted, persisted, retrievable by `material_ids` |
| `FX-MAT-TEXT-001` | TXT/MD | plain text / notes ingest | visible, extracted, persisted, retrievable by `material_ids` |
| `FX-MAT-MP4-001` | MP4 | local/API hybrid video path | processable, transcript/visual outputs stable, retrievable by selected-material scope |
| `FX-MAT-SYNC-001` | folder sync | sync create/update/dedupe/remove path | synced materials remain visible and retrieval-safe without stale-path drift |

## Neuro Golden Path Fixture Sets

| Fixture ID | Goal | Exact Local Source Set | Expected Core Outputs |
|---|---|---|---|
| `FX-NEURO-W7-001` | Week 7 first exposure | `Week 7 To Do Neuro.txt`, `Development of nervous system updated.pdf`, `PHYT 6313 Developmental_Disorders1_week 7.pdf`, `Lecture transcript.txt`, `Class wk 7.mp4` | scoped preflight, top-down teaching, notes save, chain-appropriate cards |
| `FX-NEURO-W8-001` | Week 8 Brain Structure first exposure | `Week 8 LO and To Do.txt`, `Brain Structure 2026.pptx` | scoped preflight, first-exposure chain behavior, notes save, stable continuation |
| `FX-NEURO-BG-001` | Basal Ganglia review/retrieval | `Week 9 To Do and LO.txt`, `Movement Control Basal Ganglia 2026.pptx`, `PHYT 6313_Basal Ganglia_PD_week 7.pptx` | review chain behavior, retrieval stability, note/card handling, clean close |

## Fixture Design Rules

- fixture inputs must be deterministic and versioned in repo-tracked metadata
- golden-path fixtures must freeze exact material set, exact objective set, and expected artifact/output checks
- binary/source files may be introduced later, but fixture IDs and pass targets are fixed now so later tests cannot shift the bar

## Current Local Source Root

- `C:\Users\treyt\OneDrive\Desktop\PT School\Neuroscience`
