# Trey's Study System Canon

Date: 2026-03-12
Status: Canonical product contract
Authority: this is the only file allowed to define product/page ownership, route hierarchy, subsystem roles, and source-of-truth order for this repo. If another active doc disagrees, that other doc is wrong and must be corrected or archived.

## 1. Core Identity

Trey's Study System is a personal 3-part study program for one student:

- **Brain** is the home/dashboard and learner-model engine.
- **Scholar** is the system-facing investigation and improvement console.
- **Tutor** is the live study workspace and protocol executor.

The system is not a generic chatbot, not an institution platform, and not a set of equal peer pages fighting for center stage. Brain is where the learner lands. Tutor is where the learner does the work. Scholar is where the system investigates friction and proposes improvements. Support pages exist to feed those three roles rather than compete with them.

## 2. Ownership Matrix

| Surface | Owns | Must not own |
|---|---|---|
| **Brain** | Home/dashboard, learner profile, telemetry view, mastery view, next-action framing, support-system launch points | Public notes/canvas/graph/table/data workspace sprawl, direct pedagogy control |
| **Tutor** | Session launch, active study workspace, notes, canvas, graph, table, artifacts, restore/resume, structured teaching flow | Generic dashboard behavior, unbounded off-protocol teaching |
| **Scholar** | Investigations, focused learner questions when blocked, findings, bounded strategy proposals, system research | Live course teaching, direct Tutor control, replacing Brain home |
| **Library** | What Tutor can teach through material scope and content readiness | How Tutor teaches |
| **SOP library** | How Tutor teaches through methods, chains, stages, and rules | Course-content truth |
| **Calendar** | Time pressure, obligations, study timing support | Tutor pedagogy or learner-model authority |
| **Mastery** | Detailed skill-state support view fed by Brain/Tutor evidence | Independent teaching flow |
| **Methods** | Support view into Tutor's method and chain configuration | Product ownership or learner home |
| **Vault Health** | Support diagnostics for the Obsidian knowledge base | Tutor teaching behavior |
| **Operator-only tools** | Raw data/admin/debug surfaces | Public shell ownership |

Locked rule: Brain public modes are `home` and `profile`. Tutor owns the public study-workspace tools previously scattered across Brain.

## 3. Route Matrix

| Route | Public meaning | Notes |
|---|---|---|
| `/` | Brain home | Canonical landing route |
| `/brain` | Brain home alias | Compatibility alias; same home surface as `/` |
| `/tutor` | Tutor live workspace | Primary execution surface |
| `/scholar` | Scholar investigation console | System-facing research surface |
| `/calendar` | Calendar support system | Support page |
| `/library` | Library support system | Support page |
| `/mastery` | Mastery support system | Support page |
| `/methods` | Methods support system | Support page |
| `/vault-health` | Vault Health support system | Support page |

There is no separate peer Dashboard route in the product. Dashboard behavior lives inside Brain.

## 4. Locked Operating Laws

1. **Tutor is the bread-and-butter product value.** When priorities conflict, optimize the live study experience first.
2. **Brain is the canonical home surface.** The learner starts there and sees what needs attention there.
3. **Brain-owned Library controls what Tutor teaches.** Tutor teaches from the learner's selected class materials.
4. **SOP controls how Tutor teaches.** Tutor is protocol-led, not generic-chat-led.
5. **Tutor owns the active study workspace.** Notes, canvas, graph, table, and session artifacts belong under Tutor's public workflow.
6. **Brain stays evidence-first.** Learner-model claims must be grounded in telemetry, evidence, confidence, freshness, and contradiction handling.
7. **Scholar is system-facing.** Scholar investigates, questions, researches, and proposes; it does not become the course-content teacher.
8. **Brain does not directly steer Tutor.** Any live adaptation must pass through bounded Scholar mediation with provenance.
9. **Obsidian is the durable notes home.** Tutor outputs must remain compatible with Obsidian behavior.
10. **Archive is evidence, not authority.** Historical docs may explain how the system evolved, but they do not override this file.

## 5. Session Contract

### Startup

- The learner selects course/material scope in Tutor, synchronized with Library state.
- Tutor carries the active scope, chain/method context, and any bounded Scholar strategy snapshot into the session.
- Launch, resume, and Brain/Library handoff must preserve that context intentionally.

### Teaching Loop

- Tutor executes the selected chain block-by-block.
- The active SOP method and control-plane stage define what Tutor may do next.
- Tutor uses selected class materials first and supporting Obsidian context second.
- Brain observes and records. Scholar does not replace Tutor inside the teaching loop.

### Artifacts And Writes

- Tutor owns live notes, canvas/graph/table work surfaces, and session artifacts.
- Durable note artifacts land in Obsidian using the note rules.
- Brain stores telemetry, evidence, mastery effects, and continuation data.
- Anki output is chain-conditional, not mandatory.

### Improvement Loop

- Brain accumulates evidence.
- Scholar interprets that evidence, asks focused questions when needed, performs cited research, and drafts bounded findings or proposals.
- Approved improvements flow back into SOP, product docs, or implementation work.

## 6. Document Authority Matrix

| Class | Meaning | Allowed examples |
|---|---|---|
| **Canonical** | May define product/page ownership and precedence | `docs/root/TUTOR_STUDY_BUDDY_CANON.md` |
| **Execution-only** | May track tasks, status, and implementation sequencing, but may not redefine the product | `docs/root/TUTOR_TODO.md`, `conductor/tracks.md`, `conductor/workflow.md`, track plans/logs |
| **Reference-only** | May explain architecture, runtime, runbooks, or UX, but must defer to the canon for ownership and product meaning | `docs/root/PROJECT_ARCHITECTURE.md`, `docs/root/GUIDE_ARCHITECTURE.md`, `docs/root/GUIDE_DEV.md`, frontend READMEs |
| **Historical** | Preserved evidence of prior states; never authority | `docs/archive/**`, superseded track artifacts, stale audits |

## 7. Precedence Order

When sources disagree, use this order:

1. **Master product canon**
   `docs/root/TUTOR_STUDY_BUDDY_CANON.md`
2. **SOP pedagogy canon**
   `sop/library/17-control-plane.md`, `sop/library/01-core-rules.md`, `sop/library/05-session-flow.md`, and active method/chain YAML
3. **Execution-only and reference docs**
   `docs/root/TUTOR_TODO.md`, architecture guides, runbooks, READMEs, conductor execution docs
4. **Tracks and archive**
   historical evidence only

## 8. What This System Is Not

- Not a generic study chatbot that freely changes teaching style mid-session.
- Not a product where Brain directly rewrites Tutor behavior.
- Not a product where Scholar is the live course-content teacher.
- Not a public shell where raw data/admin tools compete with learner-facing surfaces.
- Not a product with a separate peer Dashboard page.
- Not an institution/admin platform pretending to be the core product.

## 9. Canonical Reference Map

- **Product and ownership authority:** this file
- **Pedagogy and control plane:** `sop/library/`
- **Execution queue:** `docs/root/TUTOR_TODO.md`
- **Technical architecture:** `docs/root/PROJECT_ARCHITECTURE.md`
- **Run/build/test workflow:** `docs/root/GUIDE_DEV.md`
- **Historical evidence:** `docs/archive/` and completed track artifacts
