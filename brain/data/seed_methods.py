#!/usr/bin/env python3
"""
Seed the method_blocks and method_chains tables with the PEIRRO-aligned method library.

Run: python brain/data/seed_methods.py
     python brain/data/seed_methods.py --force     # delete existing rows first
     python brain/data/seed_methods.py --migrate   # migrate categories on existing DB
Idempotent by default: inserts any missing YAML/hardcoded blocks + template chains by name.
Use --force to wipe and re-seed from the source-of-truth library.

Data source priority:
  1. YAML specs in sop/library/methods/ and sop/library/chains/ (if present)
  2. Hardcoded METHOD_BLOCKS / TEMPLATE_CHAINS below (fallback)
"""

import json
import subprocess
import sys
import os
from pathlib import Path

# Allow running from repo root or brain/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from db_setup import get_connection, migrate_method_categories

# Repo root (for locating YAML specs)
_ROOT = Path(__file__).resolve().parents[2]
_METHODS_DIR = _ROOT / "sop" / "library" / "methods"
_CHAINS_DIR = _ROOT / "sop" / "library" / "chains"
_VERSION_PATH = _ROOT / "sop" / "library" / "meta" / "version.yaml"


# ---------------------------------------------------------------------------
# Atomic Method Blocks (36 blocks across 6 PEIRRO phases)
# ---------------------------------------------------------------------------
METHOD_BLOCKS = [
    # === PREPARE (warm up working memory, set focus, survey structure) ===
    {
        "name": "Brain Dump",
        "category": "prepare",
        "description": "Free-write everything you already know about the topic for 2-3 min. Surfaces prior knowledge and sets a baseline.",
        "default_duration_min": 3,
        "energy_cost": "low",
        "best_stage": "first_exposure",
        "tags": ["warm-up", "recall", "low-stakes"],
        "evidence": "Brod et al. (2013); prior knowledge activation improves encoding of new information",
    },
    {
        "name": "Prediction Questions",
        "category": "prepare",
        "description": "Write 3-5 questions you expect the material to answer. Creates forward hooks for active reading.",
        "default_duration_min": 3,
        "energy_cost": "low",
        "best_stage": "first_exposure",
        "tags": ["priming", "curiosity", "metacognition"],
        "evidence": "Pressley et al. (1990); question-generation primes elaborative processing",
    },
    {
        "name": "Prior Knowledge Scan",
        "category": "prepare",
        "description": "List related concepts you already know. Identify connections to previous modules.",
        "default_duration_min": 3,
        "energy_cost": "low",
        "best_stage": "first_exposure",
        "tags": ["schema-activation", "connections"],
        "evidence": "Ausubel (1968); meaningful learning requires anchoring to existing schemas",
    },
    {
        "name": "AI Skeleton Review",
        "category": "prepare",
        "description": "Have Tutor generate a topic skeleton with main headings and subheadings. Review for 2-3 min to build mental map.",
        "default_duration_min": 5,
        "energy_cost": "low",
        "best_stage": "first_exposure",
        "tags": ["overview", "structure", "ai-assisted"],
        "evidence": "Lorch & Lorch (1996); advance organizers improve text comprehension",
    },
    {
        "name": "Concept Cluster",
        "category": "prepare",
        "description": "Group related terms/concepts into 3-5 clusters. Identify hierarchy and relationships.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["organization", "visual", "grouping"],
        "evidence": "Bower et al. (1969); conceptual organization improves recall by 2-3x",
    },
    {
        "name": "Three-Layer Chunk",
        "category": "prepare",
        "description": "Break topic into 3 layers: big picture, key details, edge cases. Process one layer at a time.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["chunking", "depth-first", "structure"],
        "evidence": "Miller (1956); Gobet et al. (2001); chunking manages cognitive load",
    },
    {
        "name": "Pre-Test",
        "category": "prepare",
        "description": "Attempt to answer questions on the topic BEFORE studying it. Getting answers wrong primes the brain to encode the correct information more deeply.",
        "default_duration_min": 5,
        "energy_cost": "low",
        "best_stage": "first_exposure",
        "tags": ["pre-testing", "priming", "desirable-difficulty"],
        "evidence": "Richland et al. (2009); Kornell et al. (2009); pre-testing primes encoding even when initial answers are wrong",
    },
    # === ENCODE (attach meaning, create hooks) ===
    {
        "name": "KWIK Hook",
        "category": "encode",
        "description": "Structured 5-step encoding protocol for new terms. Sound (phonetic cue) → Function (true meaning) → Image (vivid visual tied to function) → Resonance (learner confirms it clicks) → Lock (record as card/log). Each step is gated — don't skip ahead.",
        "default_duration_min": 3,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["mnemonic", "kwik", "hook", "gated", "sop-core"],
        "evidence": "Paivio (1991); dual-coding theory — combining verbal + visual improves retention",
    },
    {
        "name": "Seed-Lock Generation",
        "category": "encode",
        "description": "Learner generates their own encoding hook BEFORE the AI offers help. Start with your own association, metaphor, or mnemonic. AI only assists if you're stuck. Enforces active generation over passive reception.",
        "default_duration_min": 3,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["seed-lock", "generation-first", "active", "sop-core"],
        "evidence": "Slamecka & Graf (1978); generation effect — self-generated items remembered better than read items",
    },
    {
        "name": "Draw-Label",
        "category": "encode",
        "description": "Sketch the structure (anatomy, pathway, concept map) and label from memory. Fill gaps with source material.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "first_exposure",
        "tags": ["visual", "anatomy", "drawing", "active"],
        "evidence": "Wammes et al. (2016); drawing effect — drawing produces superior memory compared to writing",
    },
    {
        "name": "Teach-Back",
        "category": "encode",
        "description": "Explain the concept aloud as if teaching a classmate. Identify points where explanation breaks down.",
        "default_duration_min": 5,
        "energy_cost": "high",
        "best_stage": "review",
        "tags": ["verbal", "feynman", "deep-processing"],
        "evidence": "Nestojko et al. (2014); expecting to teach enhances encoding and organization",
    },
    {
        "name": "Why-Chain",
        "category": "encode",
        "description": "Ask 'why?' 3-5 times in succession about a concept to build causal depth. Each answer becomes the premise for the next question. Based on elaborative interrogation (Dunlosky et al.).",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["elaboration", "causal", "depth", "evidence-based"],
        "evidence": "Dunlosky et al. (2013); elaborative interrogation rated moderate utility for learning",
    },
    {
        "name": "Think-Aloud Protocol",
        "category": "encode",
        "description": "Verbalize your reasoning step-by-step while working through a problem or reading. Exposes gaps in logic and strengthens self-explanation. Based on Chi et al. self-explanation research.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["self-explanation", "metacognition", "verbal", "evidence-based"],
        "evidence": "Chi et al. (1994); self-explanation leads to deeper understanding and better problem-solving",
    },
    {
        "name": "Self-Explanation Protocol",
        "category": "encode",
        "description": "After reading each paragraph or concept, pause and explain to yourself WHY each step follows from the previous one. Focus on explaining the reasoning, not just restating facts.",
        "default_duration_min": 7,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["self-explanation", "comprehension", "causal-reasoning"],
        "evidence": "Chi et al. (1994); Dunlosky et al. (2013); self-explanation rated moderate-high utility across domains",
    },
    {
        "name": "Mechanism Trace",
        "category": "encode",
        "description": "Trace the causal mechanism step-by-step: what triggers what, and why. Build a cause→effect chain from input to output. Especially useful for pathophysiology and physiological pathways.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "first_exposure",
        "tags": ["causal-reasoning", "mechanism", "pathophysiology", "transfer"],
        "evidence": "Kulasegaram et al. (2013); causal reasoning with biomedical mechanisms supports diagnostic transfer",
    },
    {
        "name": "Concept Map",
        "category": "encode",
        "description": "Build a node-and-link diagram showing relationships between concepts. Self-constructed maps force elaboration and reveal structural gaps. Use Mermaid syntax for dashboard editor.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "first_exposure",
        "tags": ["visual", "mermaid", "relationships", "elaboration"],
        "evidence": "Nesbit & Adesope (2006) d=0.82; self-constructed > provided (d=1.00 vs 0.37)",
    },
    {
        "name": "Comparison Table",
        "category": "encode",
        "description": "Create a side-by-side table comparing 2-4 confusable concepts across shared features. Highlight discriminating features. Builds differential diagnosis skill.",
        "default_duration_min": 7,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["visual", "comparison", "discrimination", "table"],
        "evidence": "Alfieri et al. (2013); comparison improves discrimination and concept formation",
    },
    {
        "name": "Process Flowchart",
        "category": "encode",
        "description": "Draw a sequential diagram showing a process, pathway, or algorithm. Include decision points where applicable. Use Mermaid graph TD syntax for dashboard editor.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "first_exposure",
        "tags": ["visual", "mermaid", "sequential", "procedural"],
        "evidence": "Winn (1991); spatial-sequential diagrams improve procedural understanding",
    },
    {
        "name": "Clinical Decision Tree",
        "category": "encode",
        "description": "Build a branching decision diagram: presentation → key findings → differential → tests → diagnosis. Scaffolds clinical reasoning into explicit decision points.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "exam_prep",
        "tags": ["visual", "mermaid", "clinical-reasoning", "decision-tree"],
        "evidence": "Charlin et al. (2000); decision trees scaffold clinical reasoning",
    },
    # === RETRIEVE (test recall, strengthen pathways) ===
    {
        "name": "Free Recall Blurt",
        "category": "retrieve",
        "description": "Close materials. Write everything you remember about the topic. No peeking. Compare after.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["recall", "testing-effect", "self-assessment"],
        "evidence": "Roediger & Karpicke (2006); testing effect — retrieval practice > re-reading for long-term retention",
    },
    {
        "name": "Sprint Quiz",
        "category": "retrieve",
        "description": "Rapid-fire Q&A with Tutor. 10-15 questions in 5 min. Track accuracy for RSR.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["quiz", "speed", "rsr", "ai-assisted"],
        "evidence": "McDaniel et al. (2007); quiz-based retrieval enhances later exam performance",
    },
    {
        "name": "Fill-in-Blank",
        "category": "retrieve",
        "description": "Review notes with key terms blanked out. Fill from memory. Targets specific vocabulary recall.",
        "default_duration_min": 5,
        "energy_cost": "low",
        "best_stage": "review",
        "tags": ["cloze", "vocabulary", "targeted"],
        "evidence": "Dunlosky et al. (2013); cloze-based retrieval is effective for factual knowledge",
    },
    {
        "name": "Mixed Practice",
        "category": "retrieve",
        "description": "Interleave questions from 2-3 different topics in a single retrieval block. Builds discrimination and prevents blocked-practice illusion. Based on interleaving research (Rohrer et al.).",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "exam_prep",
        "tags": ["interleaving", "discrimination", "mixed", "evidence-based"],
        "evidence": "Rohrer et al. (2015); interleaved practice improves discrimination and transfer",
    },
    {
        "name": "Variable Retrieval",
        "category": "retrieve",
        "description": "Retrieve the same concept in 3 different formats: (1) free recall, (2) application question, (3) compare/contrast. Varied retrieval contexts build more flexible memory traces.",
        "default_duration_min": 10,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["varied-practice", "transfer", "flexible-retrieval"],
        "evidence": "Morris et al. (1977); PNAS 2024; varied retrieval practice produces more durable and transferable knowledge than constant retrieval",
    },
    # === INTERROGATE (link to prior knowledge, apply, compare) ===
    {
        "name": "Analogy Bridge",
        "category": "interrogate",
        "description": "Create an analogy linking this concept to something familiar. Test if the analogy holds at the edges.",
        "default_duration_min": 3,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["analogy", "transfer", "creative"],
        "evidence": "Gentner (1983); analogical reasoning supports structural mapping and transfer",
    },
    {
        "name": "Clinical Application",
        "category": "interrogate",
        "description": "Apply the concept to a clinical scenario. Ask: how would this present? What would you test? How would you treat?",
        "default_duration_min": 5,
        "energy_cost": "high",
        "best_stage": "exam_prep",
        "tags": ["clinical", "application", "pt-specific"],
        "evidence": "Schmidt & Rikers (2007); clinical application strengthens illness script formation",
    },
    {
        "name": "Cross-Topic Link",
        "category": "interrogate",
        "description": "Identify 2-3 connections between this topic and topics from other courses. Look for shared principles.",
        "default_duration_min": 3,
        "energy_cost": "medium",
        "best_stage": "consolidation",
        "tags": ["integration", "cross-course", "big-picture"],
        "evidence": "Pugh & Bergin (2006); interest deepens when learners see cross-domain connections",
    },
    {
        "name": "Side-by-Side Comparison",
        "category": "interrogate",
        "description": "Place two confusable concepts in a comparison table (features, functions, clinical signs). Identify discriminating features. Builds differential diagnosis skill.",
        "default_duration_min": 7,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["comparison", "discrimination", "differential", "table"],
        "evidence": "Alfieri et al. (2013); comparison-based learning improves discrimination and concept formation",
    },
    {
        "name": "Case Walkthrough",
        "category": "interrogate",
        "description": "Walk through a clinical case from presentation to assessment to intervention. Apply learned concepts to patient scenarios. Builds clinical reasoning chains.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "exam_prep",
        "tags": ["clinical", "case-based", "reasoning", "application"],
        "evidence": "Thistlethwaite et al. (2012); case-based learning improves clinical reasoning in health professions",
    },
    {
        "name": "Illness Script Builder",
        "category": "interrogate",
        "description": "For a condition, build the illness script: (1) enabling conditions, (2) pathophysiological fault, (3) clinical consequences. Compare your script to the textbook version.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "first_exposure",
        "tags": ["illness-script", "clinical-reasoning", "pathology"],
        "evidence": "Schmidt & Rikers (2007); illness scripts are the cognitive structure underlying expert clinical reasoning",
    },
    # === REFINE (error analysis, relearning loops) ===
    {
        "name": "Error Autopsy",
        "category": "refine",
        "description": "Review errors from retrieval practice. For each error: (1) What did I say? (2) What's correct? (3) Why did I confuse them? (4) What cue will prevent this next time? Metacognitive error analysis.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "exam_prep",
        "tags": ["error-analysis", "metacognition", "correction", "evidence-based"],
        "evidence": "Metcalfe (2017); error correction with feedback is more effective than errorless learning",
    },
    {
        "name": "Mastery Loop",
        "category": "refine",
        "description": "Re-study items missed during retrieval, then immediately re-test. Repeat until all items are recalled correctly. Based on successive relearning (Rawson & Dunlosky).",
        "default_duration_min": 10,
        "energy_cost": "medium",
        "best_stage": "consolidation",
        "tags": ["successive-relearning", "mastery", "retest", "evidence-based"],
        "evidence": "Rawson & Dunlosky (2011); successive relearning combines testing + spacing for durable retention",
    },
    # === OVERLEARN (close loop, capture artifacts) ===
    {
        "name": "Exit Ticket",
        "category": "overlearn",
        "description": "Answer three questions: (1) What did I learn? (2) What's still muddy? (3) What's my next action?",
        "default_duration_min": 3,
        "energy_cost": "low",
        "best_stage": "consolidation",
        "tags": ["reflection", "meta", "wrap", "sop-core"],
        "evidence": "Tanner (2012); metacognitive reflection improves self-regulated learning",
    },
    {
        "name": "Anki Card Draft",
        "category": "overlearn",
        "description": "Draft 3-5 Anki cards for the session's key concepts. Use cloze or basic format. Brain syncs to Anki.",
        "default_duration_min": 5,
        "energy_cost": "low",
        "best_stage": "consolidation",
        "tags": ["anki", "spaced-repetition", "artifacts"],
        "evidence": "Kornell (2009); Cepeda et al. (2006); spaced retrieval via flashcards is high-utility",
    },
]


# ---------------------------------------------------------------------------
# Template Chains (13 pre-built chains)
# ---------------------------------------------------------------------------
# block_ids will be resolved by name after inserting blocks
TEMPLATE_CHAINS = [
    {
        "name": "First Exposure (Core)",
        "description": "Full PEIRRO cycle for new material. Prepare → Encode → Retrieve → Interrogate → Overlearn. Retrieval before generative encoding per Potts & Shanks (2022).",
        "blocks": ["Brain Dump", "AI Skeleton Review", "Free Recall Blurt", "KWIK Hook", "Analogy Bridge", "Exit Ticket"],
        "context_tags": {"stage": "first_exposure", "energy": "high", "time_available": 45},
        "is_template": 1,
    },
    {
        "name": "Review Sprint",
        "description": "Fast review loop. Prepare → Retrieve → Interrogate → Overlearn. Skips encode for known material.",
        "blocks": ["Prediction Questions", "Sprint Quiz", "Cross-Topic Link", "Exit Ticket"],
        "context_tags": {"stage": "review", "energy": "medium", "time_available": 25},
        "is_template": 1,
    },
    {
        "name": "Quick Drill",
        "description": "Minimal time investment. Prepare → Retrieve → Overlearn. Good for spacing reviews.",
        "blocks": ["Brain Dump", "Sprint Quiz", "Exit Ticket"],
        "context_tags": {"stage": "review", "energy": "medium", "time_available": 15},
        "is_template": 1,
    },
    {
        "name": "Anatomy Deep Dive",
        "description": "Anatomy-focused chain with drawing. Prepare → Encode (Draw-Label) → Retrieve → Overlearn.",
        "blocks": ["Prior Knowledge Scan", "Three-Layer Chunk", "Draw-Label", "Free Recall Blurt", "Anki Card Draft"],
        "context_tags": {"class_type": "anatomy", "stage": "first_exposure", "energy": "high", "time_available": 40},
        "is_template": 1,
    },
    {
        "name": "Low Energy",
        "description": "Low-effort chain for tired days. Prepare → Overlearn. Maintain streak without burning out.",
        "blocks": ["Brain Dump", "AI Skeleton Review", "Exit Ticket"],
        "context_tags": {"energy": "low", "time_available": 15},
        "is_template": 1,
    },
    {
        "name": "Exam Prep",
        "description": "Exam-focused chain with interleaving and error analysis. Prepare → Retrieve → Interrogate → Refine → Overlearn.",
        "blocks": ["Prediction Questions", "Mixed Practice", "Side-by-Side Comparison", "Error Autopsy", "Anki Card Draft"],
        "context_tags": {"stage": "exam_prep", "energy": "high", "time_available": 35},
        "is_template": 1,
    },
    {
        "name": "Clinical Reasoning",
        "description": "Build clinical reasoning chains. Prepare → Interrogate → Refine → Overlearn.",
        "blocks": ["Prior Knowledge Scan", "Three-Layer Chunk", "Case Walkthrough", "Side-by-Side Comparison", "Error Autopsy", "Anki Card Draft"],
        "context_tags": {"class_type": "clinical", "stage": "exam_prep", "energy": "high", "time_available": 45},
        "is_template": 1,
    },
    {
        "name": "Mastery Review",
        "description": "Deep consolidation with successive relearning. Retrieve → Refine → Overlearn.",
        "blocks": ["Free Recall Blurt", "Error Autopsy", "Mastery Loop", "Anki Card Draft"],
        "context_tags": {"stage": "consolidation", "energy": "medium", "time_available": 30},
        "is_template": 1,
    },
    # --- 4 new intake-focused chains ---
    {
        "name": "Dense Anatomy Intake",
        "description": "High-detail anatomy first exposure. Pre-Test primes encoding, Draw-Label for spatial memory, retrieval before generative steps.",
        "blocks": ["Pre-Test", "Draw-Label", "Free Recall Blurt", "KWIK Hook", "Anki Card Draft"],
        "context_tags": {"class_type": "anatomy", "stage": "first_exposure", "energy": "high", "time_available": 40},
        "is_template": 1,
    },
    {
        "name": "Pathophysiology Intake",
        "description": "Pathology first exposure with mechanism tracing. Pre-Test → Self-Explanation → Concept Cluster → Retrieve → Refine.",
        "blocks": ["Pre-Test", "Self-Explanation Protocol", "Concept Cluster", "Free Recall Blurt", "Error Autopsy"],
        "context_tags": {"class_type": "pathology", "stage": "first_exposure", "energy": "high", "time_available": 45},
        "is_template": 1,
    },
    {
        "name": "Clinical Reasoning Intake",
        "description": "Clinical first exposure with illness scripts. Pre-Test → Illness Script → Compare → Retrieve → Overlearn.",
        "blocks": ["Pre-Test", "Illness Script Builder", "Side-by-Side Comparison", "Free Recall Blurt", "Anki Card Draft"],
        "context_tags": {"class_type": "clinical", "stage": "first_exposure", "energy": "high", "time_available": 45},
        "is_template": 1,
    },
    {
        "name": "Quick First Exposure",
        "description": "Minimal intake chain when time is limited. Pre-Test → AI Skeleton → Retrieve → Overlearn.",
        "blocks": ["Pre-Test", "AI Skeleton Review", "Free Recall Blurt", "Exit Ticket"],
        "context_tags": {"stage": "first_exposure", "energy": "medium", "time_available": 20},
        "is_template": 1,
    },
    {
        "name": "Visual Encoding",
        "description": "Visualization-first encoding for topics with confusable concepts. Build visual representations before retrieval.",
        "blocks": ["Brain Dump", "Concept Map", "Comparison Table", "Free Recall Blurt", "Exit Ticket"],
        "context_tags": {"stage": "first_exposure", "energy": "high", "time_available": 40},
        "is_template": 1,
    },
    # --- SWEEP/DEPTH chain runner chains ---
    {
        "name": "SWEEP",
        "description": "Pass 1: Fast structural understanding. Touch everything once. Produce visual maps, objectives, confusables, seed cards.",
        "blocks": ["Concept Cluster", "Concept Map", "Comparison Table", "Sprint Quiz", "Anki Card Draft"],
        "context_tags": {"stage": "first_exposure", "pass": "sweep", "energy": "medium", "time_available": 30},
        "is_template": 1,
    },
    {
        "name": "DEPTH",
        "description": "Pass 2: Selective mastery on high-priority objectives. Full PEIRRO cycle. Retrieval-driven. Cards only from errors.",
        "blocks": ["Pre-Test", "Why-Chain", "Mechanism Trace", "Clinical Application", "Variable Retrieval", "Error Autopsy", "Anki Card Draft"],
        "context_tags": {"stage": "review", "pass": "depth", "energy": "high", "time_available": 45},
        "is_template": 1,
    },
]


def generate_facilitation_prompt(yaml_data: dict) -> str:
    """Convert YAML block definition into a structured facilitation prompt for the LLM."""
    name = yaml_data.get("name", "Unknown")
    category = yaml_data.get("category", "")
    duration = yaml_data.get("default_duration_min", 5)
    description = yaml_data.get("description", "")

    parts: list[str] = []
    parts.append(f"## Current Activity Block: {name} ({category}, ~{duration} min)")
    if description:
        parts.append(f"_{description}_")
    parts.append(f"\n### Your Task\nFacilitate the **{name}** protocol with the student. Follow the steps below in order and gate each one — do not skip ahead until the student completes the current step.")

    # Steps
    steps = yaml_data.get("steps", [])
    if steps:
        step_lines = ["### Steps (follow in order, gate each one)"]
        for s in steps:
            step_num = s.get("step", "?")
            action = s.get("action", "")
            notes = s.get("notes", "")
            step_lines.append(f"{step_num}. {action}")
            if notes:
                step_lines.append(f"   - {notes}")
        parts.append("\n".join(step_lines))

    # Inputs
    inputs = yaml_data.get("inputs", [])
    if inputs:
        parts.append("### Required Inputs\n" + "\n".join(f"- {inp}" for inp in inputs))

    # Outputs
    outputs = yaml_data.get("outputs", [])
    if outputs:
        parts.append("### Expected Outputs\n" + "\n".join(f"- {out}" for out in outputs))

    # Stop criteria
    stop_criteria = yaml_data.get("stop_criteria", [])
    if stop_criteria:
        parts.append("### Stop When\n" + "\n".join(f"- {sc}" for sc in stop_criteria))

    # Failure modes
    failure_modes = yaml_data.get("failure_modes", [])
    if failure_modes:
        fm_lines = ["### Watch For (Failure Modes)"]
        for fm in failure_modes:
            mode = fm.get("mode", "")
            mitigation = fm.get("mitigation", "")
            fm_lines.append(f"- **{mode}** → {mitigation}")
        parts.append("\n".join(fm_lines))

    # Evidence
    ev = yaml_data.get("evidence_raw") or ""
    if not ev:
        ev_dict = yaml_data.get("evidence")
        if isinstance(ev_dict, dict):
            ev = f"{ev_dict.get('citation', '')}; {ev_dict.get('finding', '')}"
    if ev:
        parts.append(f"Evidence: {ev}")

    return "\n\n".join(parts)


def regenerate_prompts() -> None:
    """Read YAML block definitions and update facilitation_prompt in method_blocks."""
    try:
        import yaml
    except ImportError:
        print("[ERROR] PyYAML not installed — cannot regenerate prompts")
        return

    if not _METHODS_DIR.exists():
        print(f"[ERROR] Methods directory not found: {_METHODS_DIR}")
        return

    conn = get_connection()
    cursor = conn.cursor()

    # Build name->id lookup from DB
    cursor.execute("SELECT id, name FROM method_blocks")
    name_to_id: dict[str, int] = {}
    for row in cursor.fetchall():
        name_to_id[row[1]] = row[0]

    updated = 0
    yaml_names_seen: set[str] = set()

    for path in sorted(_METHODS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not data:
            continue

        block_name = data.get("name", "")
        yaml_names_seen.add(block_name)
        block_id = name_to_id.get(block_name)
        if block_id is None:
            print(f"[WARN] YAML block '{block_name}' not found in DB — skipping")
            continue

        prompt = generate_facilitation_prompt(data)
        cursor.execute(
            "UPDATE method_blocks SET facilitation_prompt = ? WHERE id = ?",
            (prompt, block_id),
        )
        updated += 1

    # Fallback for blocks without YAML definitions
    for block_name, block_id in name_to_id.items():
        if block_name not in yaml_names_seen:
            cursor.execute(
                "SELECT facilitation_prompt FROM method_blocks WHERE id = ?",
                (block_id,),
            )
            existing = cursor.fetchone()
            if not existing or not existing[0]:
                fallback = f"## Current Activity Block: {block_name}\n\nFacilitate the **{block_name}** method. Guide the student step-by-step through this activity."
                cursor.execute(
                    "UPDATE method_blocks SET facilitation_prompt = ? WHERE id = ?",
                    (fallback, block_id),
                )
                updated += 1

    conn.commit()
    conn.close()
    print(f"[OK] Regenerated facilitation prompts for {updated} blocks")


def load_from_yaml() -> dict | None:
    """Load method blocks and chains from YAML specs (no Pydantic — yaml.safe_load only).

    Returns {"methods": [...], "chains": [...], "version": "..."} or None if YAML not available.
    """
    if not _METHODS_DIR.exists() or not any(_METHODS_DIR.glob("*.yaml")):
        return None

    try:
        import yaml
    except ImportError:
        print("[WARN] PyYAML not installed — falling back to hardcoded data")
        return None

    methods = []
    for path in sorted(_METHODS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if data:
            # Flatten evidence to string for DB storage
            ev = data.get("evidence")
            ev_raw = data.get("evidence_raw")
            if ev and isinstance(ev, dict):
                evidence_str = f"{ev.get('citation', '')}; {ev.get('finding', '')}"
            elif ev_raw:
                evidence_str = ev_raw
            else:
                evidence_str = None

            methods.append({
                "name": data["name"],
                "category": data["category"],
                "description": data.get("description", ""),
                "default_duration_min": data.get("default_duration_min", 5),
                "energy_cost": data.get("energy_cost", "medium"),
                "best_stage": data.get("best_stage"),
                "tags": data.get("tags", []),
                "evidence": evidence_str,
            })

    chains = []
    # Build method_id→name lookup for resolving chain block refs
    id_to_name = {}
    for path in sorted(_METHODS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if data:
            id_to_name[data["id"]] = data["name"]

    for path in sorted(_CHAINS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if data:
            # Resolve YAML method IDs (M-PRE-001) to names (Brain Dump) for DB
            block_names = [id_to_name.get(bid, bid) for bid in data.get("blocks", [])]
            chains.append({
                "name": data["name"],
                "description": data.get("description", ""),
                "blocks": block_names,
                "context_tags": data.get("context_tags", {}),
                "is_template": 1 if data.get("is_template", False) else 0,
            })

    version = "unknown"
    if _VERSION_PATH.exists():
        ver_data = yaml.safe_load(_VERSION_PATH.read_text(encoding="utf-8"))
        if ver_data:
            version = ver_data.get("version", "unknown")

    return {"methods": methods, "chains": chains, "version": version}


def _get_git_sha() -> str | None:
    """Get current git HEAD SHA (graceful failure)."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True, text=True, timeout=5,
            cwd=str(_ROOT),
        )
        if result.returncode == 0:
            return result.stdout.strip()[:12]
    except Exception:
        pass
    return None


def _insert_library_meta(conn, version: str, method_count: int, chain_count: int) -> None:
    """Insert a row into library_meta tracking this seed operation."""
    sha = _get_git_sha()
    try:
        conn.execute(
            """INSERT INTO library_meta (library_version, source_sha, method_count, chain_count)
               VALUES (?, ?, ?, ?)""",
            (version, sha, method_count, chain_count),
        )
    except Exception as e:
        # Table might not exist on older DBs — non-fatal
        print(f"[WARN] Could not insert library_meta: {e}")


def seed_methods(force: bool = False):
    """Insert/merge default method blocks and template chains (idempotent unless --force)."""
    conn = get_connection()
    cursor = conn.cursor()

    if force:
        cursor.execute("DELETE FROM method_ratings")
        cursor.execute("DELETE FROM method_chains")
        cursor.execute("DELETE FROM method_blocks")
        print("[FORCE] Cleared method_blocks, method_chains, method_ratings")

    # Current DB state (used for logging only; we merge missing items by name).
    cursor.execute("SELECT COUNT(*) FROM method_blocks")
    block_count = int(cursor.fetchone()[0] or 0)
    cursor.execute("SELECT COUNT(*) FROM method_chains WHERE COALESCE(is_template, 0) = 1")
    template_chain_count = int(cursor.fetchone()[0] or 0)
    if block_count == 0 and template_chain_count == 0:
        print("[INFO] Method library missing; seeding...")
    else:
        print(
            f"[INFO] Method library partial/exists: method_blocks={block_count}, template_chains={template_chain_count} "
            "(will merge missing items)"
        )

    # Try YAML source first, fall back to hardcoded dicts
    yaml_data = load_from_yaml()
    if yaml_data:
        methods_src = yaml_data["methods"]
        chains_src = yaml_data["chains"]
        version = yaml_data["version"]
        print(f"[YAML] Loading from YAML specs (v{version})")
    else:
        methods_src = METHOD_BLOCKS
        chains_src = TEMPLATE_CHAINS
        version = "legacy"
        print("[DICT] Loading from hardcoded data (YAML not available)")

    # Build name->id lookup + a light snapshot of existing rows (for safe patch-up updates).
    cursor.execute("PRAGMA table_info(method_blocks)")
    mb_cols = {r[1] for r in cursor.fetchall()}
    select_cols = [
        "id",
        "name",
        "category",
        "description",
        "default_duration_min",
        "energy_cost",
        "best_stage",
        "tags",
    ]
    if "evidence" in mb_cols:
        select_cols.append("evidence")

    cursor.execute(f"SELECT {', '.join(select_cols)} FROM method_blocks")
    existing_by_name = {}
    name_to_id = {}
    for row in cursor.fetchall():
        rec = dict(zip(select_cols, row))
        existing_by_name[rec["name"]] = rec
        name_to_id[rec["name"]] = rec["id"]

    inserted_blocks = 0
    updated_blocks = 0
    for block in methods_src:
        existing = existing_by_name.get(block["name"])
        if not existing:
            cursor.execute(
                """
                INSERT INTO method_blocks (name, category, description, default_duration_min, energy_cost, best_stage, tags, evidence, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """,
                (
                    block["name"],
                    block["category"],
                    block["description"],
                    block["default_duration_min"],
                    block["energy_cost"],
                    block["best_stage"],
                    json.dumps(block["tags"]),
                    block.get("evidence"),
                ),
            )
            name_to_id[block["name"]] = cursor.lastrowid
            inserted_blocks += 1
            continue

        # Conservative fix-up: only overwrite rows that look like placeholders.
        desc = (existing.get("description") or "").strip()
        tags_raw = existing.get("tags")
        tags_ok = False
        if tags_raw and tags_raw != "null":
            try:
                tags_val = json.loads(tags_raw) if isinstance(tags_raw, str) else tags_raw
                tags_ok = bool(tags_val)
            except Exception:
                tags_ok = False

        needs_update = False
        if not desc or desc.lower().startswith("test "):
            needs_update = True
        if not tags_ok:
            needs_update = True

        if needs_update:
            set_cols = [
                "category = ?",
                "description = ?",
                "default_duration_min = ?",
                "energy_cost = ?",
                "best_stage = ?",
                "tags = ?",
            ]
            values = [
                block["category"],
                block["description"],
                block["default_duration_min"],
                block["energy_cost"],
                block["best_stage"],
                json.dumps(block["tags"]),
            ]
            if "evidence" in mb_cols:
                set_cols.append("evidence = ?")
                values.append(block.get("evidence"))
            values.append(existing["id"])
            cursor.execute(
                f"UPDATE method_blocks SET {', '.join(set_cols)} WHERE id = ?",
                values,
            )
            updated_blocks += 1

    if inserted_blocks:
        print(f"[OK] Inserted {inserted_blocks} method blocks")
    else:
        print(f"[OK] No method blocks to insert (method_blocks={block_count})")

    if updated_blocks:
        print(f"[OK] Updated {updated_blocks} existing method blocks")

    # Insert template chains (resolve block names to IDs; skip duplicates)
    cursor.execute("SELECT name FROM method_chains")
    existing_chain_names = {r[0] for r in cursor.fetchall()}

    inserted_chains = 0
    for chain in chains_src:
        if chain.get("is_template", 0) != 1:
            continue
        if chain["name"] in existing_chain_names:
            continue

        missing = [b for b in chain["blocks"] if b not in name_to_id]
        if missing:
            print(f"[WARN] Skipping chain '{chain['name']}' (missing blocks: {', '.join(missing)})")
            continue

        block_ids = [name_to_id[name] for name in chain["blocks"]]
        cursor.execute(
            """
            INSERT INTO method_chains (name, description, block_ids, context_tags, is_template, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                chain["name"],
                chain["description"],
                json.dumps(block_ids),
                json.dumps(chain["context_tags"]),
                chain["is_template"],
            ),
        )
        inserted_chains += 1

    if inserted_chains:
        print(f"[OK] Inserted {inserted_chains} template chains")
    else:
        print(f"[OK] No template chains to insert (template_chains={template_chain_count})")

    # Track seed operation in library_meta (store post-seed totals for clarity).
    if force or inserted_blocks or updated_blocks or inserted_chains:
        cursor.execute("SELECT COUNT(*) FROM method_blocks")
        mb_total = int(cursor.fetchone()[0] or 0)
        cursor.execute("SELECT COUNT(*) FROM method_chains")
        mc_total = int(cursor.fetchone()[0] or 0)
        _insert_library_meta(conn, version, mb_total, mc_total)

    conn.commit()
    conn.close()


if __name__ == "__main__":
    force = "--force" in sys.argv
    migrate = "--migrate" in sys.argv
    regen_prompts = "--regenerate-prompts" in sys.argv

    if migrate:
        migrate_method_categories()
    elif regen_prompts:
        regenerate_prompts()
    else:
        seed_methods(force=force)
