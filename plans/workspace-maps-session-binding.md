# Plan: Workspace Maps Session Binding

> Goal: The three Workspace-panel maps (Canvas, Mind Map, Concept Map) should
> reflect the **active Tutor session's material** — priming outputs, tutor
> turns/artifacts, promoted Prime Packet items, captured notes — not
> unrelated global/vault sources.

---

## Architectural decisions

These hold across all phases — don't re-litigate per phase.

- **Single source-of-truth shape** — a normalized `SessionMaterialBundle` type
  plus a `useTutorSessionMaterialBundle()` hook. Every map consumes this,
  nothing else.
- **Propagation path** — bundle flows as props from `tutor.tsx` → `TutorShell`
  → `StudioShell.workspace` content → `StudioWorkspaceUnified` → each map
  tab. No new global store, no React context for this.
- **Seeding discipline** — each map owns two states: `isSeeded` (bool) and
  `isDirty` (bool). Auto-seed fires exactly once per mount when
  `!isSeeded && bundle.isReady && !isDirty`. After that only a manual
  "Refresh from session" button re-seeds; it prompts if `isDirty`.
- **Canvas is already session-adjacent** — `StudioTldrawWorkspace` accepts
  `canvasObjects: StudioWorkspaceObject[]` and creates tldraw shapes from
  them. Phase 4 only extends this, it does not rewrite it.
- **No tests for the integration layer yet** — unit-test the bundle hook and
  the per-map seed builders (pure functions). Integration happens via
  existing tutor.test.tsx paths plus a visual verification checklist.
- **Feature flag** — ship behind `workspaceMapsSessionSeed` toggle in
  localStorage (default on in dev, off in prod for the first 48h) so we can
  disable auto-seed remotely if it surprises users. Removed after burn-in.

---

## Phase 1: SessionMaterialBundle contract + hook

**What to build**

A normalized bundle the maps can consume without knowing where each piece
came from. End-to-end behavior: mount `useTutorSessionMaterialBundle()` in
the tutor page, pass the bundle through shell → workspace → tabs, and log
its shape in dev so we can verify plumbing before any map consumes it.

**Files to touch**
- `dashboard_rebuild/client/src/hooks/useTutorSessionMaterialBundle.ts` (new)
- `dashboard_rebuild/client/src/lib/sessionMaterialBundle.ts` (new — type +
  normalizers, no React)
- `dashboard_rebuild/client/src/pages/tutor.tsx` (wire the hook)
- `dashboard_rebuild/client/src/components/TutorShell.tsx` (forward prop)
- `dashboard_rebuild/client/src/components/studio/StudioShell.tsx` (forward
  prop, pass to workspace slot)
- `dashboard_rebuild/client/src/components/studio/StudioWorkspaceUnified.tsx`
  (accept prop)
- `dashboard_rebuild/client/src/hooks/__tests__/useTutorSessionMaterialBundle.test.ts`
  (new)

**Bundle shape (draft — confirm in review)**
```ts
type SessionMaterialBundle = {
  isReady: boolean;              // false until workflow detail loads
  sessionKey: string;            // workflow_id || tutor_session_id || "project"
  topic: string | null;
  studyUnit: string | null;
  learningObjectives: Array<{ loCode?: string; title: string; materialId?: number }>;
  concepts: Array<{ concept: string; materialId?: number; sourceTitle?: string }>;
  terms: Array<{ term: string; definition?: string; materialId?: number }>;
  summaries: Array<{ text: string; materialId?: number; sourceTitle?: string }>;
  rootExplanations: Array<{ text: string; materialId?: number; sourceTitle?: string }>;
  gaps: Array<{ gap: string; materialId?: number }>;
  tutorTurns: Array<{ id: string; question: string; answer: string }>;
  artifacts: Array<{ id: string; type: string; title?: string; content?: string }>;
  primePacket: Array<PrimePromotedWorkspaceObject>;
  polishPacket: Array<StudioPolishPromotedNote>;
  notes: Array<{ mode: "exact" | "editable"; title?: string; content: string }>;
};
```

**Priority**: Impact High / Effort Medium / **P1**

**Risk**
- L: prop-drilling through 4 components adds noise but nothing else uses
  context here — resist adding it.
- M: field-shape drift if backend priming payload changes. Mitigation:
  normalizers in `lib/sessionMaterialBundle.ts` tolerate missing fields.

**Acceptance criteria**
- [ ] `useTutorSessionMaterialBundle()` returns a `SessionMaterialBundle` by
      reading existing workflow state (no new queries).
- [ ] Unit test covers: empty workflow, priming-only, priming + tutor turns,
      all fields populated.
- [ ] Bundle flows through to `StudioWorkspaceUnified` as a prop and is
      logged once when `isReady` flips true (dev-only).
- [ ] Zero changes to any map's rendered output yet.

**Time**: S (half day)

---

## Phase 2: Mind Map — session-seeded hierarchy

**What to build**

When a user opens the Mind Map tab for the first time in a session, it
seeds with a hierarchy derived from the bundle: Topic → Learning
Objectives → Concepts → Terms. Subsequent opens keep the user's edits. A
"Refresh from session" toolbar button re-seeds (with confirm if dirty).

**End-to-end flow**
1. Bundle arrives as prop via `StudioWorkspaceUnified` → `MindMapView`.
2. First render: if `!seedKeyRef.current && bundle.isReady`, run
   `buildMindMapFromBundle(bundle)` → `setNodes` / `setEdges`, store seed
   key so we don't re-seed on re-render.
3. User edits → `isDirty` flips (already tracked).
4. "Refresh from session" button: if dirty, confirm dialog; else re-seed.
5. Switching session (sessionKey changes) resets the seed gate.

**Files to touch**
- `dashboard_rebuild/client/src/components/MindMapView.tsx`
- `dashboard_rebuild/client/src/components/studio/StudioWorkspaceUnified.tsx`
  (pass bundle to `MindMapView`)
- `dashboard_rebuild/client/src/lib/mindMapFromBundle.ts` (new — pure
  builder, testable)
- `dashboard_rebuild/client/src/lib/__tests__/mindMapFromBundle.test.ts`
  (new)

**Also** — strip the Obsidian vault-index dependency path when a bundle is
provided. Keep the old vault-seeded path as the fallback when no session is
active (Brain page still uses it).

**Priority**: Impact High / Effort Medium / **P1**

**Risk**
- M: existing Brain page consumer shouldn't regress. Mitigation: new
  `bundle` prop is optional; old path runs when `bundle` is undefined.
- L: large bundles → too many nodes. Cap at N=50 per level initially with
  a "show all" toggle (deferred).
- M: user already has a non-trivial map when they first open it? Won't
  happen on mount — `nodes=[]` initially — so safe.

**Acceptance criteria**
- [ ] Open Workflow with priming results → Mind Map tab → auto-seeds with
      topic root + LO branches + concept leaves + term leaves.
- [ ] Edit a node → click away → switch tab → return. Edits persist.
- [ ] "Refresh from session" with clean map: re-seeds silently.
- [ ] "Refresh from session" with dirty map: shows confirm dialog.
- [ ] Brain page Mind Map unchanged (vault-seeded).
- [ ] No React error #185 or render loops (keep da23e5e4 fix intact).

**Time**: M (1-2 days)

---

## Phase 3: Concept Map — session-seeded relationships

**What to build**

When a user opens the Concept Map tab for the first time in a session, it
seeds with a Mermaid graph built from the bundle: concepts as nodes,
edges derived from root_explanations + tutor turn references + priming
method outputs. Reuses the existing `externalCommand` import_mermaid path
so we don't rewrite `ConceptMapStructured`.

**End-to-end flow**
1. Bundle arrives as prop.
2. `StudioWorkspaceUnified` computes a `sessionMermaid` string via
   `buildConceptMapFromBundle(bundle)`.
3. First time the tab becomes visited AND `!seededKeyRef.current`: dispatch
   `externalCommand = { type: "import_mermaid", payload: sessionMermaid }`.
4. "Refresh from session" button in Concept Map toolbar dispatches same
   command with dirty-guard.

**Files to touch**
- `dashboard_rebuild/client/src/components/studio/StudioWorkspaceUnified.tsx`
- `dashboard_rebuild/client/src/components/ConceptMapStructured.tsx` (add
  "Refresh from session" button only; seeding stays in parent)
- `dashboard_rebuild/client/src/lib/conceptMapFromBundle.ts` (new — pure
  Mermaid builder)
- `dashboard_rebuild/client/src/lib/__tests__/conceptMapFromBundle.test.ts`
  (new)

**Design notes**
- Edge derivation rule: concept A → concept B if A appears in B's
  `root_explanation` paragraph OR if both co-occur in the same tutor turn.
  Cap edges at N=80 to keep Mermaid readable.
- Preserve the existing priming-initiated import path (`conceptMapCommand`
  from priming panel). Session-seed is a separate trigger that runs on
  tab-first-visit, not on priming completion.

**Priority**: Impact High / Effort Medium / **P1**

**Risk**
- M: two different trigger sources for `externalCommand` (priming panel,
  session seed). Mitigation: merge via a discriminated reducer with a
  single request-key counter.
- L: bad Mermaid from heuristic edges. Mitigation: validate output in the
  builder, fall back to node-only graph if validation fails.

**Acceptance criteria**
- [ ] Open session with priming results → Concept Map tab → auto-seeds with
      a readable graph.
- [ ] Priming-triggered mermaid import from the priming panel still works.
- [ ] "Refresh from session" button with dirty map prompts; with clean map
      reseeds silently.
- [ ] No regression to concept map already-in-flight features.

**Time**: M (1-2 days)

---

## Phase 4: Canvas — session-aware starter frames

**What to build**

Canvas (tldraw) already accepts `canvasObjects`. Today those come from
SourceShelf uploads and priming-result promotions. Extend so that if the
canvas is empty AND the bundle has material, we auto-add a small set of
"starter frame" tldraw shapes: one frame per LO with its title + top
concepts, laid out in a grid. User's existing shapes are never touched.

**End-to-end flow**
1. When `StudioTldrawWorkspace` mounts AND tldraw editor is ready AND
   `canvasObjects.length === 0` AND `bundle.isReady` AND
   `bundle.learningObjectives.length > 0` → create starter frames once,
   tagged with `meta: { source: "session-seed" }`.
2. User edits or adds shapes → never auto-removed.
3. "Refresh from session" button deletes only shapes with
   `meta.source === "session-seed"` before re-seeding.

**Files to touch**
- `dashboard_rebuild/client/src/components/studio/StudioTldrawWorkspace.tsx`
- `dashboard_rebuild/client/src/lib/canvasFromBundle.ts` (new)
- `dashboard_rebuild/client/src/lib/__tests__/canvasFromBundle.test.ts`
  (new — test the shape generator, not tldraw itself)

**Design notes**
- Keep the 1.4MB tldraw chunk lazy. Don't import tldraw types outside
  this module.
- Frame coordinates are deterministic grid: 3 columns, 320×240 with
  40 padding. Makes diffs review-friendly.
- User-added shapes live in a separate `meta.source === "user"` or
  unmarked space. Seed-tagged shapes never overlap user work after first
  placement.

**Priority**: Impact Medium / Effort Large / **P2** (ship after Phase 2-3
validate the pattern; Canvas is already session-ish today).

**Risk**
- H: tldraw store mutations from React effects have a history of causing
  re-entry loops. Mitigation: use a `useRef` guard, only fire inside an
  `editor.run(() => {...})` batch, and bail if `editor.store` is
  disposed.
- M: users may want different frame layouts. Keep generator pure so we can
  iterate without touching the component.
- L: PNG export at 2× scale already exists; starter frames must render
  correctly. Smoke-test during visual verification.

**Acceptance criteria**
- [ ] Empty canvas + session with LOs → starter frames appear on first
      open.
- [ ] Add a user shape → refresh session → user shape survives, only
      seed-tagged shapes replaced.
- [ ] Canvas with existing user shapes + empty LO list → no frames added.
- [ ] No increase in `index-*.js` main chunk (tldraw must stay lazy).

**Time**: L (3-4 days)

---

## Phase 5: Feature flag, rollout, and teardown

**What to build**

A narrow kill-switch in case auto-seed surprises users.

**Files to touch**
- `dashboard_rebuild/client/src/lib/featureFlags.ts` (new or existing — add
  `workspaceMapsSessionSeed`)
- Each map surface reads the flag before triggering auto-seed (manual
  "Refresh from session" still works regardless).

**Acceptance criteria**
- [ ] Setting `localStorage.workspaceMapsSessionSeed = "off"` disables
      auto-seed on next reload; manual refresh button still works.
- [ ] Default is "on" in all environments.
- [ ] 48h after Phase 4 lands, flag is removed in a cleanup commit.

**Time**: S (2-4 hours for flag, 1h for teardown)

**Priority**: Impact Low / Effort Low / **P3**

---

## Priority matrix

| Item | Impact | Effort | Priority |
|------|--------|--------|----------|
| Phase 1 — Bundle hook + plumbing | High | Medium | P1 |
| Phase 2 — Mind Map seeding | High | Medium | P1 |
| Phase 3 — Concept Map seeding | High | Medium | P1 |
| Phase 4 — Canvas starter frames | Medium | Large | P2 |
| Phase 5 — Feature flag + teardown | Low | Low | P3 |

## Risk table

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Regressing the ScrollArea/React 19 fix (da23e5e4) | Low | High | Every phase runs the Mind Map click smoke-test. |
| Bundle field drift when backend changes | Medium | Medium | Normalizers in `lib/sessionMaterialBundle.ts` tolerate missing fields; unit-tested. |
| Auto-seed overwrites user's edits | Medium | High | `isDirty` guard; seed runs once per mount; "Refresh" prompts on dirty. |
| tldraw store re-entry loops from effects | Medium | High | `useRef` gate, `editor.run()` batch, disposed-editor bail. |
| Mind Map nodes explode with large bundles | Medium | Low | Cap N=50 per level, "show all" toggle deferred. |
| Two triggers for concept-map `externalCommand` collide | Low | Medium | Single request-key counter; discriminated source. |
| Brain page Mind Map regresses (still vault-seeded) | Low | Medium | `bundle` prop optional, vault path runs when undefined. |

## Open questions (need user decision before Phase 2 starts)

1. **Bundle scope when no workflow is active** — in "Skip Setup" mode there's
   no workflow_id. Should maps remain empty (current behavior outside a
   session), or do they get a `project`-scoped bundle from the latest
   promoted Prime/Polish items? Default recommendation: empty.
2. **Mind Map caps** — is 50 children per level the right default, or
   should we show the first 20 with "show more"? Default: 50, no toggle
   initially.
3. **Canvas starter frames** — frame-per-LO or frame-per-top-concept?
   Default: per-LO (smaller frame count, clearer hierarchy).

These can be answered when Phase 2 opens; Phase 1 is safe to land first
without resolving them.

## Rollout order

1. Ship Phase 1 → verify bundle flows end-to-end via dev log.
2. Ship Phase 2 (Mind Map) → 48h soak with flag on.
3. Ship Phase 3 (Concept Map).
4. Ship Phase 4 (Canvas).
5. Ship Phase 5 teardown.

Each phase is a single PR. Do not stack phases without verifying the prior
one in the browser per the visual-verification rule in memory.
