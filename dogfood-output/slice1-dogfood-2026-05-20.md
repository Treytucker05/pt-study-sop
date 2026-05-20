# Dogfood Report — Slice #161 (General Q&A + teach gate)

**Date:** 2026-05-20  
**Target:** http://127.0.0.1:5127/tutor  
**Server:** `./Start_Dashboard.command` (running)

---

## Summary

| Area | Result |
|------|--------|
| **API / persistence** | **Pass** — gates and `interaction_mode` behave as specified |
| **Built frontend bundle** | **Pass** — `GENERAL Q&A`, `START TUTOR`, `Send as General Q&A`, no `Auto tutor flow` in `tutor-*.js` |
| **UI (agent-browser)** | **Blocked** — new empty-state buttons not found in live DOM on default `/tutor` view |

Backend slice #161 is **verified**. Full UI dogfood needs you to open the **Tutor floating panel** with no active teach session (or we fix panel mount visibility).

---

## Passed — API (end-to-end)

### 1. General session + general turn

- `POST /api/tutor/session` with `session_kind: "general"` → **201**, `session_id` returned
- `POST .../turn` with `turn_mode: "general"`, message *"What is SOAP note format?"* → **SSE stream** with answer
- DB: `interaction_mode = 'general'` on turn 1

### 2. Teach gate — reject without materials

- `POST /api/tutor/session` with `session_kind: "tutor"`, chain id, empty `material_ids` → **400**
- Code: `TEACH_MATERIALS_REQUIRED`

### 3. Teach gate — accept with materials + template chain

- Same with `material_ids: [1]` + template chain → **201**

### 4. Tutor turn blocked on general-only session

- `POST .../turn` with `turn_mode: "tutor"` on general session → **400**
- Code: `TUTOR_TURN_REQUIRES_TEACH_SESSION`

### 5. Build artifacts

- `Auto tutor flow` — **not** in production tutor bundle
- `GENERAL Q&A`, `START TUTOR`, `Send as General Q&A` — **present** in `brain/static/dist/assets/tutor-LXnHpP__.js`

---

## UI exploration (agent-browser)

**Steps taken**

1. Opened `/tutor` — page loads, hero shows `NEW SESSION` / `RESUME` / `REFRESH` (lifecycle split is #162, expected).
2. Clicked **Open Tutor panel**, **Lock canvas**, closed entry overlay.
3. Searched DOM / `document.body.innerText` for `GENERAL Q&A`, `START TUTOR`, `READY TO RUN`.

**Result**

- Strings **not** in page text (`eval` → `false`).
- Accessibility snapshot does **not** list `GENERAL Q&A` or `START TUTOR` buttons.

**Likely cause**

- `TutorLiveStudyPane` empty state (where those buttons live) only mounts inside the **floating Tutor panel** body when that panel is open **and** `activeSessionId` is null.
- Floating Studio may not mount panel content into the main document until layout/preset opens Tutor, or content is in a layer not exposed to a11y snapshots.

**What you should try manually**

1. http://127.0.0.1:5127/tutor  
2. Start or resume a **study run** (workflow) if needed.  
3. Open the **Tutor** floating panel (chip on canvas).  
4. With **no** active teach session, you should see **GENERAL Q&A** and **START TUTOR**.  
5. **GENERAL Q&A** → ask a question without chain/materials.  
6. **START TUTOR** → requires topic, materials, chain (no Auto tutor in selector).

---

## Issues / gaps (for follow-up)

| Severity | Finding |
|----------|---------|
| **P2** | Hero still says `NEW SESSION` / `RESUME` — teach vs study-run lifecycle not split (#162). |
| **P2** | Dogfood automation could not reach `GENERAL Q&A` / `START TUTOR` from default `/tutor` without a clearer panel-open path or `data-testid` on empty state. |
| **P3** | Entry overlay “START A FRESH STUDY SESSION” still conflates **workflow** start with **Tutor teach** — separate from slice 1 but confusing on first visit. |

---

## Verdict

**Slice #161 backend: ship-ready for API consumers.**  
**Slice #161 UI: coded and built; manual confirmation still needed inside the Tutor panel.**

Recommended: add `data-testid="tutor-empty-general-qa"` and `data-testid="tutor-empty-start-tutor"` on empty-state actions for the next dogfood/CI pass.
