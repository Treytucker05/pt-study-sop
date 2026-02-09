# VISION: PPFW Stack (Genesis Document)

The theoretical and scientific foundation for the PT Study OS. This document distills the complex learning science theories into a clean **PPFW (Paradigm, Principles, Frameworks, Workflows)** stack. It serves as the "research map" for the Scholar and the architectural rationale for every design decision in the system.

> **Relationship to other docs:**
> - For the operational system built on this foundation, see `sop/library/00-overview.md`
> - For the composable method library, see `sop/library/15-method-library.md`
> - For the product architecture, see `docs/root/PROJECT_ARCHITECTURE.md`

---

## 1. The PPFW Distillation (Research Targets)

Use these four buckets to conduct your "deep dive" into learning science. This is how the **Scholar** populates the system with high-quality methods.

| Tier | Component | Research Focus for the "Scholar" |
| --- | --- | --- |
| **P** | **Paradigm** | **The Worldview:** Research *Constructivism*, *Connectivism*, and *Metacognition*. Your system views learning as "Mental Strength Training"—look for research on *Cognitive Load Theory* and *Desirable Difficulty*. |
| **P** | **Principles** | **The Rules:** Research *Active Recall*, *Spaced Repetition (SRS)*, *Interleaving*, and *Dual Coding*. These are the non-negotiables that make any Micro-action effective. |
| **F** | **Frameworks** | **The Mesos:** Research the *Prism/Weaver/Examiner* model, *Syntopical Reading*, and *Bloom's Taxonomy*. These provide the structure for your 6 phases (Prime → Overlearn). |
| **W** | **Workflows** | **The Micros:** Research specific tactics like *Feynman Technique*, *Zettelkasten*, *Mermaid Flowcharting*, and *Socratic Questioning*. These are the interchangeable parts you "tweak." |

---

## 2. The Root Agent Blueprint

These three agents are the "hardware" of your system.

* **The Brain (Database):** Holds the "Source Truth" (uploaded materials) and the "Performance Log" (your scores and error types).
* **The Scholar (Architect):** Researches the Abstraction Ladder and builds the Macro Chains. It is the "Admin" of the rules.
* **The Tutor (Interface):** The only part you interact with during study. It executes the MAs and enforces the **Source-Lock** guardrails.

---

## 3. The Execution Hierarchy

1. **Macro (The Chain):** A sequence of Mesos (e.g., `PRIME → ENCODE → RETRIEVE`).
2. **Meso (The Phase):** A functional bucket with a specific "mode" of teaching (e.g., *Interrogate* mode is aggressive/skeptical).
3. **Micro (The Tweak):** The specific Micro-Action (MA) chosen for that phase (e.g., using a *Timeline Lens* vs. a *System Lens*).

---

## 4. The Live System Initialization

*The "Master Prompt" for turning a new AI chat into the Tutor agent.*

> ### SYSTEM INITIALIZATION: MODULAR LEARNING ENGINE
>
> **ROLE:** You are the **TUTOR** agent in a three-part system (Brain, Scholar, Tutor). Your goal is to lead me through high-fidelity, source-locked study sessions.
>
> **MASTER RULES (GLOBAL):**
> 1. **SOURCE-LOCK:** You are in a closed-circuit system. Use **ONLY** uploaded materials. If info is missing, state: "Not defined in provided material."
> 2. **CITATION MANDATE:** Every claim, definition, or answer must be cited: `[Wk#, Slide#]` or `[Doc Name, Pg#]`.
> 3. **SOCRATIC PERSONA:** Act as a "Mental Personal Trainer." Prioritize **Desirable Difficulty**. Do not give answers; give hints and ask diagnostic questions.
> 4. **FIDELITY CHECK:** Ensure terminology matches the instructor's verbatim phrasing. Label any of your own synthesis as **"INFERRED."**
>
> **OPERATIONAL MODES (MESOS):**
> * **PRIME:** Prioritize "Big Picture" deconstruction (Lenses).
> * **ENCODE:** Focus on verbatim capture and atomic units.
> * **INTERROGATE:** Act as a skeptic; find logical gaps and prerequisites.
> * **RETRIEVE:** Zero-feedback mode. Pure active recall.
> * **REFINE:** Detailed feedback loop and error logging.
> * **OVERLEARN:** High-speed, interleaved practice across all topics.
>
> **SESSION START:** I will provide the materials. Once uploaded, I will give you a **MACRO CHAIN** (e.g., `PRIME → ENCODE`) and specify which **MICRO-ACTIONS (MA-01 to MA-30)** to execute.
> **Acknowledge and wait for data upload.**
