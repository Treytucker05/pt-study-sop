# brain/data/ — Runtime Data Store

All user data lives here. Nothing in this directory is checked into git (see `.gitignore`).

## Study Materials (managed via `/library` page)

```
uploads/              Raw uploaded files (PDFs, DOCX, PPTX, etc.)
chroma_tutor/         ChromaDB vector store root (provider/model-scoped embeddings for RAG retrieval)
  tutor_materials_<provider>_<model>/   Active Tutor material collections
  instructions/       Legacy SOP instruction collection
  notes/              Legacy vault note collection
```

**Flow:** User uploads via `/library` page → file saved to `uploads/` → text extracted → embedded into a provider/model-scoped Tutor collection under `chroma_tutor/` → Tutor retrieves during chat via `brain/tutor_rag.py`.

**Current default embedding path:** Gemini Embedding 2 preview via:
- `GEMINI_API_KEY`
- `TUTOR_RAG_EMBEDDING_PROVIDER=gemini`
- `TUTOR_RAG_GEMINI_EMBEDDING_MODEL=gemini-embedding-2-preview`

OpenAI embeddings remain fallback-only when the provider is switched explicitly.

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
