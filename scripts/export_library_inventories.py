import csv
import json
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
    return str(path.relative_to(ROOT))


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

print("Export complete")
print(json.dumps(summary, indent=2))
