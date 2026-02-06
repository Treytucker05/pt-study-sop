"""
Optional Supermemory snippet (not used by the PT Study app).

This file is kept intentionally lightweight and safe:
- No secrets are stored here.
- Provide the API key via environment variables if you run it.
"""

from __future__ import annotations

import os


def main() -> int:
    api_key = os.environ.get("SUPERMEMORY_API_KEY", "").strip()
    if not api_key:
        print("SUPERMEMORY_API_KEY is not set. Nothing to do.")
        return 0

    # Optional dependency: only required if you run this file directly.
    from supermemory import Supermemory  # type: ignore

    client = Supermemory(api_key=api_key)

    # Example usage (edit to taste):
    # response = client.memories.add(
    #     content="Supermemory Python SDK is awesome.",
    #     container_tag="Python_SDK",
    #     metadata={"note_id": 123},
    # )
    # print(response)

    searching = client.search.execute(q="What do you know about me?")
    print(searching.results)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

