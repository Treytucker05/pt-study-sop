# Ideas & Research Backlog

Captured research items and future enhancements for the PT Study system.

---

## Active Research Items

### 1. Session Context Persistence for Long Study Sessions

**Problem:** Users have hours-long study sessions. How do we maintain conversational context across many Tutor turns without hitting token limits?

**Research Areas:**
- Sliding window with summary compression
- Session checkpoints (periodic state snapshots)
- Hierarchical memory (recent turns full, older summarized)
- External memory store (Redis, SQLite cache)
- Token budget allocation strategies

**Constraints:**
- Codex CLI has context limits
- Must preserve learning continuity
- Performance must stay responsive

**Status:** UNCONFIRMED - needs investigation

---

### 2. Mode-Specific Tutor Behavior (Core/Sprint/Drill)

**Problem:** The three study modes have different goals. How should Tutor behavior adapt?

**Research Areas:**
- Core Mode: Deep explanations, conceptual linking, Socratic questioning
- Sprint Mode: Rapid recall, concise answers, time-pressure aware
- Drill Mode: Pattern recognition, error correction, spaced repetition integration

**Source Files to Review:**
- sop/library/06-modes.md
- sop/library/05-session-flow.md (planning + modes overview)
- sop/library/00-overview.md

**Status:** UNCONFIRMED - needs SOP review

---

## Future Enhancements (Deferred)

### v2: Embedding-Based RAG Search
- Replace LIKE search with vector embeddings
- Consider: sentence-transformers, OpenAI embeddings, local models
- Trade-offs: accuracy vs complexity vs latency

### v2: Multi-Modal Knowledge Ingestion
- Support images, diagrams from study materials
- OCR for scanned notes
- Integration with existing asset pipeline

### v2: Adaptive Difficulty Calibration
- Track user performance patterns
- Adjust question difficulty dynamically
- Connect to spaced repetition metrics

---

## Completed Research

(Move items here when resolved)

---

*Last updated: 2026-01-09*
