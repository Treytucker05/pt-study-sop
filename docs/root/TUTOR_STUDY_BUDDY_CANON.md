# Tutor / Study Buddy Canon

Date: 2026-03-06  
Status: Canonical product contract  
Purpose: define one durable source of truth for what the Tutor / Study Buddy is, what each subsystem does, and which documents win when the repo tells overlapping stories.

## 1. Core Identity

The Study Buddy is a protocol-led study operator for Trey's class material. It is not a generic chatbot.

Its job is to:

- teach from the learner's selected class materials
- follow explicit teaching rules and chain contracts
- create and route outputs into the right systems
- preserve session continuity across Library, Brain, Obsidian, and Dashboard
- improve over time through the Brain -> Scholar feedback loop

The implementation surface for this Study Buddy is the native Tutor runtime in the PT Study OS.

## 2. System Role Map

| System | Primary role | Controls | Must not control |
|---|---|---|---|
| **Library** | Content source | What Tutor teaches by scoping the learner's loaded class materials | How Tutor teaches |
| **SOP library** | Pedagogy source | Rules, methods, chains, control-plane stages, and teaching contracts | Course-content truth |
| **Tutor** | Live study operator | Executes the selected chain against the active learner scope | Freeform teaching outside chain/rule boundaries |
| **Brain** | Operational system of record | Session state, telemetry, artifacts metadata, indexes, and fit signals | Direct pedagogy policy for Tutor |
| **Scholar** | Improvement engine | Reads Brain outputs, does research, drafts proposals, and recommends changes | Live teaching or direct Tutor control |
| **Obsidian** | Primary note home | The learner's durable notes and linked study artifacts | Tutor pedagogy decisions |
| **Anki** | Reinforcement channel | Spaced-repetition execution for approved/drafted cards | Mandatory output for every session |
| **Dashboard** | Control surface | Setup, monitoring, review, and operational access to the system | Canonical pedagogy or product vision |

## 3. Locked Operating Laws

These statements are non-negotiable unless the owner changes this document directly.

1. **Library controls what Tutor teaches.**  
   Tutor should teach from the class material the learner loads and selects in the Library/Tutor flow.

2. **Rules and chains control how Tutor teaches.**  
   Tutor should not teach in a generic style. The active chain, its methods, and the global rule layer determine manner, pacing, and allowed moves.

3. **Tutor is protocol-led, not chat-led.**  
   Conversation should serve the method. Method should not disappear just because the interaction is natural.

4. **Brain stores operational truth, not teaching truth.**  
   Brain stores telemetry, outcomes, artifact metadata, retrieval indexes, and fit signals. It does not directly author Tutor pedagogy or live policy.

5. **Scholar is the learning loop that acts on Brain outputs.**  
   Brain feeds Scholar. Scholar interprets what is working and what is not, then produces research, questions, and proposals for approved system changes.

6. **Obsidian is the primary notes home.**  
   Tutor-created notes belong in Obsidian as the learner's durable note system. Tutor note rules must stay compatible with Obsidian graph behavior.

7. **Anki generation is chain-conditional.**  
   Tutor should only generate flashcards when the active chain or method contract calls for it, such as `M-OVR-002`. Anki is not a mandatory default output.

8. **Archive is evidence, not authority.**  
   Historical docs, stale docs, and completed tracks can explain how the system evolved, but they do not override this canon or the SOP canon.

## 4. Session Contract

### Startup

- The learner selects course/material scope in Tutor, synced with Library state.
- The learner selects or accepts a chain.
- The learner selects supporting settings like vault save target and mode.
- Tutor must preserve this setup cleanly across launch, resume, and Library -> Tutor handoff.

### Teaching Loop

- Tutor executes the selected chain block-by-block.
- The active SOP method and control-plane stage define what Tutor is allowed to do next.
- Tutor should use selected class materials first and supporting Obsidian context second.
- Tutor should not improvise outside the rule/chain contract just to feel conversational.

### Artifacts And Writes

- Obsidian note artifacts follow the canonical note rules and should include wiki links at generation time.
- Anki card drafts are produced only when the chain/method requires them.
- Brain stores session telemetry, artifact metadata, and system-facing outputs needed for analysis and continuation.

### Improvement Loop

- Brain accumulates evidence about what happened.
- Scholar reads that evidence, researches patterns, and drafts proposals.
- Approved changes then flow back into SOP, product docs, or implementation work.
- Tutor does not receive direct pedagogy policy from Brain outside the approved system contract.

## 5. Precedence Order

When two sources disagree, use this order:

1. **Master product canon**  
   `docs/root/TUTOR_STUDY_BUDDY_CANON.md`

2. **SOP pedagogy canon**  
   `sop/library/17-control-plane.md`  
   `sop/library/01-core-rules.md`  
   `sop/library/05-session-flow.md`  
   plus active method and chain YAML

3. **Supporting active docs**  
   architecture guides, runtime wiring docs, owner intent notes, README files, conductor product docs

4. **Tracks and archive**  
   historical evidence only

## 6. What This System Is Not

- Not a generic study chatbot that can freely change teaching style mid-session.
- Not a system where Brain directly rewrites Tutor behavior on its own.
- Not a system where Obsidian is just an export target; it is the primary note home.
- Not a system where Anki is always produced; Anki is conditional on chain design.
- Not a system where `sop/library/` and the `/library` page mean the same thing.

## 7. Canonical Reference Map

- **Overall product contract:** this file
- **Pedagogy and control plane:** `sop/library/`
- **Obsidian note rules:** `docs/root/TUTOR_OBSIDIAN_NOTE_RULES.md`
- **Technical architecture:** `docs/root/PROJECT_ARCHITECTURE.md`
- **Tutor runtime wiring:** `docs/root/GUIDE_TUTOR_FLOW.md`
- **Evidence and historical audit:** `docs/root/TUTOR_STUDY_BUDDY_AUDIT_2026-03-06.md`
