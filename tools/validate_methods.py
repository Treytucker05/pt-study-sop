import argparse
import importlib.util
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def load_db_setup():
    module_path = ROOT / "brain" / "db_setup.py"
    sys.path.append(str(ROOT / "brain"))
    spec = importlib.util.spec_from_file_location("db_setup", module_path)
    if spec is None or spec.loader is None:
        raise RuntimeError("Failed to load db_setup")
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--min-len", type=int, default=200)
    args = parser.parse_args()

    db_setup = load_db_setup()
    conn = db_setup.get_connection()
    conn.row_factory = None
    cursor = conn.cursor()

    try:
        cursor.execute(
            "SELECT id, name, facilitation_prompt FROM method_blocks ORDER BY id"
        )
    except Exception:
        conn.close()
        print("ERROR: method_blocks table not found")
        return 1

    rows = cursor.fetchall()
    conn.close()

    total = len(rows)
    missing = []
    short = []

    for row in rows:
        method_id, name, prompt = row
        value = (prompt or "").strip()
        if not value:
            missing.append((method_id, name))
        elif len(value) < args.min_len:
            short.append((method_id, name, len(value)))

    print(f"total methods: {total}")
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
