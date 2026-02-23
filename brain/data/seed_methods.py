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
import sqlite3
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
# Atomic Method Blocks (46 blocks across 6 Control Plane stages)
# ---------------------------------------------------------------------------
METHOD_BLOCKS = [
    {
        "name": "Brain Dump",
        "control_stage": "PRIME",
        "description": "Free-write everything you already know about the topic for 2-3 min. Surfaces prior knowledge and sets a baseline.",
        "default_duration_min": 3,
        "energy_cost": "low",
        "best_stage": "first_exposure",
        "tags": ["warm-up", "recall", "low-stakes"],
        "evidence": "Brod et al. (2013); prior knowledge activation improves encoding of new information",
        "icap_level": "active",
        "clt_target": "manage-intrinsic",
        "assessment_type": "recall",
        "research_terms": ["prior_knowledge_effects", "metacognitive_monitoring"],
    },
    {
        "name": "Prediction Questions",
        "control_stage": "PRIME",
        "description": "Write 3-5 questions you expect the material to answer. Creates forward hooks for active reading.",
        "default_duration_min": 3,
        "energy_cost": "low",
        "best_stage": "first_exposure",
        "tags": ["priming", "curiosity", "metacognition"],
        "evidence": "Pressley et al. (1990); question-generation primes elaborative processing",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "assessment_type": "calibration",
        "research_terms": ["elaborative_interrogation", "generation_effect"],
    },
    {
        "name": "Prior Knowledge Scan",
        "control_stage": "PRIME",
        "description": "List related concepts you already know. Identify connections to previous modules.",
        "default_duration_min": 3,
        "energy_cost": "low",
        "best_stage": "first_exposure",
        "tags": ["schema-activation", "connections"],
        "evidence": "Ausubel (1968); meaningful learning requires anchoring to existing schemas",
        "icap_level": "active",
        "clt_target": "manage-intrinsic",
        "research_terms": [
            "schema_theory",
            "advance_organizers",
            "prior_knowledge_effects",
        ],
    },
    {
        "name": "AI Skeleton Review",
        "control_stage": "PRIME",
        "description": "Have Tutor generate a topic skeleton with main headings and subheadings. Review for 2-3 min to build mental map.",
        "default_duration_min": 5,
        "energy_cost": "low",
        "best_stage": "first_exposure",
        "tags": ["overview", "structure", "ai-assisted"],
        "evidence": "Lorch & Lorch (1996); advance organizers improve text comprehension",
        "icap_level": "passive",
        "clt_target": "reduce-extraneous",
        "artifact_type": "outline",
        "research_terms": ["advance_organizers", "pretraining_principle"],
    },
    {
        "name": "Concept Cluster",
        "control_stage": "PRIME",
        "description": "Group related terms/concepts into 3-5 clusters. Identify hierarchy and relationships.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["organization", "visual", "grouping"],
        "evidence": "Bower et al. (1969); conceptual organization improves recall by 2-3x",
        "icap_level": "constructive",
        "clt_target": "manage-intrinsic",
        "artifact_type": "mindmap",
        "research_terms": ["chunking", "schema_theory", "cognitive_flexibility"],
    },
    {
        "name": "Three-Layer Chunk",
        "control_stage": "PRIME",
        "description": "Break topic into 3 layers: big picture, key details, edge cases. Process one layer at a time.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["chunking", "depth-first", "structure"],
        "evidence": "Miller (1956); Gobet et al. (2001); chunking manages cognitive load",
        "icap_level": "active",
        "clt_target": "manage-intrinsic",
        "research_terms": ["chunking", "segmenting_principle", "cognitive_load"],
    },
    {
        "name": "Pre-Test",
        "control_stage": "CALIBRATE",
        "description": "Attempt to answer questions on the topic BEFORE studying it. Getting answers wrong primes the brain to encode the correct information more deeply.",
        "default_duration_min": 5,
        "energy_cost": "low",
        "best_stage": "first_exposure",
        "tags": ["pre-testing", "priming", "desirable-difficulty"],
        "evidence": "Richland et al. (2009); Kornell et al. (2009); pre-testing primes encoding even when initial answers are wrong",
        "icap_level": "active",
        "clt_target": "increase-germane",
        "assessment_type": "calibration",
        "research_terms": [
            "pretest_posttest",
            "desirable_difficulties",
            "productive_failure",
        ],
    },
    # === ENCODE (attach meaning, create hooks) ===
    {
        "name": "KWIK Hook",
        "control_stage": "ENCODE",
        "description": "Structured 5-step encoding protocol for new terms. Sound (phonetic cue) → Function (true meaning) → Image (vivid visual tied to function) → Resonance (learner confirms it clicks) → Lock (record as card/log). Each step is gated — don't skip ahead.",
        "default_duration_min": 3,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["mnemonic", "kwik", "hook", "gated", "sop-core"],
        "evidence": "Paivio (1991); dual-coding theory — combining verbal + visual improves retention",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "cards",
        "research_terms": [
            "dual_coding",
            "generation_effect",
            "elaborative_interrogation",
        ],
    },
    {
        "name": "Seed-Lock Generation",
        "control_stage": "ENCODE",
        "description": "Learner generates their own encoding hook BEFORE the AI offers help. Start with your own association, metaphor, or mnemonic. AI only assists if you're stuck. Enforces active generation over passive reception.",
        "default_duration_min": 3,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["seed-lock", "generation-first", "active", "sop-core"],
        "evidence": "Slamecka & Graf (1978); generation effect — self-generated items remembered better than read items",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "cards",
        "research_terms": [
            "generation_effect",
            "elaborative_interrogation",
            "metacognitive_monitoring",
        ],
    },
    {
        "name": "Draw-Label",
        "control_stage": "ENCODE",
        "description": "Sketch the structure (anatomy, pathway, concept map) and label from memory. Fill gaps with source material.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "first_exposure",
        "tags": ["visual", "anatomy", "drawing", "active"],
        "evidence": "Wammes et al. (2016); drawing effect — drawing produces superior memory compared to writing",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "outline",
        "research_terms": ["dual_coding", "generation_effect", "worked_example_effect"],
    },
    {
        "name": "Teach-Back",
        "control_stage": "ENCODE",
        "description": "Explain the concept aloud as if teaching a classmate. Identify points where explanation breaks down.",
        "default_duration_min": 5,
        "energy_cost": "high",
        "best_stage": "review",
        "tags": ["verbal", "feynman", "deep-processing"],
        "evidence": "Nestojko et al. (2014); expecting to teach enhances encoding and organization",
        "icap_level": "interactive",
        "clt_target": "increase-germane",
        "research_terms": [
            "self_explanation",
            "elaborative_interrogation",
            "contingent_tutoring",
        ],
    },
    {
        "name": "Why-Chain",
        "control_stage": "ENCODE",
        "description": "Ask 'why?' 3-5 times in succession about a concept to build causal depth. Each answer becomes the premise for the next question. Based on elaborative interrogation (Dunlosky et al.).",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["elaboration", "causal", "depth", "evidence-based"],
        "evidence": "Dunlosky et al. (2013); elaborative interrogation rated moderate utility for learning",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "research_terms": [
            "elaborative_interrogation",
            "self_explanation",
            "schema_theory",
        ],
    },
    {
        "name": "Think-Aloud Protocol",
        "control_stage": "ENCODE",
        "description": "Verbalize your reasoning step-by-step while working through a problem or reading. Exposes gaps in logic and strengthens self-explanation. Based on Chi et al. self-explanation research.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["self-explanation", "metacognition", "verbal", "evidence-based"],
        "evidence": "Chi et al. (1994); self-explanation leads to deeper understanding and better problem-solving",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "research_terms": [
            "self_explanation",
            "metacognitive_monitoring",
            "cognitive_apprenticeship",
        ],
    },
    {
        "name": "Self-Explanation Protocol",
        "control_stage": "ENCODE",
        "description": "After reading each paragraph or concept, pause and explain to yourself WHY each step follows from the previous one. Focus on explaining the reasoning, not just restating facts.",
        "default_duration_min": 7,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["self-explanation", "comprehension", "causal-reasoning"],
        "evidence": "Chi et al. (1994); Dunlosky et al. (2013); self-explanation rated moderate-high utility across domains",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "research_terms": [
            "self_explanation",
            "elaborative_interrogation",
            "transfer_appropriate_processing",
        ],
    },
    {
        "name": "Mechanism Trace",
        "control_stage": "ENCODE",
        "description": "Trace the causal mechanism step-by-step: what triggers what, and why. Build a cause→effect chain from input to output. Especially useful for pathophysiology and physiological pathways.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "first_exposure",
        "tags": ["causal-reasoning", "mechanism", "pathophysiology", "transfer"],
        "evidence": "Kulasegaram et al. (2013); causal reasoning with biomedical mechanisms supports diagnostic transfer",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "flowchart",
        "research_terms": [
            "schema_theory",
            "case_based_reasoning",
            "transfer_appropriate_processing",
        ],
    },
    {
        "name": "Concept Map",
        "control_stage": "ENCODE",
        "description": "Build a node-and-link diagram showing relationships between concepts. Self-constructed maps force elaboration and reveal structural gaps. Use Mermaid syntax for dashboard editor.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "first_exposure",
        "tags": ["visual", "mermaid", "relationships", "elaboration"],
        "evidence": "Nesbit & Adesope (2006) d=0.82; self-constructed > provided (d=1.00 vs 0.37)",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "concept-map",
        "research_terms": ["concept_mapping", "schema_theory", "cognitive_flexibility"],
    },
    {
        "name": "Comparison Table",
        "control_stage": "ENCODE",
        "description": "Create a side-by-side table comparing 2-4 confusable concepts across shared features. Highlight discriminating features. Builds differential diagnosis skill.",
        "default_duration_min": 7,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["visual", "comparison", "discrimination", "table"],
        "evidence": "Alfieri et al. (2013); comparison improves discrimination and concept formation",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "comparison-table",
        "research_terms": [
            "comparison_based_learning",
            "schema_theory",
            "transfer_appropriate_processing",
        ],
    },
    {
        "name": "Process Flowchart",
        "control_stage": "ENCODE",
        "description": "Draw a sequential diagram showing a process, pathway, or algorithm. Include decision points where applicable. Use Mermaid graph TD syntax for dashboard editor.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "first_exposure",
        "tags": ["visual", "mermaid", "sequential", "procedural"],
        "evidence": "Winn (1991); spatial-sequential diagrams improve procedural understanding",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "flowchart",
        "research_terms": ["dual_coding", "worked_example_effect", "schema_theory"],
    },
    {
        "name": "Clinical Decision Tree",
        "control_stage": "ENCODE",
        "description": "Build a branching decision diagram: presentation → key findings → differential → tests → diagnosis. Scaffolds clinical reasoning into explicit decision points.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "exam_prep",
        "tags": ["visual", "mermaid", "clinical-reasoning", "decision-tree"],
        "evidence": "Charlin et al. (2000); decision trees scaffold clinical reasoning",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "decision-tree",
        "research_terms": [
            "clinical_reasoning",
            "illness_scripts",
            "case_based_reasoning",
        ],
    },
    # === RETRIEVE (test recall, strengthen pathways) ===
    {
        "name": "Free Recall Blurt",
        "control_stage": "RETRIEVE",
        "description": "Close materials. Write everything you remember about the topic. No peeking. Compare after.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["recall", "testing-effect", "self-assessment"],
        "evidence": "Roediger & Karpicke (2006); testing effect — retrieval practice > re-reading for long-term retention",
        "icap_level": "active",
        "clt_target": "increase-germane",
        "assessment_type": "recall",
        "research_terms": ["retrieval_practice", "testing_effect", "spacing_effect"],
    },
    {
        "name": "Sprint Quiz",
        "control_stage": "RETRIEVE",
        "description": "Rapid-fire Q&A with Tutor. 10-15 questions in 5 min. Track accuracy for RSR.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["quiz", "speed", "rsr", "ai-assisted"],
        "evidence": "McDaniel et al. (2007); quiz-based retrieval enhances later exam performance",
        "icap_level": "active",
        "clt_target": "increase-germane",
        "assessment_type": "recall",
        "research_terms": ["retrieval_practice", "testing_effect", "calibration"],
    },
    {
        "name": "Fill-in-Blank",
        "control_stage": "RETRIEVE",
        "description": "Review notes with key terms blanked out. Fill from memory. Targets specific vocabulary recall.",
        "default_duration_min": 5,
        "energy_cost": "low",
        "best_stage": "review",
        "tags": ["cloze", "vocabulary", "targeted"],
        "evidence": "Dunlosky et al. (2013); cloze-based retrieval is effective for factual knowledge",
        "icap_level": "active",
        "clt_target": "increase-germane",
        "assessment_type": "recall",
        "research_terms": [
            "retrieval_practice",
            "testing_effect",
            "encoding_specificity",
        ],
    },
    {
        "name": "Mixed Practice",
        "control_stage": "RETRIEVE",
        "description": "Interleave questions from 2-3 different topics in a single retrieval block. Builds discrimination and prevents blocked-practice illusion. Based on interleaving research (Rohrer et al.).",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "exam_prep",
        "tags": ["interleaving", "discrimination", "mixed", "evidence-based"],
        "evidence": "Rohrer et al. (2015); interleaved practice improves discrimination and transfer",
        "icap_level": "active",
        "clt_target": "increase-germane",
        "assessment_type": "application",
        "research_terms": [
            "interleaving",
            "contextual_interference",
            "transfer_appropriate_processing",
        ],
    },
    {
        "name": "Variable Retrieval",
        "control_stage": "RETRIEVE",
        "description": "Retrieve the same concept in 3 different formats: (1) free recall, (2) application question, (3) compare/contrast. Varied retrieval contexts build more flexible memory traces.",
        "default_duration_min": 10,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["varied-practice", "transfer", "flexible-retrieval"],
        "evidence": "Morris et al. (1977); PNAS 2024; varied retrieval practice produces more durable and transferable knowledge than constant retrieval",
        "icap_level": "active",
        "clt_target": "increase-germane",
        "assessment_type": "transfer",
        "research_terms": [
            "retrieval_practice",
            "transfer_appropriate_processing",
            "spacing_effect",
        ],
    },
    # === INTERROGATE (link to prior knowledge, apply, compare) ===
    {
        "name": "Analogy Bridge",
        "control_stage": "ENCODE",
        "description": "Create an analogy linking this concept to something familiar. Test if the analogy holds at the edges.",
        "default_duration_min": 3,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["analogy", "transfer", "creative"],
        "evidence": "Gentner (1983); analogical reasoning supports structural mapping and transfer",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "assessment_type": "transfer",
        "research_terms": [
            "transfer_appropriate_processing",
            "schema_theory",
            "cognitive_flexibility",
        ],
    },
    {
        "name": "Clinical Application",
        "control_stage": "RETRIEVE",
        "description": "Apply the concept to a clinical scenario. Ask: how would this present? What would you test? How would you treat?",
        "default_duration_min": 5,
        "energy_cost": "high",
        "best_stage": "exam_prep",
        "tags": ["clinical", "application", "pt-specific"],
        "evidence": "Schmidt & Rikers (2007); clinical application strengthens illness script formation",
        "icap_level": "interactive",
        "clt_target": "increase-germane",
        "assessment_type": "application",
        "research_terms": [
            "case_based_reasoning",
            "illness_scripts",
            "clinical_reasoning",
        ],
    },
    {
        "name": "Cross-Topic Link",
        "control_stage": "ENCODE",
        "description": "Identify 2-3 connections between this topic and topics from other courses. Look for shared principles.",
        "default_duration_min": 3,
        "energy_cost": "medium",
        "best_stage": "consolidation",
        "tags": ["integration", "cross-course", "big-picture"],
        "evidence": "Pugh & Bergin (2006); interest deepens when learners see cross-domain connections",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "research_terms": [
            "transfer_appropriate_processing",
            "schema_theory",
            "cognitive_flexibility",
        ],
    },
    {
        "name": "Side-by-Side Comparison",
        "control_stage": "ENCODE",
        "description": "Place two confusable concepts in a comparison table (features, functions, clinical signs). Identify discriminating features. Builds differential diagnosis skill.",
        "default_duration_min": 7,
        "energy_cost": "medium",
        "best_stage": "review",
        "tags": ["comparison", "discrimination", "differential", "table"],
        "evidence": "Alfieri et al. (2013); comparison-based learning improves discrimination and concept formation",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "comparison-table",
        "research_terms": [
            "comparison_based_learning",
            "schema_theory",
            "transfer_appropriate_processing",
        ],
    },
    {
        "name": "Case Walkthrough",
        "control_stage": "RETRIEVE",
        "description": "Walk through a clinical case from presentation to assessment to intervention. Apply learned concepts to patient scenarios. Builds clinical reasoning chains.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "exam_prep",
        "tags": ["clinical", "case-based", "reasoning", "application"],
        "evidence": "Thistlethwaite et al. (2012); case-based learning improves clinical reasoning in health professions",
        "icap_level": "interactive",
        "clt_target": "increase-germane",
        "assessment_type": "application",
        "research_terms": [
            "case_based_reasoning",
            "clinical_reasoning",
            "illness_scripts",
        ],
    },
    {
        "name": "Illness Script Builder",
        "control_stage": "ENCODE",
        "description": "For a condition, build the illness script: (1) enabling conditions, (2) pathophysiological fault, (3) clinical consequences. Compare your script to the textbook version.",
        "default_duration_min": 10,
        "energy_cost": "high",
        "best_stage": "first_exposure",
        "tags": ["illness-script", "clinical-reasoning", "pathology"],
        "evidence": "Schmidt & Rikers (2007); illness scripts are the cognitive structure underlying expert clinical reasoning",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "illness-script",
        "research_terms": ["illness_scripts", "case_based_reasoning", "schema_theory"],
    },
    # === REFINE (error analysis, relearning loops) ===
    {
        "name": "Error Autopsy",
        "control_stage": "OVERLEARN",
        "description": "Review errors from retrieval practice. For each error: (1) What did I say? (2) What's correct? (3) Why did I confuse them? (4) What cue will prevent this next time? Metacognitive error analysis.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "exam_prep",
        "tags": ["error-analysis", "metacognition", "correction", "evidence-based"],
        "evidence": "Metcalfe (2017); error correction with feedback is more effective than errorless learning",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "error-log",
        "research_terms": [
            "error_based_learning",
            "metacognitive_monitoring",
            "calibration",
        ],
    },
    {
        "name": "Mastery Loop",
        "control_stage": "OVERLEARN",
        "description": "Re-study items missed during retrieval, then immediately re-test. Repeat until all items are recalled correctly. Based on successive relearning (Rawson & Dunlosky).",
        "default_duration_min": 10,
        "energy_cost": "medium",
        "best_stage": "consolidation",
        "tags": ["successive-relearning", "mastery", "retest", "evidence-based"],
        "evidence": "Rawson & Dunlosky (2011); successive relearning combines testing + spacing for durable retention",
        "icap_level": "active",
        "clt_target": "increase-germane",
        "assessment_type": "recall",
        "research_terms": [
            "successive_relearning",
            "mastery_learning",
            "spacing_effect",
        ],
    },
    # === OVERLEARN (close loop, capture artifacts) ===
    {
        "name": "Exit Ticket",
        "control_stage": "OVERLEARN",
        "description": "Answer three questions: (1) What did I learn? (2) What's still muddy? (3) What's my next action?",
        "default_duration_min": 3,
        "energy_cost": "low",
        "best_stage": "consolidation",
        "tags": ["reflection", "meta", "wrap", "sop-core"],
        "evidence": "Tanner (2012); metacognitive reflection improves self-regulated learning",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "research_terms": [
            "metacognitive_monitoring",
            "calibration",
            "self_explanation",
        ],
    },
    {
        "name": "Anki Card Draft",
        "control_stage": "OVERLEARN",
        "description": "Draft 3-5 Anki cards for the session's key concepts. Use cloze or basic format. Brain syncs to Anki.",
        "default_duration_min": 5,
        "energy_cost": "low",
        "best_stage": "consolidation",
        "tags": ["anki", "spaced-repetition", "artifacts"],
        "evidence": "Kornell (2009); Cepeda et al. (2006); spaced retrieval via flashcards is high-utility",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "cards",
        "research_terms": [
            "spacing_effect",
            "retrieval_practice",
            "successive_relearning",
        ],
    },
    {
        "name": "Hand-Draw Map",
        "control_stage": "PRIME",
        "description": "Hand-draw a spatial mind map of the topic structure using own words, simple pictures, colors, and spatial positioning. Close eyes afterward to recall layout. Max 5 min, max 1-2 per session.",
        "default_duration_min": 5,
        "energy_cost": "medium",
        "best_stage": "first_exposure",
        "tags": ["spatial", "hand-draw", "mind-map", "visual", "own-words"],
        "evidence": "Wammes et al. (2016); drawing effect — 45% vs 20% recall; Fan (2023) drawing as cognitive tool; Van der Weel (2024) handwriting brain connectivity",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "notes",
        "research_terms": [
            "drawing_effect",
            "dual_coding",
            "spatial_encoding",
            "motor_encoding",
        ],
    },
    {
        "name": "Story Confidence Tag",
        "control_stage": "CALIBRATE",
        "description": "After the big-picture narrative overview, rate story-level confidence (1-3). Where does the story break down? Light-touch calibration for top-down learners — no item-level quizzing.",
        "default_duration_min": 2,
        "energy_cost": "low",
        "best_stage": "first_exposure",
        "tags": ["calibrate", "confidence", "narrative", "top-down", "metacognition"],
        "evidence": "Metcalfe (2017); calibration monitoring. Structural Learning (2023); top-down processing reduces overload for big-picture learners",
        "icap_level": "active",
        "clt_target": "reduce-extraneous",
        "artifact_type": "notes",
        "research_terms": [
            "metacognitive_monitoring",
            "calibration",
            "schema_assessment",
        ],
    },
    {
        "name": "Post-Learn Brain Dump",
        "control_stage": "OVERLEARN",
        "description": "Close all materials. Write everything remembered from the session (5 min). Then open materials, compare, identify gaps, fill with one-line annotations (2 min). Comprehensive session-level closure.",
        "default_duration_min": 7,
        "energy_cost": "medium",
        "best_stage": "consolidation",
        "tags": ["recall", "brain-dump", "metacognition", "gap-detection", "session-wrap"],
        "evidence": "RetrievalPractice.org (2017); free recall strengthens retention. Roediger & Karpicke (2006); testing effect. Karpicke & Blunt (2011); retrieval > concept mapping",
        "icap_level": "constructive",
        "clt_target": "increase-germane",
        "artifact_type": "notes",
        "research_terms": [
            "retrieval_practice",
            "free_recall",
            "metacognition",
            "testing_effect",
        ],
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
        "blocks": [
            "Brain Dump",
            "AI Skeleton Review",
            "Free Recall Blurt",
            "KWIK Hook",
            "Analogy Bridge",
            "Exit Ticket",
        ],
        "context_tags": {
            "stage": "first_exposure",
            "energy": "high",
            "time_available": 45,
        },
        "is_template": 1,
    },
    {
        "name": "Review Sprint",
        "description": "Fast review loop. Prepare → Retrieve → Interrogate → Overlearn. Skips encode for known material.",
        "blocks": [
            "Prediction Questions",
            "Sprint Quiz",
            "Cross-Topic Link",
            "Exit Ticket",
        ],
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
        "blocks": [
            "Prior Knowledge Scan",
            "Three-Layer Chunk",
            "Draw-Label",
            "Free Recall Blurt",
            "Anki Card Draft",
        ],
        "context_tags": {
            "class_type": "anatomy",
            "stage": "first_exposure",
            "energy": "high",
            "time_available": 40,
        },
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
        "blocks": [
            "Prediction Questions",
            "Mixed Practice",
            "Side-by-Side Comparison",
            "Error Autopsy",
            "Anki Card Draft",
        ],
        "context_tags": {"stage": "exam_prep", "energy": "high", "time_available": 35},
        "is_template": 1,
    },
    {
        "name": "Clinical Reasoning",
        "description": "Build clinical reasoning chains. Prepare → Interrogate → Refine → Overlearn.",
        "blocks": [
            "Prior Knowledge Scan",
            "Three-Layer Chunk",
            "Case Walkthrough",
            "Side-by-Side Comparison",
            "Error Autopsy",
            "Anki Card Draft",
        ],
        "context_tags": {
            "class_type": "clinical",
            "stage": "exam_prep",
            "energy": "high",
            "time_available": 45,
        },
        "is_template": 1,
    },
    {
        "name": "Mastery Review",
        "description": "Deep consolidation with successive relearning. Retrieve → Refine → Overlearn.",
        "blocks": [
            "Free Recall Blurt",
            "Error Autopsy",
            "Mastery Loop",
            "Anki Card Draft",
        ],
        "context_tags": {
            "stage": "consolidation",
            "energy": "medium",
            "time_available": 30,
        },
        "is_template": 1,
    },
    # --- 4 new intake-focused chains ---
    {
        "name": "Dense Anatomy Intake",
        "description": "High-detail anatomy first exposure. Pre-Test primes encoding, Draw-Label for spatial memory, retrieval before generative steps.",
        "blocks": [
            "Pre-Test",
            "Draw-Label",
            "Free Recall Blurt",
            "KWIK Hook",
            "Anki Card Draft",
        ],
        "context_tags": {
            "class_type": "anatomy",
            "stage": "first_exposure",
            "energy": "high",
            "time_available": 40,
        },
        "is_template": 1,
    },
    {
        "name": "Pathophysiology Intake",
        "description": "Pathology first exposure with mechanism tracing. Pre-Test → Self-Explanation → Concept Cluster → Retrieve → Refine.",
        "blocks": [
            "Pre-Test",
            "Self-Explanation Protocol",
            "Concept Cluster",
            "Free Recall Blurt",
            "Error Autopsy",
        ],
        "context_tags": {
            "class_type": "pathology",
            "stage": "first_exposure",
            "energy": "high",
            "time_available": 45,
        },
        "is_template": 1,
    },
    {
        "name": "Clinical Reasoning Intake",
        "description": "Clinical first exposure with illness scripts. Pre-Test → Illness Script → Compare → Retrieve → Overlearn.",
        "blocks": [
            "Pre-Test",
            "Illness Script Builder",
            "Side-by-Side Comparison",
            "Free Recall Blurt",
            "Anki Card Draft",
        ],
        "context_tags": {
            "class_type": "clinical",
            "stage": "first_exposure",
            "energy": "high",
            "time_available": 45,
        },
        "is_template": 1,
    },
    {
        "name": "Quick First Exposure",
        "description": "Minimal intake chain when time is limited. Pre-Test → AI Skeleton → Retrieve → Overlearn.",
        "blocks": [
            "Pre-Test",
            "AI Skeleton Review",
            "Free Recall Blurt",
            "Exit Ticket",
        ],
        "context_tags": {
            "stage": "first_exposure",
            "energy": "medium",
            "time_available": 20,
        },
        "is_template": 1,
    },
    {
        "name": "Visual Encoding",
        "description": "Visualization-first encoding for topics with confusable concepts. Build visual representations before retrieval.",
        "blocks": [
            "Brain Dump",
            "Concept Map",
            "Comparison Table",
            "Free Recall Blurt",
            "Exit Ticket",
        ],
        "context_tags": {
            "stage": "first_exposure",
            "energy": "high",
            "time_available": 40,
        },
        "is_template": 1,
    },
    # --- SWEEP/DEPTH chain runner chains ---
    {
        "name": "SWEEP",
        "description": "Pass 1: Fast structural understanding. Touch everything once. Produce visual maps, objectives, confusables, seed cards.",
        "blocks": [
            "Concept Cluster",
            "Concept Map",
            "Comparison Table",
            "Sprint Quiz",
            "Anki Card Draft",
        ],
        "context_tags": {
            "stage": "first_exposure",
            "pass": "sweep",
            "energy": "medium",
            "time_available": 30,
        },
        "is_template": 1,
    },
    {
        "name": "DEPTH",
        "description": "Pass 2: Selective mastery on high-priority objectives. Full PEIRRO cycle. Retrieval-driven. Cards only from errors.",
        "blocks": [
            "Pre-Test",
            "Why-Chain",
            "Mechanism Trace",
            "Clinical Application",
            "Variable Retrieval",
            "Error Autopsy",
            "Anki Card Draft",
        ],
        "context_tags": {
            "stage": "review",
            "pass": "depth",
            "energy": "high",
            "time_available": 45,
        },
        "is_template": 1,
    },
    {
        "name": "Top-Down Narrative Mastery",
        "description": "Trey's primary chain. Top-down narrative flow: H1 map → hand-draw spatial encoding → story confidence → KWIK sound-stories + analogies → One-Page Anchor → gentle story recall → Teach-back + Brain Dump. 45 min, medium energy.",
        "blocks": [
            "Hierarchical Advance Organizer",
            "Hand-Draw Map",
            "Story Confidence Tag",
            "KWIK Hook",
            "Analogy Bridge",
            "One-Page Anchor",
            "Free Recall Blurt",
            "Teach-Back",
            "Post-Learn Brain Dump",
        ],
        "context_tags": {
            "stage": "first_exposure",
            "energy": "medium",
            "time_available": 45,
            "learner_style": "top_down_narrative",
        },
        "is_template": 1,
    },
]


def generate_facilitation_prompt(yaml_data: dict) -> str:
    """Convert YAML block definition into a structured facilitation prompt for the LLM."""
    name = yaml_data.get("name", "Unknown")
    control_stage = yaml_data.get("control_stage", yaml_data.get("control_stage", ""))
    duration = yaml_data.get("default_duration_min", 5)
    description = yaml_data.get("description", "")
    stage_key = str(control_stage or "").upper().strip()

    default_inputs = {
        "PRIME": [
            "North Star objectives for current module",
            "Selected source slice for current focus",
        ],
        "CALIBRATE": [
            "Learner responses",
            "Confidence tags",
        ],
        "ENCODE": [
            "Target concept from objective map",
            "Current misconception or gap signal",
        ],
        "REFERENCE": [
            "Encoded concept summary",
            "Reference target format for downstream retrieval",
        ],
        "RETRIEVE": [
            "Reference targets or question bank",
            "Scoring rubric and confidence capture",
        ],
        "OVERLEARN": [
            "Stable retrieval targets",
            "Speed/accuracy logs from prior attempts",
        ],
    }

    default_gating_rules = {
        "PRIME": [
            "Do not assess or score the learner in PRIME.",
            "Stay at orientation level and avoid full solution reveal.",
        ],
        "CALIBRATE": [
            "Require a best attempt before giving correction.",
            "Capture confidence and accuracy for each item.",
        ],
        "ENCODE": [
            "Force active processing (explain, transform, or map), not passive reading.",
            "Keep output scoped to mapped objectives only.",
        ],
        "REFERENCE": [
            "Produce structured targets that RETRIEVE can directly test.",
            "No retrieval drills until reference targets are explicit.",
        ],
        "RETRIEVE": [
            "Require closed-note recall first, then feedback.",
            "If repeated misses occur, route back to ENCODE or REFERENCE.",
        ],
        "OVERLEARN": [
            "Run only after stable retrieval performance.",
            "Stop after cap is met to avoid burnout loops.",
        ],
    }

    default_outputs = {
        "PRIME": ["Orientation scaffold aligned to module objectives"],
        "CALIBRATE": ["Item-level accuracy and confidence baseline"],
        "ENCODE": ["Learner-generated explanation or structured encoding artifact"],
        "REFERENCE": ["Reusable reference artifact and retrieval targets"],
        "RETRIEVE": ["Recall performance with error tags and confidence"],
        "OVERLEARN": ["Fluency run summary and next review interval"],
    }

    default_stop_criteria = {
        "PRIME": ["Learner confirms big-picture orientation for current scope"],
        "CALIBRATE": ["Timebox complete and calibration signals logged"],
        "ENCODE": ["Learner can explain concept in own words with minimal support"],
        "REFERENCE": ["Reference artifact finalized and linked to targets"],
        "RETRIEVE": ["All planned prompts attempted and feedback delivered"],
        "OVERLEARN": ["Fluency cap reached or stopping threshold triggered"],
    }

    default_failure_modes = {
        "PRIME": [
            ("Scope too broad", "Reduce to objective-aligned scaffold and continue."),
            ("Drift into testing", "Return to orientation-only behavior."),
        ],
        "CALIBRATE": [
            ("Guessing without attempt", "Require best attempt before hints."),
            ("Confidence not captured", "Re-run confidence tagging for missing items."),
        ],
        "ENCODE": [
            (
                "Passive repetition",
                "Switch to self-explanation or transform-the-content prompt.",
            ),
            ("Overload", "Lower complexity and continue with one concept at a time."),
        ],
        "REFERENCE": [
            (
                "Artifact too vague for retrieval",
                "Rewrite targets into explicit prompts/answers.",
            ),
            ("Reference bloat", "Trim to objective-critical content only."),
        ],
        "RETRIEVE": [
            ("Answer leakage", "Re-enforce attempt-first then feedback."),
            ("Repeated misses", "Route back to ENCODE with targeted scaffold."),
        ],
        "OVERLEARN": [
            ("Burnout/fatigue", "Stop loop early and schedule spaced review."),
            (
                "Speed over accuracy collapse",
                "Reduce time pressure and recover accuracy first.",
            ),
        ],
    }

    default_artifact_type = {
        "PRIME": "notes",
        "CALIBRATE": "notes",
        "ENCODE": "notes",
        "REFERENCE": "notes",
        "RETRIEVE": "notes",
        "OVERLEARN": "notes",
    }

    gating_rules = None
    if "gating_rules" in yaml_data:
        gating_rules = yaml_data.get("gating_rules")
    elif "gates" in yaml_data:
        gating_rules = yaml_data.get("gates")
    elif "gating" in yaml_data:
        gating_rules = yaml_data.get("gating")

    parts: list[str] = []
    parts.append(f"## Current Activity Block: {name} ({control_stage}, ~{duration} min)")
    if description:
        parts.append(f"_{description}_")
    parts.append(
        f"\n### Your Task\nFacilitate the **{name}** protocol with the student. Follow the steps below in order and gate each one — do not skip ahead until the student completes the current step."
    )

    # Steps
    steps = yaml_data.get("steps", [])
    step_lines = ["### Steps (follow in order, gate each one)"]
    if steps:
        for s in steps:
            step_num = s.get("step", "?")
            action = s.get("action", "")
            notes = s.get("notes", "")
            step_lines.append(f"{step_num}. {action}")
            if notes:
                step_lines.append(f"   - {notes}")
    else:
        step_lines.append("1. Execute the method protocol exactly within current stage boundaries.")
    parts.append("\n".join(step_lines))

    # Inputs
    inputs = yaml_data.get("inputs", [])
    if inputs:
        parts.append("### Required Inputs\n" + "\n".join(f"- {inp}" for inp in inputs))
    else:
        stage_inputs = default_inputs.get(
            stage_key, ["Current objective scope", "Learner response context"]
        )
        parts.append("### Required Inputs\n" + "\n".join(f"- {inp}" for inp in stage_inputs))

    if gating_rules:
        if isinstance(gating_rules, list):
            parts.append(
                "### Gating Rules\n" + "\n".join(f"- {rule}" for rule in gating_rules)
            )
        elif isinstance(gating_rules, dict):
            parts.append(
                "### Gating Rules\n"
                + "\n".join(f"- {k}: {v}" for k, v in gating_rules.items())
            )
        else:
            parts.append(f"### Gating Rules\n- {gating_rules}")
    else:
        stage_rules = default_gating_rules.get(
            stage_key, ["Keep execution deterministic and stage-bounded."]
        )
        parts.append("### Gating Rules\n" + "\n".join(f"- {rule}" for rule in stage_rules))

    # Outputs
    outputs = yaml_data.get("outputs", [])
    if outputs:
        parts.append(
            "### Expected Outputs\n" + "\n".join(f"- {out}" for out in outputs)
        )
    else:
        stage_outputs = default_outputs.get(
            stage_key, ["Structured output aligned to current block."]
        )
        parts.append(
            "### Expected Outputs\n" + "\n".join(f"- {out}" for out in stage_outputs)
        )

    # Stop criteria
    stop_criteria = yaml_data.get("stop_criteria", [])
    if stop_criteria:
        parts.append(
            "### Stop Criteria\n" + "\n".join(f"- {sc}" for sc in stop_criteria)
        )
    else:
        stage_stop = default_stop_criteria.get(
            stage_key, ["Timebox complete and required outputs delivered."]
        )
        parts.append("### Stop Criteria\n" + "\n".join(f"- {sc}" for sc in stage_stop))

    # Failure modes
    failure_modes = yaml_data.get("failure_modes", [])
    fm_lines = ["### Failure Modes"]
    if failure_modes:
        for fm in failure_modes:
            if isinstance(fm, dict):
                mode = fm.get("mode", "")
                mitigation = fm.get("mitigation", "")
                fm_lines.append(f"- **{mode}** → {mitigation}")
            else:
                fm_lines.append(f"- {str(fm)}")
    else:
        stage_fm = default_failure_modes.get(
            stage_key,
            [("Unspecified failure", "Fallback to lower complexity and continue.")],
        )
        for mode, mitigation in stage_fm:
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

    # Artifact format requirements (canonical spec for machine-readable outputs)
    artifact_type = yaml_data.get("artifact_type", "")
    if not artifact_type:
        artifact_type = default_artifact_type.get(stage_key, "notes")
    parts.append(f"### Artifacts\n- artifact_type: {artifact_type}")
    if artifact_type == "cards":
        parts.append(
            "### Required Output Format (Anki Cards)\n"
            "Output ONLY card blocks in this exact line format. Do not add prose before or after cards.\n"
            "Do NOT use bullets, markdown tables, CSV, or JSON.\n"
            "When producing card drafts, use EXACTLY this format:\n"
            "```\n"
            "CARD 1:\n"
            "TYPE: basic\n"
            "FRONT: [question]\n"
            "BACK: [answer]\n"
            "TAGS: [comma-separated]\n"
            "\n"
            "CARD 2:\n"
            "TYPE: cloze\n"
            "FRONT: The {{c1::answer}} is important because...\n"
            "BACK: [answer word/phrase]\n"
            "TAGS: [comma-separated]\n"
            "```\n"
            "TYPE must be `basic` or `cloze`. FRONT and BACK are required. "
            "Cloze cards must use `{{c1::...}}` syntax in FRONT. "
            "Use uppercase labels exactly: `CARD N:`, `TYPE:`, `FRONT:`, `BACK:`, `TAGS:`."
        )
    elif artifact_type in ("concept-map", "flowchart", "decision-tree"):
        graph_dir = "LR" if artifact_type == "concept-map" else "TD"
        parts.append(
            f"### Required Output Format (Mermaid Diagram)\n"
            f"Wrap the diagram in a mermaid fence. Use `graph` (NOT `flowchart`):\n"
            f"````\n"
            f"```mermaid\n"
            f"graph {graph_dir}\n"
            f'    A["Main Topic"]\n'
            f'    B["Subtopic 1"]\n'
            f"    A -->|relates to| B\n"
            f"```\n"
            f"````\n"
            f'Node labels: `A["Label"]`. Edges: `A --> B` or `A -->|text| B`.'
        )
    elif artifact_type:
        parts.append(
            "### Required Output Format (Artifacts)\n"
            "No canonical machine-readable format is defined in the parser. "
            "Use plain text output that matches the expected outputs above."
        )

    prompt = "\n\n".join(parts)
    if len(prompt) < 200:
        prompt += (
            "\n\n### Notes\n"
            "This prompt is auto-generated from the method YAML. "
            "Fill missing sections in the YAML to improve guidance and determinism."
        )
    return prompt


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

    cursor.execute(
        "SELECT id, method_id, name, control_stage, description, default_duration_min, energy_cost, artifact_type FROM method_blocks"
    )
    id_to_block: dict[int, dict] = {}
    name_to_id: dict[str, int] = {}
    method_id_to_id: dict[str, int] = {}
    for row in cursor.fetchall():
        block = {
            "id": row[0],
            "method_id": (row[1] or "").strip(),
            "name": row[2],
            "control_stage": row[3] or "",
            "description": row[4] or "",
            "default_duration_min": row[5] or 5,
            "energy_cost": row[6] or "medium",
            "artifact_type": row[7] or "",
        }
        id_to_block[block["id"]] = block
        name_to_id[block["name"]] = block["id"]
        if block["method_id"]:
            method_id_to_id[block["method_id"]] = block["id"]

    updated = 0
    yaml_resolved_ids: set[int] = set()

    for path in sorted(_METHODS_DIR.glob("*.yaml")):
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not data:
            continue

        yaml_method_id = (data.get("id") or "").strip()
        block_name = data.get("name", "")
        block_id = method_id_to_id.get(yaml_method_id)
        if block_id is None:
            block_id = name_to_id.get(block_name)
        if block_id is None:
            if yaml_method_id:
                print(
                    f"[WARN] YAML block '{block_name}' ({yaml_method_id}) not found in DB — skipping"
                )
            else:
                print(f"[WARN] YAML block '{block_name}' not found in DB — skipping")
            continue
        yaml_resolved_ids.add(block_id)

        # Inject artifact_type from DB so format examples are embedded
        if "artifact_type" not in data:
            data["artifact_type"] = id_to_block.get(block_id, {}).get("artifact_type", "")
        prompt = generate_facilitation_prompt(data)
        cursor.execute(
            "UPDATE method_blocks SET facilitation_prompt = ? WHERE id = ?",
            (prompt, block_id),
        )
        updated += 1

    # Fallback for blocks without YAML definitions
    for block_id, base_block in id_to_block.items():
        if block_id in yaml_resolved_ids:
            continue
        prompt = generate_facilitation_prompt(base_block)
        cursor.execute(
            "UPDATE method_blocks SET facilitation_prompt = ? WHERE id = ?",
            (prompt, block_id),
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

    # Build name->artifact_type lookup from hardcoded dicts (fallback for older YAML)
    _artifact_type_lookup = {
        b["name"]: b.get("artifact_type", "") for b in METHOD_BLOCKS
    }

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

            methods.append(
                {
                    "method_id": data.get("id", ""),
                    "name": data["name"],
                    "control_stage": data["control_stage"],
                    "description": data.get("description", ""),
                    "default_duration_min": data.get("default_duration_min", 5),
                    "energy_cost": data.get("energy_cost", "medium"),
                    "best_stage": data.get("best_stage"),
                    "tags": data.get("tags", []),
                    "evidence": evidence_str,
                    "artifact_type": data.get("artifact_type")
                    or _artifact_type_lookup.get(data["name"], ""),
                    "knob_overrides_json": data.get("knobs", {}),
                }
            )

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
            chains.append(
                {
                    "name": data["name"],
                    "description": data.get("description", ""),
                    "blocks": block_names,
                    "context_tags": data.get("context_tags", {}),
                    "is_template": 1 if data.get("is_template", False) else 0,
                }
            )

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
            capture_output=True,
            text=True,
            timeout=5,
            cwd=str(_ROOT),
        )
        if result.returncode == 0:
            return result.stdout.strip()[:12]
    except Exception:
        pass
    return None


def _insert_library_meta(
    conn, version: str, method_count: int, chain_count: int
) -> None:
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


def seed_methods(force: bool = False, strict_sync: bool = False):
    """Insert/merge default method blocks and template chains.

    Args:
        force: When True, wipe method tables and reseed from source.
        strict_sync: When True, reconcile existing rows to canonical YAML values
            for runtime-critical fields (including artifact_type), not just
            placeholder rows.
    """
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
    cursor.execute(
        "SELECT COUNT(*) FROM method_chains WHERE COALESCE(is_template, 0) = 1"
    )
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
    if "method_id" not in mb_cols:
        try:
            cursor.execute("ALTER TABLE method_blocks ADD COLUMN method_id TEXT")
            mb_cols.add("method_id")
        except sqlite3.OperationalError:
            pass
    select_cols = [
        "id",
        "method_id",
        "name",
        "control_stage",
        "description",
        "default_duration_min",
        "energy_cost",
        "best_stage",
        "tags",
    ]
    if "evidence" in mb_cols:
        select_cols.append("evidence")
    if "knob_overrides_json" in mb_cols:
        select_cols.append("knob_overrides_json")

    cursor.execute(f"SELECT {', '.join(select_cols)} FROM method_blocks")
    existing_by_name = {}
    existing_by_method_id = {}
    name_to_id = {}
    for row in cursor.fetchall():
        rec = dict(zip(select_cols, row))
        existing_by_name[rec["name"]] = rec
        mid = (rec.get("method_id") or "").strip()
        if mid:
            existing_by_method_id[mid] = rec
        name_to_id[rec["name"]] = rec["id"]

    # Guardrail: remove obvious placeholder rows with missing canonical IDs.
    cursor.execute(
        """
        DELETE FROM method_blocks
        WHERE (method_id IS NULL OR LENGTH(TRIM(method_id)) = 0)
          AND LOWER(name) LIKE 'test %'
        """
    )
    deleted_placeholder_rows = int(cursor.rowcount or 0)
    if deleted_placeholder_rows:
        print(
            f"[CLEANUP] Removed {deleted_placeholder_rows} placeholder method_blocks rows without method_id"
        )

    inserted_blocks = 0
    updated_blocks = 0
    for block in methods_src:
        method_id_value = (block.get("method_id") or "").strip()
        if not method_id_value and block["name"].strip().lower().startswith("test "):
            print(
                f"[SKIP] Placeholder block '{block['name']}' has no method_id; not seeding."
            )
            continue

        existing = None
        if method_id_value:
            existing = existing_by_method_id.get(method_id_value)
        if not existing:
            existing = existing_by_name.get(block["name"])
        if not existing:
            cursor.execute(
                """
                INSERT INTO method_blocks (method_id, name, control_stage, description, default_duration_min, energy_cost, best_stage, tags, evidence, artifact_type, knob_overrides_json, created_at)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
                """,
                (
                    method_id_value,
                    block["name"],
                    block["control_stage"],
                    block["description"],
                    block["default_duration_min"],
                    block["energy_cost"],
                    block["best_stage"],
                    json.dumps(block["tags"]),
                    block.get("evidence"),
                    block.get("artifact_type", ""),
                    json.dumps(block.get("knob_overrides_json") or {}),
                ),
            )
            name_to_id[block["name"]] = cursor.lastrowid
            inserted_blocks += 1
            continue

        # Ensure canonical name can resolve to existing id even if DB row name drifted.
        name_to_id[block["name"]] = existing["id"]

        # Conservative fix-up: only overwrite rows that look like placeholders.
        desc = (existing.get("description") or "").strip()
        tags_raw = existing.get("tags")
        tags_ok = False
        if tags_raw and tags_raw != "null":
            try:
                tags_val = (
                    json.loads(tags_raw) if isinstance(tags_raw, str) else tags_raw
                )
                tags_ok = bool(tags_val)
            except Exception:
                tags_ok = False

        needs_update = False
        if not desc or desc.lower().startswith("test "):
            needs_update = True
        if not tags_ok:
            needs_update = True

        needs_method_id_update = (
            "method_id" in mb_cols
            and method_id_value
            and not (existing.get("method_id") or "")
        )

        desired_tags_json = json.dumps(block["tags"])
        existing_tags_json = tags_raw if isinstance(tags_raw, str) else json.dumps(tags_raw or [])

        strict_field_drift = False
        if strict_sync:
            strict_field_drift = any(
                [
                    (existing.get("name") or "") != block["name"],
                    (existing.get("control_stage") or "") != block["control_stage"],
                    (existing.get("description") or "") != (block["description"] or ""),
                    int(existing.get("default_duration_min") or 0)
                    != int(block["default_duration_min"] or 0),
                    (existing.get("energy_cost") or "") != (block["energy_cost"] or ""),
                    (existing.get("best_stage") or "") != (block["best_stage"] or ""),
                    existing_tags_json != desired_tags_json,
                    (
                        "evidence" in mb_cols
                        and (existing.get("evidence") or "") != (block.get("evidence") or "")
                    ),
                    (
                        "artifact_type" in mb_cols
                        and (existing.get("artifact_type") or "")
                        != (block.get("artifact_type") or "")
                    ),
                    (
                        "method_id" in mb_cols
                        and method_id_value
                        and (existing.get("method_id") or "") != method_id_value
                    ),
                    (
                        "knob_overrides_json" in mb_cols
                        and (existing.get("knob_overrides_json") or "")
                        != json.dumps(block.get("knob_overrides_json") or {})
                    ),
                ]
            )

        if needs_update or needs_method_id_update or strict_field_drift:
            set_cols = [
                "method_id = ?",
                "control_stage = ?",
                "description = ?",
                "default_duration_min = ?",
                "energy_cost = ?",
                "best_stage = ?",
                "tags = ?",
            ]
            values = [
                method_id_value,
                block["control_stage"],
                block["description"],
                block["default_duration_min"],
                block["energy_cost"],
                block["best_stage"],
                desired_tags_json,
            ]
            if strict_sync and (existing.get("name") or "") != block["name"]:
                set_cols.insert(0, "name = ?")
                values.insert(0, block["name"])
            if "evidence" in mb_cols:
                set_cols.append("evidence = ?")
                values.append(block.get("evidence"))
            if "artifact_type" in mb_cols:
                set_cols.append("artifact_type = ?")
                values.append(block.get("artifact_type", ""))
            if "knob_overrides_json" in mb_cols:
                set_cols.append("knob_overrides_json = ?")
                values.append(json.dumps(block.get("knob_overrides_json") or {}))
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

    # Insert/update template chains (resolve block names to IDs; merge by name)
    cursor.execute(
        """
        SELECT id, name, description, block_ids, context_tags, COALESCE(is_template, 0) AS is_template
        FROM method_chains
        """
    )
    existing_chains_by_name = {str(r[1]).strip().lower(): r for r in cursor.fetchall()}

    inserted_chains = 0
    updated_chains = 0
    for chain in chains_src:
        if chain.get("is_template", 0) != 1:
            continue

        missing = [b for b in chain["blocks"] if b not in name_to_id]
        if missing:
            print(
                f"[WARN] Skipping chain '{chain['name']}' (missing blocks: {', '.join(missing)})"
            )
            continue

        block_ids = [name_to_id[name] for name in chain["blocks"]]
        block_ids_json = json.dumps(block_ids)
        context_tags_json = json.dumps(chain["context_tags"])
        chain_name = chain["name"]
        chain_key = chain_name.strip().lower()

        existing = existing_chains_by_name.get(chain_key)
        if existing:
            existing_id = int(existing[0])
            existing_description = existing[2] or ""
            existing_block_ids = existing[3] or ""
            existing_context_tags = existing[4] or ""
            existing_is_template = int(existing[5] or 0)

            if (
                existing_is_template != 1
                or existing_description != chain["description"]
                or existing_block_ids != block_ids_json
                or existing_context_tags != context_tags_json
            ):
                cursor.execute(
                    """
                    UPDATE method_chains
                    SET description = ?,
                        block_ids = ?,
                        context_tags = ?,
                        is_template = 1
                    WHERE id = ?
                    """,
                    (
                        chain["description"],
                        block_ids_json,
                        context_tags_json,
                        existing_id,
                    ),
                )
                updated_chains += 1
            continue

        cursor.execute(
            """
            INSERT INTO method_chains (name, description, block_ids, context_tags, is_template, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                chain_name,
                chain["description"],
                block_ids_json,
                context_tags_json,
                chain["is_template"],
            ),
        )
        inserted_chains += 1

    if inserted_chains:
        print(f"[OK] Inserted {inserted_chains} template chains")
    else:
        print(
            f"[OK] No template chains to insert (template_chains={template_chain_count})"
        )
    if updated_chains:
        print(f"[OK] Updated {updated_chains} existing template chains")

    # Track seed operation in library_meta (store post-seed totals for clarity).
    if force or inserted_blocks or updated_blocks or inserted_chains or updated_chains:
        cursor.execute("SELECT COUNT(*) FROM method_blocks")
        mb_total = int(cursor.fetchone()[0] or 0)
        cursor.execute("SELECT COUNT(*) FROM method_chains")
        mc_total = int(cursor.fetchone()[0] or 0)
        _insert_library_meta(conn, version, mb_total, mc_total)

    conn.commit()
    conn.close()

    # Auto-populate facilitation_prompt from YAML definitions
    regenerate_prompts()


if __name__ == "__main__":
    force = "--force" in sys.argv
    strict_sync = "--strict-sync" in sys.argv
    migrate = "--migrate" in sys.argv
    regen_prompts = "--regenerate-prompts" in sys.argv

    if migrate:
        migrate_method_categories()
    elif regen_prompts:
        regenerate_prompts()
    else:
        seed_methods(force=force, strict_sync=strict_sync)
