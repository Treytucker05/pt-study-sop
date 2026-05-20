# PT Study OS — Tutor Domain

Language for the live study workspace (`/tutor`): what the learner finishes, what each stage owns, and terms that must not be overloaded.

## Language

**Study run**:
The long-lived workflow the learner keeps open until they explicitly finish it. May include multiple priming passes, multiple **Tutor** teach legs, polish passes, and optional Final Sync — not auto-closed when a single chat ends.
_Avoid_: Using “session” alone for this — see **Tutor chat session** below.

**Finish study run**:
Explicit learner action that closes the **study run** (hero-level or equivalent). Distinct from ending one **Tutor chat session** or leaving Polish.
_Avoid_: “End session” without saying which layer ended.

**Workflow**:
The persisted server record for a study run (`workflow_id`, stage, priming bundle, captured notes, polish bundle). One workflow ≈ one study run.
_Avoid_: “Project” (reserved for course-backed shell state), “plan” without qualification.

**Tutor chat session**:
The live LLM teaching instance (`tutor_session_id`, turns, chain block index, artifacts). A stage inside a **workflow**, not the whole study run.
_Avoid_: “Session” when you mean the full **study run**.

**General Q&A**:
Ad-hoc questions in the workspace anytime — no SOP chain/method contract. Lighter retrieval and rules; always-on input alongside the teach surface. Outputs are lightweight by default; the learner may **promote** a reply explicitly (promote-only handoff).
_Avoid_: “Tutor” (the teach mode), “teach session” for this path.

**Tutor** (teach mode):
The formal SOP-bound teach loop inside `/tutor`: requires scoped **study materials** and an active **method chain** (or explicit method). Block facilitation, chain advance, timer, capture-to-polish, memory capsules.
_Avoid_: “Protocol”, “protocol tutor”, “auto tutor”. The **route** `/tutor` is the page; **Tutor** is the gated teach mode on that page.

**Tutor page**:
The `/tutor` workspace shell (Floating Studio, workflow, panels). Hosts both **General Q&A** and **Tutor** teach mode.
_Avoid_: Using “Tutor” only for the page when you mean the teach mode.

**Priming**:
Pre-teach preparation stage: material scope, PRIME methods, outputs, and handoff into Tutor. Owned by Studio priming surfaces, not the chat pane itself.
_Avoid_: “Setup wizard” (legacy; Tutor is not a funnel).

**Polish**:
Post-teach review stage: organize captures, promoted tutor replies, summaries, and card requests before publish.
_Avoid_: “Edit chat” — Polish works on workflow artifacts, not raw chat UI.

**Prime packet**:
The structured context (objectives, summaries, promoted excerpts/notes) serialized into the tutor system prompt as the learner’s study packet at **Tutor chat session** start.
_Avoid_: “Context blob”, “priming output” without stage name.

**Transcript**:
The immutable full teach conversation (every user/assistant turn), stored for lookup and polish mining. Never dropped when context is compressed.
_Avoid_: “Chat history” when you mean the archival record.

**Working summary**:
A rolling compaction summary derived from the transcript. Injected into the live model context so **Tutor** stays fast when the window is full. Versioned; superseded summaries remain stored.
_Avoid_: “Compaction” alone — say **working summary** or **compaction summary**.

**Memory capsule**:
A curated workflow snapshot (summary, weak points, notes refs) for continuation and polish — may be populated from a **working summary** but is not the same as the raw **transcript**.
_Avoid_: Treating capsules as a substitute for saving full turns.

## Flagged ambiguities

| Overloaded term | Resolution |
|-----------------|------------|
| **Session** | Default means **study run** (workflow). Say **Tutor chat session** only for the live chat record. |
| **END SESSION** (hero button) | Must distinguish **end Tutor chat session**, **end teach leg**, and **finish study run** — see resolved lifecycle below. |

## Study run lifecycle (resolved)

- **Study run** stays open until **finish study run**.
- **Teach leg** = one **Tutor chat session** (`tutor_session_id`). Starting a “new session” inside the run creates a **new** teach leg; prior legs’ **transcripts** are kept, not merged into the new leg’s compaction.
- **General Q&A** may share the active teach leg’s chat session with `general`-tagged turns (see General Q&A + Tutor in one session).
- **End teach** closes the current **Tutor chat session** only; **study run** remains open.

| Action | Closes | Keeps open |
|--------|--------|------------|
| **End teach** | Current **Tutor chat session** | **Study run** |
| **New teach** | — (starts new leg) | **Study run** + prior legs’ data |
| **Finish study run** | **Study run** | — |

**Teach leg label (resolved):** Each new teach leg requires a short topic label before **Start Tutor** (polish queues, leg list, digest headers).

| Term | Meaning |
|------|---------|
| **Tutor** | On the page: either **Tutor page** (shell) or **Tutor** (teach mode). Use “teach mode” when ambiguous. |
| **Compaction** | Learner-facing: creating/updating a **working summary** while keeping the **transcript**. Not the same as token-pressure telemetry alone. |

## Compaction model (proposed — not built)

On context pressure: persist full **transcript** always; generate versioned **working summary** for the live prompt; optionally spawn polish candidates from both. Distinct from optional **memory capsule** curation step.

**Live prompt after compact (resolved):** **Working summary** + **recency tail** — the last K full turns stay in the model window; turns before that are represented only via the summary (still in **transcript** for search/polish).

## Polish handoff (resolved)

**Auto drafts, manual approve:** Compaction and/or **End Tutor** may create **editable note drafts** on the workflow from **working summary** + key transcript spans. Nothing enters the polish packet until the learner approves. Explicit promote/capture remains for high-value replies.

**Draft timing (resolved):** **Checkpoint** — one updatable in-progress digest on each compaction. **Final** — review draft when **Tutor** teach ends or learner enters Polish. Not a new note per compact.

## General Q&A + Tutor in one session (resolved)

One **Tutor chat session** per teach leg on the **workflow**. Each turn tagged `general` or `tutor`. **Transcript** is unified; **working summary** / compaction focuses on `tutor` turns (General may be excluded or a separate summary section). General replies enter polish only via explicit promote.

## Teach-mode gates (resolved)

| Mode | When | Requires |
|------|------|----------|
| **General Q&A** | Anytime — always-on input | No material/chain gate (course context optional) |
| **Tutor** (teach mode) | Explicit **Start Tutor** | At least one **study material** + (**template chain** OR **one custom method block**) |

## Tutor teach gate — chain or method (resolved)

**Option C:** No auto teach without SOP structure.

| Path | What it means |
|------|----------------|
| **Template chain** | Learner picks a saved multi-block chain (full sequence). |
| **Custom method** | Learner picks **exactly one** method block — persisted as a one-block chain at start. This is the “method” path, not a multi-block custom stack. |

_Avoid_: “Auto tutor flow” for **Tutor** teach mode. Today’s builder allows multiple custom blocks; product rule caps custom at **one method** (implementation TBD).

## Prime packet at Tutor start (resolved)

**Recommended, not required:** **Start Tutor** needs materials + chain/method. Prime packet is injected when priming/workspace promotions produced one; unprimed teach is allowed with clear UI signal.

## General Q&A handoff (resolved)

Default: no workflow capture, no automatic polish queue. Optional: explicit promote/save on a General reply (promote-only). **Tutor** teach mode remains the canonical source for captured notes, polish packet, and memory capsules.

## Teach-mode UX (resolved)

**General Q&A** is always available (lightweight input). **Tutor** teach mode is a separate **Start Tutor** path with chain bar, block advance, and workflow handoff — not a toggle labeled “protocol”.

## Example dialogue

**Learner:** “I ended my session — can I polish tomorrow?”  
**System:** “Your **study run** is still open on the **workflow**. You only closed one **Tutor chat session** — start another teach leg or open Polish on the same run. **Finish study run** when you are done for the day.”

**Learner:** “I want to study another topic in the same sitting.”  
**System:** “Keep the **study run** open. Start a new **Tutor chat session** (or re-prime) inside the same **workflow** — transcripts and drafts accumulate until you **finish study run**.”

**Learner:** “I asked a quick question in General — does that go to Polish?”  
**System:** “**General Q&A** stays lightweight unless you promote it. **Tutor** teach mode owns captures and polish handoff.”

**Learner:** “Did compaction save my notes?”  
**System:** “Compaction showed context pressure. A **memory capsule** is a separate save — activate it in Memory if you want that summary in the next **Tutor chat session** turn.”
