# TDD Execution Plan — Open Tutor Backlog

Date: 2026-04-19
Owner: Trey
Authority: execution guide for the 12 open items in `docs/root/TUTOR_TODO.md`, worked one task at a time with failing-test-first discipline.

## How to use this plan

1. Pick the top unchecked task below. Don't skip ahead.
2. Follow its subtask list in order. Every subtask has a **Red** (write a failing test), **Green** (smallest code to pass), **Verify** triplet.
3. Mark each subtask done only after:
   - the new test passes,
   - the prior suite still passes,
   - `npm run build` stays green,
   - the `Done when` bullet it maps to in `TUTOR_TODO.md` is observably true.
4. When every subtask for a task is green, tick the task checkbox in `TUTOR_TODO.md` and move on.
5. Use focused `vitest` / `pytest` runs while iterating. Only run the full suite at task boundaries.

Legend: **R** = write failing test, **G** = write production code to pass it, **V** = verify gates (unit + build + browser smoke where applicable).

---

## Execution order

| # | ID | Why here | Rough size |
|---|----|----------|-----------|
| 1 | ENTRY-200 | Smallest win, directly user-requested, builds on HUD-256 | S |
| 2 | REMAIN-002 | Finishes the Polish story; tooling already in place | S |
| 3 | REMAIN-006 | Finishes Obsidian integration; complements launch button shipped today | M |
| 4 | SOP-ENCODE-001 | Isolated library doctrine change, zero UI coupling | S |
| 5 | TGSL-110 | Unblocks the Priming→Tutor handoff UX pain point | M |
| 6 | HUD-234 | Nav simplification; prerequisite for HUD-239 cutover | M |
| 7 | SCSR-100 | Nav-language sweep; safer once HUD-234 has settled | M |
| 8 | SWARM-110 | Bug grab-bag; best done after UX cleanup above | M |
| 9 | HUD-239 | Full Studio v2 cutover; needs 1–8 stable first | L |
| 10 | TTAC-100 | Canon + runtime realign; deep, do after UI is stable | L |
| 11 | RQA-100 | Repo-wide audit; most useful once the above have tightened the surface | L |
| 12 | SWARM-120 | Quality gate / source-control sweep; naturally last | S |

---

## 1. ENTRY-200 — Resume-Session tab on entry card  *(done 2026-04-19)*

**Goal:** add a `New Session` / `Resume Session` tab bar to the Tutor entry card. Resume tab lists past sessions and launches the existing `resumeFromHubCandidate` flow.

- [x] **1.1 Tab state scaffold**
  - **R:** test — entry card defaults to `New Session` tab; clicking `Resume Session` button swaps `data-testid="tutor-entry-mode"` to `resume`.
  - **G:** add `entryMode` state + two-button tab row above the existing form.
  - **V:** focused `TutorShell.test.tsx`.
- [x] **1.2 Resume list fetch (course-scoped)**
  - **R:** test — when course selected, Resume tab calls `api.tutor.listSessions({ course_id, limit: 20 })`; when no course, calls `api.tutor.listSessions({ limit: 20 })`.
  - **G:** wire `useQuery(['tutor', 'sessions', courseId], …)` gated on tab === `resume`.
  - **V:** focused test + visual query-devtools spot check.
- [x] **1.3 List rendering**
  - **R:** test — given 3 mock sessions, Resume tab renders 3 rows with name, course/unit/topic string, relative last-active, and a `Resume` button.
  - **G:** row component reusing mono font chrome from entry card.
  - **V:** focused test.
- [x] **1.4 Empty + error + retry**
  - **R:** tests — empty result renders `No past sessions yet — start a fresh one.` with link that flips tab back; query error renders inline `Retry` button that refetches.
  - **G:** conditional branches inside Resume tab.
  - **V:** focused tests cover both branches.
- [x] **1.5 Resume click wiring**
  - **R:** test — clicking `Resume` on a row invokes `resumeFromHubCandidate(row)` with the row data and triggers `setPanelLayout(buildStudioShellPresetLayout('study'))`.
  - **G:** onClick handler threads existing callback (already in `tutor.tsx`).
  - **V:** focused test + `npm run build` green.
- [x] **1.6 Browser smoke**
  - **R:** new `scripts/verify-entry-card-history.js` — opens `/tutor`, clicks Resume tab, asserts list renders (or empty copy), clicks a row, asserts entry overlay closes and study preset panels are present.
  - **G:** script only; no code change.
  - **V:** `dev-browser --headless --timeout 60 run scripts/verify-entry-card-history.js` passes.
- [x] **1.7 Check off TUTOR_TODO + commit**

---

## 2. REMAIN-002 — Polish Packet shows tutor outputs  *(done 2026-04-19)*

**Goal:** after a tutor chat session, Polish Packet reflects promoted replies, staged summary text, and Anki drafts instead of placeholder copy.

- [x] **2.1 Fixture + section builder tests** — Existing `studioPacketSections.test.ts` (4/4 pass) already covers promoted notes / summaries / cards / assets.
- [x] **2.2 Panel render test** — Existing `TutorShell.test.tsx` tests `shows explicit Polish Packet sections`, `mirrors live Polish draft summaries`, `promotes a tutor reply into Polish Packet notes` all pass.
- [~] **2.3 Review-before-export gate** — Dropped: not in TUTOR_TODO Done-when list; was speculative. Panel already surfaces content for visual review.
- [x] **2.4 Live browser smoke** — Added `scripts/verify-polish-packet.js`; dev-browser headless run asserts the four section headers render from the live toolbar.
- [x] **2.5 Check off + commit**

---

## 3. REMAIN-006 — Obsidian panel = real vault browser  *(done 2026-04-19)*

**Goal:** Obsidian panel browses the course-scoped vault folder, opens a note in read mode, edits + saves back.

- [x] **3.1 Folder tree renders** — Already covered by pre-existing `StudioObsidianPanel` tree + test.
- [x] **3.2 Note read mode** — Already covered by existing preview flow + test.
- [x] **3.3 Note edit + save** — Added Edit / Save / Cancel buttons wired to `api.obsidian.saveFile`; edit-save test green.
- [x] **3.4 Error paths** — Save failure surfaces toast via existing error handler; cancel-edit test covers revert. Retry flow covered by existing React Query refetch on path change.
- [x] **3.5 Live browser smoke** — Existing `scripts/verify-remaining.js` passes 5/5 against the rebuilt dist.
- [x] **3.6 Check off + commit**

---

## 4. SOP-ENCODE-001 — Fix M-ENC-001 KWIK Hook mnemonic flow  *(done 2026-04-01, duplicate entry removed 2026-04-19)*

**Goal:** YAML + readable surfaces reflect the word-sound → meaning → linked-image flow (not the current placeholder).

- [ ] **4.1 Golden test captures intended flow**
  - **R:** update golden in `sop/tests/golden/15-method-library.golden.md` and `06_METHODS.golden.md` to the new card text.
  - Also add a focused `brain/tests/test_seed_methods.py` regression pinning `word_sound`, `meaning`, `linked_image` keys in the YAML.
- [ ] **4.2 YAML + category rewrite**
  - **G:** rewrite `sop/library/methods/M-ENC-001.yaml` and touch `sop/library/categories/ENCODE.md`.
- [ ] **4.3 Regenerate runtime surfaces**
  - **V:** `python sop/tools/build_runtime_bundle.py --update-golden` then `python sop/tools/validate_library.py`.
- [ ] **4.4 Hardening**
  - **V:** `python brain/data/seed_methods.py --strict-sync` + focused pytest green.
- [ ] **4.5 Check off + commit**

---

## 5. TGSL-110 — Priming→Tutor handoff contract

**Goal:** `Mark Ready` and `Start Tutor` use one launch contract, carry extracted objectives forward, and surface blockers inside the handoff section.

- [ ] **5.1 Contract test**
  - **R:** unit test — a single `buildTutorLaunchPayload(primingState)` returns the same payload shape whether invoked from `Mark Ready` or `Start Tutor`, including `objective_candidates[]`.
  - **G:** extract the shared builder; have both buttons call it.
- [ ] **5.2 Objective carryover**
  - **R:** test — payload contains non-empty `objective_candidates` whenever priming state has them; tutor session seed reads them.
- [ ] **5.3 Blocker surface**
  - **R:** test — when payload validation fails, handoff section renders inline blocker list (`missing course`, `no materials`, etc.) and buttons become disabled with `aria-disabled="true"`.
  - **G:** move blocker detection into the payload builder; render in JSX.
- [ ] **5.4 Live smoke**
  - **R:** `scripts/verify-priming-handoff.js` — simulate priming with and without objectives; assert both buttons produce identical tutor launches.
- [ ] **5.5 Check off + commit**

---

## 6. HUD-234 — Studio becomes first Tutor button, Launch folds in

**Goal:** top nav under `/tutor` is just `Studio` + `Tutor`; former `Launch` surface lives inside Studio.

- [ ] **6.1 Nav test**
  - **R:** test — top nav renders exactly `Studio`, `Tutor` (no `Launch`).
  - **G:** update nav definition.
- [ ] **6.2 Launch contents relocated**
  - **R:** tests — workflows table, study wheel, and stats render inside Studio's management area; direct `/tutor/launch` route redirects to `/tutor`.
  - **G:** move components + add route redirect.
- [ ] **6.3 Regression**
  - **V:** existing Studio + nav tests stay green.
- [ ] **6.4 Live smoke**
  - **R:** `scripts/verify-nav-fold.js` — load `/tutor/launch`, assert redirect; load `/tutor`, assert Launch content reachable from Studio.
- [ ] **6.5 Check off + commit**

---

## 7. SCSR-100 — Unify command-deck nav language

**Goal:** flagship routes and shared frames use one control system; no mixed button/tab mashups.

- [ ] **7.1 Inventory**
  - **R:** snapshot test listing every flagship route's nav primitive; fails if more than one primitive style is in use.
  - **G:** consolidate to the `HudButton` / command-deck components.
- [ ] **7.2 Per-route migration, one route per commit**
  - **R** (per route): test that the route renders the unified primitive.
  - **G:** swap in the unified primitive; remove legacy.
- [ ] **7.3 Visual regression pass**
  - **V:** dev-browser screenshots per route saved to `.dev-browser/tmp/` and diffed by eye during review.
- [ ] **7.4 Check off + commit**

---

## 8. SWARM-110 — Harden Tutor workflow logic + UI bugs

**Goal:** grab-bag of recurring interaction bugs and workflow races get captured as tests and fixed.

- [ ] **8.1 Triage**
  - Start a numbered list of reproducible bugs at the top of this task's Notes section (reference issues, session logs).
- [ ] **8.2 One bug → one subtask**
  - Each bug gets: **R** failing regression test → **G** fix → **V** focused run + build.
- [ ] **8.3 Exit criteria**
  - When zero reproducible bugs in the triage list remain, close the task.

---

## 9. HUD-239 — Floating-panel Studio v2 cutover

**Goal:** execute the slice-by-slice runbook in `docs/design/STUDIO_LAYOUT_SPEC_v2.md`.

- [ ] **9.1 Slice per subtask**
  - The spec already lists slices. Each slice is its own subtask here.
  - For every slice: write a failing Studio test that describes the slice's acceptance, implement, keep the floor from regressing (run existing StudioShell + TutorShell tests).
- [ ] **9.2 Delete dead code as each slice lands**
  - See the spec's `What gets deleted` list; tick items off as migrations complete.
- [ ] **9.3 Exit criteria**
  - Every slice green + every listed deletion complete + a full production build + full dev-browser regression pass on `/tutor`.

---

## 10. TTAC-100 — TEACH-first first-exposure alignment

**Goal:** canon, chains, runtime, mnemonic policy, and live Tutor UI all point to the locked TEACH-first architecture.

- [ ] **10.1 Canon tests first**
  - **R:** `pytest` gates on method canon, chain composition, runtime router, and mnemonic policy that encode TEACH-first invariants.
- [ ] **10.2 Data + runtime migrations**
  - **G:** update YAMLs, chain defs, runtime routing, policy files until canon tests green.
- [ ] **10.3 Frontend follow-through**
  - **R:** UI tests asserting Tutor surfaces present TEACH-first copy/flow.
  - **G:** update copy + component ordering.
- [ ] **10.4 End-to-end validation**
  - **V:** `pytest` full suite + `npm run build` + `dev-browser` walkthrough.
- [ ] **10.5 Check off + commit**

---

## 11. RQA-100 — Repo-wide audit → severity-ranked fix plan

**Goal:** produce a single severity-ranked fix backlog with evidence, not code changes.

- [ ] **11.1 Shard the audit**
  - Split the app into subsystems (frontend tutor shell, priming, polish, brain API, SOP library, infra scripts). One subtask per shard.
- [ ] **11.2 Evidence capture**
  - For each shard: collect failing tests / broken flows / console errors / UX issues into a structured list with repro steps.
- [ ] **11.3 Consolidation**
  - Merge shards into one ranked backlog at `docs/root/RQA_BACKLOG.md` with severity (Sev1–Sev3) and fix-wave groupings.
- [ ] **11.4 Verification**
  - No code changes required; task closes when the backlog doc lands.

---

## 12. SWARM-120 — Quality gatekeeper final pass

**Goal:** last audits + source-control cleanup.

- [ ] **12.1 Branch / tag hygiene**
  - Delete stale remote branches; audit local worktrees for orphan commits.
- [ ] **12.2 Failing or skipped tests**
  - Re-enable, fix, or delete. No long-term skips survive.
- [ ] **12.3 Build + lint baseline**
  - `npm run build`, `pytest`, lint — all green on `main`.
- [ ] **12.4 Release notes**
  - Capture the trail of completed items since the last snapshot in `docs/root/RELEASE_NOTES.md`.
- [ ] **12.5 Check off + commit**

---

## Session discipline

- One task per working session when possible. Split only if a task's scope grows beyond 2 hours.
- Every commit message references the task ID, e.g. `feat(entry-200): add Resume tab state`.
- After finishing a task, run `/learn` before closing the session per `MEMORY.md`.
- If verification fails twice, STOP and re-read the task scope top-down before continuing.
