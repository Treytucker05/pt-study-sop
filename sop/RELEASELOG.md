# SOP Method Library — Release Log

## v1.1.0 (2026-02-23)

- RAG chunking rewrite: small-doc bypass (≤8K chars), two-stage header-aware splitting, cross-encoder reranker
- Gemini CLI wired as second LLM provider (`call_llm(provider="gemini")`)
- Fixed `embed_vault_notes()` latent bug (missing `source_path` arg)
- Bumped `DEFAULT_MAX_CHUNKS_PER_DOC` from 2 → 4
- Minimum chunk filter (50 chars) to eliminate header-only fragments

## v1.0.0 (2026-02-08)

- Initial YAML-based method library with 34 blocks and 13 chains
- Validation, gap radar, ticket scaffolder, and version bump tools
- Build pipeline: YAML -> 15-method-library.md -> runtime bundles
- Seed conversion: seed_methods.py reads YAML with dict fallback
