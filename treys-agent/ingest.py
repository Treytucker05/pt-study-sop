# pip install networkx

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import List

import networkx as nx


WIKILINK_RE = re.compile(r"\[\[([^\]|#]+)")


def _normalize_wikilink(target: str) -> str:
    text = target.strip()
    if not text:
        return ""
    text = text.split("|", 1)[0]
    text = text.split("#", 1)[0]
    text = text.replace("\\", "/")
    text = text.split("/")[-1]
    if text.lower().endswith(".md"):
        text = text[:-3]
    return text.strip()


class ObsidianGraph:
    def __init__(self) -> None:
        self.graph = nx.DiGraph()

    def build_graph(self, vault_paths: List[str]) -> nx.DiGraph:
        self.graph.clear()

        for vault_path in vault_paths:
            root = Path(vault_path)
            if not root.exists():
                raise FileNotFoundError(f"Vault path not found: {root}")

            for dirpath, _dirnames, filenames in os.walk(root):
                for filename in filenames:
                    if not filename.lower().endswith(".md"):
                        continue
                    file_path = Path(dirpath) / filename
                    node = file_path.stem
                    self.graph.add_node(node)

                    try:
                        content = file_path.read_text(encoding="utf-8", errors="ignore")
                    except OSError:
                        continue

                    for raw_target in WIKILINK_RE.findall(content):
                        target = _normalize_wikilink(raw_target)
                        if not target:
                            continue
                        if target == node:
                            continue
                        self.graph.add_edge(node, target)

        return self.graph

    def get_related(self, topic: str) -> List[str]:
        if not self.graph.has_node(topic):
            return []
        return list(self.graph.successors(topic))


if __name__ == "__main__":
    import sys

    # LIST OF PATHS TO INGEST
    VAULT_PATHS = [
        # Path 1: The SOPs / Techniques (The Brain)
        r"C:\Users\treyt\OneDrive\Desktop\pt-study-sop\context\architecture",

        # Path 2: The New School Notes (The Work)
        r"C:\Users\treyt\OneDrive\Desktop\pt-study-sop\PT School Semester 2",
    ]

    print(f"---  INGESTING {len(VAULT_PATHS)} PATHS ---")

    graph_builder = ObsidianGraph()
    try:
        # Build the graph from MULTIPLE paths
        G = graph_builder.build_graph(VAULT_PATHS)

        # Print Stats
        print(f"[SUCCESS] Graph Built.")
        print(f"Total Notes Found: {G.number_of_nodes()}")
        print(f"Total Connections: {G.number_of_edges()}")

        # List the nodes found to confirm we got the SOPs
        if G.number_of_nodes() < 10:
            print(f"Nodes found: {list(G.nodes())}")

    except Exception as e:
        print(f"[CRITICAL ERROR] {e}")
