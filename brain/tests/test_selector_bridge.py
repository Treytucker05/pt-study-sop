"""Unit tests for brain/selector_bridge.py"""

import sys
from pathlib import Path

# Add brain/ to path for imports
brain_dir = Path(__file__).parent.parent
sys.path.insert(0, str(brain_dir))

import pytest
from selector_bridge import run_selector, get_policy_version, reload_chain_catalog


# ---------------------------------------------------------------------------
# get_policy_version
# ---------------------------------------------------------------------------


def test_policy_version_returns_string():
    v = get_policy_version()
    assert isinstance(v, str)
    assert v == "v1.0"


# ---------------------------------------------------------------------------
# reload_chain_catalog
# ---------------------------------------------------------------------------


def test_reload_chain_catalog_returns_positive_count():
    count = reload_chain_catalog()
    assert isinstance(count, int)
    assert count > 0


# ---------------------------------------------------------------------------
# run_selector — basic contract
# ---------------------------------------------------------------------------


def test_run_selector_returns_expected_keys():
    result = run_selector(assessment_mode="definition")
    expected_keys = {
        "chain_id",
        "chain_name",
        "selected_blocks",
        "dependency_fix_applied",
        "score_tuple",
        "selector_policy_version",
    }
    assert set(result.keys()) == expected_keys


def test_run_selector_chain_id_is_string():
    result = run_selector(assessment_mode="definition")
    assert isinstance(result["chain_id"], str)
    assert len(result["chain_id"]) > 0


def test_run_selector_selected_blocks_is_list():
    result = run_selector(assessment_mode="definition")
    assert isinstance(result["selected_blocks"], list)
    assert len(result["selected_blocks"]) > 0


def test_run_selector_score_tuple_is_list_of_ints():
    result = run_selector(assessment_mode="definition")
    assert isinstance(result["score_tuple"], list)
    assert all(isinstance(x, (int, float)) for x in result["score_tuple"])


def test_run_selector_policy_version_matches():
    result = run_selector(assessment_mode="definition")
    assert result["selector_policy_version"] == get_policy_version()


# ---------------------------------------------------------------------------
# run_selector — determinism
# ---------------------------------------------------------------------------


def test_determinism_same_input_same_output():
    """Same inputs should always yield the same chain selection."""
    r1 = run_selector(
        assessment_mode="mechanism", stage="review", energy="high", time_available=45
    )
    r2 = run_selector(
        assessment_mode="mechanism", stage="review", energy="high", time_available=45
    )
    assert r1["chain_id"] == r2["chain_id"]
    assert r1["selected_blocks"] == r2["selected_blocks"]
    assert r1["score_tuple"] == r2["score_tuple"]


# ---------------------------------------------------------------------------
# run_selector — various assessment modes
# ---------------------------------------------------------------------------


@pytest.mark.parametrize(
    "mode",
    [
        "definition",
        "classification",
        "recognition",
        "mechanism",
        "computation",
        "procedure",
        "spatial",
        "synthesis",
    ],
)
def test_run_selector_valid_modes(mode: str):
    """Every standard assessment mode should produce a selection."""
    m: str = mode  # pyright narrows from parametrize union
    result = run_selector(assessment_mode=m)
    assert result["chain_id"]
    assert result["chain_name"]


# ---------------------------------------------------------------------------
# run_selector — optional parameters
# ---------------------------------------------------------------------------


def test_run_selector_with_all_optional_params():
    result = run_selector(
        assessment_mode="definition",
        stage="exam_prep",
        energy="low",
        time_available=20,
        class_type="lecture",
        prior_exposure_band="moderate",
        prior_rsr=0.75,
        prior_calibration_gap=0.1,
    )
    assert result["chain_id"]
    assert isinstance(result["dependency_fix_applied"], bool)
