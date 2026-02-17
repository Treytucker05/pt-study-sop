"""
Figma MCP Client — server-side diagram creation via Figma MCP server.

Connects to karthiks3000/figma-mcp-server via stdio using the Anthropic
MCP Python SDK. Requires:
  1. Figma MCP server built: figma-mcp-server/dist/server.js
  2. FIGMA_ACCESS_TOKEN env var (or in brain/.env)
  3. Figma Desktop open with the plugin loaded (write mode)

Falls back gracefully when any prerequisite is missing.
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
import shutil
from pathlib import Path
from typing import Any

log = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------

# Default location relative to repo root
_REPO_ROOT = Path(__file__).parent.parent.resolve()
_DEFAULT_SERVER_JS = _REPO_ROOT / "figma-mcp-server" / "dist" / "server.js"

# Layout constants for diagram generation
NODE_WIDTH = 200
NODE_HEIGHT = 60
NODE_PADDING_X = 80
NODE_PADDING_Y = 40
LABEL_OFFSET_X = 10
LABEL_OFFSET_Y = 20
FRAME_PADDING = 60


def _get_server_js_path() -> str | None:
    """Resolve the Figma MCP server.js path."""
    # Check env override first
    env_path = os.environ.get("FIGMA_MCP_SERVER_JS")
    if env_path and Path(env_path).is_file():
        return env_path
    # Check default location
    if _DEFAULT_SERVER_JS.is_file():
        return str(_DEFAULT_SERVER_JS)
    return None


def _get_figma_token() -> str | None:
    """Get Figma access token from environment."""
    return os.environ.get("FIGMA_ACCESS_TOKEN")


def is_figma_available() -> dict[str, Any]:
    """Check if Figma MCP integration is available. Non-blocking, no I/O."""
    server_js = _get_server_js_path()
    token = _get_figma_token()
    node_bin = shutil.which("node")

    available = bool(server_js and token and node_bin)
    issues: list[str] = []
    if not node_bin:
        issues.append("Node.js not found in PATH")
    if not server_js:
        issues.append(
            "Figma MCP server not found. "
            "Clone karthiks3000/figma-mcp-server to repo root and run npm run build."
        )
    if not token:
        issues.append("FIGMA_ACCESS_TOKEN not set in brain/.env or environment")

    return {
        "available": available,
        "issues": issues,
        "server_js": server_js,
        "has_token": bool(token),
        "has_node": bool(node_bin),
    }


# ---------------------------------------------------------------------------
# Async MCP Client
# ---------------------------------------------------------------------------


class FigmaMCPClient:
    """
    Async client that spawns the Figma MCP server process and calls its tools.

    Usage::

        async with FigmaMCPClient() as client:
            result = await client.create_frame("My Diagram", width=800, height=600)
    """

    def __init__(
        self,
        server_js_path: str | None = None,
        figma_token: str | None = None,
    ):
        self.server_js_path = server_js_path or _get_server_js_path()
        self.figma_token = figma_token or _get_figma_token()
        self._session = None
        self._exit_stack = None

    async def __aenter__(self):
        await self.connect()
        return self

    async def __aexit__(self, *exc):
        await self.cleanup()

    async def connect(self) -> None:
        """Spawn MCP server process and establish session."""
        try:
            from mcp import ClientSession, StdioServerParameters
            from mcp.client.stdio import stdio_client
        except ImportError:
            raise RuntimeError("mcp package not installed. Run: pip install mcp")

        if not self.server_js_path:
            raise RuntimeError("Figma MCP server.js not found")
        if not self.figma_token:
            raise RuntimeError("FIGMA_ACCESS_TOKEN not set")

        node_bin = shutil.which("node")
        if not node_bin:
            raise RuntimeError("Node.js not found in PATH")

        from contextlib import AsyncExitStack

        self._exit_stack = AsyncExitStack()

        params = StdioServerParameters(
            command=node_bin,
            args=[self.server_js_path],
            env={**os.environ, "FIGMA_ACCESS_TOKEN": self.figma_token},
        )

        transport = await self._exit_stack.enter_async_context(stdio_client(params))
        read_stream, write_stream = transport
        self._session = await self._exit_stack.enter_async_context(
            ClientSession(read_stream, write_stream)
        )
        await self._session.initialize()
        log.info("Figma MCP client connected")

    async def call_tool(self, tool_name: str, arguments: dict[str, Any]) -> Any:
        """Call a tool on the MCP server."""
        if not self._session:
            raise RuntimeError("Not connected — call connect() first")
        result = await self._session.call_tool(tool_name, arguments)
        return result

    async def cleanup(self) -> None:
        """Shut down the MCP server process."""
        if self._exit_stack:
            await self._exit_stack.aclose()
            self._exit_stack = None
            self._session = None

    # ── Diagram primitives ──────────────────────────────────────────────

    async def create_frame(
        self,
        name: str,
        x: int = 0,
        y: int = 0,
        width: int = 800,
        height: int = 600,
    ) -> Any:
        return await self.call_tool(
            "create_frame",
            {"name": name, "x": x, "y": y, "width": width, "height": height},
        )

    async def create_rectangle(
        self,
        x: int,
        y: int,
        width: int,
        height: int,
        name: str = "Box",
    ) -> Any:
        return await self.call_tool(
            "create_rectangle",
            {"name": name, "x": x, "y": y, "width": width, "height": height},
        )

    async def create_text(
        self,
        text: str,
        x: int,
        y: int,
        font_size: int = 14,
    ) -> Any:
        return await self.call_tool(
            "create_text",
            {"text": text, "x": x, "y": y, "fontSize": font_size},
        )

    async def set_fill(
        self,
        node_id: str,
        r: float,
        g: float,
        b: float,
        a: float = 1.0,
    ) -> Any:
        return await self.call_tool(
            "set_fill_color",
            {"nodeId": node_id, "r": r, "g": g, "b": b, "a": a},
        )

    async def create_connector(
        self,
        start_node_id: str,
        end_node_id: str,
    ) -> Any:
        return await self.call_tool(
            "create_connections",
            {"connections": [{"fromNodeId": start_node_id, "toNodeId": end_node_id}]},
        )


# ---------------------------------------------------------------------------
# Layout algorithms
# ---------------------------------------------------------------------------


def _layout_flowchart(
    nodes: list[dict],
    edges: list[dict] | None,
) -> list[dict]:
    """Compute x/y positions for a top-to-bottom flowchart."""
    positioned = []
    for i, node in enumerate(nodes):
        positioned.append(
            {
                **node,
                "x": FRAME_PADDING,
                "y": FRAME_PADDING + i * (NODE_HEIGHT + NODE_PADDING_Y),
            }
        )
    return positioned


def _layout_concept_map(
    nodes: list[dict],
    edges: list[dict] | None,
) -> list[dict]:
    """Compute x/y positions for a radial concept map.

    Center node at position 0; remaining nodes arranged in a circle.
    """
    import math

    if not nodes:
        return []

    positioned = []
    center_x = 400
    center_y = 300

    # First node is the center concept
    positioned.append(
        {**nodes[0], "x": center_x - NODE_WIDTH // 2, "y": center_y - NODE_HEIGHT // 2}
    )

    # Remaining nodes in a circle
    remaining = nodes[1:]
    if remaining:
        radius = 250
        angle_step = 2 * math.pi / len(remaining)
        for i, node in enumerate(remaining):
            angle = -math.pi / 2 + i * angle_step
            x = center_x + radius * math.cos(angle) - NODE_WIDTH // 2
            y = center_y + radius * math.sin(angle) - NODE_HEIGHT // 2
            positioned.append({**node, "x": int(x), "y": int(y)})

    return positioned


def _layout_hierarchy(
    nodes: list[dict],
    edges: list[dict] | None,
) -> list[dict]:
    """Compute x/y for a top-down tree hierarchy.

    Uses edges to determine parent-child relationships.
    Falls back to a simple grid if no edges.
    """
    if not edges:
        return _layout_flowchart(nodes, edges)

    # Build adjacency: parent -> children
    node_map = {n["id"]: n for n in nodes}
    children_of: dict[str, list[str]] = {}
    has_parent: set[str] = set()
    for e in edges:
        parent_id = e["from"]
        child_id = e["to"]
        children_of.setdefault(parent_id, []).append(child_id)
        has_parent.add(child_id)

    # Find roots (nodes with no parent)
    roots = [n["id"] for n in nodes if n["id"] not in has_parent]
    if not roots:
        roots = [nodes[0]["id"]]

    # BFS to assign levels
    from collections import deque

    level_of: dict[str, int] = {}
    queue: deque[str] = deque()
    for r in roots:
        level_of[r] = 0
        queue.append(r)

    while queue:
        nid = queue.popleft()
        for child in children_of.get(nid, []):
            if child not in level_of:
                level_of[child] = level_of[nid] + 1
                queue.append(child)

    # Assign any unvisited nodes
    max_level = max(level_of.values()) if level_of else 0
    for n in nodes:
        if n["id"] not in level_of:
            max_level += 1
            level_of[n["id"]] = max_level

    # Group by level and position
    levels: dict[int, list[str]] = {}
    for nid, lvl in level_of.items():
        levels.setdefault(lvl, []).append(nid)

    positioned = []
    for lvl in sorted(levels.keys()):
        nids = levels[lvl]
        total_width = len(nids) * (NODE_WIDTH + NODE_PADDING_X) - NODE_PADDING_X
        start_x = FRAME_PADDING + max(0, (800 - total_width) // 2)
        y = FRAME_PADDING + lvl * (NODE_HEIGHT + NODE_PADDING_Y)
        for i, nid in enumerate(nids):
            if nid in node_map:
                positioned.append(
                    {
                        **node_map[nid],
                        "x": start_x + i * (NODE_WIDTH + NODE_PADDING_X),
                        "y": y,
                    }
                )

    return positioned


LAYOUT_ALGORITHMS = {
    "flowchart": _layout_flowchart,
    "concept_map": _layout_concept_map,
    "hierarchy": _layout_hierarchy,
    "process": _layout_flowchart,  # alias
}


# ---------------------------------------------------------------------------
# High-level diagram builder
# ---------------------------------------------------------------------------


async def build_diagram(
    title: str,
    diagram_type: str,
    nodes: list[dict],
    edges: list[dict] | None = None,
) -> dict[str, Any]:
    """
    Build a complete diagram in Figma.

    Returns {"success": True/False, "message": ..., "node_count": ...}
    """
    status = is_figma_available()
    if not status["available"]:
        return {
            "success": False,
            "error": "Figma MCP not available: " + "; ".join(status["issues"]),
        }

    layout_fn = LAYOUT_ALGORITHMS.get(diagram_type, _layout_flowchart)
    positioned = layout_fn(nodes, edges)

    # Calculate frame dimensions
    if positioned:
        max_x = max(n["x"] + NODE_WIDTH for n in positioned)
        max_y = max(n["y"] + NODE_HEIGHT for n in positioned)
    else:
        max_x, max_y = 800, 600
    frame_w = max_x + FRAME_PADDING
    frame_h = max_y + FRAME_PADDING

    try:
        async with FigmaMCPClient() as client:
            # Create container frame
            await client.create_frame(title, width=frame_w, height=frame_h)

            created_ids: dict[str, str] = {}

            # Create node boxes + labels
            for node in positioned:
                # Determine box color based on node type
                node_type = node.get("type", "process")
                box_result = await client.create_rectangle(
                    node["x"],
                    node["y"],
                    NODE_WIDTH,
                    NODE_HEIGHT,
                    name=node.get("label", node["id"]),
                )
                # Extract node ID from result
                box_id = _extract_node_id(box_result)
                if box_id:
                    created_ids[node["id"]] = box_id

                    # Color based on type
                    color = _node_type_color(node_type)
                    await client.set_fill(box_id, *color)

                # Create label text
                await client.create_text(
                    node.get("label", node["id"]),
                    node["x"] + LABEL_OFFSET_X,
                    node["y"] + LABEL_OFFSET_Y,
                    font_size=14,
                )

            # Create connectors
            if edges:
                for edge in edges:
                    from_id = created_ids.get(edge["from"])
                    to_id = created_ids.get(edge["to"])
                    if from_id and to_id:
                        await client.create_connector(from_id, to_id)

            return {
                "success": True,
                "message": f"Created {diagram_type} diagram '{title}' with {len(positioned)} nodes",
                "node_count": len(positioned),
                "edge_count": len(edges) if edges else 0,
            }

    except Exception as e:
        log.exception("Figma diagram creation failed")
        return {
            "success": False,
            "error": f"Figma diagram creation failed: {e}",
        }


def _extract_node_id(result: Any) -> str | None:
    """Extract a Figma node ID from an MCP tool result."""
    if result is None:
        return None
    # MCP results have a .content list of TextContent objects
    try:
        if hasattr(result, "content") and result.content:
            text = result.content[0].text
            # Try parsing as JSON first
            try:
                data = json.loads(text)
                return data.get("id") or data.get("nodeId")
            except (json.JSONDecodeError, TypeError):
                return text.strip() if text else None
    except (IndexError, AttributeError):
        pass
    return None


def _node_type_color(node_type: str) -> tuple[float, float, float]:
    """Map node types to RGB colors (0.0-1.0)."""
    colors = {
        "start": (0.2, 0.7, 0.3),  # green
        "end": (0.8, 0.2, 0.2),  # red
        "process": (0.3, 0.5, 0.8),  # blue
        "decision": (0.9, 0.7, 0.2),  # yellow/gold
        "concept": (0.6, 0.4, 0.8),  # purple
    }
    return colors.get(node_type, (0.3, 0.5, 0.8))


# ---------------------------------------------------------------------------
# Sync wrapper for Flask integration
# ---------------------------------------------------------------------------


def create_diagram_sync(
    title: str,
    diagram_type: str,
    nodes: list[dict],
    edges: list[dict] | None = None,
) -> dict[str, Any]:
    """
    Synchronous wrapper for build_diagram(). Safe to call from Flask routes.

    Handles event loop creation/cleanup for sync contexts.
    """
    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        loop = None

    if loop and loop.is_running():
        # Already in an async context — run in a new thread
        import concurrent.futures

        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as pool:
            future = pool.submit(
                asyncio.run,
                build_diagram(title, diagram_type, nodes, edges),
            )
            return future.result(timeout=60)
    else:
        return asyncio.run(build_diagram(title, diagram_type, nodes, edges))
