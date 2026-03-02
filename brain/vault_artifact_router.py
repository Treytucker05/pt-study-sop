# brain/vault_artifact_router.py
"""Route parsed vault artifact commands to ObsidianVault methods."""
from __future__ import annotations

import logging
from typing import Any

log = logging.getLogger(__name__)


def execute_vault_artifact(vault: Any, artifact: dict) -> str:
    """Execute a single vault artifact command.

    Args:
        vault: ObsidianVault instance
        artifact: {"operation": str, "params": dict}

    Returns:
        Result string from vault operation, or error message.
    """
    op = artifact["operation"]
    p = artifact["params"]

    try:
        if op == "create":
            return vault.create_note(
                name=p.get("name", ""),
                folder=p.get("folder", ""),
                template=p.get("template", ""),
                content=p.get("content", ""),
            )
        elif op == "append":
            return vault.append_note(p.get("file", ""), p.get("content", ""))
        elif op == "prepend":
            return vault.prepend_note(p.get("file", ""), p.get("content", ""))
        elif op == "replace-section":
            return vault.replace_section(
                p.get("file", ""), p.get("heading", ""), p.get("content", "")
            )
        elif op == "property":
            return vault.set_property(p.get("file", ""), p.get("key", ""), p.get("value", ""))
        elif op == "search":
            results = vault.search(p.get("query", ""), limit=int(p.get("limit", "10")))
            return str(results)
        elif op == "move":
            return vault.move_note(
                p.get("path", ""),
                new_name=p.get("name", ""),
                new_folder=p.get("folder", ""),
            )
        else:
            log.warning("Unknown vault artifact operation: %s", op)
            return f"Unknown operation: {op}"
    except Exception as exc:
        log.error("Vault artifact %s failed: %s", op, exc)
        return f"Error: {exc}"


def execute_all_artifacts(vault: Any, artifacts: list[dict]) -> list[dict]:
    """Execute all artifacts and return results.

    Returns list of {"operation": str, "result": str, "success": bool}.
    """
    results = []
    for artifact in artifacts:
        result = execute_vault_artifact(vault, artifact)
        success = not result.startswith("Error:") and not result.startswith("Unknown")
        results.append({
            "operation": artifact["operation"],
            "result": result,
            "success": success,
        })
    return results
