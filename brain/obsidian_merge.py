import json
import re
from typing import Dict, Optional

import requests

from llm_provider import call_llm

OBSIDIAN_API_URL = "https://127.0.0.1:27124"
MANAGED_START = "<!-- BRAIN_MANAGED_START -->"
MANAGED_END = "<!-- BRAIN_MANAGED_END -->"


def read_existing_note(path: str) -> str:
    """Get current note content via Obsidian API."""
    api_key = _get_obsidian_api_key()
    if not api_key:
        return ""
    try:
        resp = requests.get(
            f"{OBSIDIAN_API_URL}/vault/{path}",
            headers={"Authorization": f"Bearer {api_key}"},
            timeout=10,
            verify=False,
        )
        if resp.status_code == 200:
            return resp.text or ""
    except Exception:
        return ""
    return ""


def diff_content(existing: str, new: str) -> dict:
    """Identify what's new vs already present."""
    existing_lines = {line.strip() for line in existing.splitlines() if line.strip()}
    new_lines = [line for line in new.splitlines() if line.strip() and line.strip() not in existing_lines]
    return {
        "is_duplicate": len(new_lines) == 0,
        "new_lines": new_lines,
    }


def merge_sections(existing: str, new: str, session_id: Optional[str] = None, vault_index: Optional[list] = None) -> str:
    """Combine content without duplication. Pass vault_index for validated wikilinks."""
    if not new or not new.strip():
        return existing

    existing = existing or ""
    managed_block = _find_managed_block(existing, session_id=session_id)
    merged_body = new.strip()

    if managed_block:
        merged_body = _semantic_merge(_strip_managed_block(managed_block), new)

    merged_body = add_concept_links(merged_body, course=None, vault_index=vault_index)
    merged_body = format_obsidian(merged_body)
    new_block = _build_managed_block(merged_body, session_id=session_id)

    if managed_block:
        if managed_block == new_block:
            return existing
        return existing.replace(managed_block, new_block)

    if existing.strip().endswith(MANAGED_END):
        return existing.rstrip() + "\n\n" + new_block
    return existing.rstrip() + "\n\n" + new_block if existing.strip() else new_block


def add_concept_links(content: str, course: Optional[str] = None, vault_index: Optional[list] = None) -> str:
    """Convert key terms to [[Wiki Links]] using LLM, validated against vault index."""
    if not content.strip():
        return content

    system_prompt = (
        "Identify key terms that should be linked in Obsidian. "
        "Return JSON array of terms only. Do not include duplicates."
    )
    if vault_index:
        # Give the LLM ground truth so it only links to existing notes
        sample = vault_index[:200]
        notes_str = ", ".join(sample)
        if len(vault_index) > 200:
            notes_str += f" ... ({len(vault_index) - 200} more)"
        system_prompt += (
            f"\n\nONLY link terms that match one of these existing notes: {notes_str}. "
            "Do NOT create links for concepts not in this list."
        )

    user_prompt = f"Content:\n{content}"
    result = call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        provider="openrouter",
        model="google/gemini-2.5-flash-lite",
        timeout=30,
    )
    if not result.get("success"):
        return content

    try:
        terms = json.loads(result.get("content", "") or "[]")
    except json.JSONDecodeError:
        return content

    if not isinstance(terms, list):
        return content

    # Validate against vault index if provided
    if vault_index:
        vault_lookup = {note.lower(): note for note in vault_index}
        validated = []
        for term in terms:
            if not isinstance(term, str) or not term.strip():
                continue
            match = vault_lookup.get(term.strip().lower())
            if match:
                validated.append(match)
        terms = validated

    updated = content
    for term in sorted({t for t in terms if isinstance(t, str) and t.strip()}, key=len, reverse=True):
        term_clean = term.strip()
        if not term_clean:
            continue
        updated = _link_term(updated, term_clean)
    return updated


def format_obsidian(content: str) -> str:
    """Apply basic Obsidian formatting (normalize spacing)."""
    formatted = re.sub(r"\n{3,}", "\n\n", content.strip())
    return formatted.strip()


def _get_obsidian_api_key() -> str:
    from config import load_env
    import os

    load_env()
    key = os.environ.get("OBSIDIAN_API_KEY", "")
    if key:
        return key

    env_path = os.path.join(os.path.dirname(__file__), ".env")
    if os.path.exists(env_path):
        try:
            with open(env_path, "r", encoding="utf-8") as f:
                for line in f:
                    line = line.strip()
                    if line.startswith("OBSIDIAN_API_KEY="):
                        return line.split("=", 1)[1].strip().strip('"').strip("'")
        except Exception:
            pass
    return ""


def _build_managed_block(content: str, session_id: Optional[str]) -> str:
    header = "## WRAP Highlights"
    if session_id:
        header = f"{header} (session_id: {session_id})"
    return f"{MANAGED_START}\n{header}\n{content.strip()}\n{MANAGED_END}"


def _find_managed_block(existing: str, session_id: Optional[str]) -> Optional[str]:
    pattern = re.compile(rf"{re.escape(MANAGED_START)}.*?{re.escape(MANAGED_END)}", re.DOTALL)
    for block in pattern.findall(existing):
        if session_id:
            if f"session_id: {session_id}" in block:
                return block
        else:
            return block
    return None


def _strip_managed_block(block: str) -> str:
    content = block.replace(MANAGED_START, "").replace(MANAGED_END, "")
    return content.strip()


def _semantic_merge(existing_body: str, new_body: str) -> str:
    system_prompt = (
        "Merge WRAP notes without losing existing content. "
        "Preserve all existing notes, add new info, and resolve conflicts by keeping both with brief labels. "
        "Return JSON with keys: merged_content, redundant (true/false)."
    )
    user_prompt = (
        "Existing managed block:\n"
        f"{existing_body}\n\nNew WRAP content:\n{new_body}"
    )
    result = call_llm(
        system_prompt=system_prompt,
        user_prompt=user_prompt,
        provider="openrouter",
        model="google/gemini-2.5-flash-lite",
        timeout=45,
    )
    if not result.get("success"):
        return _deterministic_merge(existing_body, new_body)

    try:
        parsed = json.loads(result.get("content", "") or "{}")
    except json.JSONDecodeError:
        return _deterministic_merge(existing_body, new_body)

    merged_content = parsed.get("merged_content")
    if isinstance(merged_content, str) and merged_content.strip():
        return merged_content.strip()

    return _deterministic_merge(existing_body, new_body)


def _deterministic_merge(existing_body: str, new_body: str) -> str:
    diff = diff_content(existing_body, new_body)
    if diff["is_duplicate"]:
        return existing_body.strip()
    additions = "\n".join(diff["new_lines"]).strip()
    if not additions:
        return existing_body.strip()
    return f"{existing_body.strip()}\n\n{additions}".strip()


def _link_term(content: str, term: str) -> str:
    pattern = re.compile(rf"(?<!\\[)\\b{re.escape(term)}\\b")

    def replace(match):
        text = match.group(0)
        if f"[[{text}]]" in content:
            return text
        return f"[[{text}]]"

    return pattern.sub(replace, content)


def generate_obsidian_patch(session_id: str, note_path: str, new_content: str, existing_content: Optional[str] = None) -> Optional[str]:
    """
    Generate a diff-based patch for Obsidian note updates.
    
    Args:
        session_id: Session identifier for tracking
        note_path: Path to the Obsidian note
        new_content: New content to merge
        existing_content: Optional existing content (for testing); if None, reads from Obsidian API
        
    Returns:
        Path to the generated .diff file, or None if failed
    """
    import os
    from datetime import datetime
    from pathlib import Path
    
    existing = existing_content if existing_content is not None else read_existing_note(note_path)
    if existing and diff_content(existing, new_content).get("is_duplicate"):
        return None
    merged = merge_sections(existing, new_content, session_id)
    
    if existing == merged:
        return None
    
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    patch_filename = f"{session_id}_{timestamp}.diff"
    patch_dir = Path(__file__).parent / "data" / "obsidian_patches"
    patch_dir.mkdir(parents=True, exist_ok=True)
    patch_path = patch_dir / patch_filename
    
    diff_lines = []
    diff_lines.append(f"--- {note_path}\t(original)")
    diff_lines.append(f"+++ {note_path}\t(modified)")
    diff_lines.append(f"@@ session_id: {session_id} @@")
    
    existing_lines = existing.splitlines()
    merged_lines = merged.splitlines()
    
    for i, line in enumerate(merged_lines):
        if i >= len(existing_lines):
            diff_lines.append(f"+ {line}")
        elif line != existing_lines[i]:
            diff_lines.append(f"- {existing_lines[i]}")
            diff_lines.append(f"+ {line}")
    
    metadata = {
        "session_id": session_id,
        "note_path": note_path,
        "timestamp": timestamp,
        "original_length": len(existing_lines),
        "modified_length": len(merged_lines),
        "can_rollback": True
    }
    
    diff_lines.insert(0, f"# Metadata: {json.dumps(metadata)}")
    
    with open(patch_path, "w", encoding="utf-8") as f:
        f.write("\n".join(diff_lines))
    
    return str(patch_path)
