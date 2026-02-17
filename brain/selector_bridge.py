"""Bridge between brain/ runtime and sop/tools/selector_policy.py.

Loads the chain catalog from sop/library/chains/ and exposes a single
``run_selector()`` function that the backend can call without knowing
about YAML paths or dataclass details.
"""

from __future__ import annotations

import json
import logging
import sys
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Locate the SOP tools directory and import the selector policy module.
# ---------------------------------------------------------------------------

_REPO_ROOT = Path(__file__).resolve().parents[1]
_SOP_TOOLS = _REPO_ROOT / "sop" / "tools"
_CHAINS_DIR = _REPO_ROOT / "sop" / "library" / "chains"

if str(_SOP_TOOLS) not in sys.path:
    sys.path.insert(0, str(_SOP_TOOLS))

from selector_policy import (  # type: ignore[import-not-found]  # noqa: E402
    POLICY_VERSION,
    SelectionResult,
    SelectorInput,
    load_chain_catalog,
    select_chain,
)

# ---------------------------------------------------------------------------
# Cached chain catalog (loaded once per process, reloaded on error).
# ---------------------------------------------------------------------------

_chain_catalog: list[dict[str, Any]] = []
_chain_catalog_loaded: bool = False


def _get_chain_catalog() -> list[dict[str, Any]]:
    global _chain_catalog, _chain_catalog_loaded
    if not _chain_catalog_loaded:
        if not _CHAINS_DIR.is_dir():
            raise FileNotFoundError(f"Chain catalog directory not found: {_CHAINS_DIR}")
        _chain_catalog = load_chain_catalog(_CHAINS_DIR)
        _chain_catalog_loaded = True
        logger.info("Loaded %d chains from %s", len(_chain_catalog), _CHAINS_DIR)
    return _chain_catalog


def reload_chain_catalog() -> int:
    """Force-reload the chain catalog.  Returns the number of chains loaded."""
    global _chain_catalog, _chain_catalog_loaded
    _chain_catalog_loaded = False
    _chain_catalog = []
    catalog = _get_chain_catalog()
    return len(catalog)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------


def run_selector(
    *,
    assessment_mode: str,
    stage: str = "first_exposure",
    energy: str = "medium",
    time_available: int = 40,
    class_type: str | None = None,
    prior_exposure_band: str = "new",
    prior_rsr: float | None = None,
    prior_calibration_gap: float | None = None,
) -> dict[str, Any]:
    """Run the deterministic selector and return a plain dict of results.

    Returns a dict with keys:
        chain_id, chain_name, selected_blocks, dependency_fix_applied,
        score_tuple, selector_policy_version

    Raises ``ValueError`` if no candidate chains match the input.
    """
    catalog = _get_chain_catalog()

    selector_input = SelectorInput(
        assessment_mode=assessment_mode,
        stage=stage,
        energy=energy,
        time_available=time_available,
        class_type=class_type,
        prior_exposure_band=prior_exposure_band,
        prior_rsr=prior_rsr,
        prior_calibration_gap=prior_calibration_gap,
    )

    result: SelectionResult = select_chain(catalog, selector_input)

    return {
        "chain_id": result.chain_id,
        "chain_name": result.chain_name,
        "selected_blocks": result.selected_blocks,
        "dependency_fix_applied": result.dependency_fix_applied,
        "score_tuple": list(result.score_tuple),
        "selector_policy_version": result.selector_policy_version,
    }


def get_policy_version() -> str:
    """Return the current selector policy version string."""
    return POLICY_VERSION
