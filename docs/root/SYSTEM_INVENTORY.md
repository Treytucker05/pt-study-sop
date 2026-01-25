# SYSTEM_INVENTORY.md

## 1. The Engines (Content Models)
- **Anatomy Engine / Anatomy Learning Engine** — Bone-first anatomy flow (BONES → LANDMARKS → ATTACHMENTS → ACTIONS → NERVES → ARTERIAL/CLINICAL), visual-first landmarks, rollback rule, and arterial supply addition in v9.2.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L631-L706】【F:v9.2/CHANGELOG.md†L15-L24】
- **Concept Engine** — Default non-anatomy flow: definition/identity → context (H1 map) → mechanism → differentiation/boundary → application, with wait–generate–validate protocol.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L675-L705】
- **Recap Engine** — Structured recap/exam wrapper noted for further research and workflow support.【F:v9.2/RESEARCH_TOPICS.md†L43-L46】
- **Study Engine (SOP Runner)** — Orchestration engine enforcing MAP→LOOP→WRAP, Seed-Lock, and gating over RAG outputs with session logging.【F:v9.2/MASTER_PLAN_PT_STUDY.md†L33-L39】
- **Legacy/Implied Engines** — Version history references pre-v9 foundations (MAP/LOOP/WRAP) but no explicit named legacy engines beyond these; no Diagnosis/Case Engine labels surfaced.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L440-L449】

## 2. The Frameworks (Mental Models)
- **H-Series (Hierarchy)**: H1 System (System → Subsystem → Component → Element → Cue); H2 Anatomy (Structure → Function → Behavior → Outcome); H3 Load Stack; H4 Bloom’s Depth; H5 ICAP Engagement; H6 Bruner Modes; H7 Narrative (Hook → Context → Conflict → Resolution); H8 Prompt Frame.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L712-L749】【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L738-L744】
- **M-Series (Logic)**: M2 Trigger (default cause-effect); M6 Homeostasis; M8 Diagnosis (Cause → Mechanism → Sign → Test → Confirmation); M-SRL (Forethought → Performance → Reflection); M-ADDIE; M-STAR.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L754-L781】
- **Y-Series (Context)**: Y1 Generalist; Y2 Load/Stress; Y3 Compensate; Y4 Signal.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L792-L808】

## 3. The Mechanisms (The “Laws”)
- **Seed-Lock** — User must supply analogies; reinforced with resonance confirmation in v9.2; originally enforced in v8.5.1.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L11-L17】【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L343-L347】【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L430-L446】
- **Phonetic Override** — Ask “What does this sound like?” before defining unfamiliar terms; added in v8.6.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L13-L17】【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L446-L447】
- **Gated Platter** — Provide raw metaphor for user to edit if no Seed; introduced in v8.6.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L15-L17】【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L347-L353】【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L446-L447】
- **Source-Lock** — Require explicit session sources; added in v9.1.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L188-L232】【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L430-L444】
- **Planning Phase** — No teaching until goals, sources, and plan are set (M0); formalized in v9.1.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L11-L12】【F:v9.2/CHANGELOG.md†L15-L21】
- **Function Before Structure** — Lead with function (M2) unless user requests H2 anatomy order.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L14-L16】
- **Level Gating** — Higher-level explanations gated until lower levels validated.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L16-L18】
- **Drawing Integration** — Provide annotated drawing protocol for anatomy (Base Shape → Steps → Labels → Function).【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L17-L19】

## 4. The Modes (Workflow)
- **Core Mode** — Guided learning for new material; full prime→encode→build with scaffolding.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L255-L266】
- **Sprint Mode** — Fail-first quizzing with immediate checking; teaching only on misses.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L263-L267】
- **Drill Mode** — Targeted reconstruction of weak buckets with heavy phonetic hooks.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L269-L273】
- **Light Mode** — 10–15 minute preset for quick sessions.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L545-L546】
- **Quick Sprint Mode** — 20–30 minute fast preset for testing bursts.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L545-L546】

## 5. Gap Analysis for Lifespan
- **Time/Definition focus** — Concept Engine already sequences Identity → Context → Mechanism → Boundary → Application, aligning with developmental milestone mapping; evaluate whether a legacy timeline scaffold is needed for Lifespan contexts.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L675-L705】
- **Clinical Path emphasis** — M8 Diagnosis directly targets pathology flows but defaults favor M2 Trigger; make M8 the standard for Lifespan/Clin Path prompts to avoid underuse.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L759-L784】
- **Homeostasis and aging** — M6 Homeostasis (Perturbation → Correction → Baseline) is well-suited for lifespan physiology decline; prioritize it over anatomy-first routines.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L759-L776】
- **Narrative framing** — H7 Narrative (Hook → Context → Conflict → Resolution) can map child→adult→geriatric arcs but is optional; adopt it more aggressively since default H1 scans may miss temporal change.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L712-L749】【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L738-L744】
- **Under-utilized v8 tools in v9.2** — Mode system remains, but v8-era Seed-Lock/phonetic/gated platter rules are active; M8 Diagnosis and H7 Narrative are present yet subordinated to defaults (M2, H1), suggesting reactivation for Lifespan/Developmental Pathology flows.【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L759-L784】【F:v9.2/PT_Study_SOP_v9.2_DEV.md†L712-L749】
