"""
Proposal culling logic for Scholar.

Consolidates duplicates, scores proposals, and keeps only testable ones.
"""

import sys
import os
from typing import List, Dict, Any, Tuple
from difflib import SequenceMatcher

sys.path.insert(0, os.path.join(os.path.dirname(__file__), "..", "brain"))
from db_setup import get_connection


def similarity_score(a: str, b: str) -> float:
    if not a or not b:
        return 0.0
    return SequenceMatcher(None, a.lower(), b.lower()).ratio()


def compute_proposal_score(proposal: Dict[str, Any]) -> float:
    score = 0.0
    
    evidence = proposal.get("evidence_summary") or ""
    if len(evidence) > 200:
        score += 0.3
    elif len(evidence) > 50:
        score += 0.15
    
    impact = proposal.get("expected_impact") or ""
    if len(impact) > 100:
        score += 0.25
    elif len(impact) > 30:
        score += 0.1
    
    target = proposal.get("target_system") or ""
    if target and target not in ("General", "general", ""):
        score += 0.15
    
    status = proposal.get("status") or "draft"
    if status == "review":
        score += 0.2
    elif status == "accepted":
        score += 0.3
    
    title = proposal.get("title") or ""
    if len(title) > 10 and len(title) < 100:
        score += 0.1
    
    return min(score, 1.0)


def find_duplicates(proposals: List[Dict[str, Any]], threshold: float = 0.7) -> List[Tuple[int, int, float]]:
    duplicates = []
    n = len(proposals)
    
    for i in range(n):
        for j in range(i + 1, n):
            title_sim = similarity_score(
                proposals[i].get("title", ""),
                proposals[j].get("title", "")
            )
            
            target_match = (
                proposals[i].get("target_system", "").lower() ==
                proposals[j].get("target_system", "").lower()
            )
            
            combined_score = title_sim * 0.7 + (0.3 if target_match else 0)
            
            if combined_score >= threshold:
                duplicates.append((proposals[i]["id"], proposals[j]["id"], combined_score))
    
    return duplicates


def cull_proposals(
    dry_run: bool = True,
    similarity_threshold: float = 0.7,
    keep_top_n: int = 20,
) -> Dict[str, Any]:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, title, proposal_type, status, target_system, 
               expected_impact, evidence_summary, created_at
        FROM scholar_proposals 
        WHERE status NOT IN ('superseded', 'rejected')
        ORDER BY created_at DESC
    """)
    columns = [desc[0] for desc in cursor.description]
    proposals = [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    for p in proposals:
        p["_score"] = compute_proposal_score(p)
    
    duplicates = find_duplicates(proposals, similarity_threshold)
    
    to_supersede = []
    for id1, id2, sim_score in duplicates:
        p1 = next((p for p in proposals if p["id"] == id1), None)
        p2 = next((p for p in proposals if p["id"] == id2), None)
        if p1 and p2:
            if p1["_score"] >= p2["_score"]:
                winner, loser = id1, id2
            else:
                winner, loser = id2, id1
            
            if loser not in [t[0] for t in to_supersede]:
                to_supersede.append((loser, winner, sim_score))
    
    scored_proposals = sorted(proposals, key=lambda p: p["_score"], reverse=True)
    low_scorers = []
    if len(scored_proposals) > keep_top_n:
        low_scorers = [
            p["id"] for p in scored_proposals[keep_top_n:]
            if p["status"] == "draft" and p["id"] not in [t[0] for t in to_supersede]
        ]
    
    result = {
        "total_proposals": len(proposals),
        "duplicates_found": len(duplicates),
        "to_supersede": to_supersede,
        "low_scorers_to_reject": low_scorers[:10],
        "dry_run": dry_run,
    }
    
    if not dry_run:
        superseded_count = 0
        rejected_count = 0
        
        for loser_id, winner_id, _ in to_supersede:
            cursor.execute(
                "UPDATE scholar_proposals SET status = 'superseded', superseded_by = ? WHERE id = ?",
                (winner_id, loser_id)
            )
            superseded_count += cursor.rowcount
        
        for prop_id in low_scorers[:10]:
            cursor.execute(
                "UPDATE scholar_proposals SET status = 'rejected' WHERE id = ?",
                (prop_id,)
            )
            rejected_count += cursor.rowcount
        
        conn.commit()
        result["superseded_count"] = superseded_count
        result["rejected_count"] = rejected_count
    
    conn.close()
    return result


def get_proposal_scores() -> List[Dict[str, Any]]:
    conn = get_connection()
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, title, proposal_type, status, target_system, 
               expected_impact, evidence_summary
        FROM scholar_proposals 
        WHERE status NOT IN ('superseded', 'rejected')
        ORDER BY created_at DESC
    """)
    columns = [desc[0] for desc in cursor.description]
    proposals = [dict(zip(columns, row)) for row in cursor.fetchall()]
    conn.close()
    
    for p in proposals:
        p["cull_score"] = round(compute_proposal_score(p), 3)
    
    return sorted(proposals, key=lambda p: p["cull_score"], reverse=True)


if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Cull Scholar proposals")
    parser.add_argument("--apply", action="store_true", help="Actually apply changes (default: dry run)")
    parser.add_argument("--threshold", type=float, default=0.7, help="Similarity threshold for duplicates")
    parser.add_argument("--keep", type=int, default=20, help="Keep top N proposals")
    args = parser.parse_args()
    
    result = cull_proposals(
        dry_run=not args.apply,
        similarity_threshold=args.threshold,
        keep_top_n=args.keep,
    )
    
    print(f"Total proposals: {result['total_proposals']}")
    print(f"Duplicates found: {result['duplicates_found']}")
    print(f"To supersede: {len(result['to_supersede'])}")
    print(f"Low scorers to reject: {len(result['low_scorers_to_reject'])}")
    
    if result['dry_run']:
        print("\n[DRY RUN] No changes applied. Use --apply to execute.")
    else:
        print(f"\nSuperseded: {result.get('superseded_count', 0)}")
        print(f"Rejected: {result.get('rejected_count', 0)}")
