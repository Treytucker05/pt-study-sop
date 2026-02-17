#!/usr/bin/env python3
"""Generate a detailed cross-agent skills library in an Obsidian vault."""

from __future__ import annotations

import argparse
import datetime as dt
import os
import re
import shutil
from collections import defaultdict
from dataclasses import dataclass
from itertools import combinations
from pathlib import Path
from typing import Iterable

import yaml


DEFAULT_VAULT = Path(r"C:\Users\treyt\Desktop\Trey's Vault")
DEFAULT_OUTPUT_REL = Path(r"Study Sessions\Agent Skills Library")


@dataclass
class SkillDoc:
    skill_id: str
    canonical_path: Path
    description: str
    frontmatter_name: str
    category: str
    hints: list[str]
    dependencies: list[str]
    missing_dependencies: list[str]


def parse_frontmatter(text: str) -> dict:
    if not text.startswith("---\n"):
        return {}
    end = text.find("\n---\n", 4)
    if end == -1:
        return {}
    block = text[4:end]
    try:
        data = yaml.safe_load(block) or {}
    except Exception:
        return {}
    return data if isinstance(data, dict) else {}


def get_skill_dirs(root: Path) -> dict[str, Path]:
    result: dict[str, Path] = {}
    if not root.exists():
        return result
    for child in sorted(root.iterdir(), key=lambda p: p.name.lower()):
        if not child.is_dir():
            continue
        if (child / "SKILL.md").exists():
            result[child.name] = child
    return result


def detect_hints(text: str) -> list[str]:
    hints: list[str] = []
    rules = [
        ("Codex", r"\bCodex CLI\b|\bcodex\b"),
        ("Claude", r"\bClaude Code\b|\bclaude\b"),
        ("Cursor", r"\bcursor\b"),
        ("Antigravity", r"\bantigravity\b"),
        ("OpenCode", r"\bOpenCode\b|\bopencode\b"),
        ("Gemini", r"\bGemini CLI\b|\bgemini\b"),
        ("OpenAI-SDK", r"\bOpenAI Agents SDK\b"),
        ("Slash-Command", r"\bslash command\b"),
        ("TeammateTool", r"\bTeammateTool\b"),
    ]
    for label, pattern in rules:
        if re.search(pattern, text, flags=re.IGNORECASE):
            hints.append(label)
    return sorted(set(hints))


def detect_dependencies(text: str) -> list[str]:
    deps: list[str] = []
    rules = [
        ("codex", r"\bcodex(\.exe|\.ps1)?\b"),
        ("claude", r"\bclaude(\.exe)?\b"),
        ("cursor", r"\bcursor(\.exe|\.cmd)?\b"),
        ("opencode", r"\bopencode(\.exe)?\b"),
        ("gemini", r"\bgemini(\.exe|\.ps1)?\b"),
        ("gh", r"\bgh\b"),
        ("bq", r"\bbq\b"),
        ("ralph", r"\bralph\b"),
        ("python", r"\bpython\b"),
        ("node", r"\bnode\b|\bnpm\b"),
    ]
    for dep, pattern in rules:
        if re.search(pattern, text, flags=re.IGNORECASE):
            deps.append(dep)
    # Keep deterministic and avoid noise from always-available basics unless explicit.
    return sorted(set(deps))


def categorize(skill_id: str, description: str) -> str:
    text = f"{skill_id} {description}".lower()
    if any(k in text for k in ["conductor", "workflow", "swarm", "subagent", "worktree"]):
        return "Orchestration"
    if any(k in text for k in ["bug", "test", "ci", "review", "validate", "tdd"]):
        return "Quality"
    if any(k in text for k in ["react", "frontend", "ui", "wireframe", "shadcn", "css"]):
        return "Frontend/UI"
    if any(k in text for k in ["python", "backend", "database", "api", "mcp"]):
        return "Backend/Data"
    if any(k in text for k in ["research", "perplexity", "gemini", "codex", "openai", "oracle", "llm"]):
        return "AI/Research"
    if any(
        k in text
        for k in ["obsidian", "organizer", "docx", "pdf", "xlsx", "pptx", "readme", "writing", "session", "capture"]
    ):
        return "Knowledge/Docs"
    if any(k in text for k in ["plan", "planner", "prd", "roadmap"]):
        return "Planning"
    return "General"


def markdown_escape(value: str) -> str:
    return value.replace("|", "\\|").replace("\n", " ")


def load_existing_registry_fields(registry_path: Path) -> dict[str, dict]:
    if not registry_path.exists():
        return {}
    try:
        data = yaml.safe_load(registry_path.read_text(encoding="utf-8")) or {}
    except Exception:
        return {}
    skills = data.get("skills")
    if not isinstance(skills, list):
        return {}
    existing: dict[str, dict] = {}
    for item in skills:
        if not isinstance(item, dict):
            continue
        skill_id = item.get("skill_id")
        if not isinstance(skill_id, str) or not skill_id:
            continue
        existing[skill_id] = item
    return existing


TOKEN_STOPWORDS = {
    "and",
    "the",
    "for",
    "with",
    "from",
    "that",
    "this",
    "when",
    "into",
    "skill",
    "skills",
    "use",
    "using",
    "user",
}

TWO_PART_FAMILY_PREFIXES = {
    "agent",
    "backend",
    "business",
    "code",
    "conductor",
    "context",
    "database",
    "dependency",
    "frontend",
    "multi",
    "openai",
    "react",
    "session",
}


def family_key(skill_id: str) -> str:
    normalized = skill_id.lower().replace("_", "-")
    parts = [p for p in normalized.split("-") if p]
    if not parts:
        return "misc"
    if len(parts) >= 2 and parts[0] in TWO_PART_FAMILY_PREFIXES:
        return f"{parts[0]}-{parts[1]}"
    return parts[0]


def tokenize_for_similarity(skill: SkillDoc) -> set[str]:
    source = f"{skill.skill_id} {skill.frontmatter_name} {skill.description}".lower()
    raw_tokens = re.findall(r"[a-z0-9]+", source)
    return {
        tok
        for tok in raw_tokens
        if len(tok) >= 3 and tok not in TOKEN_STOPWORDS and not tok.isdigit()
    }


def overlap_level(score: float, same_family: bool) -> str:
    if score >= 0.60:
        return "high"
    if score >= 0.42:
        return "medium"
    if same_family and score >= 0.10:
        return "family"
    return "low"


def overlap_action(level: str) -> str:
    if level == "high":
        return "candidate merge or alias_of"
    if level == "medium":
        return "review scopes; maybe combine"
    if level == "family":
        return "keep both but clarify boundaries"
    return "keep separate"


def main() -> int:
    parser = argparse.ArgumentParser(description="Export skills library docs for Obsidian.")
    parser.add_argument("--canonical-root", default=str(Path.home() / ".agents" / "skills"))
    parser.add_argument("--codex-root", default=str(Path.home() / ".codex" / "skills"))
    parser.add_argument("--claude-root", default=str(Path.home() / ".claude" / "skills"))
    parser.add_argument("--cursor-root", default=str(Path.home() / ".cursor" / "skills"))
    parser.add_argument("--antigravity-root", default=str(Path.home() / ".antigravity" / "skills"))
    parser.add_argument("--vault-root", default=str(DEFAULT_VAULT))
    parser.add_argument("--output-rel", default=str(DEFAULT_OUTPUT_REL))
    args = parser.parse_args()

    roots = {
        "canonical": Path(args.canonical_root),
        "codex": Path(args.codex_root),
        "claude": Path(args.claude_root),
        "cursor": Path(args.cursor_root),
        "antigravity": Path(args.antigravity_root),
    }

    root_skill_sets = {name: get_skill_dirs(path) for name, path in roots.items()}
    canonical_skills = root_skill_sets["canonical"]
    if not canonical_skills:
        raise RuntimeError(f"No canonical skills found in {roots['canonical']}")

    installed = {
        "codex": shutil.which("codex") is not None,
        "claude": shutil.which("claude") is not None,
        "cursor": shutil.which("cursor") is not None,
        "opencode": shutil.which("opencode") is not None,
        "gemini": shutil.which("gemini") is not None,
        "gh": shutil.which("gh") is not None,
        "bq": shutil.which("bq") is not None,
        "ralph": shutil.which("ralph") is not None,
        "python": shutil.which("python") is not None,
        "node": shutil.which("node") is not None,
    }

    docs: list[SkillDoc] = []
    for skill_id, skill_path in sorted(canonical_skills.items()):
        text = (skill_path / "SKILL.md").read_text(encoding="utf-8", errors="ignore")
        frontmatter = parse_frontmatter(text)
        description = str(frontmatter.get("description", "")).strip()
        fm_name = str(frontmatter.get("name", skill_id)).strip() or skill_id
        hints = detect_hints(text)
        deps = detect_dependencies(text)
        missing = sorted(d for d in deps if not installed.get(d, False))
        category = categorize(skill_id, description)
        docs.append(
            SkillDoc(
                skill_id=skill_id,
                canonical_path=skill_path,
                description=description,
                frontmatter_name=fm_name,
                category=category,
                hints=hints,
                dependencies=deps,
                missing_dependencies=missing,
            )
        )

    extras: dict[str, list[str]] = {}
    for agent in ("codex", "claude", "cursor", "antigravity"):
        extras[agent] = sorted(
            skill for skill in root_skill_sets[agent].keys() if skill not in canonical_skills
        )

    out_dir = Path(args.vault_root) / Path(args.output_rel)
    out_dir.mkdir(parents=True, exist_ok=True)
    generated_at = dt.datetime.now().strftime("%Y-%m-%d %H:%M:%S")

    readme = [
        "# Agent Skills Library",
        "",
        f"- Generated: {generated_at}",
        f"- Canonical root: `{roots['canonical']}`",
        f"- Total canonical skills: **{len(docs)}**",
        "",
        "## Files",
        "- `01_skill_catalog.md`",
        "- `02_agent_coverage.md`",
        "- `03_dedupe_and_cleanup_queue.md`",
        "- `04_skill_registry.yaml`",
        "- `05_overlap_audit.md`",
        "- `06_adoption_checklist.md`",
        "",
    ]
    (out_dir / "README.md").write_text("\n".join(readme), encoding="utf-8")

    # 01 catalog
    catalog_lines = [
        "# Skill Catalog",
        "",
        "| skill_id | category | description | hints | deps | missing_deps |",
        "| --- | --- | --- | --- | --- | --- |",
    ]
    for s in docs:
        catalog_lines.append(
            "| {id} | {cat} | {desc} | {hints} | {deps} | {miss} |".format(
                id=markdown_escape(s.skill_id),
                cat=markdown_escape(s.category),
                desc=markdown_escape(s.description or "n/a"),
                hints=markdown_escape(", ".join(s.hints) or "n/a"),
                deps=markdown_escape(", ".join(s.dependencies) or "n/a"),
                miss=markdown_escape(", ".join(s.missing_dependencies) or "none"),
            )
        )
    (out_dir / "01_skill_catalog.md").write_text("\n".join(catalog_lines) + "\n", encoding="utf-8")

    # 02 coverage
    coverage_lines = [
        "# Agent Coverage",
        "",
        "| skill_id | codex | claude | cursor | antigravity |",
        "| --- | --- | --- | --- | --- |",
    ]
    for s in docs:
        row = []
        for agent in ("codex", "claude", "cursor", "antigravity"):
            row.append("Y" if s.skill_id in root_skill_sets[agent] else "N")
        coverage_lines.append(
            f"| {markdown_escape(s.skill_id)} | {row[0]} | {row[1]} | {row[2]} | {row[3]} |"
        )

    coverage_lines.extend(
        [
            "",
            "## Dependency Availability",
            "",
            "| dependency | installed |",
            "| --- | --- |",
        ]
    )
    for dep in sorted(installed.keys()):
        coverage_lines.append(f"| {dep} | {'Y' if installed[dep] else 'N'} |")

    (out_dir / "02_agent_coverage.md").write_text("\n".join(coverage_lines) + "\n", encoding="utf-8")

    # 03 cleanup queue
    cleanup_lines = [
        "# Dedupe And Cleanup Queue",
        "",
        "## Root Extras (not in canonical)",
        "",
    ]
    for agent in ("codex", "claude", "cursor", "antigravity"):
        cleanup_lines.append(f"### {agent}")
        if extras[agent]:
            for skill in extras[agent]:
                cleanup_lines.append(f"- {skill}")
        else:
            cleanup_lines.append("- none")
        cleanup_lines.append("")

    blocked = [s for s in docs if s.missing_dependencies]
    cleanup_lines.extend(["## Skills Blocked By Missing Dependencies", ""])
    if blocked:
        for s in blocked:
            cleanup_lines.append(
                f"- {s.skill_id}: missing `{', '.join(s.missing_dependencies)}`"
            )
    else:
        cleanup_lines.append("- none")

    cleanup_lines.extend(
        [
            "",
            "## Suggested First 20 To Actively Use",
            "",
        ]
    )
    suggested_order = [
        "plan-work",
        "codex-subagent",
        "code-review",
        "bug-fast",
        "bug-deep",
        "tdd",
        "commit-work",
        "session-handoff",
        "conductor-implement",
        "conductor-new-track",
        "react-dev",
        "python-development",
        "openai-docs-skill",
        "github",
        "ci-fix",
        "repo-cleanup",
        "capture-learning",
        "researcher",
        "mermaid-diagrams",
        "obsidian-markdown",
        "wireframe",
    ]
    doc_by_id = {d.skill_id: d for d in docs}
    chosen: list[str] = [s for s in suggested_order if s in doc_by_id][:20]
    if len(chosen) < 20:
        # Fill deterministically with remaining skills.
        remainder = [d.skill_id for d in sorted(docs, key=lambda x: (x.category, x.skill_id)) if d.skill_id not in chosen]
        chosen.extend(remainder[: 20 - len(chosen)])

    for skill_id in chosen:
        s = doc_by_id[skill_id]
        cleanup_lines.append(f"- {s.skill_id} ({s.category})")

    (out_dir / "03_dedupe_and_cleanup_queue.md").write_text(
        "\n".join(cleanup_lines) + "\n", encoding="utf-8"
    )

    # 04 registry yaml
    existing_registry_fields = load_existing_registry_fields(out_dir / "04_skill_registry.yaml")
    valid_statuses = {"inbox", "active", "trial", "defer", "retire"}
    registry = {
        "generated_at": generated_at,
        "canonical_root": str(roots["canonical"]),
        "skills": [],
    }
    for s in docs:
        existing = existing_registry_fields.get(s.skill_id, {})
        status = existing.get("adoption_status", "inbox")
        if status not in valid_statuses:
            status = "inbox"
        priority = existing.get("priority", 3)
        if not isinstance(priority, int):
            try:
                priority = int(priority)
            except Exception:
                priority = 3
        if priority < 1 or priority > 5:
            priority = 3
        notes = existing.get("notes", "")
        if not isinstance(notes, str):
            notes = str(notes)

        row = {
            "skill_id": s.skill_id,
            "category": s.category,
            "description": s.description,
            "hints": s.hints,
            "dependencies": s.dependencies,
            "missing_dependencies": s.missing_dependencies,
            "availability": {
                "codex": s.skill_id in root_skill_sets["codex"],
                "claude": s.skill_id in root_skill_sets["claude"],
                "cursor": s.skill_id in root_skill_sets["cursor"],
                "antigravity": s.skill_id in root_skill_sets["antigravity"],
            },
            "adoption_status": status,
            "priority": priority,
            "notes": notes,
        }

        # Preserve custom per-skill metadata fields from existing registry rows.
        for key, value in existing.items():
            if key in row or key == "skill_id":
                continue
            row[key] = value

        registry["skills"].append(row)
    (out_dir / "04_skill_registry.yaml").write_text(
        yaml.safe_dump(registry, sort_keys=False, allow_unicode=False),
        encoding="utf-8",
    )

    # 05 overlap audit
    tokens = {s.skill_id: tokenize_for_similarity(s) for s in docs}
    families: dict[str, list[str]] = defaultdict(list)
    for s in docs:
        families[family_key(s.skill_id)].append(s.skill_id)

    overlap_pairs: list[dict] = []
    sorted_ids = sorted(doc_by_id.keys())
    for left_id, right_id in combinations(sorted_ids, 2):
        left = tokens[left_id]
        right = tokens[right_id]
        if len(left) < 2 or len(right) < 2:
            continue
        shared = left & right
        union = left | right
        score = len(shared) / max(len(union), 1)
        same_family = family_key(left_id) == family_key(right_id)
        if same_family:
            if len(shared) < 1:
                continue
        else:
            if len(shared) < 2 or score < 0.30:
                continue
        level = overlap_level(score, same_family)
        if level == "low":
            continue
        overlap_pairs.append(
            {
                "left": left_id,
                "right": right_id,
                "score": score,
                "same_family": same_family,
                "level": level,
                "shared": sorted(shared),
                "action": overlap_action(level),
            }
        )

    overlap_pairs.sort(
        key=lambda row: (-row["score"], row["left"], row["right"])
    )
    overlap_pairs = overlap_pairs[:40]

    overlap_lines = [
        "# Overlap Audit",
        "",
        "## Skill Families (size >= 2)",
        "",
        "| family | count | skills |",
        "| --- | --- | --- |",
    ]
    for fam, members in sorted(
        families.items(), key=lambda item: (-len(item[1]), item[0])
    ):
        members_sorted = sorted(members)
        if len(members_sorted) < 2:
            continue
        overlap_lines.append(
            "| {fam} | {count} | {skills} |".format(
                fam=markdown_escape(fam),
                count=len(members_sorted),
                skills=markdown_escape(", ".join(members_sorted)),
            )
        )

    overlap_lines.extend(["", "## Potential Overlap Candidates", ""])
    if overlap_pairs:
        overlap_lines.extend(
            [
                "| left_skill | right_skill | overlap_score | level | same_family | suggested_action | shared_terms |",
                "| --- | --- | --- | --- | --- | --- | --- |",
            ]
        )
        for row in overlap_pairs:
            overlap_lines.append(
                "| {left} | {right} | {score:.2f} | {level} | {same_family} | {action} | {shared} |".format(
                    left=markdown_escape(row["left"]),
                    right=markdown_escape(row["right"]),
                    score=row["score"],
                    level=markdown_escape(row["level"]),
                    same_family="Y" if row["same_family"] else "N",
                    action=markdown_escape(row["action"]),
                    shared=markdown_escape(", ".join(row["shared"][:8])),
                )
            )
    else:
        overlap_lines.append("- none")

    overlap_lines.extend(
        [
            "",
            "## Normalization Rule",
            "- For true duplicates, keep one canonical `skill_id` and mark old ids as `alias_of` in metadata.",
            "- For related but distinct skills, keep both and add a one-line scope boundary note.",
        ]
    )
    (out_dir / "05_overlap_audit.md").write_text(
        "\n".join(overlap_lines) + "\n", encoding="utf-8"
    )

    # 06 adoption checklist
    checklist_lines = [
        "# Adoption Checklist",
        "",
        "1. Validate sync integrity: run `powershell -ExecutionPolicy Bypass -File scripts/sync_agent_skills.ps1 -Mode Check`.",
        "2. Export fresh catalog: run `python scripts/export_skills_library.py`.",
        "3. Open `05_overlap_audit.md` and mark overlap rows as `merge`, `alias`, or `keep`.",
        "4. Edit `04_skill_registry.yaml` for first-pass triage: set `adoption_status` to `active`, `trial`, `defer`, or `retire`.",
        "5. For skills marked `retire`, move to an archive folder or add `deprecated` status metadata.",
        "6. For skills marked `trial`, create a 2-week experiment list (max 10 at once).",
        "7. Re-run export and confirm deterministic outputs with no root drift.",
        "8. Commit library updates and add a short changelog note in your session log.",
        "",
        "## Suggested Weekly Cadence",
        "- Monday: pick 3-5 trial skills.",
        "- Wednesday: update notes and keep/drop decisions.",
        "- Friday: finalize statuses and regenerate exports.",
    ]
    (out_dir / "06_adoption_checklist.md").write_text(
        "\n".join(checklist_lines) + "\n", encoding="utf-8"
    )

    print("Skills library exported")
    print(f"  output_dir: {out_dir}")
    print(f"  skills: {len(docs)}")
    print(f"  blocked_by_missing_deps: {len(blocked)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
