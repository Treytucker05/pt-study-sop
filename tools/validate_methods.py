import argparse
import importlib.util
from pathlib import Path
from typing import Callable

import yaml

ROOT = Path(__file__).resolve().parents[1]
METHODS_DIR = ROOT / "sop" / "library" / "methods"

_seed_loader = None


def _load_facilitation_prompt_builder() -> Callable[[dict], str] | None:
    global _seed_loader
    if _seed_loader is not None:
        return _seed_loader
    try:
        seed_path = ROOT / "brain" / "data" / "seed_methods.py"
        if not seed_path.exists():
            return None
        spec = importlib.util.spec_from_file_location("seed_methods_for_validation", seed_path)
        if spec is None or spec.loader is None:
            return None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        builder = getattr(module, "generate_facilitation_prompt", None)
        if callable(builder):
            _seed_loader = builder
            return builder
    except Exception:
        return None
    return None


def load_yaml_file(path: Path) -> tuple[dict | None, str | None]:
    """Load a YAML file. Returns (data, error_message)."""
    try:
        data = yaml.safe_load(path.read_text(encoding="utf-8"))
        if not isinstance(data, dict):
            return None, f"{path.name}: YAML root is not a mapping"
        return data, None
    except yaml.YAMLError as e:
        return None, f"{path.name}: YAML parse error: {e}"
    except OSError as e:
        return None, f"{path.name}: read error: {e}"


def main() -> int:
    parser = argparse.ArgumentParser(description="Validate method prompts in YAML sources.")
    parser.add_argument("--min-len", type=int, default=200)
    args = parser.parse_args()

    yaml_files = sorted(METHODS_DIR.glob("*.yaml"))
    if not METHODS_DIR.exists():
        print("ERROR: methods directory does not exist")
        return 1
    if not yaml_files:
        print("ERROR: methods directory contains no YAML files")
        return 1

    missing = []
    short = []
    rows = 0

    for path in yaml_files:
        data, err = load_yaml_file(path)
        if err:
            print(err)
            continue
        if not data:
            print(f"{path.name}: empty YAML file")
            continue

        rows += 1
        method_id = data.get("id", f"<unknown:{path.name}>")
        name = data.get("name", "<unnamed>")
        prompt = (data.get("facilitation_prompt") or "").strip()
        if not prompt:
            builder = _load_facilitation_prompt_builder()
            if builder:
                try:
                    prompt = (builder(data) or "").strip()
                except Exception as e:
                    print(f"{path.name}: failed to generate facilitation prompt: {e}")
                    continue


        if not prompt:
            missing.append((method_id, name))
        elif len(prompt) < args.min_len:
            short.append((method_id, name, len(prompt)))

    print(f"total methods: {rows}")
    print(f"missing facilitation_prompt: {len(missing)}")
    print(f"facilitation_prompt < {args.min_len}: {len(short)}")

    if missing:
        print("\nMissing prompts:")
        for method_id, name in missing:
            print(f"- {method_id}: {name}")

    if short:
        print("\nShort prompts:")
        for method_id, name, length in short:
            print(f"- {method_id}: {name} ({length} chars)")

    return 1 if missing or short else 0


if __name__ == "__main__":
    raise SystemExit(main())
