## Findings (ordered by severity)

1. **P1 — No REFERENCE→RETRIEVE runtime gate in these two files**
   - Evidence: retrieval entrypoints run directly in [brain/tutor_rag.py:454](C:/pt-study-sop/brain/tutor_rag.py:454) and [brain/tutor_rag.py:802](C:/pt-study-sop/brain/tutor_rag.py:802); `tutor_chains` only does artifact regex detection at [brain/tutor_chains.py:39](C:/pt-study-sop/brain/tutor_chains.py:39).
   - Risk impact: in this layer, retrieval can run without explicit REFERENCE-stage preconditions/targets.

2. **P1 — Empty `material_ids` can silently broaden retrieval scope**
   - Evidence: truthy checks at [brain/tutor_rag.py:525](C:/pt-study-sop/brain/tutor_rag.py:525), [brain/tutor_rag.py:529](C:/pt-study-sop/brain/tutor_rag.py:529), [brain/tutor_rag.py:667](C:/pt-study-sop/brain/tutor_rag.py:667), [brain/tutor_rag.py:676](C:/pt-study-sop/brain/tutor_rag.py:676), [brain/tutor_rag.py:761](C:/pt-study-sop/brain/tutor_rag.py:761).
   - Risk impact: `[]` is treated like “no filter,” so selected-material scoping can fail open.

3. **P1 — `init_vectorstore()` failure can bypass fallback path**
   - Evidence: `vs = init_vectorstore(...)` occurs before guarded `try` at [brain/tutor_rag.py:487](C:/pt-study-sop/brain/tutor_rag.py:487), while fallback handling starts at [brain/tutor_rag.py:491](C:/pt-study-sop/brain/tutor_rag.py:491).
   - Risk impact: startup/import/env failures can hard-fail instead of degrading to keyword fallback.

4. **P1 — Embed path is not atomic across Chroma + SQL tracking**
   - Evidence: vectors inserted at [brain/tutor_rag.py:318](C:/pt-study-sop/brain/tutor_rag.py:318), then SQL tracking rows inserted at [brain/tutor_rag.py:329](C:/pt-study-sop/brain/tutor_rag.py:329), commit later at [brain/tutor_rag.py:339](C:/pt-study-sop/brain/tutor_rag.py:339), with no rollback of inserted IDs on SQL-write failure.
   - Risk impact: Chroma/SQLite drift (orphaned vectors, inconsistent skip/re-embed behavior).

5. **P2 — Fallback corpus scoping is effectively disabled from embedding path**
   - Evidence: `corpus_fallback = None` at [brain/tutor_rag.py:489](C:/pt-study-sop/brain/tutor_rag.py:489), passed into fallback at [brain/tutor_rag.py:497](C:/pt-study-sop/brain/tutor_rag.py:497), [brain/tutor_rag.py:510](C:/pt-study-sop/brain/tutor_rag.py:510), [brain/tutor_rag.py:616](C:/pt-study-sop/brain/tutor_rag.py:616), [brain/tutor_rag.py:629](C:/pt-study-sop/brain/tutor_rag.py:629); fallback only applies corpus when truthy at [brain/tutor_rag.py:662](C:/pt-study-sop/brain/tutor_rag.py:662).
   - Risk impact: fallback can cross corpus boundaries.

6. **P2 — Folder scope semantics are inconsistent between vector and fallback**
   - Evidence: vector exact-match `$in` at [brain/tutor_rag.py:528](C:/pt-study-sop/brain/tutor_rag.py:528); SQL substring `LIKE` at [brain/tutor_rag.py:672](C:/pt-study-sop/brain/tutor_rag.py:672)-[brain/tutor_rag.py:674](C:/pt-study-sop/brain/tutor_rag.py:674).
   - Risk impact: same request can return different scope depending on fallback path.

7. **P2 — Unscoped `k` has no hard cap**
   - Evidence: unscoped candidate sizing at [brain/tutor_rag.py:447](C:/pt-study-sop/brain/tutor_rag.py:447)-[brain/tutor_rag.py:448](C:/pt-study-sop/brain/tutor_rag.py:448), used in retrieval at [brain/tutor_rag.py:541](C:/pt-study-sop/brain/tutor_rag.py:541) and merge sizing at [brain/tutor_rag.py:575](C:/pt-study-sop/brain/tutor_rag.py:575).
   - Risk impact: very large `k` can inflate retrieval work and latency.

8. **P2 — Stop-word/short queries can force zero fallback results**
   - Evidence: keyword filtering at [brain/tutor_rag.py:657](C:/pt-study-sop/brain/tutor_rag.py:657), `score_expr = "0"` at [brain/tutor_rag.py:689](C:/pt-study-sop/brain/tutor_rag.py:689), SQL requires `({score_expr}) > 0` at [brain/tutor_rag.py:699](C:/pt-study-sop/brain/tutor_rag.py:699).
   - Risk impact: fallback returns empty even when docs exist.

9. **P2 — DB connections are not exception-safe**
   - Evidence: open/close without `finally` in [brain/tutor_rag.py:256](C:/pt-study-sop/brain/tutor_rag.py:256)-[brain/tutor_rag.py:340](C:/pt-study-sop/brain/tutor_rag.py:340) and [brain/tutor_rag.py:652](C:/pt-study-sop/brain/tutor_rag.py:652)-[brain/tutor_rag.py:722](C:/pt-study-sop/brain/tutor_rag.py:722).
   - Risk impact: exception paths can leave DB handles open longer than intended.

## Missing checks/tests

1. `material_ids=[]` should be explicitly tested as **empty scope** (not “no scope”) in both `search_with_embeddings` and `_keyword_fallback`.
2. Fallback parity tests should verify scope equivalence for `folder_paths` and corpus between vector path and SQL path.
3. `init_vectorstore` failure-path test should verify deterministic behavior (fallback or explicit controlled error).
4. `embed_rag_docs` should have consistency tests simulating SQL failure after Chroma add (ensuring rollback/compensation behavior).
5. Guardrail tests for `k` (`k<=0`, very large `k`) should assert bounded candidate sizes and safe fallback behavior.
6. Fallback tests for stop-word-only / short-token queries should assert expected behavior (not accidental zeroing unless intentional).
7. Runtime dependency-law tests should assert retrieve entrypoints reject/guard when REFERENCE artifacts/targets are absent.
8. `detect_artifact_command` needs boundary/false-positive tests for note/card/map regex patterns.

## Quick confidence notes

- **High confidence:** findings #2, #3, #5, #6, #8, #9 (directly observable control flow and condition logic).
- **Medium confidence:** finding #1 (could be enforced upstream, but not in these two files), finding #7 (impact depends on external `k` limits), finding #4 (requires failure-path execution to realize drift, but path is present).

## Next steps

1. Pick top 3 fixes to harden first (`material_ids` fail-closed, `init_vectorstore` fallback coverage, embed atomicity).
2. Add the missing tests above before code changes to lock expected behavior.
3. Run a targeted failure-injection pass (vector init failure, SQL write failure, empty-scope input) to confirm runtime integrity.