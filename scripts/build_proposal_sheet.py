#!/usr/bin/env python3
from __future__ import annotations

import re
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Dict, List, Optional, Tuple


REPO_ROOT = Path(__file__).resolve().parents[1]
PROMOTION_DIRS = [
    REPO_ROOT / "scholar" / "outputs" / "promotion_queue",
    REPO_ROOT / "scholar" / "outputs" / "proposals",
    REPO_ROOT / "scholar" / "outputs" / "proposals" / "approved",
    REPO_ROOT / "scholar" / "outputs" / "proposals" / "rejected",
]
OUTPUT_PATH = REPO_ROOT / "docs" / "roadmap" / "proposal_running_sheet.md"


@dataclass
class Proposal:
    proposal_id: str
    title: str
    summary: str
    target_system: str
    status: str
    approval_required: str
    priority: str
    queue: str
    source_file: Path
    evidence_paths: List[str] = field(default_factory=list)
    required_paths: List[str] = field(default_factory=list)
    evidence_missing: List[str] = field(default_factory=list)
    required_missing: List[str] = field(default_factory=list)
    evidence_newer: List[str] = field(default_factory=list)


def _parse_meta(lines: List[str]) -> Dict[str, str]:
    meta: Dict[str, str] = {}
    for line in lines:
        if not line.startswith("- "):
            continue
        match = re.match(r"-\s*([^:]+):\s*(.+)", line.strip())
        if match:
            key = match.group(1).strip().lower()
            meta[key] = match.group(2).strip()
    return meta


def _extract_first(patterns: List[str], text: str) -> str:
    for pattern in patterns:
        match = re.search(pattern, text, flags=re.IGNORECASE | re.MULTILINE)
        if match:
            return match.group(1).strip()
    return ""


def _extract_list(label_patterns: List[str], text: str) -> List[str]:
    for label in label_patterns:
        match = re.search(label, text, flags=re.IGNORECASE | re.MULTILINE)
        if not match:
            continue
        lines = text[match.end():].splitlines()
        items: List[str] = []
        for line in lines:
            if line.startswith("## "):
                break
            if not line.strip():
                if items:
                    break
                continue
            if line.lstrip().startswith("- "):
                stripped = line.strip()
                if ":" in stripped and "`" not in stripped and "/" not in stripped and "\\" not in stripped:
                    break
                items.append(stripped[2:].strip())
            else:
                if items:
                    items[-1] = f"{items[-1]} {line.strip()}"
        return items
    return []


def _normalize_path(item: str) -> str:
    backtick_match = re.search(r"`([^`]+)`", item)
    if backtick_match:
        return backtick_match.group(1).strip()
    return item.strip()


def _is_pattern(path_str: str) -> bool:
    return "*" in path_str or "?" in path_str


def _split_proposals(text: str) -> List[Tuple[str, str]]:
    sections: List[Tuple[str, str]] = []
    header_matches = list(re.finditer(r"^##\s+Proposal\s+.+$", text, flags=re.MULTILINE))
    if header_matches:
        for idx, match in enumerate(header_matches):
            start = match.end()
            end = header_matches[idx + 1].start() if idx + 1 < len(header_matches) else len(text)
            header = match.group(0).replace("##", "", 1).strip()
            sections.append((header, text[start:end]))
        return sections
    # Alternate format: "## Proposal ID: XYZ"
    alt_matches = list(re.finditer(r"^##\s+Proposal\s+ID:\s*.+$", text, flags=re.MULTILINE))
    if alt_matches:
        for idx, match in enumerate(alt_matches):
            start = match.end()
            end = alt_matches[idx + 1].start() if idx + 1 < len(alt_matches) else len(text)
            header = match.group(0).replace("##", "", 1).strip()
            sections.append((header, text[start:end]))
        return sections
    return sections


def _parse_header(header: str) -> Tuple[str, str, str]:
    header = header.replace("Proposal", "", 1).strip()
    header = header.replace("ID:", "").strip()
    priority = ""
    priority_match = re.search(r"\((Priority[^)]+)\)", header, flags=re.IGNORECASE)
    if priority_match:
        priority = priority_match.group(1).strip()
        header = header.replace(priority_match.group(0), "").strip()
    if ":" in header:
        proposal_id, title = header.split(":", 1)
    else:
        parts = header.split(" ", 1)
        proposal_id = parts[0]
        title = parts[1].strip() if len(parts) > 1 else ""
    return proposal_id.strip(), title.strip(), priority


def _collect_proposals(path: Path, queue: str) -> List[Proposal]:
    text = path.read_text(encoding="utf-8")
    lines = text.splitlines()
    meta = _parse_meta(lines)
    target_system = meta.get("target system", "Unknown")
    status = meta.get("status", "Unknown")
    approval_required = meta.get("approval required", "Unknown")
    proposals: List[Proposal] = []
    sections = _split_proposals(text)
    if not sections:
        proposal_id = path.stem
        title = lines[0].lstrip("# ").strip() if lines else proposal_id
        summary = _extract_first([r"^Summary:\s*(.+)", r"^- Summary:\s*(.+)"], text)
        evidence_paths = _extract_list([r"^Evidence paths:\s*$", r"^- Evidence paths:\s*$"], text)
        required_paths = _extract_list([r"^Required Changes.*?:\s*$", r"^- Required changes.*?:\s*$"], text)
        proposals.append(
            Proposal(
                proposal_id=proposal_id,
                title=title,
                summary=summary,
                target_system=target_system,
                status=status,
                approval_required=approval_required,
                priority="",
                queue=queue,
                source_file=path,
                evidence_paths=[_normalize_path(item) for item in evidence_paths],
                required_paths=[_normalize_path(item) for item in required_paths],
            )
        )
        return proposals
    for header, section in sections:
        proposal_id, title, priority = _parse_header(header)
        summary = _extract_first([r"^- Summary:\s*(.+)", r"^Summary:\s*(.+)"], section)
        evidence_paths = _extract_list(
            [r"^- Evidence paths:\s*$", r"^Evidence paths:\s*$"], section
        )
        required_paths = _extract_list(
            [r"^- Required changes.*?:\s*$", r"^Required Changes.*?:\s*$"], section
        )
        proposals.append(
            Proposal(
                proposal_id=proposal_id,
                title=title,
                summary=summary,
                target_system=target_system,
                status=status,
                approval_required=approval_required,
                priority=priority,
                queue=queue,
                source_file=path,
                evidence_paths=[_normalize_path(item) for item in evidence_paths],
                required_paths=[_normalize_path(item) for item in required_paths],
            )
        )
    return proposals


def _queue_label(path: Path) -> str:
    parts = [str(p) for p in path.parts]
    if "promotion_queue" in parts:
        return "promotion_queue"
    if "approved" in parts:
        return "approved"
    if "rejected" in parts:
        return "rejected"
    if "proposals" in parts:
        return "proposals"
    return "unknown"


def _check_paths(proposal: Proposal) -> None:
    proposal_mtime = proposal.source_file.stat().st_mtime
    for path_str in proposal.evidence_paths:
        if not path_str:
            continue
        if _is_pattern(path_str):
            continue
        candidate = REPO_ROOT / path_str
        if not candidate.exists():
            proposal.evidence_missing.append(path_str)
            continue
        if candidate.stat().st_mtime > proposal_mtime:
            proposal.evidence_newer.append(path_str)
    for path_str in proposal.required_paths:
        if not path_str:
            continue
        if _is_pattern(path_str):
            continue
        candidate = REPO_ROOT / path_str
        if not candidate.exists():
            proposal.required_missing.append(path_str)


def _render_table(rows: List[Proposal]) -> str:
    lines = [
        "| ID | Summary | Target | Queue | Priority | Status | Evidence Drift | Missing Paths | Decision | Owner | Next | Source |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
    for p in rows:
        drift = "Yes" if p.evidence_newer else "No"
        missing = "Yes" if (p.evidence_missing or p.required_missing) else "No"
        summary = p.summary or p.title
        summary = summary.replace("|", "\\|")
        priority = p.priority or "-"
        status = p.status or "-"
        source = str(p.source_file.relative_to(REPO_ROOT))
        decision = getattr(p, "decision", "") or ""
        owner = getattr(p, "owner", "") or ""
        next_step = getattr(p, "next_step", "") or ""
        lines.append(
            f"| {p.proposal_id} | {summary} | {p.target_system} | {p.queue} | {priority} | {status} | {drift} | {missing} | {decision} | {owner} | {next_step} | `{source}` |"
        )
    return "\n".join(lines)


def _load_existing_overrides() -> Dict[str, Dict[str, str]]:
    if not OUTPUT_PATH.exists():
        return {}
    text = OUTPUT_PATH.read_text(encoding="utf-8")
    lines = text.splitlines()
    overrides: Dict[str, Dict[str, str]] = {}
    header_idx = None
    for idx, line in enumerate(lines):
        if line.startswith("| ID |"):
            header_idx = idx
            break
    if header_idx is None or header_idx + 2 >= len(lines):
        return overrides
    headers = [h.strip() for h in lines[header_idx].strip().strip("|").split("|")]
    if "ID" not in headers:
        return overrides
    for line in lines[header_idx + 2:]:
        if not line.startswith("|"):
            break
        cells = [c.strip() for c in line.strip().strip("|").split("|")]
        row = {headers[i]: cells[i] if i < len(cells) else "" for i in range(len(headers))}
        proposal_id = row.get("ID", "")
        if not proposal_id:
            continue
        overrides[proposal_id] = {
            "Decision": row.get("Decision", ""),
            "Owner": row.get("Owner", ""),
            "Next": row.get("Next", ""),
        }
    return overrides


def build_sheet() -> None:
    proposals: List[Proposal] = []
    overrides = _load_existing_overrides()
    for directory in PROMOTION_DIRS:
        if not directory.exists():
            continue
        for path in sorted(directory.glob("*.md")):
            proposals.extend(_collect_proposals(path, _queue_label(path)))

    for proposal in proposals:
        if proposal.proposal_id in overrides:
            proposal.decision = overrides[proposal.proposal_id].get("Decision", "")
            proposal.owner = overrides[proposal.proposal_id].get("Owner", "")
            proposal.next_step = overrides[proposal.proposal_id].get("Next", "")
        _check_paths(proposal)

    by_target: Dict[str, int] = {}
    for proposal in proposals:
        by_target[proposal.target_system] = by_target.get(proposal.target_system, 0) + 1

    drift_count = sum(1 for p in proposals if p.evidence_newer)
    missing_count = sum(1 for p in proposals if p.evidence_missing or p.required_missing)

    timestamp = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    header_lines = [
        "# Proposal Running Sheet",
        "",
        f"- Generated: {timestamp}",
        "- Sources: `scholar/outputs/promotion_queue/`, `scholar/outputs/proposals/`",
        "",
        "## Synthesis",
        f"- Total proposals: {len(proposals)}",
        f"- Evidence drift flags: {drift_count}",
        f"- Missing path flags: {missing_count}",
        "",
        "### By target system",
    ]
    for target, count in sorted(by_target.items()):
        header_lines.append(f"- {target}: {count}")

    header_lines.extend(
        [
            "",
            "## Review + Final Check Flow",
            "1) Review each proposal summary and evidence paths.",
            "2) Record decisions in the Decision/Owner/Next columns.",
            "3) Re-run this script for the final check (decisions are preserved).",
            "4) Any proposal with Evidence Drift = Yes should be re-reviewed before implementation.",
            "",
            "## Proposal Table",
        ]
    )

    table = _render_table(proposals)
    OUTPUT_PATH.write_text("\n".join(header_lines) + "\n" + table + "\n", encoding="utf-8")


if __name__ == "__main__":
    build_sheet()
