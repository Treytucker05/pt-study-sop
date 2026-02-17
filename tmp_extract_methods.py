from pathlib import Path
from ruamel.yaml import YAML
from ruamel.yaml.comments import CommentedMap
import json

yaml = YAML()

def as_plain(value):
    if isinstance(value, CommentedMap):
        return {k: as_plain(v) for k, v in value.items()}
    if isinstance(value, list):
        return [as_plain(item) for item in value]
    return value

def line_number(mapping, key):
    lc = getattr(mapping, "lc", None)
    if lc is None:
        return None
    try:
        pair = lc.key(key)
    except KeyError:
        return None
    if pair is None:
        return None
    return pair[0] + 1

def field_entry(mapping, key):
    if not isinstance(mapping, CommentedMap):
        return {"value": None, "line": None, "note": "absent"}
    value = mapping.get(key)
    line = line_number(mapping, key)
    if value is None:
        return {"value": None, "line": line, "note": "absent"}
    return {"value": as_plain(value), "line": line, "note": None}

def main():
    base = Path("sop/library/methods")
    entries = []
    for path in sorted(base.glob("*.yaml")):
        data = yaml.load(path)
        entry = {
            "file": path.as_posix(),
            "method_id": field_entry(data, "id"),
            "current_name": field_entry(data, "name"),
            "stage": field_entry(data, "stage"),
            "purpose": field_entry(data, "description"),
            "inputs": field_entry(data, "inputs"),
            "outputs": field_entry(data, "outputs"),
            "gating_rules": field_entry(data, "gating_rules"),
            "gates": field_entry(data, "gates"),
            "stop_criteria": field_entry(data, "stop_criteria"),
            "failure_modes": field_entry(data, "failure_modes"),
            "adaptation_hooks": field_entry(data, "adaptation_hooks"),
            "knobs": field_entry(data, "knobs"),
            "knob_registry_references": field_entry(data, "knob_registry"),
            "expertise_reversal_guidance": field_entry(data, "expertise_reversal_guidance"),
        }
        entries.append(entry)
    print(json.dumps(entries, indent=2))

if __name__ == "__main__":
    main()
