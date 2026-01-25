#!/usr/bin/env python3
"""
Anki Connect integration for syncing card drafts to Anki.
Requires Anki desktop running with Anki Connect plugin installed.

Anki Connect: https://foosoft.net/projects/anki-connect/

Usage:
    python anki_sync.py --check              # Verify Anki connection
    python anki_sync.py --list-decks         # List all Anki decks
    python anki_sync.py --sync               # Sync approved cards to Anki
    python anki_sync.py --sync --dry-run     # Preview sync without changes
"""

import argparse
import json
import sqlite3
import sys
import time
from datetime import datetime
from pathlib import Path
from typing import Optional, List, Dict, Any
from urllib.error import URLError
from urllib.request import Request, urlopen

# Ensure imports work from repo root
SCRIPT_DIR = Path(__file__).resolve().parent
if str(SCRIPT_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPT_DIR))

from db_setup import get_connection, init_database

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

ANKI_CONNECT_URL = "http://localhost:8765"
ANKI_CONNECT_VERSION = 6
DEFAULT_DECK = "PT_Study"
MAX_RETRIES = 3
RETRY_DELAY_SEC = 1.0

# Card type to Anki model mapping
CARD_TYPE_TO_MODEL = {
    "basic": "Basic",
    "cloze": "Cloze",
    "reversed": "Basic (and reversed card)",
}


# ---------------------------------------------------------------------------
# Anki Connect Core Functions
# ---------------------------------------------------------------------------

def _invoke(action: str, params: Optional[Dict[str, Any]] = None, retries: int = MAX_RETRIES) -> Any:
    """
    Send a request to Anki Connect.
    
    Args:
        action: The Anki Connect action name
        params: Optional parameters for the action
        retries: Number of retry attempts for transient failures
        
    Returns:
        The result from Anki Connect
        
    Raises:
        ConnectionError: If Anki is not running or unreachable
        RuntimeError: If Anki returns an error
    """
    payload: Dict[str, Any] = {
        "action": action,
        "version": ANKI_CONNECT_VERSION,
    }
    if params:
        payload["params"] = params
    
    request_data = json.dumps(payload).encode("utf-8")
    
    for attempt in range(retries):
        try:
            req = Request(ANKI_CONNECT_URL, data=request_data)
            req.add_header("Content-Type", "application/json")
            
            with urlopen(req, timeout=10) as response:
                result = json.loads(response.read().decode("utf-8"))
            
            if result.get("error"):
                raise RuntimeError(f"Anki Connect error: {result['error']}")
            
            return result.get("result")
            
        except URLError as e:
            if attempt < retries - 1:
                time.sleep(RETRY_DELAY_SEC)
                continue
            raise ConnectionError(
                f"Cannot connect to Anki Connect at {ANKI_CONNECT_URL}. "
                "Ensure Anki is running with Anki Connect plugin installed."
            ) from e
        except Exception as e:
            if attempt < retries - 1:
                time.sleep(RETRY_DELAY_SEC)
                continue
            raise
    
    # Should not reach here, but satisfy type checker
    raise RuntimeError("All retries exhausted")


def check_connection() -> bool:
    """
    Verify Anki Connect is running and accessible.
    
    Returns:
        True if connected, False otherwise
    """
    try:
        version = _invoke("version", retries=1)
        return version is not None
    except (ConnectionError, RuntimeError):
        return False


def get_deck_names() -> List[str]:
    """
    Get all deck names from Anki.
    
    Returns:
        List of deck names
        
    Raises:
        ConnectionError: If Anki is not running
    """
    return _invoke("deckNames") or []


def ensure_deck_exists(deck_name: str) -> bool:
    """
    Create a deck if it doesn't exist.
    
    Args:
        deck_name: Name of the deck to create
        
    Returns:
        True if deck exists or was created successfully
    """
    try:
        existing = get_deck_names()
        if deck_name in existing:
            return True
        
        _invoke("createDeck", {"deck": deck_name})
        return True
    except (ConnectionError, RuntimeError) as e:
        print(f"[ERROR] Failed to ensure deck exists: {e}")
        return False


def get_model_names() -> List[str]:
    """
    Get all note type (model) names from Anki.
    
    Returns:
        List of model names
    """
    return _invoke("modelNames") or []


def add_note(
    deck_name: str,
    card_type: str,
    front: str,
    back: str,
    tags: Optional[List[str]] = None,
) -> Optional[int]:
    """
    Add a single note to Anki.
    
    Args:
        deck_name: Target deck name
        card_type: Type of card (basic, cloze, reversed)
        front: Front content (or cloze text for cloze cards)
        back: Back content (or extra text for cloze cards)
        tags: Optional list of tags
        
    Returns:
        Note ID on success, None on failure
    """
    model_name = CARD_TYPE_TO_MODEL.get(card_type.lower(), "Basic")
    
    # Build fields based on card type
    if card_type.lower() == "cloze":
        fields: Dict[str, str] = {
            "Text": front,
            "Extra": back or "",
        }
    else:
        fields = {
            "Front": front,
            "Back": back or "",
        }
    
    note: Dict[str, Any] = {
        "deckName": deck_name,
        "modelName": model_name,
        "fields": fields,
        "tags": tags or [],
        "options": {
            "allowDuplicate": False,
            "duplicateScope": "deck",
        },
    }
    
    try:
        note_id = _invoke("addNote", {"note": note})
        return note_id
    except RuntimeError as e:
        error_msg = str(e)
        if "duplicate" in error_msg.lower():
            print(f"[WARN] Duplicate note skipped: {front[:50]}...")
        else:
            print(f"[ERROR] Failed to add note: {e}")
        return None
    except ConnectionError as e:
        print(f"[ERROR] Connection lost: {e}")
        return None


def add_notes_batch(cards: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
    """
    Add multiple notes to Anki in a batch.
    
    Args:
        cards: List of card dicts with keys:
            - id: Card draft ID from database
            - deck_name: Target deck
            - card_type: basic, cloze, or reversed
            - front: Front content
            - back: Back content
            - tags: List of tags (optional)
            
    Returns:
        List of result dicts with keys:
            - card_id: Original card draft ID
            - note_id: Anki note ID (if successful)
            - success: True/False
            - error: Error message (if failed)
    """
    results: List[Dict[str, Any]] = []
    notes_to_add: List[Dict[str, Any]] = []
    card_index_map: Dict[int, Dict[str, Any]] = {}  # Map batch index to card info
    
    # Build notes for batch
    for idx, card in enumerate(cards):
        card_type = str(card.get("card_type", "basic")).lower()
        model_name = CARD_TYPE_TO_MODEL.get(card_type, "Basic")
        
        if card_type == "cloze":
            fields: Dict[str, Any] = {
                "Text": card.get("front", ""),
                "Extra": card.get("back", ""),
            }
        else:
            fields = {
                "Front": card.get("front", ""),
                "Back": card.get("back", ""),
            }
        
        # Parse tags
        raw_tags = card.get("tags", [])
        if isinstance(raw_tags, str):
            tags_list: List[str] = [t.strip() for t in raw_tags.split(",") if t.strip()]
        else:
            tags_list = list(raw_tags) if raw_tags else []
        
        note: Dict[str, Any] = {
            "deckName": card.get("deck_name", DEFAULT_DECK),
            "modelName": model_name,
            "fields": fields,
            "tags": tags_list,
            "options": {
                "allowDuplicate": False,
                "duplicateScope": "deck",
            },
        }
        
        notes_to_add.append(note)
        card_index_map[idx] = {
            "card_id": card.get("id"),
            "front_preview": card.get("front", "")[:50],
        }
    
    if not notes_to_add:
        return results
    
    try:
        # Use addNotes for batch add
        note_ids = _invoke("addNotes", {"notes": notes_to_add})
        
        for idx, note_id in enumerate(note_ids or []):
            card_info = card_index_map.get(idx, {})
            if note_id:
                results.append({
                    "card_id": card_info.get("card_id"),
                    "note_id": note_id,
                    "success": True,
                    "error": None,
                })
            else:
                results.append({
                    "card_id": card_info.get("card_id"),
                    "note_id": None,
                    "success": False,
                    "error": "Failed to add (duplicate or invalid)",
                })
                
    except ConnectionError as e:
        # All cards fail on connection error
        for card in cards:
            results.append({
                "card_id": card.get("id"),
                "note_id": None,
                "success": False,
                "error": f"Connection error: {e}",
            })
    except RuntimeError as e:
        # Try to handle partial failures
        for card in cards:
            results.append({
                "card_id": card.get("id"),
                "note_id": None,
                "success": False,
                "error": str(e),
            })
    
    return results


# ---------------------------------------------------------------------------
# Card Draft Database Functions
# ---------------------------------------------------------------------------

def get_pending_cards(status: str = "approved") -> List[Dict[str, Any]]:
    """
    Fetch cards ready for syncing from the database.
    
    Args:
        status: Card status to fetch (default: 'approved')
        
    Returns:
        List of card dicts
    """
    conn = get_connection()
    conn.row_factory = sqlite3.Row
    cursor = conn.cursor()
    
    cursor.execute("""
        SELECT id, session_id, topic_id, course_id, deck_name,
               card_type, front, back, tags, status, created_at
        FROM card_drafts
        WHERE status = ?
        ORDER BY created_at ASC
    """, (status,))
    
    cards = [dict(row) for row in cursor.fetchall()]
    conn.close()
    return cards


def update_card_status(
    card_id: int,
    status: str,
    note_id: Optional[int] = None,
    error_message: Optional[str] = None,
) -> bool:
    """
    Update a card draft's status after sync attempt.
    
    Args:
        card_id: The card draft ID
        status: New status (synced, error, etc.)
        note_id: Anki note ID if successful
        error_message: Error message if failed
        
    Returns:
        True on success
    """
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat(timespec="seconds")
    
    if status == "synced":
        cursor.execute("""
            UPDATE card_drafts
            SET status = ?, anki_note_id = ?, synced_at = ?
            WHERE id = ?
        """, (status, note_id, now, card_id))
    else:
        cursor.execute("""
            UPDATE card_drafts
            SET status = ?
            WHERE id = ?
        """, (status, card_id))
    
    conn.commit()
    conn.close()
    return True


def create_card_draft(
    front: str,
    back: str,
    card_type: str = "basic",
    deck_name: str = DEFAULT_DECK,
    tags: Optional[str] = None,
    session_id: Optional[str] = None,
    topic_id: Optional[int] = None,
    course_id: Optional[int] = None,
    status: str = "draft",
) -> Optional[int]:
    """
    Create a new card draft in the database.
    
    Returns:
        The new card draft ID, or None if failed
    """
    conn = get_connection()
    cursor = conn.cursor()
    now = datetime.now().isoformat(timespec="seconds")
    
    cursor.execute("""
        INSERT INTO card_drafts 
        (session_id, topic_id, course_id, deck_name, card_type, front, back, tags, status, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, (session_id, topic_id, course_id, deck_name, card_type, front, back, tags, status, now))
    
    card_id = cursor.lastrowid
    conn.commit()
    conn.close()
    return card_id


# ---------------------------------------------------------------------------
# Full Sync Workflow
# ---------------------------------------------------------------------------

def sync_pending_cards(
    deck_override: Optional[str] = None,
    dry_run: bool = False,
) -> Dict[str, Any]:
    """
    Full sync workflow: fetch pending → push to Anki → update status.
    
    Args:
        deck_override: Optional deck name to use for all cards
        dry_run: If True, show what would be done without making changes
        
    Returns:
        Summary dict with keys:
            - total: Total cards processed
            - synced: Successfully synced count
            - skipped: Skipped (duplicate) count
            - failed: Failed count
            - errors: List of error messages
    """
    summary: Dict[str, Any] = {
        "total": 0,
        "synced": 0,
        "skipped": 0,
        "failed": 0,
        "errors": [],
    }
    
    # Check connection first
    if not check_connection():
        summary["errors"].append("Anki Connect not available. Is Anki running?")
        return summary
    
    # Get approved cards
    cards = get_pending_cards(status="approved")
    summary["total"] = len(cards)
    
    if not cards:
        print("[INFO] No approved cards to sync.")
        return summary
    
    print(f"[INFO] Found {len(cards)} approved card(s) to sync.")
    
    if dry_run:
        print("\n[DRY RUN] Would sync the following cards:")
        for card in cards:
            deck = deck_override or card.get("deck_name", DEFAULT_DECK)
            print(f"  - [{card['card_type']}] {card['front'][:60]}... → {deck}")
        return summary
    
    # Ensure target decks exist
    deck_names: set[str] = set()
    for card in cards:
        deck = str(deck_override or card.get("deck_name", DEFAULT_DECK))
        deck_names.add(deck)
    
    for deck in deck_names:
        if not ensure_deck_exists(deck):
            summary["errors"].append(f"Failed to create deck: {deck}")
            return summary
    
    # Prepare cards for batch add
    cards_for_batch: List[Dict[str, Any]] = []
    for card in cards:
        cards_for_batch.append({
            "id": card["id"],
            "deck_name": deck_override or card.get("deck_name", DEFAULT_DECK),
            "card_type": card.get("card_type", "basic"),
            "front": card["front"],
            "back": card.get("back", ""),
            "tags": card.get("tags", ""),
        })
    
    # Sync in batch
    results = add_notes_batch(cards_for_batch)
    
    # Update database with results
    for result in results:
        card_id = result.get("card_id")
        if not card_id:
            continue
        
        if result["success"]:
            update_card_status(card_id, "synced", note_id=result.get("note_id"))
            summary["synced"] += 1
            print(f"  [OK] Card {card_id} synced (note_id: {result.get('note_id')})")
        else:
            error = result.get("error", "Unknown error")
            if "duplicate" in error.lower():
                # Mark as synced anyway (already exists)
                update_card_status(card_id, "synced")
                summary["skipped"] += 1
                print(f"  [SKIP] Card {card_id} skipped (duplicate)")
            else:
                update_card_status(card_id, "draft")  # Reset to draft for retry
                summary["failed"] += 1
                summary["errors"].append(f"Card {card_id}: {error}")
                print(f"  [FAIL] Card {card_id} failed: {error}")
    
    print(f"\n[SUMMARY] Synced: {summary['synced']}, Skipped: {summary['skipped']}, Failed: {summary['failed']}")
    return summary


# ---------------------------------------------------------------------------
# CLI Interface
# ---------------------------------------------------------------------------

def main():
    parser = argparse.ArgumentParser(
        description="Anki Connect integration for PT Study Brain",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  python anki_sync.py --check              # Verify Anki connection
  python anki_sync.py --list-decks         # List all Anki decks
  python anki_sync.py --list-models        # List all note types
  python anki_sync.py --sync               # Sync approved cards to Anki
  python anki_sync.py --sync --dry-run     # Preview sync without changes
  python anki_sync.py --sync --deck "Med"  # Sync to specific deck
  python anki_sync.py --stats              # Show card draft statistics
        """
    )
    
    parser.add_argument("--check", action="store_true", 
                        help="Check Anki Connect connection")
    parser.add_argument("--list-decks", action="store_true",
                        help="List all deck names")
    parser.add_argument("--list-models", action="store_true",
                        help="List all note type (model) names")
    parser.add_argument("--sync", action="store_true",
                        help="Sync approved cards to Anki")
    parser.add_argument("--deck", type=str, default=None,
                        help="Override deck name for all cards")
    parser.add_argument("--dry-run", action="store_true",
                        help="Show what would be synced without making changes")
    parser.add_argument("--stats", action="store_true",
                        help="Show card draft statistics")
    parser.add_argument("--create-test-card", action="store_true",
                        help="Create a test card draft for testing")
    
    args = parser.parse_args()
    
    # Initialize database
    init_database()
    
    if args.check:
        print(f"Checking Anki Connect at {ANKI_CONNECT_URL}...")
        if check_connection():
            print("[OK] Connected to Anki Connect")
            try:
                version = _invoke("version")
                print(f"  Anki Connect version: {version}")
            except Exception:
                pass
            sys.exit(0)
        else:
            print("[FAIL] Cannot connect to Anki Connect")
            print("  Make sure Anki is running with the Anki Connect plugin installed.")
            sys.exit(1)
    
    elif args.list_decks:
        if not check_connection():
            print("[FAIL] Cannot connect to Anki. Is it running?")
            sys.exit(1)
        decks = get_deck_names()
        print(f"Found {len(decks)} deck(s):")
        for deck in decks:
            print(f"  - {deck}")
    
    elif args.list_models:
        if not check_connection():
            print("[FAIL] Cannot connect to Anki. Is it running?")
            sys.exit(1)
        models = get_model_names()
        print(f"Found {len(models)} note type(s):")
        for model in models:
            print(f"  - {model}")
    
    elif args.sync:
        result = sync_pending_cards(deck_override=args.deck, dry_run=args.dry_run)
        if result["errors"] and not args.dry_run:
            sys.exit(1)
    
    elif args.stats:
        conn = get_connection()
        conn.row_factory = sqlite3.Row
        cursor = conn.cursor()
        
        try:
            cursor.execute("""
                SELECT status, COUNT(*) as count
                FROM card_drafts
                GROUP BY status
            """)
            rows = cursor.fetchall()
            
            if not rows:
                print("No card drafts in database.")
            else:
                print("Card Draft Statistics:")
                total = 0
                for row in rows:
                    print(f"  {row['status']}: {row['count']}")
                    total += row['count']
                print(f"  --------")
                print(f"  Total: {total}")
        except sqlite3.OperationalError:
            print("Card drafts table not found. Run init_database() first.")
        conn.close()
    
    elif args.create_test_card:
        card_id = create_card_draft(
            front="What is the origin of the gluteus maximus?",
            back="Posterior gluteal line of ilium, posterior surface of sacrum and coccyx, sacrotuberous ligament",
            card_type="basic",
            deck_name="PT_Study",
            tags="anatomy,gluteal,test",
            status="approved",  # Ready for sync
        )
        print(f"[OK] Created test card draft (ID: {card_id}) with status 'approved'")
        print("  Run 'python anki_sync.py --sync' to push it to Anki")
    
    else:
        parser.print_help()


if __name__ == "__main__":
    main()
