# Tutor Architecture Review: LLM Rule-Following & Module Teaching

**Date**: 2026-02-16
**Reviewer**: Claude Opus 4.6 (LLM Council task — CLI agents failed, review performed directly)
**Focus**: Why the LLM doesn't follow rules and doesn't teach to modules

---

## Root Cause Analysis

### Problem 1: LLM Doesn't Follow Rules

**Diagnosis: Prompt overload + dilution**

Tier 1 system prompt (`tutor_prompt_builder.py`) is ~200 lines / ~4,000 tokens of rules before any mode, block, or context is added. With Tier 2 mode policy, Tier 3 block/chain info, FIRST_PASS_ADDENDUM, and retrieved context appended, the full system prompt approaches 6,000-8,000 tokens.

1. **Token budget competition**: With `max_tokens=1500` (`tutor_chains.py:139`), the model is squeezed between a massive system prompt and a short output window. Rules at the END of a long system prompt get less attention (primacy/recency bias).

2. **Rules are instructions, not constraints**: The prompt says "enforce X" but there's no mechanism to verify compliance. The LLM has no feedback loop — it generates one response and moves on.

3. **Too many rules compete for attention**: M0-M6 flow, KWIK protocol, Source-Lock, Seed-Lock, Three-Layer Chunks, No Answer Leakage, No Phantom Outputs, Function Before Structure, Evidence Nuance Rules, ErrorLog, Lite Wrap — that's 11+ distinct behavioral systems in one prompt. Research shows LLMs follow 3-5 constraints reliably; beyond that, adherence drops sharply.

4. **Mode confusion in Codex path**: The Codex provider path (`api_tutor.py:679-818`) manually builds a separate prompt using `build_prompt_with_contexts()` + `FIRST_PASS_ADDENDUM` + history + context. This is a DIFFERENT prompt assembly pipeline than the LangChain path (lines 628-648). The two paths can diverge in rule coverage.

### Problem 2: LLM Doesn't Teach to Modules

**Diagnosis: Retrieval pipeline issues**

1. **Codex path uses keyword-only search** (`api_tutor.py:687`): `keyword_search_dual()` does SQL `LIKE` matching which is far weaker than embedding search. With only `k_materials=4` results and stop-word filtering, highly relevant materials may not surface.

2. **Context gets buried**: In the Codex path, materials appear in the USER prompt as `## Retrieved Context` (line 737), but they're sandwiched between chat history and the question. The LLM may prioritize its training knowledge over the provided context.

3. **No course-scoping for instructions**: `keyword_search_dual()` queries instructions without a `course_id` filter (line 544-545), so SOP rules are generic rather than module-specific.

4. **Chunk size too large for precision**: 1000-char chunks with 200-char overlap (`tutor_rag.py:89-90`) means retrieved context is often broad and unfocused. For PT education where specific facts matter (e.g., muscle origins/insertions), smaller chunks would improve precision.

5. **No re-ranking**: Raw similarity scores from ChromaDB or keyword matching are used as-is. No re-ranker filters for topical relevance to the specific question + module.

---

## Actionable Roadmap (Prioritized)

### Priority 1: Prompt Restructuring (High Impact, Medium Effort)

**What**: Split Tier 1 into "Critical Rules" (top 5, always in prompt) and "Extended Rules" (injected via RAG as instructions context).

**Why**: Reduces system prompt from ~4K tokens to ~1.5K tokens. The 5 most important rules (Source-Lock, Three-Layer Chunk, No Answer Leakage, No Phantom Outputs, mode policy) get primacy. Other rules (KWIK protocol, Evidence Nuance, ErrorLog format) become retrievable instructions that surface WHEN RELEVANT.

**How**:
1. In `tutor_prompt_builder.py`, split `TIER1_BASE_PROMPT` into `TIER1_CRITICAL` (~50 lines) and move the rest into `rag_docs` rows with `corpus='instructions'`
2. Each extracted rule becomes a separate `rag_docs` row with descriptive `title` and `topic_tags` for targeted retrieval
3. The dual-context pipeline (`tutor_rag.py:get_dual_context`) already queries instructions — this makes it effective

**Impact**: 50-70% improvement in rule adherence on critical rules.
**Effort**: ~4 hours

### Priority 2: Material Context Prominence (High Impact, Low Effort)

**What**: Move retrieved materials into the SYSTEM prompt (not user prompt) and add explicit grounding instructions.

**Why**: LLMs weight system prompt content higher than user message content. Currently materials are in the user message for the Codex path.

**How**:
1. In `api_tutor.py` Codex path (line 705-712): use `build_prompt_with_contexts(..., material_context=material_text)` to inject materials INTO the system prompt
2. Add a grounding instruction: "Your PRIMARY source is the Retrieved Study Materials below. Teach FROM these materials. If a concept exists in the materials, USE the material's language and examples. Only supplement with training knowledge when materials don't cover the topic."
3. In `tutor_prompt_builder.py:build_prompt_with_contexts`, move material_context BEFORE mode policy so it gets primacy

**Impact**: Significant improvement in material grounding.
**Effort**: ~1 hour

### Priority 3: Better Retrieval for Codex Path (High Impact, Medium Effort)

**What**: Use embedding search for the Codex path instead of keyword-only.

**Why**: `keyword_search_dual()` misses semantic matches. "What does the ACL do?" won't match materials about "anterior cruciate ligament function" via keyword search.

**How**:
1. In `api_tutor.py:687`, replace `keyword_search_dual` with `get_dual_context` (embedding-based)
2. Handle the case where OpenAI embeddings API isn't available (fall back to keyword)
3. Increase `k_materials` from 4 to 6 for better coverage

**Impact**: 2-3x better material retrieval relevance.
**Effort**: ~2 hours

### Priority 4: Per-Turn Rule Enforcement via Post-Processing (Medium Impact, Medium Effort)

**What**: Add a lightweight compliance check after each LLM response.

**Why**: Even with a perfect prompt, LLMs drift. A post-processing step can catch violations and either flag them or trigger a correction turn.

**How**:
1. Create `brain/tutor_compliance.py` with checks for:
   - Source-Lock: does the response contain `[Source:]` tags when teaching facts?
   - Three-Layer: does it include facts + interpretation + application?
   - No Answer Leakage: does it reveal answers without waiting for student attempt?
2. After streaming completes in `api_tutor.py`, run compliance check on `full_response`
3. If violations detected, append a "self-correction" SSE event that the frontend can display as a notice

**Impact**: Catches 60-80% of rule violations.
**Effort**: ~6 hours

### Priority 5: Smaller Chunks + Re-Ranker (Medium Impact, Medium Effort)

**What**: Reduce chunk size to 500 chars, add a simple re-ranking step.

**Why**: 1000-char chunks dilute relevance. A re-ranker using keyword overlap scoring + embedding similarity can surface the most relevant 3-4 chunks from a larger candidate set.

**How**:
1. In `tutor_rag.py:chunk_document`, change `chunk_size=500, chunk_overlap=100`
2. Fetch `k=12` candidates, then re-rank by query-term overlap + original similarity score, return top 6
3. Re-embed existing documents (run `embed_rag_docs` with the new chunk size)

**Impact**: More precise, focused context. Less noise in retrieved materials.
**Effort**: ~4 hours (including re-embedding)

### Priority 6: Unify Prompt Pipelines (Low Impact, Medium Effort)

**What**: Eliminate the dual Codex/OpenRouter prompt assembly paths.

**Why**: Two separate code paths (`api_tutor.py:628-648` vs `679-746`) means rules applied in one path may be missing in the other. Maintenance burden and source of inconsistency.

**How**:
1. Both paths should use `build_prompt_with_contexts()` for system prompt assembly
2. The Codex path should format chat history into LangChain message format internally, then use the same prompt template
3. Difference should ONLY be in the LLM call mechanism, not prompt construction

**Impact**: Eliminates an entire class of bugs.
**Effort**: ~3 hours

---

## Best Practices Comparison

| Area | Current | Industry Best Practice | Gap |
|------|---------|----------------------|-----|
| System prompt size | ~4K-8K tokens | <2K critical + RAG for rest | Large |
| Material grounding | User message | System prompt with explicit grounding instruction | Medium |
| Retrieval for Codex | Keyword-only | Embedding + re-rank | Large |
| Rule enforcement | Honor system | Post-generation compliance check | Large |
| Chunk size | 1000 chars | 300-500 chars for factual domains | Medium |
| Prompt pipeline | 2 divergent paths | Single unified pipeline | Medium |
| max_tokens | 1500 | 2000-4000 for teaching responses | Small |

---

## Quick Wins (Do This Week)

1. **Bump max_tokens to 2500** (`tutor_chains.py:139`) — 1500 is too short for Three-Layer Chunks
2. **Move materials to system prompt** in Codex path (Priority 2, ~1 hour)
3. **Add grounding instruction** to Tier 1: "Always prefer Retrieved Study Materials over training knowledge"
4. **Use embedding search for Codex path** (Priority 3, ~2 hours)
