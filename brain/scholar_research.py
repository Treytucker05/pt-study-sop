from __future__ import annotations

import json
import logging
import re
import sqlite3
import threading
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable, Dict, List, Optional, Sequence
from urllib.parse import urlparse, urlunparse

import requests
from bs4 import BeautifulSoup

from config import DB_PATH
from learner_profile import get_profile_summary
from llm_provider import call_llm

logger = logging.getLogger(__name__)

RESEARCH_NOTEBOOK_DIR = (
    Path(__file__).resolve().parent.parent / "scholar" / "outputs" / "research_notebook"
)
SEARCH_ENDPOINT = "https://html.duckduckgo.com/html/"
REQUEST_TIMEOUT_SECONDS = 20
SEARCH_RESULT_LIMIT = 8

HIGH_TRUST_DOMAINS = {
    "pubmed.ncbi.nlm.nih.gov",
    "ncbi.nlm.nih.gov",
    "nih.gov",
    "who.int",
    "unesco.org",
    "oecd.org",
    "nature.com",
    "sciencedirect.com",
    "springer.com",
    "tandfonline.com",
}

MEDIUM_TRUST_SUFFIXES = (".org", ".edu")


def _utc_now() -> datetime:
    return datetime.now(timezone.utc)


def _utc_iso_now() -> str:
    return _utc_now().isoformat()


def _slugify(value: str) -> str:
    slug = re.sub(r"[^a-z0-9]+", "-", (value or "").lower()).strip("-")
    return slug or "investigation"


def _normalize_text(value: str) -> str:
    return re.sub(r"\s+", " ", (value or "").strip())


def _json_dumps(payload: Any) -> str:
    return json.dumps(payload, indent=2, ensure_ascii=True)


def _question_hash_seed(question_text: str, investigation_id: str) -> str:
    normalized = f"{investigation_id}|{_normalize_text(question_text)}"
    import hashlib

    return hashlib.sha256(normalized.encode("utf-8")).hexdigest()


def _connect() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    ensure_scholar_research_schema(conn)
    return conn


def ensure_scholar_research_schema(conn: sqlite3.Connection) -> None:
    cur = conn.cursor()
    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_investigations (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            investigation_id TEXT NOT NULL UNIQUE,
            title TEXT NOT NULL,
            query_text TEXT NOT NULL,
            rationale TEXT NOT NULL,
            audience_type TEXT NOT NULL DEFAULT 'learner',
            mode TEXT NOT NULL DEFAULT 'brain',
            status TEXT NOT NULL DEFAULT 'queued',
            source_policy TEXT NOT NULL DEFAULT 'trusted-first',
            confidence TEXT NOT NULL DEFAULT 'low',
            uncertainty_summary TEXT,
            linked_profile_snapshot_id TEXT,
            requested_by TEXT NOT NULL DEFAULT 'ui',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            started_at TEXT,
            completed_at TEXT,
            run_notes TEXT,
            output_markdown TEXT,
            error_message TEXT
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_investigations_status
        ON scholar_investigations(status)
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_investigations_updated
        ON scholar_investigations(updated_at DESC)
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_sources (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_id TEXT NOT NULL UNIQUE,
            investigation_id TEXT NOT NULL,
            url TEXT NOT NULL,
            normalized_url TEXT NOT NULL,
            domain TEXT NOT NULL,
            title TEXT,
            publisher TEXT,
            published_at TEXT,
            snippet TEXT,
            source_type TEXT NOT NULL DEFAULT 'web',
            trust_tier TEXT NOT NULL DEFAULT 'general',
            rank_order INTEGER NOT NULL DEFAULT 0,
            fetched_at TEXT,
            created_at TEXT NOT NULL,
            FOREIGN KEY(investigation_id) REFERENCES scholar_investigations(investigation_id)
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_sources_investigation
        ON scholar_sources(investigation_id)
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_sources_domain
        ON scholar_sources(domain)
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_findings (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            finding_id TEXT NOT NULL UNIQUE,
            investigation_id TEXT NOT NULL,
            title TEXT NOT NULL,
            summary TEXT NOT NULL,
            relevance TEXT,
            confidence TEXT NOT NULL DEFAULT 'low',
            uncertainty TEXT,
            learner_visible INTEGER NOT NULL DEFAULT 1,
            source_ids_json TEXT NOT NULL DEFAULT '[]',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY(investigation_id) REFERENCES scholar_investigations(investigation_id)
        )
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_findings_investigation
        ON scholar_findings(investigation_id)
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS scholar_questions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            question_id TEXT NOT NULL UNIQUE,
            question_hash TEXT NOT NULL UNIQUE,
            question_text TEXT NOT NULL,
            source TEXT NOT NULL,
            status TEXT NOT NULL DEFAULT 'pending',
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            answered_at TEXT,
            answer_text TEXT,
            answer_source TEXT,
            status_updated_at TEXT,
            status_reason TEXT
        )
        """
    )

    cur.execute("PRAGMA table_info(scholar_questions)")
    existing_cols = {col[1] for col in cur.fetchall()}
    required_question_cols = {
        "question_id": "TEXT",
        "question_hash": "TEXT",
        "question_text": "TEXT",
        "source": "TEXT",
        "status": "TEXT",
        "created_at": "TEXT",
        "updated_at": "TEXT",
        "answered_at": "TEXT",
        "answer_text": "TEXT",
        "answer_source": "TEXT",
        "status_updated_at": "TEXT",
        "status_reason": "TEXT",
        "audience_type": "TEXT DEFAULT 'learner'",
        "rationale": "TEXT",
        "is_blocking": "INTEGER DEFAULT 0",
        "linked_investigation_id": "TEXT",
        "evidence_needed": "TEXT",
        "answer_incorporation_status": "TEXT DEFAULT 'pending'",
        "answer_incorporated_at": "TEXT",
    }
    for col_name, col_type in required_question_cols.items():
        if col_name not in existing_cols:
            cur.execute(f"ALTER TABLE scholar_questions ADD COLUMN {col_name} {col_type}")

    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_questions_question_id
        ON scholar_questions(question_id)
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_questions_hash
        ON scholar_questions(question_hash)
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_questions_status
        ON scholar_questions(status)
        """
    )
    cur.execute(
        """
        CREATE INDEX IF NOT EXISTS idx_scholar_questions_investigation
        ON scholar_questions(linked_investigation_id)
        """
    )


def _normalize_url(url: str) -> str:
    parsed = urlparse((url or "").strip())
    cleaned = parsed._replace(query="", fragment="")
    return urlunparse(cleaned)


def _trust_tier_for_domain(domain: str) -> str:
    domain = (domain or "").lower()
    if not domain:
        return "general"
    if domain in HIGH_TRUST_DOMAINS or domain.endswith(".gov") or domain.endswith(".edu"):
        return "high"
    if any(domain.endswith(suffix) for suffix in MEDIUM_TRUST_SUFFIXES):
        return "medium"
    return "general"


def _sorted_by_trust(results: Sequence[Dict[str, Any]]) -> List[Dict[str, Any]]:
    priority = {"high": 0, "medium": 1, "general": 2}
    return sorted(
        results,
        key=lambda item: (
            priority.get(item.get("trust_tier", "general"), 3),
            item.get("rank_order", 999),
        ),
    )


def search_web(query_text: str, limit: int = SEARCH_RESULT_LIMIT) -> List[Dict[str, Any]]:
    query_text = _normalize_text(query_text)
    if not query_text:
        return []

    response = requests.post(
        SEARCH_ENDPOINT,
        data={"q": query_text},
        headers={"User-Agent": "TreyStudyScholar/1.0"},
        timeout=REQUEST_TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "lxml")

    results: List[Dict[str, Any]] = []
    seen_urls: set[str] = set()
    for idx, node in enumerate(soup.select(".result"), start=1):
        anchor = node.select_one(".result__title a") or node.select_one("a.result__a")
        if not anchor:
            continue
        href = anchor.get("href") or ""
        if not href.startswith("http"):
            continue
        normalized_url = _normalize_url(href)
        if normalized_url in seen_urls:
            continue
        seen_urls.add(normalized_url)
        snippet_node = node.select_one(".result__snippet")
        domain = urlparse(normalized_url).netloc.lower()
        results.append(
            {
                "title": _normalize_text(anchor.get_text(" ", strip=True)),
                "url": href,
                "normalized_url": normalized_url,
                "snippet": _normalize_text(snippet_node.get_text(" ", strip=True))
                if snippet_node
                else "",
                "domain": domain,
                "publisher": domain,
                "trust_tier": _trust_tier_for_domain(domain),
                "rank_order": idx,
                "source_type": "web",
            }
        )
        if len(results) >= limit:
            break

    return _sorted_by_trust(results)


def fetch_source_document(result: Dict[str, Any]) -> Dict[str, Any]:
    url = str(result.get("url") or "").strip()
    if not url:
        raise ValueError("source url required")

    response = requests.get(
        url,
        headers={"User-Agent": "TreyStudyScholar/1.0"},
        timeout=REQUEST_TIMEOUT_SECONDS,
        allow_redirects=True,
    )
    response.raise_for_status()
    soup = BeautifulSoup(response.text, "lxml")

    title = (
        soup.title.get_text(" ", strip=True)
        if soup.title and soup.title.get_text(" ", strip=True)
        else result.get("title")
    )
    publisher = (
        (soup.find("meta", attrs={"property": "og:site_name"}) or {}).get("content")
        or (soup.find("meta", attrs={"name": "application-name"}) or {}).get("content")
        or result.get("publisher")
    )
    published_at = (
        (soup.find("meta", attrs={"property": "article:published_time"}) or {}).get(
            "content"
        )
        or (soup.find("meta", attrs={"name": "citation_publication_date"}) or {}).get(
            "content"
        )
        or ""
    )
    description = (
        (soup.find("meta", attrs={"name": "description"}) or {}).get("content")
        or (soup.find("meta", attrs={"property": "og:description"}) or {}).get(
            "content"
        )
        or ""
    )

    paragraphs = [
        _normalize_text(node.get_text(" ", strip=True))
        for node in soup.select("article p, main p, p")
    ]
    paragraphs = [paragraph for paragraph in paragraphs if len(paragraph) >= 60][:4]
    snippet_parts = [description] if description else []
    snippet_parts.extend(paragraphs)
    snippet = _normalize_text(" ".join(snippet_parts))[:1400]

    normalized_url = _normalize_url(response.url or url)
    domain = urlparse(normalized_url).netloc.lower()
    return {
        "title": _normalize_text(str(title or result.get("title") or domain)),
        "url": url,
        "normalized_url": normalized_url,
        "domain": domain,
        "publisher": _normalize_text(str(publisher or domain)),
        "published_at": _normalize_text(str(published_at)),
        "snippet": snippet or _normalize_text(str(result.get("snippet") or "")),
        "source_type": str(result.get("source_type") or "web"),
        "trust_tier": _trust_tier_for_domain(domain),
        "rank_order": int(result.get("rank_order") or 0),
        "fetched_at": _utc_iso_now(),
    }


def _extract_json_object(raw_text: str) -> Dict[str, Any]:
    stripped = (raw_text or "").strip()
    if not stripped:
        return {}
    try:
        return json.loads(stripped)
    except json.JSONDecodeError:
        match = re.search(r"\{[\s\S]*\}", stripped)
        if not match:
            return {}
        return json.loads(match.group(0))


def _default_question_payload(
    investigation_id: str,
    question_text: str,
    *,
    rationale: str,
    evidence_needed: str,
    is_blocking: bool,
    source: str = "scholar-research",
    audience_type: str = "learner",
) -> Dict[str, Any]:
    question_hash = _question_hash_seed(question_text, investigation_id)
    now = _utc_iso_now()
    return {
        "question_id": question_hash[:24],
        "question_hash": question_hash,
        "question_text": _normalize_text(question_text),
        "source": source,
        "status": "pending",
        "created_at": now,
        "updated_at": now,
        "audience_type": audience_type,
        "rationale": _normalize_text(rationale),
        "is_blocking": 1 if is_blocking else 0,
        "linked_investigation_id": investigation_id,
        "evidence_needed": _normalize_text(evidence_needed),
        "answer_incorporation_status": "pending",
    }


def _fallback_synthesis(
    investigation: Dict[str, Any],
    source_rows: Sequence[Dict[str, Any]],
    learner_profile: Optional[Dict[str, Any]],
) -> Dict[str, Any]:
    findings: List[Dict[str, Any]] = []
    for row in source_rows[:3]:
        findings.append(
            {
                "title": row.get("title") or row.get("publisher") or "Source finding",
                "summary": row.get("snippet")
                or "Scholar collected this source as relevant to the active investigation.",
                "relevance": f"Source from {row.get('publisher') or row.get('domain')}",
                "confidence": "medium" if row.get("trust_tier") == "high" else "low",
                "uncertainty": "Needs synthesis across multiple sources.",
                "source_ids": [row["source_id"]],
            }
        )

    questions: List[Dict[str, Any]] = []
    if not source_rows:
        questions.append(
            _default_question_payload(
                investigation["investigation_id"],
                "What exact outcome should Scholar optimize for in this investigation?",
                rationale="Scholar could not find enough trustworthy sources to synthesize a useful answer.",
                evidence_needed="A narrower target outcome or stronger search terms.",
                is_blocking=True,
            )
        )
    elif learner_profile and learner_profile.get("hybridArchetype", {}).get(
        "confidence"
    ) == "low":
        questions.append(
            _default_question_payload(
                investigation["investigation_id"],
                f"Brain currently sees {learner_profile['hybridArchetype']['label']}. Does that match how studying has felt this week?",
                rationale="The learner profile is still low-confidence, so Scholar needs direct calibration.",
                evidence_needed="Learner-reported fit or contradiction.",
                is_blocking=False,
            )
        )

    confidence = "medium" if len(source_rows) >= 3 else "low"
    uncertainty_summary = (
        "Scholar found some relevant sources, but this investigation still needs stronger evidence."
        if source_rows
        else "Scholar could not find enough trustworthy sources to answer confidently."
    )
    return {
        "confidence": confidence,
        "uncertainty_summary": uncertainty_summary,
        "findings": findings,
        "questions": questions,
    }


def _synthesise_with_llm(
    investigation: Dict[str, Any],
    source_rows: Sequence[Dict[str, Any]],
    learner_profile: Optional[Dict[str, Any]],
    llm_fn: Callable[..., Dict[str, Any]],
) -> Dict[str, Any]:
    source_payload = [
        {
            "source_id": row["source_id"],
            "title": row.get("title"),
            "publisher": row.get("publisher"),
            "published_at": row.get("published_at"),
            "trust_tier": row.get("trust_tier"),
            "url": row.get("url"),
            "snippet": row.get("snippet"),
        }
        for row in source_rows
    ]
    learner_context = learner_profile or {}
    system_prompt = """You are Scholar, the research partner in Trey's Study System.

You are synthesizing cited findings for a learner-facing investigation. Stay inside research mode:
- do not teach course content
- do not fabricate certainty
- preserve uncertainty when the evidence is weak or conflicting
- ground every finding in the provided sources

Return strict JSON with this shape:
{
  "confidence": "low|medium|high",
  "uncertainty_summary": "...",
  "findings": [
    {
      "title": "...",
      "summary": "...",
      "relevance": "...",
      "confidence": "low|medium|high",
      "uncertainty": "...",
      "source_ids": ["source-id-1", "source-id-2"]
    }
  ],
  "questions": [
    {
      "question_text": "...",
      "rationale": "...",
      "evidence_needed": "...",
      "is_blocking": true
    }
  ]
}

Use 2-4 findings. Use 0-3 questions. Only include questions when the learner needs to answer or clarify something important."""

    user_prompt = _json_dumps(
        {
            "investigation": {
                "title": investigation["title"],
                "query_text": investigation["query_text"],
                "rationale": investigation["rationale"],
                "audience_type": investigation["audience_type"],
            },
            "learner_profile": {
                "hybridArchetype": learner_context.get("hybridArchetype"),
                "summaryCards": learner_context.get("summaryCards", []),
            },
            "sources": source_payload,
        }
    )

    llm_result = llm_fn(system_prompt, user_prompt, timeout=60)
    if not llm_result.get("success") or not llm_result.get("content"):
        raise RuntimeError(llm_result.get("error") or "Scholar synthesis failed")
    payload = _extract_json_object(str(llm_result["content"]))
    if not payload:
        raise RuntimeError("Scholar synthesis returned invalid JSON")
    return payload


def _render_audit_markdown(
    investigation: Dict[str, Any],
    findings: Sequence[Dict[str, Any]],
    questions: Sequence[Dict[str, Any]],
    sources: Sequence[Dict[str, Any]],
) -> str:
    lines = [
        f"# Scholar Investigation — {investigation['title']}",
        "",
        f"- Investigation ID: `{investigation['investigation_id']}`",
        f"- Status: `{investigation['status']}`",
        f"- Audience: `{investigation['audience_type']}`",
        f"- Query: {investigation['query_text']}",
        f"- Rationale: {investigation['rationale']}",
        f"- Confidence: `{investigation.get('confidence') or 'low'}`",
    ]
    if investigation.get("uncertainty_summary"):
        lines.extend(["", "## Uncertainty", investigation["uncertainty_summary"]])

    lines.extend(["", "## Findings"])
    if findings:
        for finding in findings:
            lines.append(
                f"- **{finding['title']}** ({finding.get('confidence') or 'low'}) — {finding['summary']}"
            )
            if finding.get("relevance"):
                lines.append(f"  - Relevance: {finding['relevance']}")
            if finding.get("uncertainty"):
                lines.append(f"  - Uncertainty: {finding['uncertainty']}")
    else:
        lines.append("- None yet.")

    lines.extend(["", "## Questions"])
    if questions:
        for question in questions:
            lines.append(f"- {question['question_text']}")
            if question.get("rationale"):
                lines.append(f"  - Why: {question['rationale']}")
    else:
        lines.append("- None.")

    lines.extend(["", "## Sources"])
    if sources:
        for source in sources:
            lines.append(
                f"- [{source.get('title') or source.get('url')}]({source.get('url')}) — {source.get('publisher') or source.get('domain')} ({source.get('trust_tier')})"
            )
    else:
        lines.append("- None.")
    return "\n".join(lines) + "\n"


def _write_audit_mirror(investigation: Dict[str, Any], markdown: str) -> None:
    RESEARCH_NOTEBOOK_DIR.mkdir(parents=True, exist_ok=True)
    timestamp = datetime.now().strftime("%Y-%m-%d_%H%M%S")
    filename = f"investigation_{timestamp}_{_slugify(investigation['title'])}.md"
    (RESEARCH_NOTEBOOK_DIR / filename).write_text(markdown, encoding="utf-8")


def _serialize_investigation_row(
    row: sqlite3.Row, *, conn: Optional[sqlite3.Connection] = None
) -> Dict[str, Any]:
    payload = dict(row)
    payload["findings_count"] = 0
    payload["open_question_count"] = 0
    if conn:
        cur = conn.cursor()
        cur.execute(
            "SELECT COUNT(*) FROM scholar_findings WHERE investigation_id = ?",
            (payload["investigation_id"],),
        )
        payload["findings_count"] = int(cur.fetchone()[0] or 0)
        cur.execute(
            """
            SELECT COUNT(*)
            FROM scholar_questions
            WHERE linked_investigation_id = ?
              AND status = 'pending'
            """,
            (payload["investigation_id"],),
        )
        payload["open_question_count"] = int(cur.fetchone()[0] or 0)
    return payload


def _serialize_source_row(row: sqlite3.Row) -> Dict[str, Any]:
    return dict(row)


def _load_sources_for_investigation(
    conn: sqlite3.Connection, investigation_id: str
) -> Dict[str, Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute(
        """
        SELECT
            source_id,
            investigation_id,
            url,
            normalized_url,
            domain,
            title,
            publisher,
            published_at,
            snippet,
            source_type,
            trust_tier,
            rank_order,
            fetched_at,
            created_at
        FROM scholar_sources
        WHERE investigation_id = ?
        ORDER BY rank_order ASC, created_at ASC
        """,
        (investigation_id,),
    )
    return {row["source_id"]: _serialize_source_row(row) for row in cur.fetchall()}


def _serialize_question_row(row: sqlite3.Row) -> Dict[str, Any]:
    payload = dict(row)
    payload["question"] = payload.get("question_text") or ""
    payload["context"] = payload.get("rationale") or ""
    payload["dataInsufficient"] = payload.get("evidence_needed") or ""
    payload["researchAttempted"] = payload.get("linked_investigation_id") or ""
    payload["is_blocking"] = bool(payload.get("is_blocking"))
    return payload


def _serialize_finding_row(
    row: sqlite3.Row, source_map: Optional[Dict[str, Dict[str, Any]]] = None
) -> Dict[str, Any]:
    payload = dict(row)
    try:
        source_ids = json.loads(payload.get("source_ids_json") or "[]")
    except json.JSONDecodeError:
        source_ids = []
    payload["source_ids"] = source_ids
    payload["sources"] = [
        source_map[source_id]
        for source_id in source_ids
        if source_map and source_id in source_map
    ]
    return payload


def list_investigations(limit: int = 20) -> List[Dict[str, Any]]:
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            SELECT *
            FROM scholar_investigations
            ORDER BY updated_at DESC, created_at DESC
            LIMIT ?
            """,
            (int(limit),),
        )
        return [_serialize_investigation_row(row, conn=conn) for row in cur.fetchall()]
    finally:
        conn.close()


def get_investigation(investigation_id: str) -> Optional[Dict[str, Any]]:
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM scholar_investigations WHERE investigation_id = ? LIMIT 1",
            (investigation_id,),
        )
        row = cur.fetchone()
        if not row:
            return None

        payload = _serialize_investigation_row(row, conn=conn)
        source_map = _load_sources_for_investigation(conn, investigation_id)

        cur.execute(
            """
            SELECT *
            FROM scholar_findings
            WHERE investigation_id = ?
            ORDER BY created_at ASC
            """,
            (investigation_id,),
        )
        payload["findings"] = [
            _serialize_finding_row(finding_row, source_map)
            for finding_row in cur.fetchall()
        ]

        cur.execute(
            """
            SELECT *
            FROM scholar_questions
            WHERE linked_investigation_id = ?
            ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'answered' THEN 1 ELSE 2 END, updated_at DESC
            """,
            (investigation_id,),
        )
        payload["questions"] = [
            _serialize_question_row(question_row) for question_row in cur.fetchall()
        ]
        payload["sources"] = list(source_map.values())
        return payload
    finally:
        conn.close()


def list_questions(status: Optional[str] = None, limit: int = 100) -> List[Dict[str, Any]]:
    conn = _connect()
    try:
        cur = conn.cursor()
        params: List[Any] = []
        where = ""
        if status and status != "all":
            where = "WHERE status = ?"
            params.append(status)
        params.append(int(limit))
        cur.execute(
            f"""
            SELECT *
            FROM scholar_questions
            {where}
            ORDER BY CASE status WHEN 'pending' THEN 0 WHEN 'answered' THEN 1 ELSE 2 END, updated_at DESC
            LIMIT ?
            """,
            params,
        )
        return [_serialize_question_row(row) for row in cur.fetchall()]
    finally:
        conn.close()


def list_findings(
    investigation_id: Optional[str] = None, limit: int = 50
) -> List[Dict[str, Any]]:
    conn = _connect()
    try:
        cur = conn.cursor()
        params: List[Any] = []
        where = ""
        if investigation_id:
            where = "WHERE investigation_id = ?"
            params.append(investigation_id)
        params.append(int(limit))
        cur.execute(
            f"""
            SELECT *
            FROM scholar_findings
            {where}
            ORDER BY updated_at DESC, created_at DESC
            LIMIT ?
            """,
            params,
        )
        rows = cur.fetchall()
        if investigation_id:
            source_map = _load_sources_for_investigation(conn, investigation_id)
        else:
            cur.execute("SELECT * FROM scholar_sources ORDER BY created_at DESC LIMIT 200")
            source_map = {
                row["source_id"]: _serialize_source_row(row) for row in cur.fetchall()
            }
        return [_serialize_finding_row(row, source_map) for row in rows]
    finally:
        conn.close()


def _upsert_question(conn: sqlite3.Connection, payload: Dict[str, Any]) -> None:
    now = _utc_iso_now()
    cur = conn.cursor()
    cur.execute(
        """
        INSERT INTO scholar_questions (
            question_id,
            question_hash,
            question_text,
            source,
            status,
            created_at,
            updated_at,
            audience_type,
            rationale,
            is_blocking,
            linked_investigation_id,
            evidence_needed,
            answer_incorporation_status
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ON CONFLICT(question_hash) DO UPDATE SET
            question_text = excluded.question_text,
            source = excluded.source,
            updated_at = excluded.updated_at,
            audience_type = excluded.audience_type,
            rationale = excluded.rationale,
            is_blocking = excluded.is_blocking,
            linked_investigation_id = excluded.linked_investigation_id,
            evidence_needed = excluded.evidence_needed
        """,
        (
            payload["question_id"],
            payload["question_hash"],
            payload["question_text"],
            payload.get("source") or "scholar-research",
            payload.get("status") or "pending",
            payload.get("created_at") or now,
            now,
            payload.get("audience_type") or "learner",
            payload.get("rationale") or "",
            int(payload.get("is_blocking") or 0),
            payload.get("linked_investigation_id") or "",
            payload.get("evidence_needed") or "",
            payload.get("answer_incorporation_status") or "pending",
        ),
    )


def submit_question_answer(question_id: str, answer: str, source: str = "user") -> Dict[str, Any]:
    answer = _normalize_text(answer)
    if not answer:
        raise ValueError("answer is required")

    conn = _connect()
    try:
        now = _utc_iso_now()
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE scholar_questions
            SET answer_text = ?,
                answer_source = ?,
                status = 'answered',
                answered_at = ?,
                updated_at = ?,
                status_updated_at = ?,
                answer_incorporation_status = 'ready_for_refresh'
            WHERE question_id = ? OR CAST(id AS TEXT) = ?
            """,
            (answer, source, now, now, now, question_id, question_id),
        )
        if cur.rowcount == 0:
            raise LookupError("Question not found")
        cur.execute(
            """
            SELECT *
            FROM scholar_questions
            WHERE question_id = ? OR CAST(id AS TEXT) = ?
            LIMIT 1
            """,
            (question_id, question_id),
        )
        row = cur.fetchone()
        conn.commit()
        if not row:
            return {"success": True, "question_id": question_id}
        payload = _serialize_question_row(row)
        payload["success"] = True
        return payload
    finally:
        conn.close()


def _persist_sources(
    conn: sqlite3.Connection, investigation_id: str, sources: Sequence[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    stored: List[Dict[str, Any]] = []
    for idx, source in enumerate(sources, start=1):
        source_id = f"{investigation_id}-src-{idx:02d}"
        record = {
            "source_id": source_id,
            "investigation_id": investigation_id,
            "url": source["url"],
            "normalized_url": source.get("normalized_url") or _normalize_url(source["url"]),
            "domain": source.get("domain") or urlparse(source["url"]).netloc.lower(),
            "title": source.get("title") or source.get("url"),
            "publisher": source.get("publisher") or source.get("domain") or "",
            "published_at": source.get("published_at") or "",
            "snippet": source.get("snippet") or "",
            "source_type": source.get("source_type") or "web",
            "trust_tier": source.get("trust_tier") or "general",
            "rank_order": int(source.get("rank_order") or idx),
            "fetched_at": source.get("fetched_at") or _utc_iso_now(),
            "created_at": _utc_iso_now(),
        }
        cur.execute(
            """
            INSERT INTO scholar_sources (
                source_id,
                investigation_id,
                url,
                normalized_url,
                domain,
                title,
                publisher,
                published_at,
                snippet,
                source_type,
                trust_tier,
                rank_order,
                fetched_at,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(source_id) DO UPDATE SET
                title = excluded.title,
                publisher = excluded.publisher,
                published_at = excluded.published_at,
                snippet = excluded.snippet,
                trust_tier = excluded.trust_tier,
                fetched_at = excluded.fetched_at
            """,
            (
                record["source_id"],
                record["investigation_id"],
                record["url"],
                record["normalized_url"],
                record["domain"],
                record["title"],
                record["publisher"],
                record["published_at"],
                record["snippet"],
                record["source_type"],
                record["trust_tier"],
                record["rank_order"],
                record["fetched_at"],
                record["created_at"],
            ),
        )
        stored.append(record)
    return stored


def _persist_findings(
    conn: sqlite3.Connection, investigation_id: str, findings: Sequence[Dict[str, Any]]
) -> List[Dict[str, Any]]:
    cur = conn.cursor()
    cur.execute("DELETE FROM scholar_findings WHERE investigation_id = ?", (investigation_id,))
    now = _utc_iso_now()
    stored: List[Dict[str, Any]] = []
    for idx, finding in enumerate(findings, start=1):
        finding_id = f"{investigation_id}-finding-{idx:02d}"
        source_ids = finding.get("source_ids") or []
        cur.execute(
            """
            INSERT INTO scholar_findings (
                finding_id,
                investigation_id,
                title,
                summary,
                relevance,
                confidence,
                uncertainty,
                learner_visible,
                source_ids_json,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                finding_id,
                investigation_id,
                finding.get("title") or f"Finding {idx}",
                finding.get("summary") or "",
                finding.get("relevance") or "",
                finding.get("confidence") or "low",
                finding.get("uncertainty") or "",
                1,
                json.dumps(source_ids),
                now,
                now,
            ),
        )
        stored.append(
            {
                "finding_id": finding_id,
                "investigation_id": investigation_id,
                "title": finding.get("title") or f"Finding {idx}",
                "summary": finding.get("summary") or "",
                "relevance": finding.get("relevance") or "",
                "confidence": finding.get("confidence") or "low",
                "uncertainty": finding.get("uncertainty") or "",
                "source_ids": source_ids,
                "created_at": now,
                "updated_at": now,
            }
        )
    return stored


def create_investigation(
    *,
    title: str,
    query_text: str,
    rationale: str,
    audience_type: str = "learner",
    mode: str = "brain",
    requested_by: str = "ui",
    linked_profile_snapshot_id: Optional[str] = None,
) -> Dict[str, Any]:
    query_text = _normalize_text(query_text)
    rationale = _normalize_text(rationale)
    title = _normalize_text(title) or query_text
    if not query_text:
        raise ValueError("query_text is required")
    if not rationale:
        raise ValueError("rationale is required")

    now = _utc_iso_now()
    investigation_id = f"scholar-inv-{datetime.now().strftime('%Y%m%d%H%M%S%f')}"
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            """
            INSERT INTO scholar_investigations (
                investigation_id,
                title,
                query_text,
                rationale,
                audience_type,
                mode,
                status,
                source_policy,
                confidence,
                linked_profile_snapshot_id,
                requested_by,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, 'queued', 'trusted-first', 'low', ?, ?, ?, ?)
            """,
            (
                investigation_id,
                title,
                query_text,
                rationale,
                audience_type or "learner",
                mode or "brain",
                linked_profile_snapshot_id,
                requested_by or "ui",
                now,
                now,
            ),
        )
        conn.commit()
        cur.execute(
            "SELECT * FROM scholar_investigations WHERE investigation_id = ?",
            (investigation_id,),
        )
        row = cur.fetchone()
        return _serialize_investigation_row(row, conn=conn)
    finally:
        conn.close()


def run_investigation_sync(
    investigation_id: str,
    *,
    search_fn: Callable[[str, int], List[Dict[str, Any]]] = search_web,
    fetch_fn: Callable[[Dict[str, Any]], Dict[str, Any]] = fetch_source_document,
    llm_fn: Callable[..., Dict[str, Any]] = call_llm,
) -> Dict[str, Any]:
    conn = _connect()
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT * FROM scholar_investigations WHERE investigation_id = ? LIMIT 1",
            (investigation_id,),
        )
        investigation_row = cur.fetchone()
        if not investigation_row:
            raise LookupError("Investigation not found")

        investigation = dict(investigation_row)
        now = _utc_iso_now()
        cur.execute(
            """
            UPDATE scholar_investigations
            SET status = 'running',
                started_at = COALESCE(started_at, ?),
                updated_at = ?
            WHERE investigation_id = ?
            """,
            (now, now, investigation_id),
        )
        conn.commit()

        learner_profile = get_profile_summary(
            conn,
            user_id="default",
            force_refresh=False,
        )
        search_results = search_fn(investigation["query_text"], SEARCH_RESULT_LIMIT)
        fetched_sources: List[Dict[str, Any]] = []
        for result in search_results[:SEARCH_RESULT_LIMIT]:
            try:
                fetched_sources.append(fetch_fn(result))
            except Exception as exc:
                logger.warning(
                    "Scholar source fetch failed for %s: %s", result.get("url"), exc
                )

        cur.execute("DELETE FROM scholar_sources WHERE investigation_id = ?", (investigation_id,))
        persisted_sources = _persist_sources(conn, investigation_id, fetched_sources)

        try:
            synthesis = _synthesise_with_llm(
                investigation, persisted_sources, learner_profile, llm_fn
            )
        except Exception as exc:
            logger.warning(
                "Scholar synthesis fallback for %s: %s", investigation_id, exc
            )
            synthesis = _fallback_synthesis(
                investigation, persisted_sources, learner_profile
            )

        cur.execute(
            "DELETE FROM scholar_questions WHERE linked_investigation_id = ?",
            (investigation_id,),
        )
        available_source_ids = [source["source_id"] for source in persisted_sources]
        normalized_findings = []
        for finding in synthesis.get("findings", []):
            source_ids = [
                source_id
                for source_id in (finding.get("source_ids") or [])
                if source_id in available_source_ids
            ]
            if not source_ids and available_source_ids:
                source_ids = available_source_ids[: min(2, len(available_source_ids))]
            normalized_findings.append({**finding, "source_ids": source_ids})
        stored_findings = _persist_findings(
            conn, investigation_id, normalized_findings
        )
        question_payloads = synthesis.get("questions", [])
        stored_questions: List[Dict[str, Any]] = []
        for item in question_payloads:
            if item.get("question_hash"):
                payload = item
            else:
                payload = _default_question_payload(
                    investigation_id,
                    item.get("question_text")
                    or "What additional learner context does Scholar still need?",
                    rationale=item.get("rationale")
                    or "Scholar needs more context before recommending a stronger direction.",
                    evidence_needed=item.get("evidence_needed") or "",
                    is_blocking=bool(item.get("is_blocking")),
                    audience_type=investigation.get("audience_type") or "learner",
                )
            _upsert_question(conn, payload)
            stored_questions.append(payload)

        confidence = synthesis.get("confidence") or "low"
        uncertainty_summary = synthesis.get("uncertainty_summary") or ""
        final_status = (
            "blocked" if any(q.get("is_blocking") for q in stored_questions) else "completed"
        )
        investigation.update(
            {
                "status": final_status,
                "confidence": confidence,
                "uncertainty_summary": uncertainty_summary,
                "linked_profile_snapshot_id": learner_profile.get("snapshotId")
                if learner_profile
                else investigation.get("linked_profile_snapshot_id"),
            }
        )

        markdown = _render_audit_markdown(
            investigation, stored_findings, stored_questions, persisted_sources
        )
        cur.execute(
            """
            UPDATE scholar_investigations
            SET status = ?,
                confidence = ?,
                uncertainty_summary = ?,
                linked_profile_snapshot_id = ?,
                completed_at = ?,
                updated_at = ?,
                output_markdown = ?,
                run_notes = ?
            WHERE investigation_id = ?
            """,
            (
                final_status,
                confidence,
                uncertainty_summary,
                investigation.get("linked_profile_snapshot_id"),
                _utc_iso_now(),
                _utc_iso_now(),
                markdown,
                f"Sources collected: {len(persisted_sources)}; findings: {len(stored_findings)}; questions: {len(stored_questions)}",
                investigation_id,
            ),
        )
        conn.commit()
        _write_audit_mirror(investigation, markdown)
        return get_investigation(investigation_id) or {}
    except Exception as exc:
        conn.rollback()
        cur = conn.cursor()
        cur.execute(
            """
            UPDATE scholar_investigations
            SET status = 'failed',
                error_message = ?,
                updated_at = ?
            WHERE investigation_id = ?
            """,
            (str(exc), _utc_iso_now(), investigation_id),
        )
        conn.commit()
        raise
    finally:
        conn.close()


def start_investigation_run(
    *,
    title: str,
    query_text: str,
    rationale: str,
    audience_type: str = "learner",
    mode: str = "brain",
    requested_by: str = "ui",
) -> Dict[str, Any]:
    conn = _connect()
    try:
        learner_profile = get_profile_summary(
            conn,
            user_id="default",
            force_refresh=False,
        )
    finally:
        conn.close()
    profile_snapshot_id = learner_profile.get("snapshotId") if learner_profile else None
    investigation = create_investigation(
        title=title,
        query_text=query_text,
        rationale=rationale,
        audience_type=audience_type,
        mode=mode,
        requested_by=requested_by,
        linked_profile_snapshot_id=profile_snapshot_id,
    )

    def _runner() -> None:
        try:
            run_investigation_sync(investigation["investigation_id"])
        except Exception as exc:
            logger.exception("Scholar investigation failed: %s", exc)

    threading.Thread(target=_runner, daemon=True).start()
    return investigation
