# Trey’s Study System / Study Buddy Canon

Date: 2026-03-11
Status: Canonical product contract
Purpose: define one durable source of truth for what Trey’s Study System is, what each subsystem does, and which documents win when the repo tells overlapping stories.

## 1. Core Identity

Trey’s Study System is a 3-part learning system:

- **Brain** = learner-model engine
- **Scholar** = direct research partner
- **Tutor** = live protocol-led teacher

It is not a generic chatbot. It is a learning system built to:

- identify how the learner learns best
- teach from the learner's selected class materials
- follow explicit teaching rules and chain contracts
- create and route outputs into the right systems
- preserve session continuity across Library, Brain, Obsidian, and Dashboard
- improve over time through the Brain -> Scholar -> Tutor loop

The implementation surface for live teaching is the native Tutor runtime in the PT Study OS. Brain and Scholar are separate systems with separate responsibilities.

## 2. System Role Map

| System | Primary role | Controls | Must not control |
|---|---|---|---|
| **Library** | Content source | What Tutor teaches by scoping the learner's loaded class materials | How Tutor teaches |
| **SOP library** | Pedagogy source | Rules, methods, chains, control-plane stages, and teaching contracts | Course-content truth |
| **Brain** | Learner-model engine | Telemetry, learner-profile claims, mastery/fit signals, evidence snapshots, visible archetypes | Direct pedagogy policy for Tutor |
| **Scholar** | Research and strategy layer | Learner questions, cited research, investigations, bounded strategy recommendations, improvement proposals | Live course-content teaching or unbounded Tutor control |
| **Tutor** | Live study operator | Executes the selected chain against the active learner scope and active strategy envelope | Freeform teaching outside chain/rule boundaries |
| **Obsidian** | Primary note home | The learner's durable notes and linked study artifacts | Tutor pedagogy decisions |
| **Anki** | Reinforcement channel | Spaced-repetition execution for approved/drafted cards | Mandatory output for every session |
| **Dashboard / Shell** | Control surface | Setup, monitoring, review, and operational access to the system | Canonical pedagogy or product vision |

## 3. Locked Operating Laws

These statements are non-negotiable unless the owner changes this document directly.

1. **Library controls what Tutor teaches.**
   Tutor teaches from the class material the learner loads and selects in the Library/Tutor flow.

2. **Rules and chains control how Tutor teaches.**
   Tutor does not teach in a generic style. The active chain, its methods, and the global rule layer determine manner, pacing, and allowed moves.

3. **Tutor is protocol-led, not chat-led.**
   Conversation serves the method. Method does not disappear just because the interaction is natural.

4. **Brain is the learner-model engine.**
   Brain stores telemetry, outcomes, artifact metadata, retrieval indexes, and fit signals. Brain also builds learner-profile claims and visible hybrid archetypes that explain how the learner appears to learn best.

5. **Brain must stay evidence-first.**
   Brain claims must be grounded in telemetry, evidence, confidence, freshness, and contradiction handling. Brain is not allowed to invent certainty.

6. **Scholar is a direct research partner.**
   Scholar interprets Brain evidence, asks the learner focused questions when needed, performs cited research, and produces findings, strategy proposals, and approved-change recommendations.

7. **Scholar does not teach course content.**
   Scholar may explain what it is researching and why, but Tutor remains the only live teaching engine for course content.

8. **Brain does not directly steer Tutor.**
   Any adaptation to Tutor must pass through a bounded Scholar strategy envelope with explicit provenance.

9. **Obsidian is the primary notes home.**
   Tutor-created notes belong in Obsidian as the learner's durable note system. Tutor note rules must stay compatible with Obsidian graph behavior.

10. **Anki generation is chain-conditional.**
    Tutor only generates flashcards when the active chain or method contract calls for it, such as `M-OVR-002`. Anki is not a mandatory default output.

11. **Archive is evidence, not authority.**
    Historical docs, stale docs, and completed tracks can explain how the system evolved, but they do not override this canon or the SOP canon.

## 4. Session Contract

### Startup

- The learner selects course/material scope in Tutor, synced with Library state.
- The learner selects or accepts a chain.
- The learner selects supporting settings like vault save target and mode.
- Tutor receives the relevant learner evidence snapshot from Brain and any bounded active strategy snapshot from Scholar.
- Tutor preserves this setup cleanly across launch, resume, and Library -> Tutor handoff.

### Teaching Loop

- Tutor executes the selected chain block-by-block.
- The active SOP method and control-plane stage define what Tutor is allowed to do next.
- Tutor uses selected class materials first and supporting Obsidian context second.
- Tutor does not improvise outside the rule/chain contract just to feel conversational.
- Brain observes what happens. Scholar does not replace Tutor inside the teaching loop.

### Artifacts And Writes

- Obsidian note artifacts follow the canonical note rules and should include wiki links at generation time.
- Anki card drafts are produced only when the chain/method requires them.
- Brain stores session telemetry, artifact metadata, and system-facing outputs needed for analysis and continuation.

### Improvement Loop

- Brain accumulates evidence about what happened and updates the learner model.
- Scholar reads that evidence, asks the learner clarifying questions when needed, researches patterns, and drafts bounded findings or proposals.
- Approved changes then flow back into SOP, product docs, or implementation work.
- Tutor does not receive direct pedagogy policy from Brain outside the approved Brain -> Scholar -> Tutor contract.

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
- Not a system where Scholar is only a passive auditor with no learner-facing research role.
- Not a system where Obsidian is just an export target; it is the primary note home.
- Not a system where Anki is always produced; Anki is conditional on chain design.
- Not a system where `sop/library/` and the `/library` page mean the same thing.

## 7. Canonical Reference Map

- **Overall product contract:** this file
- **Pedagogy and control plane:** `sop/library/`
- **Owner-specific lock-ins:** `docs/root/TUTOR_OWNER_INTENT.md`
- **Technical architecture:** `docs/root/PROJECT_ARCHITECTURE.md`
- **Tutor runtime wiring:** `docs/root/GUIDE_TUTOR_FLOW.md`
- **Current roadmap of record:** `conductor/tracks/brain-scholar-tutor-realignment_20260311/`
- **Evidence and historical audit:** `docs/root/TUTOR_STUDY_BUDDY_AUDIT_2026-03-06.md`
