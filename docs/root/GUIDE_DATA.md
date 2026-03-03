# brain/data/ — Runtime Data Store

All user data lives here. Nothing in this directory is checked into git (see `.gitignore`).

## Study Materials (managed via `/library` page)

```
uploads/              Raw uploaded files (PDFs, DOCX, PPTX, etc.)
chroma_tutor/         ChromaDB vector store (embeddings for RAG retrieval)
  materials/          Collection: user study materials
  instructions/       Collection: SOP instruction embeddings
  notes/              Collection: vault note embeddings
```

**Flow:** User uploads via `/library` page → file saved to `uploads/` → text extracted → embedded into `chroma_tutor/materials/` → tutor retrieves during chat via `brain/tutor_rag.py`.

**Sync source:** `C:\Users\treyt\OneDrive\Desktop\PT School` (configurable in Library page).

## Database

```
pt_study.db           Primary SQLite database (sessions, rag_docs, method_blocks, etc.)
study.db              Legacy/secondary database
```

Key tables for materials:
- `rag_docs` — metadata + extracted text for all ingested materials
- `ingested_files` — checksum tracking for deduplication

## Other

```
api_config.json       Google Calendar/Tasks API configuration
gcal_token.json       Google OAuth token (sensitive)
vault_courses.yaml    Course-to-vault-folder mapping
video_ingest/         Processed video transcripts + visual notes
extracted_images/     Images extracted from PDFs/PPTX during ingestion
```

> **Not to be confused with `sop/library/`** which contains study *methodology* definitions (how the tutor teaches), not study materials. See `AGENTS.md` → "Library Disambiguation".
