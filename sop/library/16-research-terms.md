# 16 - Research Terms for the Modular Tutor-Brain-Scholar System

Status: CANONICAL (research vocabulary for Scholar + module design)
Last updated: 2026-02-11

Every term below maps onto the system's primitives (LearningModule, Chain, RuleSet, Metric, Hypothesis, Proposal). Use the Layer/Phase/ICAP/CLT/Assessment/Artifact tags to classify any new research term before it enters the system.

---

## 1. Individual Differences (justifies modularity across people)

Principled reason to let different users pick different chains. Basis for Scholar to recommend different modules by skill level.

| Term | Key Finding | System Impact |
|------|-------------|---------------|
| Aptitude-Treatment Interaction (ATI) | What works for one learner may hurt another | Module fit > best method |
| Expertise reversal effect | Scaffolding helps novices but hinders experts | Fade supports as mastery grows |
| Prior knowledge effects | Encoding depends on what learner already knows | Adapt chain selection to pre-test |
| Learner modeling | Track skill state per-topic | Brain metrics + adaptive sequencing |
| Zone of Proximal Development (ZPD) | Learning happens in the stretch zone | Module difficulty must match ZPD |
| Cognitive diagnostic assessment | Identify specific misconceptions, not just "wrong" | Error classification in Brain |

---

## 2. Metacognition and Self-Regulated Learning (Scholar + Brain loop)

Research backbone for monitoring, control, reflection, and improvement.

| Term | Key Finding | System Impact |
|------|-------------|---------------|
| Self-Regulated Learning (SRL) (Zimmerman) | Forethought -> performance -> reflection cycle | Maps to M0-Planning -> Tutor -> Wrap |
| Metacognitive monitoring vs control (Nelson & Narens) | Monitoring accuracy predicts learning outcomes | Calibration metrics in Brain |
| Judgments of Learning (JOL) | Learners often misjudge what they know | Track confidence vs accuracy |
| Calibration | Confidence-correctness alignment | calibration_gap metric |
| Illusions of competence / fluency effects | Re-reading feels like learning but isn't | Retrieval practice over re-study |
| Desirable difficulties | Harder encoding = better retention | Generation, interleaving, spacing |
| Deliberate practice (Ericsson) | Focused effort on weaknesses with feedback | Error Autopsy + Mastery Loop |

---

## 3. Cognitive Load Theory Cluster (module and tutor behavior design)

The rule-engine's most useful "principles" layer.

| Term | Key Finding | System Impact |
|------|-------------|---------------|
| Cognitive Load Theory (CLT) (Sweller) | Working memory is limited; design around it | Core module design principle |
| Intrinsic load | Complexity inherent to the content | Cannot remove; manage via segmenting |
| Extraneous load | Load from bad design/presentation | Modules must minimize this |
| Germane load | Load from learning itself | Modules should maximize this |
| Worked example effect | Studying examples > solving problems (novices) | AI Skeleton Review, guided steps |
| Split-attention effect | Integrating separated sources hurts | Keep text + diagram together |
| Modality effect | Visual + auditory > visual + visual | Vary presentation modality |
| Redundancy effect | Redundant info adds extraneous load | Don't repeat in two formats |
| Signaling principle | Cues direct attention to essentials | Bold, highlight, structure |
| Segmenting principle | Break complex into pieces | Three-Layer Chunk module |
| Coherence principle | Remove interesting but irrelevant content | Stick to source material |
| Pretraining principle | Pre-teach key concepts before full lesson | Prime modules (Brain Dump, etc.) |
| Guidance fading / faded worked examples | Scaffolding -> completion -> independent | Chain sequencing logic |

---

## 4. Retrieval and Memory Principles (Examiner module design)

High-yield module variants.

| Term | Key Finding | System Impact |
|------|-------------|---------------|
| Testing effect / retrieval practice | Testing > re-reading for retention | All Retrieve category modules |
| Free recall vs cued recall | Free recall is harder, builds stronger traces | Free Recall Blurt module |
| Successive relearning | Test + respace until mastered | Mastery Loop module |
| Spaced repetition / spacing effect | Distribute practice over time | Anki integration, scheduling |
| Interleaving vs blocking | Mixing topics > blocking (for discrimination) | Mixed Practice module |
| Contextual interference | Varied practice context improves transfer | Variable Retrieval module |
| Generation effect | Self-generated > read items | Seed-Lock rule |
| Elaborative interrogation | "Why is this true?" enhances encoding | Why-Chain module |
| Self-explanation effect | Explaining to yourself builds connections | Self-Explanation Protocol |
| Transfer-appropriate processing | Test format should match study format | Practice like the exam |
| Encoding specificity | Recall cues must match encoding context | Multi-context retrieval |
| Desirable difficulties (Bjork) | Make learning harder in specific ways | Interleave, space, generate |

---

## 5. Instructional Design Blueprints (chain archetypes)

Framework-level containers implemented as module templates.

| Term | Key Finding | System Impact |
|------|-------------|---------------|
| Gagne's Nine Events of Instruction | Systematic instructional sequence | Maps to M0-M6 session flow |
| Merrill's First Principles of Instruction | Activation -> demonstration -> application -> integration | Maps to PEIRRO phases |
| Backward Design (Wiggins & McTighe) | Start with desired outcomes, design backward | LO Engine chain selection |
| 4C/ID (Four-Component Instructional Design) | Learning tasks + supportive info + procedural info + part-task practice | Complex chain archetype |
| Cognitive Apprenticeship | Modeling -> coaching -> scaffolding -> fading -> articulation -> reflection | Tutor behavior progression |
| Worked example -> completion -> independent (fading path) | Gradual release of responsibility | Chain sequencing principle |
| Productive failure (Kapur) | Fail first, then receive instruction | Pre-Test -> Teach chain |
| Problem-based learning (PBL) | Learning through authentic problems | Case Walkthrough module |
| Case-based reasoning | Learn from concrete cases | Illness Script Builder, Clinical Application |
| ADDIE | Analyze -> Design -> Develop -> Implement -> Evaluate | Scholar proposal cycle |

---

## 6. Engagement Taxonomy (module scoring dimension)

| Term | Key Finding | System Impact |
|------|-------------|---------------|
| ICAP Framework (Interactive, Constructive, Active, Passive) | I > C > A > P for learning outcomes | Per-module ICAP tag predicts learning yield |
| Passive | Receiving without overt processing | AI Skeleton Review (low ICAP) |
| Active | Manipulating or highlighting | Fill-in-Blank (medium ICAP) |
| Constructive | Generating new output beyond given | Concept Map, Why-Chain (high ICAP) |
| Interactive | Co-constructing with dialogue partner | Teach-Back, Clinical Application (highest ICAP) |

---

## 7. Knowledge Representation and Linking (artifact design)

How to structure artifacts and graphs.

| Term | Key Finding | System Impact |
|------|-------------|---------------|
| Schema theory | Knowledge organized in schemas | Module goal: build/extend schemas |
| Concept maps vs mind maps | Concept maps show relationships; mind maps show hierarchy | Different artifact types |
| Semantic networks | Nodes + labeled edges = knowledge | Knowledge graph in Brain |
| Chunking | Group items into retrievable units | Three-Layer Chunk module |
| Cognitive flexibility theory | Multiple representations aid transfer | Module variants (ASCII, Canvas, Table) |
| Advance organizers (Ausubel) | Pre-exposure structures improve encoding | AI Skeleton Review |
| Zettelkasten / Map of Content (MOC) | Linked atomic notes build knowledge | Obsidian integration |

---

## 8. Tutoring Dialogue Mechanics (RuleSet design)

How the tutor should talk and scaffold.

| Term | Key Finding | System Impact |
|------|-------------|---------------|
| Socratic questioning | Questions > telling for deep understanding | Tutor question-first rules |
| Scaffolding | Temporary support withdrawn as mastery grows | Fading in chain sequences |
| Contingent tutoring | Help only as needed | Seed-Lock rule |
| Hint hierarchy / graduated hints | Simple hint -> elaborated hint -> answer | Tutor hint escalation |
| Immediate vs delayed feedback | Immediate for simple; delayed for complex | RuleSet feedback timing |
| Error-based learning | Errors + correction > errorless learning | Error Autopsy module |
| Teach-back | Explain to confirm understanding | Teach-Back module |
| Wait time | Pause after questions increases quality | Force student output rule |
| Dialogic teaching | Genuine dialogue, not IRE patterns | Interactive ICAP level |

---

## 9. Assessment and Measurement (Brain metrics)

Turn ranking into something defensible.

| Term | Key Finding | System Impact |
|------|-------------|---------------|
| Criterion-referenced assessment | Measure against standard, not peers | Mastery thresholds per module |
| Rubric reliability | Consistent scoring across raters | Self/AI grading rubrics |
| Item difficulty / discrimination | Good items differentiate knowing from guessing | Sprint Quiz item selection |
| Item Response Theory (IRT) | Probabilistic mastery estimation | Advanced mastery modeling |
| Mastery learning | Achieve criterion before moving on | Level gating rule |
| Learning curves | Performance improves predictably with practice | Track per-module learning curves |
| Pretest-posttest design | Measure gain, not just final level | learning_gain metric |
| Effect size (Cohen's d, Hedges g) | Standardized measure of intervention impact | Module/chain comparison |
| N-of-1 experiments / single-case designs (ABAB, multiple baseline) | Rigorous self-experimentation | Scholar experiment design |

---

## 10. Adaptive Sequencing and Scheduling (Scholar's "choose next chain" brain)

The math/decision layer.

| Term | Key Finding | System Impact |
|------|-------------|---------------|
| Spaced repetition algorithms (SM-2, Leitner, half-life) | Optimal review intervals | Anki scheduling, spaced review |
| Knowledge tracing (Bayesian) | Track P(mastery) per skill over time | Mastery estimation |
| Elo rating for skills | Skill rating from performance history | Mastery proxy per topic |
| Multi-armed bandits (explore vs exploit) | Balance trying new modules vs sticking with winners | Scholar module selection |
| Recommender systems | Rank interventions by predicted effectiveness | Chain recommendation engine |

---

## 11. Systems Thinking (Scholar loop governance)

Stable process rules for proposal generation, consolidation, and pruning.

| Term | Key Finding | System Impact |
|------|-------------|---------------|
| Cybernetics | Goal-directed systems with feedback | Scholar loop architecture |
| Feedback loops | Positive (amplify) vs negative (stabilize) | Brain metrics -> Scholar -> Module Library |
| OODA loop | Observe -> Orient -> Decide -> Act | Scholar cycle per run |
| PDCA cycle | Plan -> Do -> Check -> Act | Proposal -> Implement -> Verify -> Adjust |
| Kaizen | Continuous small improvements | One-change proposals |
| Governance / change control | Structured change approval | Scholar approval gate |

---

## Tagging Taxonomy (per module/idea)

```
Layer:       paradigm | principle | blueprint | workflow | module | ruleset | tool
Phase:       prepare | encode | retrieve | refine | integrate | evaluate
ICAP:        passive | active | constructive | interactive
CLT:         reduce-extraneous | manage-intrinsic | increase-germane
Assessment:  recall | application | transfer | calibration
Artifact:    outline | concept-map | mindmap | decision-tree | cards | error-log
```

---

## High-Yield Search Strings (Google Scholar)

```
"aptitude treatment interaction instructional methods"
"expertise reversal effect worked examples"
"cognitive load theory split attention modality redundancy"
"retrieval practice successive relearning spacing effect"
"interleaving practice contextual interference effect"
"ICAP framework constructive learning activities"
"elaborative interrogation self explanation effect"
"cognitive apprenticeship scaffolding fading articulation reflection"
"productive failure Kapur learning outcomes"
"Bayesian knowledge tracing mastery learning"
"single-case experimental design education ABAB"
"judgments of learning calibration metacognitive monitoring control"
```
