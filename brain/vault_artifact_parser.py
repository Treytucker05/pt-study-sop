# brain/vault_artifact_parser.py
"""Parse :::vault:*::: artifact commands from LLM output."""
from __future__ import annotations

import re
from typing import Any

# Match :::vault:<operation>\n...\n:::
_ARTIFACT_RE = re.compile(
    r":::vault:(\S+)\s*\n(.*?)\n:::",
    re.DOTALL,
)


def parse_vault_artifacts(text: str) -> list[dict[str, Any]]:
    """Extract vault artifact commands from LLM response text.

    Returns list of {"operation": str, "params": dict}.
    """
    artifacts = []
    for match in _ARTIFACT_RE.finditer(text):
        operation = match.group(1)
        body = match.group(2)
        params = _parse_yaml_body(body)
        artifacts.append({"operation": operation, "params": params})
    return artifacts


def strip_vault_artifacts(text: str) -> str:
    """Remove all :::vault:*::: blocks from text, leaving clean prose."""
    return _ARTIFACT_RE.sub("", text).strip()


def _parse_yaml_body(body: str) -> dict[str, str]:
    """Parse simple YAML-like key: value pairs from artifact body.

    Handles multiline values via `key: |` syntax.
    """
    params: dict[str, str] = {}
    lines = body.split("\n")
    current_key = ""
    current_value_lines: list[str] = []
    in_multiline = False

    for line in lines:
        if in_multiline:
            # Multiline continues while indented
            if line.startswith("  ") or line.startswith("\t"):
                current_value_lines.append(line.strip())
            elif line.strip() == "":
                current_value_lines.append("")
            else:
                # End of multiline — save and parse this line
                params[current_key] = "\n".join(current_value_lines).strip()
                in_multiline = False
                current_value_lines = []
                # Fall through to parse this line as a new key

        if not in_multiline:
            colon_idx = line.find(":")
            if colon_idx == -1:
                continue
            key = line[:colon_idx].strip()
            value = line[colon_idx + 1:].strip()
            if not key:
                continue
            if value == "|":
                current_key = key
                in_multiline = True
                current_value_lines = []
            else:
                params[key] = value

    # Flush any remaining multiline
    if in_multiline and current_key:
        params[current_key] = "\n".join(current_value_lines).strip()

    return params
