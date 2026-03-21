# Tutor Guided Studyability Issue Log

Use this file during guided study passes.

## Entry schema

- `ID`:
- `Stage`: `Launch` | `Priming` | `Tutor` | `Polish` | `Final Sync` | `Cross-stage`
- `Type`: `bug` | `missing feature` | `partial feature` | `bad default` | `confusing UX` | `workflow break` | `polish` | `new desired capability`
- `Severity`: `P1` | `P2` | `P3`
- `Feature ID`:
- `Repro`:
- `Expected behavior`:
- `Actual behavior`:
- `Study impact`:
- `What the learner liked / disliked`:
- `Workaround`:
- `Likely owner`: `frontend` | `backend` | `prompt/runtime` | `SOP/canon` | `multi-surface`
- `Status`: `new` | `triaged` | `backlogged`

## Severity rules

- `P1`: blocks or breaks real studying
- `P2`: study is possible, but the flow is rough, misleading, or workaround-heavy
- `P3`: annoyance, visual debt, or lower-priority roughness

## Entries

#### TGSL-LA-001
- Stage: Launch
- Type: confusing UX
- Severity: P2
- Feature ID: F-LA-001, F-LA-003
- Repro: Open `/tutor`, land on the launch screen, and judge the screen before relying on prior familiarity. Use `Start New` as the obvious forward action.
- Expected behavior: The first Tutor launch page should feel obvious, intuitive, and clearly oriented around the next study action even for a user who is not relying on memory of prior use.
- Actual behavior: The learner reported that the first page was not obvious or intuitive and rated the overall design/setup `2/10`, even though `Recent workflows` drew first attention and `Start New` was clear enough to click. The top-of-page Tutor area was hard to read and did not stand out well enough to orient the page.
- Study impact: The entry surface creates low confidence and weak orientation at the very start of a study session. It may still be usable, but it does not feel smooth or trustworthy.
- What the learner liked / disliked: Liked that `Recent workflows` drew attention and `Start New` was actionable. Disliked the overall design and setup quality of the launch surface.
- Workaround: Prior familiarity with the screen.
- Likely owner: frontend
- Status: triaged
- Implementation update (2026-03-21): the live `TutorWorkflowLaunchHub` surface now has a dedicated HUD-style visual pass with sharper illuminated panels, higher-contrast typography, red-accent primary actions, instrument-style filters, and a darker workflow table while preserving the exact layout, navigation, and actions. Needs learner retest for whether the Launch page now feels materially more trustworthy and legible.

#### TGSL-LA-002
- Stage: Launch
- Type: workflow break
- Severity: P2
- Feature ID: F-LA-001, F-LA-003, F-CR-001
- Repro: Open `/tutor` and evaluate how the launch surface presents navigation and next-step choices before entering study flow.
- Expected behavior: Launch should present one clear forward path with one coherent workflow model.
- Actual behavior: The learner reported too many choices on the launch page and called out mixed signals: the page shows the staged workflow (`Priming`, `Tutor`, `Polish`, `Final Sync`) while also presenting another set of action buttons underneath, making the page feel like it has a dual track instead of one clear flow.
- Study impact: The learner has to interpret competing navigation models before even beginning study work, which increases hesitation and makes the start of the session feel messy.
- What the learner liked / disliked: Disliked the number of choices and the conflicting workflow cues. No positive signal yet beyond the ability to click `Start New`.
- Workaround: Ignore part of the page and continue based on memory.
- Likely owner: frontend
- Status: triaged
- Implementation update (2026-03-21 surface-first follow-up): the competing top-of-page workflow rail was removed entirely. Tutor now uses one global surface nav (`Launch`, `Tutor`, `Studio`, `Schedule`, `Settings`), `Launch` acts as the workflow inbox/home, and opening a workflow routes straight into the correct owned surface (`Studio > Priming`, `Tutor`, `Studio > Polish`, or `Studio > Final Sync`) instead of reviving a second dashboard-style stage system. Legacy `mode=dashboard` restore/query state still normalizes back to `Launch`. Needs live learner retest for whether the entry surface now reads as one coherent model.
- Implementation update (2026-03-21 Studio hardening): `Studio` now opens on a real `Home` surface with next-step CTA priority, clear card-level gating, and embedded workbench access instead of dropping the learner into a contextless workbench. Explicit workflow opens now hold on their owned Studio surface instead of being hijacked by project-shell restore, so `Open Polish in Studio` and `Open Final Sync` stay where the learner expects. Needs learner retest for whether the top-level workflow model now feels fully trustworthy.

#### TGSL-PR-001
- Stage: Priming
- Type: bad default
- Severity: P2
- Feature ID: F-PR-005, F-PR-007
- Repro: Enter `Priming`, review the stage flow, and look for method/chain controls before running extraction.
- Expected behavior: Priming should expose method/chain selection at the point where the learner is deciding how to prime the material, before or alongside the extraction action.
- Actual behavior: Priming currently presents a top-level `Extract PRIME` button above the source viewer, while method/chain controls are pushed down into `Advanced Prime Controls` at the very end with no selections visible. The learner expected to choose the method or chain before extraction and found the current control placement off.
- Study impact: The extraction action feels premature and under-explained, which weakens trust in what PRIME is about to do.
- What the learner liked / disliked: Liked that the stage order is at least sensible (`Setup` -> `Materials in scope` -> `Source viewer`). Disliked the hidden/demoted method-chain controls and the action-first extraction placement.
- Workaround: Ignore method/chain choice and just click `Extract PRIME`.
- Likely owner: frontend
- Status: triaged
- Implementation update (2026-03-21): the live Priming chain selector was removed, Priming method selection moved into the `Prime Artifact Workspace` as multi-select method cards, the main `Extract PRIME` action now lives in that workspace instead of the source viewer, the Priming page now loads real PRIME methods from the Methods API rather than a synthetic local picker, extraction runs only the selected stable `M-PRE-*` methods, and the workspace renders selected-method output cards instead of the old fixed artifact-tab bundle. Needs live retest for smoothness, clarity, and output quality.
- Implementation update (2026-03-21 follow-up): the workspace now renders nothing below the PRIME method cards until at least one method is selected, then reveals a selected-method window area with the main `Extract PRIME` action plus one method-owned panel per selected method. This directly addresses the learner complaint that generic PRIME info and artifact surfaces were appearing before any method had been chosen.
- Implementation update (2026-03-21 Studio hardening): Priming is now a five-step flow (`Setup`, `Materials`, `PRIME Methods`, `Outputs`, `Tutor Handoff`) with persistent step navigation, focus movement on step change, inline blocker text, and a side-by-side source viewer instead of one long stacked page. Studio can now enter Priming directly even without an existing workflow, and the bootstrap preserves current course/material context instead of blanking the setup state during hydration. Needs learner retest for whether the step flow now feels direct enough to use without guessing.

#### TGSL-PR-002
- Stage: Priming
- Type: confusing UX
- Severity: P2
- Feature ID: F-PR-001, F-PR-002, F-PR-003
- Repro: Enter `Priming`, pick a class, open a scoped material, and review the full Priming surface after extraction.
- Expected behavior: Priming should feel readable and visually trustworthy while reviewing source material and extracted artifacts.
- Actual behavior: The learner described the stage as bland overall, with small text, weak text color/contrast, and hard-to-read typography across the viewer, artifact workspace, and handoff surfaces.
- Study impact: Even when the flow works, the stage feels low-trust and tiring to read, which makes artifact review feel worse than it should.
- What the learner liked / disliked: Liked that the stage is in a more logical order than Launch and that the previously loaded file appeared under `Materials in Scope`. Disliked the weak readability and overall bland visual treatment.
- Workaround: Read more slowly and rely on prior familiarity.
- Likely owner: frontend
- Status: triaged
- Implementation update (2026-03-21 follow-up): extracted and existing learning objectives on the Priming page now render as structured objective cards with numbering, better title emphasis, and LO-code badges when present, instead of plain raw line text. This keeps the extraction contract structured while addressing the readability complaint without asking the LLM to invent UI formatting.

#### TGSL-PR-003
- Stage: Priming
- Type: partial feature
- Severity: P2
- Feature ID: F-PR-003, F-PR-004
- Repro: Run `Extract PRIME` on a scoped material and compare the artifact outputs inside the `Prime Artifact Workspace` and `Source-Linked Extraction` sections.
- Expected behavior: PRIME extraction should produce a coherent artifact bundle with consistent objective coverage, a visible hierarchical map, readable terms/spine formatting, and trustworthy summary output.
- Actual behavior: Extraction produced objective candidates, key terms, study spine, and a summary, but the outputs felt uneven. `Source-Linked Extraction` showed only `7` of `14` learning objectives, the `Hierarchical Map` printed nothing, key terms and study spine were hard to read, and the learner was unsure whether the study spine was actually good. The summary worked and was formatted, but it looked like it might just summarize each card rather than provide stronger synthesis.
- Study impact: PRIME technically runs, but the learner cannot fully trust or comfortably evaluate the output quality, which weakens the handoff into Tutor.
- What the learner liked / disliked: Liked that objective candidates, terms, study spine, and summary did populate. Disliked the uneven quality, blank hierarchy output, and partial objective coverage.
- Workaround: Manually infer quality from whatever artifacts did populate.
- Likely owner: multi-surface
- Status: triaged
- Implementation update (2026-03-21 follow-up): the live Priming contract now separates `selected methods for the next extract` from `already extracted PRIME methods` on the currently scoped materials, and backend Priming assist now merges new per-material `method_outputs` by `method_id` instead of overwriting prior method runs. Existing study-unit objectives were also moved out of the selected-method window area so they no longer read like part of the next extraction request. Needs learner retest for whether the split is now obvious enough in real use.
- Implementation update (2026-03-21 reasoning hardening): PRIME extraction now uses the richer SOP method logic in the LLM prompt instead of just a short method description plus JSON shape, feeds prior extracted outputs for the selected methods back into reruns as stabilization context, and covers long materials chunk-by-chunk with an LLM consolidation pass instead of truncating to the first `12000` characters. Needs learner retest for whether objective counts and other outputs now feel materially more stable across reruns.
- Implementation update (2026-03-21 objective-anchor follow-up): for `M-PRE-010`, backend Priming assist now detects explicit `## Learning objectives` sections already present in the stored material text, feeds the full source-visible objective list into the prompt as a hard anchor, and applies that explicit list back onto the final objective output so visible slide objectives are preserved instead of silently collapsing from `14` down to `9`. Needs learner retest on the Cardiovascular packet to confirm the live objective window now shows all `14` source objectives.

#### TGSL-PR-004
- Stage: Priming
- Type: partial feature
- Severity: P2
- Feature ID: F-PR-006
- Repro: Review the `Tutor Handoff` and handoff notes sections after running PRIME extraction.
- Expected behavior: Tutor handoff should provide clearly formatted notes plus a meaningful Tutor strategy or at least enough guided handoff information to justify the stage.
- Actual behavior: `Tutor Handoff` showed as ready and checked off, but handoff notes contained unformatted open questions, no Tutor strategy, and only minimal useful handoff content.
- Study impact: The stage says it is ready, but the handoff does not yet feel rich enough to support a confident transition into Tutor.
- What the learner liked / disliked: Liked that readiness is surfaced. Disliked the minimal content, lack of formatting, and missing Tutor strategy.
- Workaround: Move on without relying on the handoff notes.
- Likely owner: multi-surface
- Status: triaged

#### TGSL-PR-005
- Stage: Priming
- Type: workflow break
- Severity: P1
- Feature ID: F-PR-006, F-TU-001
- Repro: Complete the visible Priming flow, then click `SAVE DRAFT`, `MARK READY`, and `START TUTOR SESSION` from the handoff area.
- Expected behavior: If Priming says the handoff is ready, `Mark Ready` and `Start Tutor` should either move into Tutor or clearly explain the exact missing launch requirement inline on the same screen.
- Actual behavior: The learner clicked `Start Tutor` and nothing visibly happened. `Save Draft` and `Mark Ready` also did not appear to advance the flow. Current code shows that Priming readiness does not match Tutor preflight, and launch blockers are mainly surfaced through toast behavior instead of the handoff UI.
- Study impact: This is a real session blocker. The learner cannot trust the handoff state or get into actual study even after doing the visible Priming work.
- What the learner liked / disliked: Disliked that the buttons felt dead and that the stage appeared ready without actually transitioning.
- Workaround: None discovered during the guided pass.
- Likely owner: multi-surface
- Status: triaged
- Implementation update (2026-03-21): Tutor launch blockers are now surfaced inline, the handoff buttons disable when launch is not actually ready, and Priming saves extracted objectives into the handoff bundle for Tutor preflight. Needs live retest from Priming into Tutor.

#### TGSL-PR-006
- Stage: Priming
- Type: confusing UX
- Severity: P2
- Feature ID: F-PR-001, F-PR-006
- Repro: Enter `Priming`, review what the page appears to require to get into Tutor, and compare the first setup window against the actual readiness and preflight contract.
- Expected behavior: The first Priming window should clearly surface the real Tutor launch contract so the learner can see class, study unit, scope, materials, and launch blockers together before trying to start Tutor.
- Actual behavior: The first setup window is mostly class/material setup, while the actual Tutor handoff contract is split across lower page sections and backend preflight logic. The learner explicitly asked to get all of that together on the first window with the class selection.
- Study impact: The learner cannot easily tell what Priming still needs before Tutor will actually start, which makes the stage feel scattered and lowers trust in the handoff flow.
- What the learner liked / disliked: Disliked having the launch-critical requirements separated from the first setup window. Wanted the first window to own the real go-to-Tutor setup contract.
- Workaround: Scroll through the page and infer the launch contract from scattered readiness and blocker messaging.
- Likely owner: frontend
- Status: triaged
- Implementation update (2026-03-21): the first `Setup` window now owns class, study unit, topic, materials, the live Tutor launch contract, and visible preflight blockers. Needs learner retest for whether the first window now feels like the real launch contract.

#### TGSL-PR-007
- Stage: Priming
- Type: bad default
- Severity: P2
- Feature ID: F-PR-001, F-PR-003
- Repro: Review the first Priming setup window after class selection and compare the visible setup fields against what PRIME already derives from the selected study unit and source files.
- Expected behavior: Priming should not make the learner manage a redundant objective-scope / focus-objective mode when learning objectives are already resolved from the selected study unit and extracted from the chosen files.
- Actual behavior: Priming currently shows `Objective Scope` and `Focus Objective`, even though the learner expects objectives to be pulled from the study unit and file-derived extraction. The learner called the extra narrowing controls redundant and wanted them removed.
- Study impact: The page asks for one more setup decision than the learner needs, which adds noise and makes the setup contract feel heavier than it should.
- What the learner liked / disliked: Disliked the extra narrowing controls and saw them as legacy baggage from an older workflow.

#### TGSL-CR-001
- Stage: Cross-stage
- Type: workflow break
- Severity: P1
- Feature ID: F-ST-001, F-PR-001, F-CR-001
- Repro: Open `/tutor`, enter `Studio` from the global surface nav or a stored Studio restore path, and try to continue the normal prep flow from there without going back through Launch.
- Expected behavior: Generic Studio entry should land on a clear Studio Home with an obvious next action, and `Priming` should stay directly enterable even when no workflow is already active.
- Actual behavior: Studio currently lands on a workbench-first surface that feels like a dead end, while the local `Priming` tab is disabled when there is no active workflow id. The learner called out that the flow needs to be re-thought, does not route intuitively, and that Priming is not available to click to work on.
- Study impact: This blocks real prep work from Studio itself and forces the learner to rely on memory or bounce back through Launch instead of trusting the surface they are already in.
- What the learner liked / disliked: Disliked the counterintuitive button model, the lack of a real Studio landing surface, and the dead Priming entry state.
- Workaround: Go back to Launch and open a workflow there first, or rely on prior familiarity with which surface owns which action.
- Likely owner: frontend
- Status: triaged
- Workaround: Ignore the controls and continue with the default whole-unit path.
- Likely owner: frontend
- Status: triaged
- Implementation update (2026-03-21): `Objective Scope` and `Focus Objective` were removed from the live Priming UI, hidden stale `single_focus` state is normalized back to `module_all`, and objective readiness now keys off study-unit objectives or extracted file objectives instead of a separate narrowing mode.

#### TGSL-TU-001
- Stage: Tutor
- Type: confusing UX
- Severity: P2
- Feature ID: F-TU-003, F-CR-001
- Repro: Open `/tutor` with a live Tutor session and try to move backward or forward through the workflow from the top of the page.
- Expected behavior: The main Tutor workflow navigation should be immediately visible at the top of the page, use one coherent stage story, and expose obvious previous/next movement without forcing the learner to scroll through runtime diagnostics first.
- Actual behavior: The learner reported that moving forward and back was busted. On the live Tutor page, the most prominent block was the large TEACH runtime diagnostics rail, while workflow navigation cues were weak, mixed, or pushed below that runtime surface. This made the route through `Launch -> Priming -> Tutor -> Polish -> Final Sync` feel hidden instead of guided.
- Study impact: The learner loses orientation once a live session is open and has to hunt for how to get back to workflow stages or move on to the next stage, which increases friction during actual studying.
- What the learner liked / disliked: Disliked the busted feel of stage movement and the fact that navigation was not obvious from the top of the Tutor screen.
- Workaround: Scroll, rely on memory, or use scattered local buttons deeper in the page.
- Likely owner: frontend
- Status: triaged
- Implementation update (2026-03-21): promoted workflow navigation to the top of `TutorTopBar`, split the old mixed navigation into a primary workflow navigator plus a smaller workspace nav row, added explicit previous/next stage controls in `TutorWorkflowStepper.tsx`, added a top-level `WORKFLOW` return action in `TutorTabBar.tsx`, and removed the need to scroll past the large runtime diagnostics block just to find stage navigation. Needs learner retest on the live Tutor page.
- Implementation update (2026-03-21 follow-up): fixed a brittle render gate in `TutorWorkflowStepper.tsx` so the navigator no longer disappears just because `activeWorkflowId` is temporarily missing during live Tutor mode. The stepper now stays visible whenever there is real workflow/session context such as active Tutor mode, current stage, active session, or Polish state. Needs live learner retest for whether the navigator now stays stable across Tutor transitions and rerenders.
- Implementation update (2026-03-21 surface-first follow-up): the earlier top-bar stepper approach was superseded by the surface-first IA. `TutorTopBar` now keeps only the global surface nav plus read-only workflow context badges, while `Studio` owns the workflow sub-tabs (`Workbench`, `Priming`, `Polish`, `Final Sync`) and Tutor keeps only live-session execution plus contextual handoff actions like `Open Polish`. This removes the second global navigation system that was making movement feel busted even after the stepper fix. Needs live learner retest for whether Tutor now feels orientation-safe without competing stage rails.

### Copy/paste template

```md
#### ISSUE-ID
- Stage:
- Type:
- Severity:
- Feature ID:
- Repro:
- Expected behavior:
- Actual behavior:
- Study impact:
- What the learner liked / disliked:
- Workaround:
- Likely owner:
- Status:
```
