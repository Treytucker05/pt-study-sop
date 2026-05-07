"""Effectiveness scoring for tutor session method ratings.

Replaces the hardcoded ``effectiveness=3, engagement=3`` insert in
``brain/dashboard/api_tutor_sessions.py`` with a computed signal from
verdict + mastery + retrieval at session-end.

Public API:
- ``verdict_score_5pt(verdict_dict)`` — extract a 1-5 score from a parsed
  verdict dict (the shape returned by ``brain.tutor_verdict.parse_verdict``).
  Returns ``None`` when no signal.
- ``mastery_level_5pt(session_id, conn)`` — average of touched-topic mastery
  levels mapped to 1-5. NOTE: this is a LEVEL, not a delta.
  ``topic_mastery`` has no per-session snapshot, so we approximate by mapping
  current ``avg_understanding`` of topics touched in the session. Future v2
  should add per-session mastery snapshots for true deltas.
- ``retrieval_5pt(session_id, conn)`` — average of ``tutor_accuracy_log
  .retrieval_confidence`` text values mapped (high=5, medium=3, low=1).
  Returns ``None`` when no turns logged for the session.
- ``compute_effectiveness(verdict, mastery, retrieval)`` — pure scorer
  returning 1-5. ``None`` inputs are treated as the neutral fallback
  ``NEUTRAL_FALLBACK``. All-None returns ``NEUTRAL_FALLBACK``.
- ``compute_session_signals(session_id, conn)`` — one-shot helper that runs
  all three adapters and returns the dict ``{verdict, mastery, retrieval}``.

Per-block attribution: v1 applies the session-level signal to all blocks
logged in the same session. Future v2 should refine per-block using
``tutor_block_transitions``.

Consumer audit (effectiveness reads at the time of write):
- ``brain/dashboard/method_analysis.py:43`` — ``AVG(effectiveness)`` for
  per-block summaries; threshold ``effectiveness >= 4`` for "best contexts"
  (line 69). Both queries are monotonic in the new 1-5 scale; the threshold
  still selects the top of the distribution. No code path assumed
  ``effectiveness == 3`` meant "no signal."
- ``scholar/brain_reader.py:502`` — ``get_method_effectiveness_summary``
  uses ``AVG(effectiveness)`` for the global average and per-block top
  performers (line 550). Same monotonicity argument applies. Top-performers
  query has no hard threshold beyond ``rating_count >= 1``.
- No other call sites read ``method_ratings.effectiveness`` at the time of
  this commit (verified by grep across ``brain/`` and ``scholar/``).

Neutral fallback chosen as ``2`` (not ``3``) so legacy hardcoded rows stay
distinguishable in queries that filter by exact equality.
"""

from __future__ import annotations

import json
import sqlite3
from pathlib import Path
import sys
from typing import Optional

# Ensure ``brain.tutor_verdict`` resolves whether this module is imported
# from ``brain/`` directly or from a package context.
_BRAIN_ROOT = Path(__file__).resolve().parent
if str(_BRAIN_ROOT) not in sys.path:
    sys.path.insert(0, str(_BRAIN_ROOT))

from tutor_verdict import parse_verdict  # noqa: E402

NEUTRAL_FALLBACK = 2


def verdict_score_5pt(verdict_dict: Optional[dict]) -> Optional[int]:
    """Extract a 1-5 score from a parsed verdict dict.

    Tries the canonical ``verdict`` key (``pass``/``partial``/``fail``)
    first since that is what ``parse_verdict`` actually returns from the
    LLM-emitted ``<!-- VERDICT_JSON: ... -->`` markup. Falls back to
    numeric ``score``/``quality`` or boolean ``pass``/``passed`` keys
    for resilience against future verdict shape changes.

    Returns ``None`` when no recognizable signal is present.
    """
    if not isinstance(verdict_dict, dict):
        return None

    verdict_value = verdict_dict.get("verdict")
    if verdict_value == "pass":
        return 5
    if verdict_value == "partial":
        return 3
    if verdict_value == "fail":
        return 1

    for key in ("score", "quality"):
        value = verdict_dict.get(key)
        if isinstance(value, (int, float)):
            return int(max(1, min(5, round(value))))

    for key in ("pass", "passed"):
        value = verdict_dict.get(key)
        if isinstance(value, bool):
            return 5 if value else 1

    return None


def _verdict_for_session(session_id: str, conn: sqlite3.Connection) -> Optional[int]:
    """Re-parse the most-recent verdict from this session's stored answers.

    Verdicts are emitted by the LLM as ``<!-- VERDICT_JSON: ... -->``
    markup inside the response text and persisted to ``tutor_turns.answer``.
    They are not stored in a structured column today, so we re-parse from
    text. Latest turn first, walking back until we find one with a verdict.
    """
    cur = conn.cursor()
    cur.execute(
        """SELECT answer FROM tutor_turns
           WHERE session_id = ? AND answer IS NOT NULL
           ORDER BY turn_number DESC""",
        (session_id,),
    )
    for row in cur.fetchall():
        answer = row[0]
        if not answer:
            continue
        parsed = parse_verdict(answer)
        if parsed:
            score = verdict_score_5pt(parsed)
            if score is not None:
                return score
    return None


def mastery_level_5pt(
    session_id: str, conn: sqlite3.Connection
) -> Optional[int]:
    """Average of touched-topic mastery levels mapped to 1-5.

    NOTE: this is a level, not a delta. ``topic_mastery`` does not snapshot
    per session, so we approximate. Topics "touched" by the session are
    those that appear in ``tutor_accuracy_log.topic`` for this session_id.

    Returns ``None`` when no topics were touched or no mastery rows exist.
    """
    cur = conn.cursor()
    cur.execute(
        """SELECT AVG(tm.avg_understanding) AS avg_u
             FROM topic_mastery tm
             JOIN tutor_accuracy_log tal ON tal.topic = tm.topic
            WHERE tal.session_id = ?""",
        (session_id,),
    )
    row = cur.fetchone()
    if row is None or row[0] is None:
        return None
    avg_understanding = float(row[0])  # 0.0 – 1.0
    return int(max(1, min(5, round(1 + avg_understanding * 4))))


def retrieval_5pt(
    session_id: str, conn: sqlite3.Connection
) -> Optional[int]:
    """Average of ``tutor_accuracy_log.retrieval_confidence`` mapped to 1-5.

    Mapping: ``high=5``, ``medium=3``, ``low=1``. Unrecognized values are
    skipped. Returns ``None`` when no turns are logged for the session
    or no values match the mapping.
    """
    cur = conn.cursor()
    cur.execute(
        """SELECT retrieval_confidence FROM tutor_accuracy_log
            WHERE session_id = ? AND retrieval_confidence IS NOT NULL""",
        (session_id,),
    )
    rows = cur.fetchall()
    if not rows:
        return None

    mapping = {"high": 5, "medium": 3, "low": 1}
    scores = []
    for (rc,) in rows:
        if not isinstance(rc, str):
            continue
        v = mapping.get(rc.strip().lower())
        if v is not None:
            scores.append(v)
    if not scores:
        return None
    return int(round(sum(scores) / len(scores)))


def compute_effectiveness(
    verdict: Optional[int],
    mastery: Optional[int],
    retrieval: Optional[int],
) -> int:
    """Pure scorer combining verdict + mastery + retrieval into a 1-5 score.

    Formula: ``0.5 * verdict + 0.3 * mastery + 0.2 * retrieval`` weighted
    average. ``None`` inputs are treated as the neutral fallback so a
    missing signal nudges the result toward neutral rather than dropping
    weight onto remaining signals.

    All-``None`` short-circuits to ``NEUTRAL_FALLBACK`` (currently 2)
    rather than returning the same value the formula would produce, so
    callers can distinguish "no signal at all" from "all-neutral signals."
    """
    if verdict is None and mastery is None and retrieval is None:
        return NEUTRAL_FALLBACK

    v = verdict if verdict is not None else NEUTRAL_FALLBACK
    m = mastery if mastery is not None else NEUTRAL_FALLBACK
    r = retrieval if retrieval is not None else NEUTRAL_FALLBACK

    weighted = 0.5 * v + 0.3 * m + 0.2 * r
    return int(max(1, min(5, round(weighted))))


def compute_session_signals(
    session_id: str, conn: sqlite3.Connection
) -> dict:
    """Compute all three signals for a session in one pass.

    Caller owns the connection. Returns a dict with keys ``verdict``,
    ``mastery``, ``retrieval`` whose values are int (1-5) or ``None``.
    """
    return {
        "verdict": _verdict_for_session(session_id, conn),
        "mastery": mastery_level_5pt(session_id, conn),
        "retrieval": retrieval_5pt(session_id, conn),
    }


__all__ = [
    "NEUTRAL_FALLBACK",
    "verdict_score_5pt",
    "mastery_level_5pt",
    "retrieval_5pt",
    "compute_effectiveness",
    "compute_session_signals",
]
