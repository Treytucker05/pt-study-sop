# Deferred Features

Purpose: Track features intentionally not implemented yet.
Audience: Maintainers and contributors aligning roadmap expectations.
Source of Truth: This list plus `sop/working/ROADMAP.md` for prioritization.

| Feature | Status | Why Deferred | Dependency |
|---------|--------|--------------|------------|
| ~~Dashboard~~ | ✅ **IMPLEMENTED** | ~~Awaiting defined analytics scope and architecture~~ | ~~Depends on finalized metrics contract from `brain/` data~~ |
| Plan Overview Endpoints | Deferred | `/api/plan/today` and `/api/plan/overview` mentioned in roadmap but not yet implemented | Can be added when planning logic matures |
| RAG Dashboard Integration | Deferred | `rag_notes.py` module exists with CLI, but no dashboard UI for search/ingestion | Dashboard integration can be added when RAG usage patterns stabilize |
| ~~Full Tutor Implementation~~ | ✅ **IMPLEMENTED** | ~~Tutor API stubs exist but return placeholders~~ | ~~Requires RAG integration and SOP runtime execution engine~~ |
| Embedding-Based RAG Search | Deferred | Current RAG uses LIKE-based text search | v2 enhancement: add vector embeddings for semantic search |
| Spacing/Coverage Visuals | Deferred | Basic stats exist, but advanced visualizations (coverage maps, spacing charts) not implemented | Can be added as dashboard enhancement |
| Card Bridge Integration | Deferred | No Anki/card integration visible in dashboard | Requires Anki Connect API integration and card deduplication logic |
| Calendar Sync | Deferred | External calendar API and auth model not selected | Selection of calendar provider and auth flow |
| Live Image Fetch | Deferred | Requires image source policy and caching approach | Decision on image source/hosting and bandwidth constraints |
| Session Persistence to DB | Deferred | Tutor session context stored in-memory only | Needed for multi-hour sessions that may survive server restart |
