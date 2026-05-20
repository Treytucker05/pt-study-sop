# Tutor study run — rough finish plan (remaining GitHub issues)

**Epic:** [#160](https://github.com/Treytucker05/pt-study-sop/issues/160)  
**Done:** [#161](https://github.com/Treytucker05/pt-study-sop/issues/161), [#162](https://github.com/Treytucker05/pt-study-sop/issues/162)  
**Open:** #163 → #164 → #165 → #166, then close #160

**Canon:** `docs/prd/TUTOR_STUDY_RUN_PRD.md`, `docs/audit/TUTOR_BEHAVIOR_SPEC.md`, `docs/adr/0001-tutor-transcript-and-working-summary.md`

---

## Status snapshot

| Issue | Slice | Status | Depends on |
|-------|-------|--------|------------|
| #161 | General Q&A + teach gate | **Closed** (`109cc806`) | — |
| #162 | Lifecycle hero | **Closed** (`109cc806`) | #161 (done) |
| #163 | Teach leg list | **Open** | #161, #162 (done) |
| #164 | Turn tags + working summary | **Open** | #161 (`interaction_mode` exists) |
| #165 | Prompt assembler + memory UI | **Open** | #164 |
| #166 | Polish drafts | **Open** | #164, #162 (done) |
| #160 | Epic | **Open** | All children |

**E2E gate (already in repo):** `./scripts/tutor-browser-dogfood.sh` after `npm run build` + dashboard up.

---

## Recommended order (one vertical slice at a time)

```text
#163 Teach leg list     → UI + API list legs per workflow_id
        ↓
#164 Working summary    → DB + compact job + tutor-only input
        ↓
#165 Prompt assembler   → send_turn history + memory panel copy
        ↓
#166 Polish drafts      → checkpoint/final drafts + approve queue
        ↓
#160 Close epic         → PRD §10 smoke + E2E script extended
```

Do **not** start #165 before #164 or #166 before #164 — they will fight over compaction shape.

---

## #163 — Teach leg list on study run

**Goal:** Learner sees every teach leg on the active study run (label, status, turn count); pick a leg without merging transcripts.

### Rough build

1. **Backend:** `GET /api/tutor/workflows/<id>/teach-legs` (or extend workflow detail) — sessions where `session_kind=tutor` for `workflow_id`, fields: `session_id`, `teach_leg_label`/`topic`, `status`, `turn_count`, `ended_at`.
2. **Frontend:** Panel in Tutor shell or workflow sidebar — list + select leg; active leg → live pane; ended leg → transcript read-only (or resume if product allows).
3. **Wire New teach:** After #162, second leg appears as second row (no merge).

### Tests

- pytest: two sessions same `workflow_id` → list length 2, distinct `session_id`.
- Vitest: list renders two labels after mocked multi-leg payload.
- Manual: New teach twice → two rows; End teach on leg A → status ended, leg B still startable.

### Close note template

> Closed in `<commit>`. Multi-leg list on workflow; transcripts isolated per `tutor_session_id`. Verified: pytest + UI test + E2E extend (optional).

**Estimate:** 1–2 focused sessions.

---

## #164 — Turn tags + working summary compaction

**Goal:** ADR-0001 — append-only transcript; versioned working summary per teach leg; compact uses **tutor** turns only.

### Rough build

1. **Schema:** `tutor_working_summaries` (or columns on session) — `tutor_session_id`, `version`, `summary_text`, `created_at`, `trigger` (manual | pressure).
2. **Compaction job:** Input = tutor-tagged turns only (`interaction_mode=tutor`); output = new summary version; never delete `tutor_turns`.
3. **API:** `POST /session/<id>/compact` (manual); hook pressure path in existing telemetry/compact trigger.
4. **Transcript API:** `GET /session/<id>/turns?mode=tutor|general` (if not already).

### Tests

- pytest: general + tutor turns → compact input excludes general; version increments; turn row count unchanged.
- pytest: transcript list still returns all turns.

### Close note template

> Closed in `<commit>`. Working summary versions per teach leg; compaction excludes general turns. ADR-0001 Phase 1.

**Estimate:** 2–3 sessions (highest risk slice — design storage + prompt contract first).

---

## #165 — Prompt assembler + memory panel clarity

**Goal:** After compact, `send_turn` sends **summary + last K full turns**, not full transcript. Memory UI separates **context pressure** vs **working summary / compact**.

### Rough build

1. **`send_turn` history builder:** If summary exists → inject summary block + tail K tutor turns; else existing behavior capped by N.
2. **Config:** K (e.g. 6–10) in tutor config or constants; document in ADR.
3. **Memory panel:** Rename/relabel telemetry (“Context pressure”); compact button (“Update working summary”); show current summary version + snippet.

### Tests

- pytest: mock long session → assert prompt payload length bounded and contains summary marker.
- Vitest: memory panel labels (no “compaction” for pressure-only).
- Regression: test that fails if code path sends all turns when summary exists.

### Close note template

> Closed in `<commit>`. Assembler uses summary + recency tail; memory panel distinguishes pressure vs summary.

**Estimate:** 1–2 sessions after #164.

---

## #166 — Polish drafts (checkpoint + end teach)

**Goal:** Compaction → editable checkpoint draft; End teach → final draft; approve → polish bundle with leg label; General still promote-only.

### Rough build

1. **Draft model:** Link to `workflow_id` + `tutor_session_id` + `kind` (checkpoint | final) + `status` (draft | approved).
2. **Hooks:** On compact success → upsert checkpoint draft; on End teach → upsert final draft (reuse #162 end path).
3. **Polish UI:** Queue list with leg labels; approve action → existing polish bundle path.
4. **Guard:** General Q&A promote path unchanged (no auto-ingest).

### Tests

- pytest: compact → one checkpoint draft; end teach → final draft; approve → bundle entry with label.
- pytest: general turn promote still explicit-only.

### Close note template

> Closed in `<commit>`. Checkpoint + final drafts with approval gate; General promote-only preserved.

**Estimate:** 2 sessions after #164.

---

## #160 — Close epic

When #163–#166 are closed:

1. Run PRD §10 smoke (manual or scripted).
2. Extend `tutor-browser-dogfood.sh` optionally: New teach → two legs visible (when #163 UI has testids).
3. `pytest` targeted tutor tests + `npm run test` tutor pages.
4. Close #160 with checklist paste from PRD acceptance.

---

## Per-slice workflow (same for each issue)

1. Claim in `docs/root/TUTOR_TODO.md` (Current Sprint) if track-scoped.
2. TDD: pytest RED → implement → GREEN; Vitest for UI.
3. `npm run build` if `dashboard_rebuild/` touched.
4. `./scripts/tutor-browser-dogfood.sh` for regressions on #161/#162 behavior.
5. Commit, push, `gh issue close N --comment "..."`.

---

## Risk / cut lines (if time-boxed)

| If slipping | Defer to follow-up |
|-------------|-------------------|
| #163 ended-leg read-only viewer | List only; transcript via existing session view |
| #164 pressure-triggered compact | Manual compact only first |
| #166 checkpoint draft | Final-on-end-teach only first |
| Wave 6 transcript search UX | Out of epic (#160) scope |

---

## Suggested next pick

**#163** — unblocked, visible UX win, validates #162 New teach multi-leg story without waiting on compaction schema.

After that, **#164** is the critical path for #165 and #166.
