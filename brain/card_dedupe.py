#!/usr/bin/env python3
"""
Deduplication logic for Anki card drafts.
Prevents redundant cards from cluttering the deck.

Uses difflib.SequenceMatcher for similarity (stdlib, no external dependencies).

Usage:
    python card_dedupe.py check "What is the origin of gluteus maximus?"
    python card_dedupe.py scan
    python card_dedupe.py clean --days 30 --apply
"""

import argparse
import re
import sqlite3
import string
import sys
from datetime import datetime, timedelta
from difflib import SequenceMatcher
from pathlib import Path
from typing import Optional, List, Dict, Any, Tuple

# Ensure imports work from repo root
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from db_setup import get_connection, init_database


# -----------------------------------------------------------------------------
# Text normalization and similarity
# -----------------------------------------------------------------------------

def normalize_text(text: str) -> str:
    """
    Normalize text for comparison: lowercase, strip punctuation, collapse whitespace.
    """
    if not text:
        return ""
    
    # Lowercase
    result = text.lower()
    
    # Remove punctuation (keep alphanumeric and whitespace)
    result = result.translate(str.maketrans("", "", string.punctuation))
    
    # Collapse multiple whitespace to single space and strip
    result = re.sub(r"\s+", " ", result).strip()
    
    return result


def text_similarity(a: str, b: str) -> float:
    """
    Calculate similarity ratio between two strings using SequenceMatcher.
    
    Returns:
        Similarity ratio from 0.0 (completely different) to 1.0 (identical)
    """
    if not a and not b:
        return 1.0
    if not a or not b:
        return 0.0
    
    norm_a = normalize_text(a)
    norm_b = normalize_text(b)
    
    return SequenceMatcher(None, norm_a, norm_b).ratio()


def extract_key_terms(text: str, min_length: int = 4) -> set[str]:
    """
    Extract key terms from text for semantic overlap checking.
    """
    if not text:
        return set()
    
    normalized = normalize_text(text)
    words = normalized.split()
    
    # Filter by length and remove common stopwords
    stopwords = {"what", "which", "where", "when", "that", "this", "with", "from", 
                 "have", "does", "will", "would", "could", "should", "about",
                 "into", "your", "their", "there", "than", "then", "these", "those"}
    
    return {w for w in words if len(w) >= min_length and w not in stopwords}


# -----------------------------------------------------------------------------
# Database queries for card drafts
# -----------------------------------------------------------------------------

def find_similar_cards(
    front: str,
    threshold: float = 0.85,
    deck_name: Optional[str] = None,
    limit: int = 10
) -> List[Dict[str, Any]]:
    """
    Search existing card drafts for similar fronts.
    
    Args:
        front: The front text to compare against
        threshold: Minimum similarity ratio (0.0-1.0) to include in results
        deck_name: Optional deck name to filter by
        limit: Maximum number of similar cards to return
        
    Returns:
        List of dicts with {id, front, back, deck_name, similarity, match_type}
    """
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    # Build query - fetch all non-rejected drafts for comparison
    query = """
        SELECT id, front, back, deck_name, topic_id, status, created_at
        FROM card_drafts
        WHERE status != 'rejected'
    """
    params: List[Any] = []
    
    if deck_name:
        query += " AND deck_name = ?"
        params.append(deck_name)
    
    try:
        cursor.execute(query, params)
        rows = cursor.fetchall()
    except sqlite3.OperationalError:
        # Table may not exist yet
        conn.close()
        return []
    
    conn.close()
    
    # Calculate similarity for each card
    similar: List[Dict[str, Any]] = []
    norm_front = normalize_text(front)
    front_terms = extract_key_terms(front)
    
    for row in rows:
        existing_front = row["front"] or ""
        norm_existing = normalize_text(existing_front)
        
        # Check for exact match first
        if norm_front == norm_existing:
            similar.append({
                "id": row["id"],
                "front": existing_front,
                "back": row["back"] or "",
                "deck_name": row["deck_name"] or "",
                "topic_id": row["topic_id"],
                "similarity": 1.0,
                "match_type": "exact"
            })
            continue
        
        # Calculate fuzzy similarity
        sim = SequenceMatcher(None, norm_front, norm_existing).ratio()
        
        if sim >= threshold:
            similar.append({
                "id": row["id"],
                "front": existing_front,
                "back": row["back"] or "",
                "deck_name": row["deck_name"] or "",
                "topic_id": row["topic_id"],
                "similarity": round(sim, 3),
                "match_type": "near"
            })
        elif sim >= 0.6:
            # Check for semantic overlap (same topic + overlapping terms)
            existing_terms = extract_key_terms(existing_front)
            if front_terms and existing_terms:
                term_overlap = len(front_terms & existing_terms) / max(len(front_terms | existing_terms), 1)
                
                if term_overlap >= 0.5:
                    similar.append({
                        "id": row["id"],
                        "front": existing_front,
                        "back": row["back"] or "",
                        "deck_name": row["deck_name"] or "",
                        "topic_id": row["topic_id"],
                        "similarity": round(sim, 3),
                        "match_type": "semantic",
                        "term_overlap": round(term_overlap, 3)
                    })
    
    # Sort by similarity descending and limit
    similar.sort(key=lambda x: x["similarity"], reverse=True)
    return similar[:limit]


def check_card_duplicate(
    front: str,
    deck_name: Optional[str] = None,
    threshold: float = 0.85
) -> Dict[str, Any]:
    """
    Check if a card front is a duplicate of an existing card.
    
    Returns:
        Dict with {is_duplicate, similar_cards, reason}
    """
    similar = find_similar_cards(front, threshold=threshold, deck_name=deck_name)
    
    if not similar:
        return {
            "is_duplicate": False,
            "similar_cards": [],
            "reason": None
        }
    
    # Check for exact duplicates
    exact_matches = [c for c in similar if c["match_type"] == "exact"]
    if exact_matches:
        return {
            "is_duplicate": True,
            "similar_cards": similar,
            "reason": f"Exact duplicate of card #{exact_matches[0]['id']}"
        }
    
    # Check for near duplicates
    near_matches = [c for c in similar if c["match_type"] == "near"]
    if near_matches:
        top_match = near_matches[0]
        return {
            "is_duplicate": True,
            "similar_cards": similar,
            "reason": f"Near duplicate ({top_match['similarity']:.0%} similar) of card #{top_match['id']}"
        }
    
    # Only semantic matches - warn but don't block
    return {
        "is_duplicate": False,
        "similar_cards": similar,
        "reason": f"Found {len(similar)} semantically similar card(s) - review recommended"
    }


def dedupe_batch(cards: List[Dict[str, Any]]) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Process a batch of proposed cards and separate unique from duplicates.
    
    Args:
        cards: List of card dicts with at least 'front' key
        
    Returns:
        Tuple of (unique_cards, duplicate_cards)
    """
    unique: List[Dict[str, Any]] = []
    duplicates: List[Dict[str, Any]] = []
    
    # Track fronts we've already processed in this batch
    batch_fronts: Dict[str, Dict[str, Any]] = {}  # normalized_front -> original card
    
    for card in cards:
        front = card.get("front", "")
        if not front:
            unique.append(card)
            continue
        
        norm_front = normalize_text(front)
        
        # Check against other cards in this batch first
        batch_match: Optional[Tuple[Dict[str, Any], float]] = None
        for seen_front, seen_card in batch_fronts.items():
            sim = SequenceMatcher(None, norm_front, seen_front).ratio()
            if sim >= 0.85:
                batch_match = (seen_card, sim)
                break
        
        if batch_match:
            card_copy = card.copy()
            card_copy["duplicate_of"] = f"batch:{batch_match[0].get('front', '')[:50]}"
            card_copy["similarity"] = round(batch_match[1], 3)
            card_copy["duplicate_reason"] = "Duplicate within batch"
            duplicates.append(card_copy)
            continue
        
        # Check against existing cards in database
        card_deck: Optional[str] = card.get("deck_name")
        check_result = check_card_duplicate(
            str(front) if front else "", 
            deck_name=card_deck
        )
        
        if check_result["is_duplicate"]:
            card_copy = card.copy()
            if check_result["similar_cards"]:
                top_match = check_result["similar_cards"][0]
                card_copy["duplicate_of"] = f"db:{top_match['id']}"
                card_copy["similarity"] = top_match["similarity"]
            card_copy["duplicate_reason"] = check_result["reason"]
            duplicates.append(card_copy)
        else:
            unique.append(card)
            batch_fronts[norm_front] = card
    
    return unique, duplicates


def clean_old_duplicates(days: int = 30, apply: bool = False) -> Dict[str, Any]:
    """
    Find and optionally mark old duplicate cards for cleanup.
    
    Args:
        days: Consider cards older than this many days
        apply: If True, mark duplicates as 'rejected'; otherwise dry-run
        
    Returns:
        Dict with {found, marked, details}
    """
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cutoff_date = (datetime.now() - timedelta(days=days)).isoformat()
    
    # Get old draft cards
    try:
        cursor.execute("""
            SELECT id, front, back, deck_name, topic_id, created_at
            FROM card_drafts
            WHERE status = 'draft'
            AND created_at < ?
            ORDER BY created_at ASC
        """, (cutoff_date,))
        old_cards = [dict(row) for row in cursor.fetchall()]
    except sqlite3.OperationalError:
        conn.close()
        return {"found": 0, "marked": 0, "details": []}
    
    # Find duplicates among old cards
    duplicates: List[Dict[str, Any]] = []
    seen_fronts: Dict[str, int] = {}  # normalized -> id
    
    for card in old_cards:
        front = card.get("front", "")
        norm_front = normalize_text(front)
        
        # Check if we've seen this exact front
        if norm_front in seen_fronts:
            duplicates.append({
                "id": card["id"],
                "front": front[:80],
                "duplicate_of": seen_fronts[norm_front],
                "match_type": "exact"
            })
            continue
        
        # Check for near matches
        for seen_front, seen_id in seen_fronts.items():
            sim = SequenceMatcher(None, norm_front, seen_front).ratio()
            if sim >= 0.85:
                duplicates.append({
                    "id": card["id"],
                    "front": front[:80],
                    "duplicate_of": seen_id,
                    "similarity": round(sim, 3),
                    "match_type": "near"
                })
                break
        else:
            seen_fronts[norm_front] = card["id"]
    
    marked = 0
    if apply and duplicates:
        dup_ids: List[int] = [d["id"] for d in duplicates]
        placeholders = ",".join("?" * len(dup_ids))
        cursor.execute(f"""
            UPDATE card_drafts
            SET status = 'rejected'
            WHERE id IN ({placeholders})
        """, dup_ids)
        marked = cursor.rowcount
        conn.commit()
    
    conn.close()
    
    return {
        "found": len(duplicates),
        "marked": marked,
        "details": duplicates
    }


# -----------------------------------------------------------------------------
# CLI interface
# -----------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Deduplicate Anki card drafts.",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python card_dedupe.py check "What is the origin of gluteus maximus?"
  python card_dedupe.py check "Gluteus maximus origin" --threshold 0.7
  python card_dedupe.py scan
  python card_dedupe.py clean --days 30
  python card_dedupe.py clean --days 30 --apply
        """
    )
    
    subparsers = parser.add_subparsers(dest="command", help="Command to run")
    
    # Check command
    check_parser = subparsers.add_parser("check", help="Check if a card front is a duplicate")
    check_parser.add_argument("front", help="Card front text to check")
    check_parser.add_argument("--deck", help="Limit to specific deck")
    check_parser.add_argument("--threshold", type=float, default=0.85, 
                             help="Similarity threshold (default: 0.85)")
    
    # Clean command
    clean_parser = subparsers.add_parser("clean", help="Find and clean old duplicates")
    clean_parser.add_argument("--days", type=int, default=30,
                             help="Consider cards older than N days (default: 30)")
    clean_parser.add_argument("--apply", action="store_true",
                             help="Actually mark duplicates as rejected")
    
    # Scan command
    scan_parser = subparsers.add_parser("scan", help="Scan all draft cards for duplicates")
    scan_parser.add_argument("--threshold", type=float, default=0.85,
                            help="Similarity threshold (default: 0.85)")
    
    args = parser.parse_args()
    
    # Initialize database
    init_database()
    
    if args.command == "check":
        result = check_card_duplicate(args.front, deck_name=args.deck, threshold=args.threshold)
        
        print(f"\n{'='*60}")
        print(f"Checking: \"{args.front[:60]}{'...' if len(args.front) > 60 else ''}\"")
        print(f"{'='*60}")
        
        if result["is_duplicate"]:
            print(f"\n⚠️  DUPLICATE DETECTED")
            print(f"   Reason: {result['reason']}")
        elif result["similar_cards"]:
            print(f"\n⚡ Similar cards found (not blocking)")
            print(f"   {result['reason']}")
        else:
            print(f"\n✓ No duplicates found")
        
        if result["similar_cards"]:
            print(f"\nSimilar cards:")
            for i, card in enumerate(result["similar_cards"][:5], 1):
                print(f"  {i}. [{card['match_type']}] {card['similarity']:.0%} - #{card['id']}")
                print(f"     Front: {card['front'][:60]}...")
        print()
        
    elif args.command == "clean":
        print(f"\n{'='*60}")
        print(f"Scanning for duplicates in cards older than {args.days} days")
        print(f"Mode: {'APPLY' if args.apply else 'DRY-RUN'}")
        print(f"{'='*60}\n")
        
        result = clean_old_duplicates(days=args.days, apply=args.apply)
        
        print(f"Duplicates found: {result['found']}")
        
        if result["details"]:
            print("\nDetails:")
            for d in result["details"][:10]:
                print(f"  - #{d['id']} duplicates #{d['duplicate_of']} ({d['match_type']})")
                print(f"    Front: {d['front'][:50]}...")
        
        if args.apply:
            print(f"\n✓ Marked {result['marked']} duplicates as 'rejected'")
        else:
            print(f"\n[DRY-RUN] Run with --apply to mark duplicates")
        print()
        
    elif args.command == "scan":
        print(f"\n{'='*60}")
        print(f"Scanning all draft cards for duplicates")
        print(f"Threshold: {args.threshold:.0%}")
        print(f"{'='*60}\n")
        
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute("SELECT * FROM card_drafts WHERE status = 'draft'")
            cards = [dict(row) for row in cursor.fetchall()]
        except sqlite3.OperationalError as e:
            print(f"Error: {e}")
            print("Note: card_drafts table may not exist yet.")
            conn.close()
            return
        
        conn.close()
        
        if not cards:
            print("No draft cards found.")
            return
        
        unique, duplicates = dedupe_batch(cards)
        
        print(f"Total draft cards: {len(cards)}")
        print(f"Unique cards: {len(unique)}")
        print(f"Duplicate cards: {len(duplicates)}")
        
        if duplicates:
            print("\nDuplicates found:")
            for d in duplicates[:10]:
                print(f"  - Front: {d['front'][:50]}...")
                print(f"    Reason: {d.get('duplicate_reason', 'Unknown')}")
        print()
        
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
