"""
Seed scholar_hypotheses with research-backed pattern hypotheses.

These hypotheses derive from the 11 research categories in sop/library/16-research-terms.md.
They give Scholar concrete starting points for investigating module/chain effectiveness.

Run: python scholar/seed_hypotheses.py
     python scholar/seed_hypotheses.py --force   # delete existing hypotheses first
"""

import sys
import os

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "brain"))
from db_setup import get_connection


SEED_HYPOTHESES = [
    {
        "pattern_detected": "High-ICAP modules (constructive/interactive) produce better recall than low-ICAP (passive/active) at review",
        "explanation": "ICAP Framework predicts: Interactive > Constructive > Active > Passive for learning outcomes. Modules like Teach-Back and Why-Chain (constructive/interactive) should outperform AI Skeleton Review (passive) on RSR metrics.",
        "metrics_involved": "rsr_percent, understanding_level, effectiveness",
        "status": "draft",
        "evidence_strength": "strong",
    },
    {
        "pattern_detected": "Interleaved practice chains produce better discrimination but lower session confidence than blocked chains",
        "explanation": "Contextual interference: Mixed Practice creates desirable difficulty. Sessions feel harder (lower confidence) but produce better discrimination at exam_prep. Calibration gap should be smaller for interleaved chains.",
        "metrics_involved": "calibration_gap, retention_confidence, error_rate",
        "status": "draft",
        "evidence_strength": "strong",
    },
    {
        "pattern_detected": "Seed-Lock (generation-first) modules show slower session progress but higher 48h retention",
        "explanation": "Generation effect (Slamecka & Graf 1978): Self-generated hooks are remembered better than received ones. Seed-Lock Generation may feel slower during session but should show higher RSR at spaced review.",
        "metrics_involved": "rsr_percent, time_cost, cognitive_load",
        "status": "draft",
        "evidence_strength": "strong",
    },
    {
        "pattern_detected": "Pre-Test modules at chain start improve encoding in subsequent blocks even when pre-test answers are wrong",
        "explanation": "Productive failure (Kapur) + pretesting effect (Richland et al. 2009): Getting answers wrong before studying primes the brain to encode corrections more deeply. Chains starting with Pre-Test should show higher learning_gain.",
        "metrics_involved": "learning_gain, understanding_level",
        "status": "draft",
        "evidence_strength": "moderate",
    },
    {
        "pattern_detected": "Three-Layer Chunk reduces cognitive overload signals compared to un-chunked first-exposure",
        "explanation": "Segmenting principle (CLT): Breaking complex topics into layers (big picture -> details -> edge cases) manages intrinsic load. Sessions using Three-Layer Chunk should show lower cognitive_strain and fewer errors_conceptual.",
        "metrics_involved": "cognitive_load, errors_conceptual",
        "status": "draft",
        "evidence_strength": "strong",
    },
    {
        "pattern_detected": "Error Autopsy + Mastery Loop combo outperforms simple re-study for persistent weak anchors",
        "explanation": "Successive relearning (Rawson & Dunlosky 2011) combined with metacognitive error analysis (Metcalfe 2017): The refine phase combo should clear weak_anchors more efficiently than re-reading or re-watching.",
        "metrics_involved": "weak_anchors, rsr_percent, error_recurrence",
        "status": "draft",
        "evidence_strength": "strong",
    },
    {
        "pattern_detected": "Expertise reversal: Scaffold-heavy modules help novices but slow down advanced learners",
        "explanation": "Expertise reversal effect (Kalyuga et al. 2003): As mastery grows, detailed worked examples and scaffolding become redundant and add extraneous load. Advanced learners should switch to retrieval-heavy chains.",
        "metrics_involved": "cognitive_load, time_cost, understanding_level",
        "status": "draft",
        "evidence_strength": "strong",
    },
    {
        "pattern_detected": "Concept Map modules produce higher transfer scores than linear note-taking modules",
        "explanation": "Concept maps force elaboration and relationship-building (Nesbit & Adesope 2006, d=0.82). Self-constructed maps should outperform passive notes on clinical application and cross-topic link tasks.",
        "metrics_involved": "understanding_level, artifact_quality",
        "status": "draft",
        "evidence_strength": "strong",
    },
    {
        "pattern_detected": "Variable Retrieval produces more durable recall than single-format retrieval",
        "explanation": "Encoding variability + transfer-appropriate processing: Retrieving the same concept in 3 formats (free recall, application, compare/contrast) builds more flexible memory traces than repeated identical retrieval.",
        "metrics_involved": "rsr_percent, retention_confidence",
        "status": "draft",
        "evidence_strength": "moderate",
    },
    {
        "pattern_detected": "Self-explanation modules improve retention more for pathophysiology content than anatomy content",
        "explanation": "Self-explanation is most effective for causal/mechanistic content (Chi et al. 1994). Pathophysiology involves causal chains (cause -> mechanism -> clinical consequence) that benefit from self-explanation. Pure anatomy may benefit more from visual/spatial modules.",
        "metrics_involved": "understanding_level, rsr_percent",
        "status": "draft",
        "evidence_strength": "moderate",
    },
    {
        "pattern_detected": "Sessions with calibration checks show faster convergence of confidence to accuracy over time",
        "explanation": "Metacognitive monitoring (Nelson & Narens): Explicit JOL prompts followed by calibration feedback train learners to become more accurate in self-assessment. calibration_gap should decrease faster for sessions with explicit calibration checks.",
        "metrics_involved": "calibration_gap, retention_confidence",
        "status": "draft",
        "evidence_strength": "moderate",
    },
    {
        "pattern_detected": "SWEEP then DEPTH chain pair produces better outcomes than single long-chain sessions",
        "explanation": "Two-pass approach leverages spacing + retrieval: SWEEP builds structural overview, DEPTH targets specific weak spots. The gap between passes provides a natural spacing interval. Combined metrics should exceed single-chain of equivalent total time.",
        "metrics_involved": "rsr_percent, understanding_level, time_cost",
        "status": "draft",
        "evidence_strength": "moderate",
    },
]


def seed_hypotheses(force: bool = False):
    conn = get_connection()
    cursor = conn.cursor()

    if force:
        cursor.execute("DELETE FROM scholar_hypotheses")
        print("[FORCE] Cleared scholar_hypotheses table")

    cursor.execute("SELECT pattern_detected FROM scholar_hypotheses")
    existing = {row[0] for row in cursor.fetchall()}

    inserted = 0
    for hyp in SEED_HYPOTHESES:
        if hyp["pattern_detected"] in existing:
            continue

        cursor.execute(
            """
            INSERT INTO scholar_hypotheses 
            (pattern_detected, explanation, metrics_involved, status, evidence_strength, created_at)
            VALUES (?, ?, ?, ?, ?, datetime('now'))
            """,
            (
                hyp["pattern_detected"],
                hyp["explanation"],
                hyp["metrics_involved"],
                hyp["status"],
                hyp["evidence_strength"],
            ),
        )
        inserted += 1

    conn.commit()
    conn.close()

    if inserted:
        print(f"[OK] Seeded {inserted} research-backed hypotheses")
    else:
        print("[OK] No new hypotheses to seed (all already exist)")


if __name__ == "__main__":
    force = "--force" in sys.argv
    seed_hypotheses(force=force)
