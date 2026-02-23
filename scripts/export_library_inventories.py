import csv
import json
import re
import sys
from pathlib import Path

try:
    import yaml
except ImportError as exc:
    raise SystemExit("PyYAML is required. Install with: pip install pyyaml") from exc

ROOT = Path(__file__).resolve().parents[1]
METHODS_DIR = ROOT / "sop" / "library" / "methods"
CHAINS_DIR = ROOT / "sop" / "library" / "chains"
EXPORTS_DIR = ROOT / "exports"

EXPORTS_DIR.mkdir(exist_ok=True)


def read_yaml(path: Path):
    text = path.read_text(encoding="utf-8")
    data = yaml.safe_load(text) or {}
    return data, text


def rel_path(path: Path) -> str:
    return path.relative_to(ROOT).as_posix()


def find_line_number(text: str, predicate) -> int | None:
    for idx, line in enumerate(text.splitlines(), start=1):
        if predicate(line):
            return idx
    return None


def line_for_chain_id(text: str) -> int | None:
    return find_line_number(text, lambda ln: ln.strip().startswith("id:"))


def line_for_block_id(text: str, block_id: str) -> int | None:
    target = f"- {block_id}"
    return find_line_number(text, lambda ln: ln.strip() == target)


def flag_value(has_key: bool, value) -> str:
    if not has_key:
        return "MISSING"
    if isinstance(value, list):
        return "Y" if len(value) > 0 else "N"
    if isinstance(value, dict):
        return "Y" if len(value.keys()) > 0 else "N"
    if isinstance(value, str):
        return "Y" if value.strip() else "N"
    return "Y" if value is not None else "N"


def outputs_summary(outputs, has_key: bool) -> str:
    if not has_key:
        return "MISSING"
    if not outputs:
        return ""
    if isinstance(outputs, list):
        parts = []
        for item in outputs:
            if isinstance(item, str):
                parts.append(item.strip())
            elif isinstance(item, dict):
                parts.append("machine-readable: " + ",".join(sorted(item.keys())))
            else:
                parts.append(str(item))
        joined = "; ".join(p for p in parts if p)
    elif isinstance(outputs, dict):
        joined = "machine-readable: " + ",".join(sorted(outputs.keys()))
    else:
        joined = str(outputs)
    if len(joined) > 120:
        return joined[:117] + "..."
    return joined


method_files = sorted(METHODS_DIR.glob("*.yaml"))
methods = []
method_catalog = []
method_ids = set()
missing_facilitation_prompt = 0

for path in method_files:
    data, text = read_yaml(path)
    method_id = data.get("id", "")
    method_ids.add(method_id)

    def has(k):
        return k in data

    steps_val = data.get("steps")
    gating_val = data.get("gating_rules") if has("gating_rules") else data.get("gates") if has("gates") else data.get("gating") if has("gating") else None
    failure_val = data.get("failure_modes")
    stop_val = data.get("stop_criteria")
    outputs_val = data.get("outputs")
    facilitation_val = data.get("facilitation_prompt")

    has_facilitation = flag_value(has("facilitation_prompt"), facilitation_val)
    if has_facilitation != "Y":
        missing_facilitation_prompt += 1

    row = {
        "id": method_id,
        "name": data.get("name", ""),
        "category": data.get("category", ""),
        "default_duration_min": data.get("default_duration_min", "MISSING" if not has("default_duration_min") else ""),
        "energy_cost": data.get("energy_cost", "MISSING" if not has("energy_cost") else ""),
        "has_steps": flag_value(has("steps"), steps_val),
        "has_gating_rules": flag_value(has("gating_rules") or has("gates") or has("gating"), gating_val),
        "has_failure_modes": flag_value(has("failure_modes"), failure_val),
        "has_stop_criteria": flag_value(has("stop_criteria"), stop_val),
        "has_outputs_or_artifacts": flag_value(has("outputs") or has("artifact_type"), outputs_val if has("outputs") else data.get("artifact_type")),
        "has_facilitation_prompt": has_facilitation,
        "outputs_summary": outputs_summary(outputs_val, has("outputs")),
        "file_path": rel_path(path),
    }
    methods.append(row)
    method_catalog.append(
        {
            "id": method_id,
            "name": data.get("name", ""),
            "category": data.get("category", ""),
            "stage": data.get("stage"),
            "best_stage": data.get("best_stage", "MISSING"),
            "status": data.get("status", "MISSING"),
            "default_duration_min": data.get("default_duration_min", "MISSING"),
            "energy_cost": data.get("energy_cost", "MISSING"),
            "description": data.get("description", ""),
            "inputs": data.get("inputs", []),
            "outputs": data.get("outputs", []),
            "gating_rules": data.get("gating_rules")
            if "gating_rules" in data
            else data.get("gates")
            if "gates" in data
            else data.get("gating")
            if "gating" in data
            else None,
            "stop_criteria": data.get("stop_criteria", []),
            "failure_modes": data.get("failure_modes", []),
            "knobs": data.get("knobs"),
            "facilitation_prompt": data.get("facilitation_prompt"),
            "mechanisms": data.get("mechanisms", []),
            "logging_fields": data.get("logging_fields", []),
            "evidence_citation": (data.get("evidence") or {}).get("citation", "") if isinstance(data.get("evidence"), dict) else "",
            "evidence_finding": (data.get("evidence") or {}).get("finding", "") if isinstance(data.get("evidence"), dict) else "",
            "evidence_raw": data.get("evidence_raw", ""),
        }
    )

methods_csv_path = EXPORTS_DIR / "methods_inventory.csv"
methods_md_path = EXPORTS_DIR / "methods_inventory.md"

with methods_csv_path.open("w", encoding="utf-8", newline="") as f:
    writer = csv.DictWriter(
        f,
        fieldnames=[
            "id",
            "name",
            "category",
            "default_duration_min",
            "energy_cost",
            "has_steps",
            "has_gating_rules",
            "has_failure_modes",
            "has_stop_criteria",
            "has_outputs_or_artifacts",
            "has_facilitation_prompt",
            "outputs_summary",
            "file_path",
        ],
    )
    writer.writeheader()
    for row in methods:
        writer.writerow(row)

md_lines = [
    "| id | name | category | default_duration_min | energy_cost | has_steps | has_gating_rules | has_failure_modes | has_stop_criteria | has_outputs_or_artifacts | has_facilitation_prompt | outputs_summary | file_path |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
]
for row in methods:
    md_lines.append(
        "| {id} | {name} | {category} | {default_duration_min} | {energy_cost} | {has_steps} | {has_gating_rules} | {has_failure_modes} | {has_stop_criteria} | {has_outputs_or_artifacts} | {has_facilitation_prompt} | {outputs_summary} | {file_path} |".format(
            **{k: str(v).replace("|", "\\|") for k, v in row.items()}
        )
    )
methods_md_path.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

chain_files = sorted(CHAINS_DIR.glob("*.yaml"))
chains = []
chain_catalog = []
chain_id_map = {}
unknown_ids = []

for path in chain_files:
    data, text = read_yaml(path)
    chain_id = data.get("id", "")
    chain_name = data.get("name", "")
    blocks = data.get("blocks", []) or []
    chain_entry = {
        "chain_id": chain_id,
        "chain_name": chain_name,
        "method_ids_in_order": ", ".join(blocks),
        "file_path": rel_path(path),
    }
    chains.append(chain_entry)
    chain_catalog.append(
        {
            "id": chain_id,
            "name": chain_name,
            "description": data.get("description", ""),
            "blocks": blocks,
            "context_tags": data.get("context_tags", {}),
            "default_knobs": data.get("default_knobs"),
            "gates": data.get("gates")
            if "gates" in data
            else data.get("gate")
            if "gate" in data
            else data.get("stage_gates")
            if "stage_gates" in data
            else None,
            "failure_actions": data.get("failure_actions")
            if "failure_actions" in data
            else data.get("on_failure")
            if "on_failure" in data
            else data.get("fallback_actions")
            if "fallback_actions" in data
            else None,
            "status": data.get("status", "MISSING"),
        }
    )

    if chain_id:
        chain_id_map.setdefault(chain_id, []).append(path)

    for block_id in blocks:
        if block_id not in method_ids:
            line_no = line_for_block_id(text, block_id)
            unknown_ids.append({
                "chain_id": chain_id,
                "block_id": block_id,
                "file_path": rel_path(path),
                "line": line_no,
            })

chains_md_path = EXPORTS_DIR / "chains_inventory.md"
chains_md_lines = [
    "| chain_id | chain_name | method_ids_in_order | file_path |",
    "| --- | --- | --- | --- |",
]
for row in chains:
    chains_md_lines.append(
        "| {chain_id} | {chain_name} | {method_ids_in_order} | {file_path} |".format(
            **{k: str(v).replace("|", "\\|") for k, v in row.items()}
        )
    )
chains_md_path.write_text("\n".join(chains_md_lines) + "\n", encoding="utf-8")

integrity_path = EXPORTS_DIR / "chains_integrity_report.md"
report_lines = ["# Chains Integrity Report", "", "## Duplicate chain IDs", ""]

has_issues = False
for chain_id, paths in chain_id_map.items():
    if len(paths) > 1:
        has_issues = True
        report_lines.append(f"- {chain_id}")
        for p in paths:
            text = p.read_text(encoding="utf-8")
            line_no = line_for_chain_id(text)
            ref = f"{rel_path(p)}" + (f":{line_no}" if line_no else "")
            report_lines.append(f"  - {ref}")

if not has_issues:
    report_lines.append("- None")

report_lines.extend(["", "## Unknown method IDs in chains", ""])
if unknown_ids:
    for item in unknown_ids:
        ref = item["file_path"] + (f":{item['line']}" if item.get("line") else "")
        report_lines.append(f"- {item['chain_id']}: {item['block_id']} ({ref})")
else:
    report_lines.append("- None")

integrity_path.write_text("\n".join(report_lines) + "\n", encoding="utf-8")

runtime_wiring_path = EXPORTS_DIR / "runtime_prompt_wiring.md"
runtime_wiring_path.write_text(
    """# Runtime Prompt Wiring\n\n"
    "## Facilitation prompt injection\n\n"
    "- `brain/data/seed_methods.py` → `generate_facilitation_prompt()` builds a block-specific prompt and stores it in `method_blocks.facilitation_prompt`.\n"
    "- `brain/data/seed_methods.py` → `regenerate_prompts()` updates `facilitation_prompt` per YAML definition.\n"
    "- `brain/dashboard/api_tutor.py` → `_build_chain_info()` and `_resolve_chain_blocks()` load `facilitation_prompt` into `current_block`.\n"
    "- `brain/tutor_prompt_builder.py` → `_build_block_section()` uses `current_block.facilitation_prompt` if present, else renders a fallback `## Current Activity Block` section.\n"
    "- `brain/tutor_prompt_builder.py` → `build_prompt_with_contexts()` assembles Tier 1 + mode policy + block section + chain section + materials.\n\n"
    "## Chain context injection\n\n"
    "- `brain/tutor_prompt_builder.py` → `_build_chain_section()` formats chain progress into `## Study Chain`.\n"
    "- `brain/dashboard/api_tutor.py` → `send_turn()` passes `chain_info` + `current_block` into `build_prompt_with_contexts()`.\n\n"
    "## Retrieved context wiring\n\n"
    "- `brain/dashboard/api_tutor.py` → `send_turn()` constructs user prompt with `## Retrieved Context` and `## Chat History`.\n"
    "- `brain/tutor_prompt_builder.py` → `build_prompt_with_contexts()` adds `## Additional Teaching Context` (SOP) and optional `## Retrieved Study Materials`.\n"
    """,
    encoding="utf-8",
)

artifact_formats_path = EXPORTS_DIR / "artifact_formats.md"
artifact_formats_path.write_text(
    """# Artifact Formats\n\n"
    "## Anki card draft format (from facilitation prompts)\n\n"
    "Source: `brain/data/seed_methods.py` → `generate_facilitation_prompt()`\n\n"
    "````\n"
    "```\n"
    "CARD 1:\n"
    "TYPE: basic\n"
    "FRONT: [question]\n"
    "BACK: [answer]\n"
    "TAGS: [comma-separated]\n\n"
    "CARD 2:\n"
    "TYPE: cloze\n"
    "FRONT: The {{c1::answer}} is important because...\n"
    "BACK: [answer word/phrase]\n"
    "TAGS: [comma-separated]\n"
    "```\n"
    "````\n\n"
    "Rules (from the prompt builder):\n"
    "- TYPE must be `basic` or `cloze`.\n"
    "- FRONT and BACK are required.\n"
    "- Cloze cards must use `{{c1::...}}` syntax in FRONT.\n\n"
    "## Anki card parsing rules (WRAP parser)\n\n"
    "Source: `brain/wrap_parser.py` → `extract_anki_cards()`\n\n"
    "Accepted lines (regex): `front|back|tags|source` preceded by optional bullet and/or bold.\n"
    "Examples that parse:\n\n"
    "````\n"
    "```\n"
    "Front: What is the insertion of the sartorius?\n"
    "Back: Pes anserinus (medial proximal tibia).\n"
    "Tags: anatomy, hip\n"
    "```\n"
    "````\n\n"
    "Card separators recognized:\n"
    "- `**1**`, `1.`, `Card 1:` (starts a new card).\n\n"
    "## Mermaid diagram format (from facilitation prompts)\n\n"
    "Source: `brain/data/seed_methods.py` → `generate_facilitation_prompt()`\n\n"
    "````\n"
    "```mermaid\n"
    "graph LR\n"
    "    A[\"Main Topic\"]\n"
    "    B[\"Subtopic 1\"]\n"
    "    A -->|relates to| B\n"
    "```\n"
    "````\n\n"
    "Rules:\n"
    "- Use `graph` (NOT `flowchart`).\n"
    "- Concept maps use `graph LR`, flowcharts/decision trees use `graph TD`.\n"
    "- Node labels must use the `A[\"Label\"]` form.\n"
    "- Edges use `A --> B` or `A -->|text| B`.\n"
    """,
    encoding="utf-8",
)

summary = {
    "total_methods": len(methods),
    "total_chains": len(chains),
    "chains_with_unknown_ids": len(unknown_ids),
    "methods_missing_facilitation_prompt": missing_facilitation_prompt,
}

summary_path = EXPORTS_DIR / "inventory_summary.json"
summary_path.write_text(json.dumps(summary, indent=2) + "\n", encoding="utf-8")


def _flatten(values) -> str:
    if values is None:
        return "MISSING"
    if isinstance(values, list):
        if not values:
            return "MISSING"
        return "; ".join(str(v) for v in values)
    if isinstance(values, dict):
        if not values:
            return "MISSING"
        return "; ".join(f"{k}={v}" for k, v in values.items())
    text = str(values).strip()
    return text if text else "MISSING"


# ---------------------------------------------------------------------------
# research_packet.md (self-contained handoff document)
# ---------------------------------------------------------------------------
knob_registry_path = ROOT / "sop" / "library" / "meta" / "knob_registry.yaml"
session_log_template_path = ROOT / "sop" / "library" / "templates" / "session_log_template.yaml"
error_log_template_path = ROOT / "sop" / "library" / "templates" / "ErrorLog.csv"
control_plane_path = ROOT / "sop" / "library" / "17-control-plane.md"
templates_dir = ROOT / "sop" / "library" / "templates"

knob_registry = {}
if knob_registry_path.exists():
    data, _ = read_yaml(knob_registry_path)
    if isinstance(data, dict):
        knob_registry = data.get("knobs") or {}

session_fields = []
if session_log_template_path.exists():
    data, _ = read_yaml(session_log_template_path)
    if isinstance(data, dict):
        raw_fields = data.get("session_fields") or []
        if isinstance(raw_fields, list):
            session_fields = [f for f in raw_fields if isinstance(f, dict)]

error_overrides_map = {}
if control_plane_path.exists():
    control_text = control_plane_path.read_text(encoding="utf-8")
    for line in control_text.splitlines():
        stripped = line.strip()
        if not stripped.startswith("|"):
            continue
        cols = [c.strip() for c in stripped.strip("|").split("|")]
        if len(cols) < 2:
            continue
        error_type = cols[0]
        if error_type in {"Error Type", "---"}:
            continue
        method_ids = re.findall(r"`(M-[A-Z]{3}-\d{3})`", stripped)
        if not method_ids:
            continue
        for mid in method_ids:
            error_overrides_map.setdefault(mid, []).append(error_type)

error_log_schema = []
if error_log_template_path.exists():
    first_line = error_log_template_path.read_text(encoding="utf-8").splitlines()[0]
    error_log_schema = [h.strip() for h in first_line.split(",") if h.strip()]


def _method_stage_from_id(method_id: str) -> str:
    if method_id.startswith("M-PRE"):
        return "PRIME"
    if method_id.startswith("M-CAL"):
        return "CALIBRATE"
    if method_id.startswith("M-ENC") or method_id.startswith("M-INT"):
        return "ENCODE"
    if method_id.startswith("M-REF"):
        return "REFERENCE"
    if method_id.startswith("M-RET"):
        return "RETRIEVE"
    if method_id.startswith("M-OVR"):
        return "OVERLEARN"
    return "MISSING"


def _chain_category(chain_item: dict) -> str:
    stage = ""
    context_tags = chain_item.get("context_tags")
    if isinstance(context_tags, dict):
        stage = str(context_tags.get("stage") or "").strip().lower()
    if stage == "first_exposure":
        return "First Exposure"
    if stage == "consolidation":
        return "Consolidation"
    if stage == "exam_prep":
        return "Exam Ramp"
    if stage == "review":
        return "Maintenance"

    name = str(chain_item.get("name") or "").lower()
    if "exam" in name or "prep" in name:
        return "Exam Ramp"
    if "mastery" in name or "consolidation" in name:
        return "Consolidation"
    if "first exposure" in name or "intake" in name:
        return "First Exposure"
    return "Maintenance"


def _extract_doi(text: str) -> str:
    if not text:
        return "MISSING"
    match = re.search(r"(10\.\d{4,9}/[-._;()/:A-Za-z0-9]+)", text)
    if match:
        return match.group(1)
    return "MISSING"


def _evidence_strength(citation: str, evidence_raw: str) -> str:
    merged = f"{citation} {evidence_raw}".strip().lower()
    if not merged:
        return "low"
    high_keywords = ["meta", "systematic", "d=", "effect size", "network meta"]
    if any(k in merged for k in high_keywords):
        return "high"
    return "medium"


def _first_nonempty_line(path: Path) -> str:
    text = path.read_text(encoding="utf-8")
    for line in text.splitlines():
        stripped = line.strip()
        if stripped:
            return stripped.lstrip("#").strip()
    return "MISSING"


def _most_common(values: list[str]) -> str:
    if not values:
        return "MISSING"
    counts = {}
    for v in values:
        counts[v] = counts.get(v, 0) + 1
    return sorted(counts.items(), key=lambda kv: (-kv[1], kv[0]))[0][0]


method_by_id = {m.get("id"): m for m in method_catalog}
reference_producer_ids = set()
for mid, m in method_by_id.items():
    outputs = m.get("outputs")
    if isinstance(outputs, list):
        out_join = " ".join(str(o) for o in outputs).lower()
        if "one-page anchor" in out_join or "question bank seed" in out_join:
            reference_producer_ids.add(mid)

chain_dependency_risks = []
for chain_item in sorted(chain_catalog, key=lambda x: x.get("id", "")):
    blocks = chain_item.get("blocks") or []
    if not isinstance(blocks, list):
        continue
    first_retrieve = None
    first_reference = None
    for idx, block_id in enumerate(blocks):
        stage = _method_stage_from_id(str(block_id))
        if stage == "RETRIEVE" and first_retrieve is None:
            first_retrieve = idx
        if block_id in reference_producer_ids and first_reference is None:
            first_reference = idx
    if first_retrieve is None:
        continue
    if first_reference is None or first_retrieve < first_reference:
        chain_dependency_risks.append(
            {
                "chain_id": chain_item.get("id", "UNKNOWN"),
                "reason": "RETRIEVE appears before REFERENCE artifact producer",
            }
        )

template_stage_hints = {
    "Spine.md": "PRIME",
    "Unknowns.md": "PRIME",
    "Predictions.md": "PRIME",
    "GoalTargets.md": "PRIME",
    "CalibrateItems.md": "CALIBRATE",
    "CalibrateResults.csv": "CALIBRATE",
    "PrioritySet.md": "CALIBRATE",
    "OnePageAnchor.md": "REFERENCE",
    "QuestionBankSeed.md": "REFERENCE",
    "CoverageCheck.md": "REFERENCE",
    "ErrorLog.csv": "RETRIEVE",
    "DrillSheet.md": "OVERLEARN",
    "CrossSessionValidation.md": "OVERLEARN",
    "session_log_template.yaml": "OBSERVABILITY",
    "topic.yaml": "CONTROL PLANE",
}

template_rows = []
for path in sorted(templates_dir.glob("*")):
    if not path.is_file():
        continue
    summary_line = _first_nonempty_line(path)
    template_rows.append(
        {
            "artifact": path.name,
            "type": path.suffix.lstrip("."),
            "stage_hint": template_stage_hints.get(path.name, "MISSING"),
            "summary": summary_line,
        }
    )

research_packet_lines = [
    "# Research Packet",
    "",
    "This packet is generated from canonical YAML and markdown artifacts in `sop/library/`.",
    "It is intended for external learning-science review without repository access.",
    "",
    "## A) Executive Summary",
    "",
    "The system implements a domain-agnostic Intelligent Tutoring System (ITS) control-plane.",
    "The control-plane separates policy from content and enforces a fixed operational sequence:",
    "",
    "`PRIME -> CALIBRATE -> ENCODE -> REFERENCE -> RETRIEVE -> OVERLEARN`",
    "",
    "Key properties:",
    "- deterministic stage gates",
    "- explicit artifact contracts (e.g., OnePageAnchor, QuestionBankSeed, ErrorLog)",
    "- error-driven adaptation mapping (ErrorType -> mandatory method overrides)",
    "- chain-level knob routing (stage, energy, class_type, time_available, pass)",
    "",
    "## B) Canonical Artifacts and Templates Overview",
    "",
    "| canonical component | purpose | interpretation without repo |",
    "| --- | --- | --- |",
    "| Method YAML catalog | Defines atomic tutoring methods and metadata | Each method row below is executable policy + constraints |",
    "| Chain YAML catalog | Defines ordered method compositions | Chain table below encodes default sequencing behavior |",
    "| Control-plane spec | Defines stage gates + adaptation logic | Gates and ErrorLog semantics are summarized in this packet |",
    "| Template bundle | Defines mandatory artifacts and CSV schemas | Templates table below is sufficient for offline review |",
    "",
    "### Template Inventory",
    "",
    "| artifact template | type | stage hint | summary |",
    "| --- | --- | --- | --- |",
]
for row in template_rows:
    research_packet_lines.append(
        "| {artifact} | {type} | {stage_hint} | {summary} |".format(
            artifact=str(row["artifact"]).replace("|", "\\|"),
            type=str(row["type"]).replace("|", "\\|"),
            stage_hint=str(row["stage_hint"]).replace("|", "\\|"),
            summary=str(row["summary"]).replace("|", "\\|"),
        )
    )

research_packet_lines.extend(
    [
        "",
        "## C) Full Method Catalog",
        "",
        "| method_id | current name | stage | purpose | inputs -> outputs | gates | error types remediated | knobs supported (acute variables) | facilitation prompt |",
        "| --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    ]
)
for item in sorted(method_catalog, key=lambda x: x.get("id", "")):
    method_id = str(item.get("id", ""))
    stage = str(item.get("stage") or _method_stage_from_id(method_id))
    purpose = str(item.get("description") or "MISSING")
    inputs_outputs = f"{_flatten(item.get('inputs'))} -> {_flatten(item.get('outputs'))}"

    gates_value = item.get("gating_rules")
    if gates_value in (None, [], {}, ""):
        gates_value = item.get("stop_criteria")
    gates = _flatten(gates_value)

    remediated = []
    for et in error_overrides_map.get(method_id, []):
        if et not in remediated:
            remediated.append(et)
    failure_modes = item.get("failure_modes")
    if isinstance(failure_modes, list):
        for fm in failure_modes:
            if isinstance(fm, dict) and fm.get("mode"):
                remediated.append(f"failure_mode:{fm.get('mode')}")
    remediated = sorted(set(remediated))
    remediated_str = _flatten(remediated)

    method_knobs = item.get("knobs")
    if isinstance(method_knobs, dict) and method_knobs:
        knobs_supported = f"operational_stage={stage}; {_flatten(method_knobs)}"
    else:
        knobs_supported = f"operational_stage={stage}; method-specific knobs=MISSING"

    facilitation_prompt = item.get("facilitation_prompt")
    if facilitation_prompt is None or str(facilitation_prompt).strip() == "":
        facilitation_prompt = "PLACEHOLDER: generated by seed pipeline from YAML method steps."

    research_packet_lines.append(
        "| {method_id} | {name} | {stage} | {purpose} | {io} | {gates} | {remediated} | {knobs} | {facilitation} |".format(
            method_id=method_id.replace("|", "\\|"),
            name=str(item.get("name", "")).replace("|", "\\|"),
            stage=stage.replace("|", "\\|"),
            purpose=purpose.replace("|", "\\|"),
            io=inputs_outputs.replace("|", "\\|"),
            gates=gates.replace("|", "\\|"),
            remediated=remediated_str.replace("|", "\\|"),
            knobs=knobs_supported.replace("|", "\\|"),
            facilitation=str(facilitation_prompt).replace("|", "\\|"),
        )
    )

research_packet_lines.extend(
    [
        "",
        "## D) Full Chain Catalog",
        "",
        "| chain_id | category | method sequence | default knobs | gates and failure actions |",
        "| --- | --- | --- | --- | --- |",
    ]
)
for item in sorted(chain_catalog, key=lambda x: x.get("id", "")):
    chain_id = str(item.get("id", ""))
    category = _chain_category(item)
    method_sequence = " -> ".join(str(b) for b in (item.get("blocks") or []))

    if item.get("default_knobs"):
        default_knobs = _flatten(item.get("default_knobs"))
    else:
        default_knobs = _flatten(item.get("context_tags"))

    gates_value = _flatten(item.get("gates"))
    failure_value = _flatten(item.get("failure_actions"))
    if gates_value == "MISSING":
        gates_value = "Global stage gates apply: PRIME/CALIBRATE/ENCODE/REFERENCE/RETRIEVE/OVERLEARN."
    if failure_value == "MISSING":
        failure_value = "Global Error Taxonomy adaptation mapping applies."
    gates_and_failure = f"Gates={gates_value}; FailureActions={failure_value}"

    research_packet_lines.append(
        "| {chain_id} | {category} | {sequence} | {knobs} | {gf} |".format(
            chain_id=chain_id.replace("|", "\\|"),
            category=category.replace("|", "\\|"),
            sequence=method_sequence.replace("|", "\\|"),
            knobs=default_knobs.replace("|", "\\|"),
            gf=gates_and_failure.replace("|", "\\|"),
        )
    )

research_packet_lines.extend(
    [
        "",
        "## E) Knob Dictionary",
        "",
        "| knob | allowed values | default | semantics |",
        "| --- | --- | --- | --- |",
    ]
)
for knob_name in sorted(knob_registry.keys()):
    spec = knob_registry.get(knob_name) or {}
    knob_values_from_chains = []
    for chain in chain_catalog:
        ctx = chain.get("context_tags")
        if isinstance(ctx, dict) and knob_name in ctx:
            knob_values_from_chains.append(str(ctx.get(knob_name)))
        defaults = chain.get("default_knobs")
        if isinstance(defaults, dict) and knob_name in defaults:
            knob_values_from_chains.append(str(defaults.get(knob_name)))
    derived_default = spec.get("default")
    if derived_default is None:
        derived_default = _most_common(knob_values_from_chains)

    allowed = spec.get("allowed_values")
    if allowed is None:
        if "min" in spec or "max" in spec:
            allowed = f"range: {spec.get('min', 'MISSING')}..{spec.get('max', 'MISSING')}"
        else:
            allowed = spec.get("type", "MISSING")

    research_packet_lines.append(
        "| {knob} | {allowed} | {default} | {semantics} |".format(
            knob=str(knob_name).replace("|", "\\|"),
            allowed=_flatten(allowed).replace("|", "\\|"),
            default=str(derived_default).replace("|", "\\|"),
            semantics=str(spec.get("description", "MISSING")).replace("|", "\\|"),
        )
    )

error_type_enum = ["Recall", "Confusion", "Rule", "Representation", "Procedure", "Computation", "Speed"]
field_semantics = {
    "topic_id": "Topic identifier for the assessed scope.",
    "item_id": "Question or item identifier from assessment artifacts.",
    "error_type": "Error taxonomy enum (Recall/Confusion/Rule/Representation/Procedure/Computation/Speed).",
    "stage_detected": "Control-plane stage where the miss was detected.",
    "confidence": "Learner confidence tag at attempt time (H/M/L).",
    "time_to_answer": "Observed response latency in seconds.",
    "fix_applied": "Mandatory override or remediation action logged after miss.",
    "assessment_mode": "Active assessment mode at miss time.",
    "chain_id": "Selected chain identifier used for deterministic routing.",
    "support_level": "Prompting/scaffold level in effect (high/medium/low).",
    "prior_exposure_band": "Learner prior exposure band (new/intermediate/advanced).",
    "selector_policy_version": "Deterministic selector policy version for A/B partitioning and replay.",
    "dependency_fix_applied": "0/1 marker for runtime dependency auto-heal insertion before retrieval.",
}

research_packet_lines.extend(
    [
        "",
        "## F) Telemetry Specification",
        "",
        "### ErrorLog.csv Schema",
        "",
        "| field | type | allowed values | semantics |",
        "| --- | --- | --- | --- |",
    ]
)
for field_name in error_log_schema:
    if field_name == "time_to_answer":
        field_type = "number"
        allowed = ">= 0"
    elif field_name == "confidence":
        field_type = "enum"
        allowed = "H; M; L"
    elif field_name == "error_type":
        field_type = "enum"
        allowed = "; ".join(error_type_enum)
    elif field_name == "support_level":
        field_type = "enum"
        allowed = "high; medium; low"
    elif field_name == "prior_exposure_band":
        field_type = "enum"
        allowed = "new; intermediate; advanced"
    elif field_name == "dependency_fix_applied":
        field_type = "integer"
        allowed = "0; 1"
    else:
        field_type = "string"
        allowed = "non-empty"
    research_packet_lines.append(
        "| {field} | {type} | {allowed} | {semantics} |".format(
            field=field_name.replace("|", "\\|"),
            type=field_type.replace("|", "\\|"),
            allowed=allowed.replace("|", "\\|"),
            semantics=str(field_semantics.get(field_name, "MISSING")).replace("|", "\\|"),
        )
    )

research_packet_lines.extend(
    [
        "",
        "### Metric Formulas",
        "",
        "| metric | formula | notes |",
        "| --- | --- | --- |",
        "| low-support accuracy | `1 - (low_support_error_count / low_support_attempt_count)` | Attempt count comes from mixed low-support retrieval items; ErrorLog supplies error_count. |",
        "| adversarial accuracy | `1 - (adversarial_error_count / adversarial_attempt_count)` | Adversarial items are mode-tagged in retrieval artifacts (QuestionBankSeed/CoverageCheck). |",
        "| median latency | `median(time_to_answer)` | Computed over retrieve-stage rows in ErrorLog. |",
        "| high-confidence wrong rate | `count(confidence='H') / count(confidence in {'H','M','L'})` | Uses ErrorLog misses; reflects confident errors among logged misses. |",
        "| dependency-fix rate | `sum(dependency_fix_applied) / count(*)` | Share of miss rows that required runtime dependency auto-heal; should trend toward 0 after authoring fixes. |",
        "| expertise-reversal delta | `miss_rate(advanced,high_support) - miss_rate(advanced,low_support)` | Requires attempt-level denominator by support band; positive values indicate over-scaffolding risk for advanced learners. |",
    ]
)

research_packet_lines.extend(
    [
        "",
        "## G) Evidence Ledger",
        "",
        "| method_id | mechanism | citation(s) | DOI | evidence strength |",
        "| --- | --- | --- | --- | --- |",
    ]
)
methods_without_doi = []
methods_without_evidence = []
for item in sorted(method_catalog, key=lambda x: x.get("id", "")):
    method_id = str(item.get("id", ""))
    mechanisms = _flatten(item.get("mechanisms"))
    citation = str(item.get("evidence_citation", "") or "")
    evidence_raw = str(item.get("evidence_raw", "") or "")
    citation_joined = citation if citation else evidence_raw
    doi = _extract_doi(f"{citation_joined} {evidence_raw}")
    strength = _evidence_strength(citation_joined, evidence_raw)
    if doi == "MISSING":
        methods_without_doi.append(method_id)
    if not citation_joined.strip():
        methods_without_evidence.append(method_id)

    research_packet_lines.append(
        "| {method_id} | {mechanism} | {citation} | {doi} | {strength} |".format(
            method_id=method_id.replace("|", "\\|"),
            mechanism=mechanisms.replace("|", "\\|"),
            citation=(citation_joined or "MISSING").replace("|", "\\|"),
            doi=doi.replace("|", "\\|"),
            strength=strength.replace("|", "\\|"),
        )
    )

missing_stage_field = [
    m.get("id") for m in method_catalog if m.get("stage") in (None, "", "MISSING")
]
missing_method_knobs = [
    m.get("id") for m in method_catalog if not isinstance(m.get("knobs"), dict) or not m.get("knobs")
]
missing_method_gates = []
for m in method_catalog:
    gates_val = m.get("gating_rules")
    if gates_val in (None, [], {}, "") and (m.get("stop_criteria") in (None, [], {}, "")):
        missing_method_gates.append(m.get("id"))
missing_chain_gates = [c.get("id") for c in chain_catalog if c.get("gates") in (None, [], {}, "")]
missing_chain_failure = [c.get("id") for c in chain_catalog if c.get("failure_actions") in (None, [], {}, "")]
unmapped_error_methods = [
    m.get("id")
    for m in method_catalog
    if m.get("id") not in error_overrides_map
]

research_packet_lines.extend(
    [
        "",
        "## H) Open Gaps List",
        "",
        "### Missing metadata fields",
        f"- methods missing explicit `stage`: {len(missing_stage_field)} (examples: {', '.join(str(x) for x in missing_stage_field[:8]) or 'none'})",
        f"- methods missing method-specific `knobs`: {len(missing_method_knobs)}",
        f"- methods with no explicit gates (`gating_rules` or `stop_criteria`): {len(missing_method_gates)}",
        f"- chains missing chain-specific `gates`: {len(missing_chain_gates)}",
        f"- chains missing chain-specific `failure_actions`: {len(missing_chain_failure)}",
        "",
        "### Unclear gates",
        "- Most chains rely on global stage gates from the control-plane rather than chain-local gate definitions.",
        "- Most methods use stop criteria as implicit gates; explicit gating_rules are sparse.",
        "",
        "### Chain dependency risks",
        f"- chains where RETRIEVE appears before REFERENCE artifact producer: {len(chain_dependency_risks)}",
    ]
)
for risk in chain_dependency_risks[:20]:
    research_packet_lines.append(f"- {risk['chain_id']}: {risk['reason']}")

research_packet_lines.extend(
    [
        "",
        "### Research uncertainties",
        f"- methods with missing DOI in evidence fields: {len(methods_without_doi)}",
        f"- methods with no parseable evidence citation text: {len(methods_without_evidence)}",
        f"- methods not directly mapped in ErrorType -> mandatory override table: {len(unmapped_error_methods)}",
        "- Evidence strength labels are heuristic from canonical citation text until a DOI-linked evidence registry is completed.",
    ]
)

research_packet_path = EXPORTS_DIR / "research_packet.md"
research_packet_path.write_text("\n".join(research_packet_lines) + "\n", encoding="utf-8")

print("Export complete")
print(json.dumps(summary, indent=2))
