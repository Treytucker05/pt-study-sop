import json
import re
from datetime import datetime
from typing import Any, Dict, List, Optional

from ingest_session import _parse_json_payloads
from llm_provider import call_llm

SECTION_KEYS = ("A", "B", "C", "D")


def is_wrap_format(raw_text: str) -> bool:
    if not isinstance(raw_text, str):
        return False
    text = raw_text.strip()
    if not text:
        return False
    score = 0
    if re.search(r"(?im)^\s*(?:#+\s*)?section\s*[ABCD]\b", text):
        score += 2
    if re.search(r"(?im)^\s*[ABCD]\s*[:\)\-]\s*", text):
        score += 2
    # v9.3 format: "### A) Title" style headers
    if re.search(r"(?im)^\s*#+\s*[ABCD]\s*\)", text):
        score += 2
    # v9.3 marker: "Obsidian Notes Pack" in Section A header
    if re.search(r"(?im)obsidian\s*notes?\s*pack", text):
        score += 2
    if re.search(r"(?im)^\s*front\s*:", text) and re.search(r"(?im)^\s*back\s*:", text):
        score += 2
    if re.search(r"(?im)\bWRAP\b", text):
        score += 1
    if re.search(r"(?im)^\s*R[1-4]\s*[:=\-]", text):
        score += 1
    if re.search(r"(?im)```json", text):
        score += 1
    return score >= 2


def parse_wrap(raw_text: str, use_llm: bool = True) -> dict:
    if not isinstance(raw_text, str):
        return {}

    sections = _split_sections(raw_text)
    if not sections:
        if re.search(r"(?im)^\s*front\s*:", raw_text):
            sections["B"] = raw_text
        if re.search(r"(?im)```json|\{", raw_text):
            sections["D"] = raw_text
    if not sections and use_llm:
        sections = _fallback_parse_sections(raw_text)
    if not sections:
        sections["A"] = raw_text

    section_a = sections.get("A", "").strip()
    section_b = sections.get("B", "").strip()
    section_c = sections.get("C", "").strip()
    section_d = sections.get("D", "").strip()

    if not section_d:
        section_d = _extract_json_section(raw_text)

    metadata = _extract_metadata(section_a, section_d)

    wrap = {
        "section_a": {"raw": section_a, "metadata": metadata},
        "section_b": extract_anki_cards({"section_b": section_b}),
        "section_c": extract_spaced_schedule({"section_c": section_c}),
        "section_d": extract_json_logs({"section_d": section_d, "raw": raw_text}),
    }
    wrap["tutor_issues"] = extract_tutor_issues(wrap, use_llm=use_llm)
    wrap["metadata"] = metadata
    wrap["raw_sections"] = sections
    return wrap


def extract_obsidian_notes(wrap: dict) -> str:
    section_a = (wrap.get("section_a") or {}).get("raw", "")
    metadata = (wrap.get("section_a") or {}).get("metadata", {})

    header_lines = []
    if metadata.get("session_id"):
        header_lines.append(f"- Session ID: {metadata['session_id']}")
    if metadata.get("date"):
        header_lines.append(f"- Date: {metadata['date']}")
    if metadata.get("course"):
        header_lines.append(f"- Course: {metadata['course']}")
    if metadata.get("topic"):
        header_lines.append(f"- Topic: {metadata['topic']}")
    if metadata.get("mode"):
        header_lines.append(f"- Mode: {metadata['mode']}")
    if metadata.get("duration_min"):
        header_lines.append(f"- Duration: {metadata['duration_min']} min")
    if metadata.get("source_lock"):
        header_lines.append(f"- Source-Lock: {metadata['source_lock']}")

    parts = []
    if header_lines:
        parts.append("### WRAP Metadata")
        parts.extend(header_lines)
        parts.append("")

    if section_a:
        parts.append("### WRAP Notes")
        parts.append(section_a.strip())

    return "\n".join(parts).strip()


def extract_anki_cards(wrap: dict) -> list:
    section_b = (wrap.get("section_b") or "").strip()
    if not section_b:
        return []

    cards: List[Dict[str, str]] = []
    current: Dict[str, str] = {}
    last_key: Optional[str] = None

    def flush():
        nonlocal current, last_key
        if current.get("front") or current.get("back"):
            cards.append(current)
        current = {}
        last_key = None

    for raw_line in section_b.splitlines():
        line = raw_line.strip()
        if not line:
            continue

        # Detect card number headers like "**1**", "**2**", "1.", "Card 1:" - flush previous card
        if re.match(r"^(?:\*\*)?(\d+)(?:\*\*)?\.?$", line) or re.match(r"^Card\s+\d+", line, re.I):
            if current:
                flush()
            continue

        # Match: "Front:", "* Front:", "- Front:", "**Front:**"
        match = re.match(r"^(?:[*\-]\s*)?(?:\*\*)?(front|back|tags|source)(?:\*\*)?\s*:\s*(.*)$", line, re.I)
        if match:
            key = match.group(1).lower()
            value = match.group(2).strip()
            if key == "front" and current:
                flush()
            current[key] = value
            last_key = key
            continue

        # Continuation lines for multi-line fields (allow even if previous value empty)
        if last_key:
            existing = current.get(last_key, "")
            current[last_key] = f"{existing} {line}".strip() if existing else line

    flush()
    return cards


def extract_spaced_schedule(wrap: dict) -> dict:
    section_c = (wrap.get("section_c") or "").strip()
    if not section_c:
        return {}

    schedule: Dict[str, str] = {}
    for raw_line in section_c.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        # Match: "R1:", "**R1:**", "* R1:", "- R1:"
        match = re.match(r"^(?:[*\-]\s*)?(?:\*\*)?(R[1-4])(?:\*\*)?\s*[:=\-]\s*(.+)$", line, re.I)
        if match:
            key = match.group(1).upper()
            # Clean up any remaining ** markers from value
            value = match.group(2).strip().strip("*").strip()
            schedule[key] = value
    return schedule


def extract_json_logs(wrap: dict) -> dict:
    section_d = (wrap.get("section_d") or "").strip()
    raw = wrap.get("raw") or ""
    payload = section_d or raw

    merged, tracker, enhanced = _parse_json_payloads(payload)
    return {
        "merged": merged or {},
        "tracker": tracker or {},
        "enhanced": enhanced or {},
    }


def extract_tutor_issues(wrap: dict, use_llm: bool = True) -> list:
    section_a = (wrap.get("section_a") or {}).get("raw", "")
    if not section_a:
        return []

    issues = _extract_issue_lines(section_a)
    if not issues:
        return []

    if not use_llm:
        return [{"description": issue, "issue_type": "formatting", "severity": "low"} for issue in issues]

    classified = _classify_issues_with_llm(issues)
    if classified:
        return classified

    return [{"description": issue, "issue_type": "formatting", "severity": "low"} for issue in issues]


def _split_sections(raw_text: str) -> Dict[str, str]:
    sections: Dict[str, List[str]] = {}
    current_key: Optional[str] = None

    for raw_line in raw_text.splitlines():
        key = _detect_section_header(raw_line)
        if key:
            current_key = key
            sections.setdefault(current_key, [])
            continue
        if current_key:
            sections[current_key].append(raw_line)

    return {key: "\n".join(lines).strip() for key, lines in sections.items()}


def _detect_section_header(line: str) -> Optional[str]:
    if not line:
        return None
    # Match various formats: "Section A", "### Section A", "A:", "A)", "### A) Title"
    patterns = [
        r"^\s*(?:#+\s*)?section\s*([ABCD])\b",  # "Section A" or "### Section A"
        r"^\s*(?:#+\s*)?([ABCD])\s*\)",          # "### A)" or "A)"
        r"^\s*([ABCD])\s*[:\-]\s*",              # "A:" or "A -"
    ]
    for pattern in patterns:
        match = re.match(pattern, line, re.I)
        if match:
            return match.group(1).upper()
    return None


def _fallback_parse_sections(raw_text: str) -> Dict[str, str]:
    system_prompt = (
        "You are extracting WRAP sections from raw text. "
        "Return JSON with keys: section_a, section_b, section_c, section_d. "
        "Each value must be a string (empty if missing)."
    )
    result = call_llm(
        system_prompt=system_prompt,
        user_prompt=f"WRAP text:\n\n{raw_text}",
        provider="openrouter",
        model="deepseek/deepseek-v3",
        timeout=45,
    )
    if not result.get("success"):
        return {}

    try:
        parsed = json.loads(result.get("content", "") or "{}")
    except json.JSONDecodeError:
        return {}

    sections: Dict[str, str] = {}
    if isinstance(parsed, dict):
        for key, value in parsed.items():
            key_norm = key.strip().lower()
            if key_norm in {"section_a", "a"}:
                sections["A"] = str(value).strip()
            if key_norm in {"section_b", "b"}:
                sections["B"] = str(value).strip()
            if key_norm in {"section_c", "c"}:
                sections["C"] = str(value).strip()
            if key_norm in {"section_d", "d"}:
                sections["D"] = str(value).strip()
    return sections


def _extract_json_section(raw_text: str) -> str:
    # Match multiline JSON blocks including arrays and nested objects
    pattern = r"```json\s*\n?([\s\S]*?)\n?```"
    blocks = []
    for match in re.finditer(pattern, raw_text, flags=re.IGNORECASE):
        block = match.group(1).strip()
        if block:
            blocks.append(block)
    if not blocks:
        return ""
    return "\n\n".join(blocks).strip()


def _extract_metadata(section_a: str, section_d: str) -> Dict[str, str]:
    metadata: Dict[str, str] = {}

    for line in section_a.splitlines():
        match = re.match(r"^\s*-?\s*([^:]+):\s*(.+)\s*$", line)
        if match:
            key = match.group(1).strip().lower().replace(" ", "_").replace("-", "_")
            value = match.group(2).strip()
            metadata[key] = value

    merged, tracker, enhanced = _parse_json_payloads(section_d) if section_d else (None, None, None)
    payload = merged or tracker or enhanced or {}
    if isinstance(payload, dict):
        for key in ("session_id", "date", "course", "topic", "mode", "duration_min", "source_lock"):
            if key in payload and payload[key] not in (None, ""):
                metadata[key] = str(payload[key])

    if "mode" in metadata:
        metadata["mode"] = _normalize_mode(metadata["mode"])

    if "date" in metadata:
        try:
            datetime.strptime(metadata["date"], "%Y-%m-%d")
        except ValueError:
            metadata["date"] = metadata["date"]

    if "session_id" not in metadata:
        session_id = _build_session_id(metadata.get("date"), metadata.get("topic"))
        if session_id:
            metadata["session_id"] = session_id

    return metadata


def _normalize_mode(value: str) -> str:
    val = value.strip().lower()
    if "diagnostic" in val:
        return "Diagnostic Sprint"
    if "teaching" in val:
        return "Teaching Sprint"
    if "sprint" in val:
        return "Sprint"
    if "drill" in val:
        return "Drill"
    return "Core"


def _build_session_id(date_str: Optional[str], topic: Optional[str]) -> Optional[str]:
    if not date_str or not topic:
        return None
    slug = re.sub(r"[^a-z0-9]+", "-", topic.lower()).strip("-")
    return f"{date_str}_{slug}" if slug else None


def _extract_issue_lines(section_a: str) -> List[str]:
    issue_lines: List[str] = []

    heading_patterns = [
        r"mistakes?\s*&\s*corrections?",
        r"tutor\s+issues?",
        r"errors?\s*&\s*corrections?",
    ]
    lines = section_a.splitlines()
    for idx, line in enumerate(lines):
        for pattern in heading_patterns:
            if re.match(rf"(?im)^\s*(?:#+\s*)?{pattern}\s*$", line.strip()):
                for next_line in lines[idx + 1 :]:
                    if re.match(r"(?im)^\s*(?:section\s+[ABCD]\b|#+\s+)", next_line.strip()):
                        break
                    if next_line.strip().startswith(("-", "*")):
                        cleaned = next_line.strip().lstrip("-").lstrip("*").strip()
                        if cleaned:
                            issue_lines.append(cleaned)
                if issue_lines:
                    return issue_lines

    for line in section_a.splitlines():
        if re.search(r"(?i)mistake|incorrect|error", line):
            cleaned = line.strip().lstrip("-").strip()
            if cleaned and not re.match(r"(?i)^mistakes?\s*&\s*corrections?$", cleaned):
                issue_lines.append(cleaned)

    return issue_lines


def _classify_issues_with_llm(issues: List[str]) -> List[Dict[str, str]]:
    if not issues:
        return []

    system_prompt = (
        "Classify tutor issues into JSON. "
        "Allowed issue_type: hallucination, formatting, incorrect_fact, unprompted_artifact. "
        "Allowed severity: low, medium, high. "
        "Return a JSON array of objects with keys: description, issue_type, severity."
    )
    user_prompt = "Issues:\n" + "\n".join(f"- {issue}" for issue in issues)
    result = call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        provider="openrouter",
        model="deepseek/deepseek-v3",
        timeout=30,
    )
    if not result.get("success"):
        return []

    try:
        parsed = json.loads(result.get("content", "") or "[]")
    except json.JSONDecodeError:
        return []

    classified: List[Dict[str, str]] = []
    if isinstance(parsed, list):
        for item in parsed:
            if not isinstance(item, dict):
                continue
            description = str(item.get("description", "")).strip()
            issue_type = str(item.get("issue_type", "")).strip()
            severity = str(item.get("severity", "")).strip()
            if description and issue_type and severity:
                classified.append({
                    "description": description,
                    "issue_type": issue_type,
                    "severity": severity,
                })
    return classified
