"""Unit tests for Figma diagram tool and figma_mcp_client module."""

import sys
from pathlib import Path
from unittest.mock import patch, MagicMock

# Add brain/ to path for imports
brain_dir = Path(__file__).parent.parent
sys.path.insert(0, str(brain_dir))

import pytest


# ---------------------------------------------------------------------------
# is_figma_available — availability checks
# ---------------------------------------------------------------------------


class TestIsFigmaAvailable:
    """Test the availability checker (no I/O, no MCP)."""

    def test_missing_everything(self):
        from figma_mcp_client import is_figma_available

        with (
            patch("figma_mcp_client._get_server_js_path", return_value=None),
            patch("figma_mcp_client._get_figma_token", return_value=None),
            patch("figma_mcp_client.shutil.which", return_value=None),
        ):
            result = is_figma_available()
            assert result["available"] is False
            assert len(result["issues"]) == 3
            assert not result["has_token"]
            assert not result["has_node"]

    def test_all_present(self):
        from figma_mcp_client import is_figma_available

        with (
            patch(
                "figma_mcp_client._get_server_js_path",
                return_value="/some/path/server.js",
            ),
            patch(
                "figma_mcp_client._get_figma_token",
                return_value="fig_abc123",
            ),
            patch(
                "figma_mcp_client.shutil.which",
                return_value="/usr/bin/node",
            ),
        ):
            result = is_figma_available()
            assert result["available"] is True
            assert result["issues"] == []
            assert result["has_token"] is True
            assert result["has_node"] is True

    def test_missing_token_only(self):
        from figma_mcp_client import is_figma_available

        with (
            patch(
                "figma_mcp_client._get_server_js_path",
                return_value="/some/path/server.js",
            ),
            patch("figma_mcp_client._get_figma_token", return_value=None),
            patch(
                "figma_mcp_client.shutil.which",
                return_value="/usr/bin/node",
            ),
        ):
            result = is_figma_available()
            assert result["available"] is False
            assert any("FIGMA_ACCESS_TOKEN" in i for i in result["issues"])


# ---------------------------------------------------------------------------
# Layout algorithms
# ---------------------------------------------------------------------------


class TestLayoutAlgorithms:
    """Test the pure layout functions (no MCP, no Figma)."""

    def test_flowchart_layout_positions(self):
        from figma_mcp_client import (
            _layout_flowchart,
            NODE_HEIGHT,
            NODE_PADDING_Y,
            FRAME_PADDING,
        )

        nodes = [
            {"id": "a", "label": "Step A"},
            {"id": "b", "label": "Step B"},
            {"id": "c", "label": "Step C"},
        ]
        result = _layout_flowchart(nodes, None)
        assert len(result) == 3
        # All at same x (vertical stack)
        assert all(n["x"] == FRAME_PADDING for n in result)
        # Y increases
        for i, n in enumerate(result):
            assert n["y"] == FRAME_PADDING + i * (NODE_HEIGHT + NODE_PADDING_Y)

    def test_concept_map_layout_center_node(self):
        from figma_mcp_client import _layout_concept_map

        nodes = [
            {"id": "center", "label": "Main Concept"},
            {"id": "a", "label": "Sub A"},
            {"id": "b", "label": "Sub B"},
        ]
        result = _layout_concept_map(nodes, None)
        assert len(result) == 3
        # Center node is at the center of the canvas
        center = result[0]
        assert center["id"] == "center"

    def test_concept_map_empty(self):
        from figma_mcp_client import _layout_concept_map

        assert _layout_concept_map([], None) == []

    def test_hierarchy_layout_with_edges(self):
        from figma_mcp_client import _layout_hierarchy

        nodes = [
            {"id": "root", "label": "Root"},
            {"id": "child1", "label": "Child 1"},
            {"id": "child2", "label": "Child 2"},
        ]
        edges = [
            {"from": "root", "to": "child1"},
            {"from": "root", "to": "child2"},
        ]
        result = _layout_hierarchy(nodes, edges)
        assert len(result) == 3
        # Root should be at level 0 (top), children at level 1
        root = next(n for n in result if n["id"] == "root")
        child1 = next(n for n in result if n["id"] == "child1")
        assert root["y"] < child1["y"]

    def test_hierarchy_falls_back_without_edges(self):
        from figma_mcp_client import _layout_hierarchy

        nodes = [
            {"id": "a", "label": "A"},
            {"id": "b", "label": "B"},
        ]
        result = _layout_hierarchy(nodes, None)
        assert len(result) == 2


# ---------------------------------------------------------------------------
# Tool schema validation
# ---------------------------------------------------------------------------


class TestFigmaToolSchema:
    """Verify the tool schema is well-formed."""

    def test_schema_in_tool_list(self):
        from tutor_tools import TUTOR_TOOL_SCHEMAS

        names = [s["name"] for s in TUTOR_TOOL_SCHEMAS]
        assert "create_figma_diagram" in names

    def test_schema_has_required_fields(self):
        from tutor_tools import CREATE_FIGMA_DIAGRAM_SCHEMA

        assert CREATE_FIGMA_DIAGRAM_SCHEMA["type"] == "function"
        assert CREATE_FIGMA_DIAGRAM_SCHEMA["name"] == "create_figma_diagram"
        params = CREATE_FIGMA_DIAGRAM_SCHEMA["parameters"]
        assert "title" in params["properties"]
        assert "diagram_type" in params["properties"]
        assert "nodes" in params["properties"]
        assert "edges" in params["properties"]
        assert set(params["required"]) == {"title", "diagram_type", "nodes"}

    def test_diagram_type_enum(self):
        from tutor_tools import CREATE_FIGMA_DIAGRAM_SCHEMA

        dt = CREATE_FIGMA_DIAGRAM_SCHEMA["parameters"]["properties"]["diagram_type"]
        assert set(dt["enum"]) == {"flowchart", "concept_map", "hierarchy", "process"}


# ---------------------------------------------------------------------------
# Tool execution — graceful degradation
# ---------------------------------------------------------------------------


class TestExecuteCreateFigmaDiagram:
    """Test execute_create_figma_diagram with mocked MCP client."""

    def test_missing_title_returns_error(self):
        from tutor_tools import execute_create_figma_diagram

        result = execute_create_figma_diagram({"nodes": [{"id": "a", "label": "A"}]})
        assert result["success"] is False
        assert "title" in result["error"]

    def test_missing_nodes_returns_error(self):
        from tutor_tools import execute_create_figma_diagram

        result = execute_create_figma_diagram({"title": "Test"})
        assert result["success"] is False
        assert "nodes" in result["error"]

    def test_figma_unavailable_returns_graceful_error(self):
        from tutor_tools import execute_create_figma_diagram

        with patch(
            "brain.figma_mcp_client.is_figma_available",
            return_value={
                "available": False,
                "issues": ["FIGMA_ACCESS_TOKEN not set"],
                "server_js": None,
                "has_token": False,
                "has_node": True,
            },
        ):
            result = execute_create_figma_diagram(
                {
                    "title": "Test Diagram",
                    "diagram_type": "flowchart",
                    "nodes": [{"id": "a", "label": "A"}],
                }
            )
            assert result["success"] is False
            assert "not set up" in result["error"] or "not available" in result["error"]


# ---------------------------------------------------------------------------
# Tool registry
# ---------------------------------------------------------------------------


class TestToolRegistry:
    """Verify Figma tool is registered in the central registry."""

    def test_figma_in_registry(self):
        from tutor_tools import TOOL_REGISTRY

        assert "create_figma_diagram" in TOOL_REGISTRY

    def test_execute_tool_routes_to_figma(self):
        from tutor_tools import execute_tool

        # Should fail gracefully (no Figma available), not crash
        result = execute_tool(
            "create_figma_diagram",
            {
                "title": "Test",
                "diagram_type": "flowchart",
                "nodes": [{"id": "a", "label": "A"}],
            },
        )
        assert isinstance(result, dict)
        assert "success" in result

    def test_get_tool_schemas_includes_figma(self):
        from tutor_tools import get_tool_schemas

        schemas = get_tool_schemas()
        names = [s["name"] for s in schemas]
        assert "create_figma_diagram" in names
        assert len(schemas) == 4  # obsidian, note, anki, figma


# ---------------------------------------------------------------------------
# Node color mapping
# ---------------------------------------------------------------------------


class TestNodeTypeColor:
    """Test the color mapper."""

    def test_known_types(self):
        from figma_mcp_client import _node_type_color

        for t in ("start", "end", "process", "decision", "concept"):
            color = _node_type_color(t)
            assert len(color) == 3
            assert all(0.0 <= c <= 1.0 for c in color)

    def test_unknown_type_defaults(self):
        from figma_mcp_client import _node_type_color

        color = _node_type_color("unknown_type")
        assert len(color) == 3
