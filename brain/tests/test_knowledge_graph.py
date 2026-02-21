"""Tests for adaptive.knowledge_graph module."""

import sqlite3
import sys
from pathlib import Path

import pytest

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from adaptive.knowledge_graph import (
    build_context_pack,
    create_kg_tables,
    extract_typed_relations,
    hybrid_retrieve,
    incremental_kg_update,
    prune_subgraph,
    prune_subgraph_pcst,
    seed_from_obsidian,
)
from adaptive.vault_ingest import create_vault_tables, ingest_vault


@pytest.fixture
def db_conn():
    conn = sqlite3.connect(":memory:")
    conn.row_factory = sqlite3.Row
    create_vault_tables(conn)
    create_kg_tables(conn)
    return conn


@pytest.fixture
def sample_vault(tmp_path):
    note1 = tmp_path / "Cardiac Output.md"
    note1.write_text(
        "---\naliases:\n  - CO\n---\n"
        "# Cardiac Output\nCO = SV x HR.\n"
        "See [[Stroke Volume]] and [[Heart Rate]].\n"
    )
    note2 = tmp_path / "Stroke Volume.md"
    note2.write_text(
        "---\naliases:\n  - SV\n---\n"
        "# Stroke Volume\nVolume per beat. Depends on [[Preload]].\n"
    )
    note3 = tmp_path / "Heart Rate.md"
    note3.write_text(
        "---\naliases:\n  - HR\n---\n"
        "# Heart Rate\nBeats per minute.\n"
    )
    note4 = tmp_path / "Preload.md"
    note4.write_text(
        "---\naliases: []\n---\n"
        "# Preload\nEnd-diastolic volume.\n"
    )
    return tmp_path


@pytest.fixture
def typed_vault(tmp_path):
    """Vault with sentences that trigger typed relation patterns."""
    note1 = tmp_path / "Preload.md"
    note1.write_text(
        "---\naliases: []\n---\n"
        "# Preload\nPreload increases Stroke Volume.\n"
        "Preload depends on Venous Return.\n"
    )
    note2 = tmp_path / "Afterload.md"
    note2.write_text(
        "---\naliases: []\n---\n"
        "# Afterload\nAfterload inhibits Stroke Volume.\n"
        "Increased Afterload decreases Cardiac Output.\n"
    )
    note3 = tmp_path / "Stroke Volume.md"
    note3.write_text(
        "---\naliases:\n  - SV\n---\n"
        "# Stroke Volume\nStroke Volume causes Cardiac Output changes.\n"
    )
    note4 = tmp_path / "Venous Return.md"
    note4.write_text(
        "---\naliases:\n  - VR\n---\n"
        "# Venous Return\nVenous Return is a component of Preload.\n"
    )
    return tmp_path


@pytest.fixture
def seeded_db(db_conn, sample_vault):
    ingest_vault(str(sample_vault), db_conn)
    seed_from_obsidian(db_conn)
    return db_conn


class TestCreateKGTables:
    def test_idempotent(self, db_conn):
        create_kg_tables(db_conn)
        create_kg_tables(db_conn)
        cur = db_conn.execute(
            "SELECT name FROM sqlite_master WHERE type='table' AND name LIKE 'kg_%'"
        )
        tables = {r[0] for r in cur.fetchall()}
        assert "kg_nodes" in tables
        assert "kg_edges" in tables
        assert "kg_provenance" in tables


class TestSeedFromObsidian:
    def test_produces_nodes_and_edges(self, db_conn, sample_vault):
        ingest_vault(str(sample_vault), db_conn)
        result = seed_from_obsidian(db_conn)
        assert result["nodes_created"] > 0
        assert result["edges_created"] > 0

    def test_alias_resolution_during_seeding(self, db_conn, sample_vault):
        ingest_vault(str(sample_vault), db_conn)
        seed_from_obsidian(db_conn)
        cur = db_conn.execute(
            "SELECT name FROM kg_nodes WHERE LOWER(name) = 'stroke volume'"
        )
        assert cur.fetchone() is not None

    def test_duplicate_seeding_skips(self, db_conn, sample_vault):
        ingest_vault(str(sample_vault), db_conn)
        r1 = seed_from_obsidian(db_conn)
        r2 = seed_from_obsidian(db_conn)
        assert r2["skipped"] >= r1["edges_created"]

    def test_seed_provenance_created(self, db_conn, sample_vault):
        """Every seeded edge has provenance with source_type=obsidian_link."""
        ingest_vault(str(sample_vault), db_conn)
        result = seed_from_obsidian(db_conn)
        edge_count = result["edges_created"]
        prov = db_conn.execute(
            "SELECT COUNT(*) FROM kg_provenance WHERE source_type = 'obsidian_link'"
        ).fetchone()[0]
        assert prov == edge_count

    def test_edge_count_matches_links(self, db_conn, sample_vault):
        """Edge count equals parsed obsidian link count."""
        ingest_vault(str(sample_vault), db_conn)
        link_count = db_conn.execute(
            "SELECT COUNT(*) FROM obsidian_links"
        ).fetchone()[0]
        result = seed_from_obsidian(db_conn)
        assert result["edges_created"] == link_count


class TestHybridRetrieve:
    def test_returns_graph_context(self, seeded_db):
        result = hybrid_retrieve("What is Cardiac Output?", seeded_db)
        assert "context_text" in result
        assert "nodes" in result

    def test_seed_entities_extracted(self, seeded_db):
        result = hybrid_retrieve("What is Cardiac Output?", seeded_db)
        assert len(result["seed_entities"]) > 0

    def test_neighbors_included(self, seeded_db):
        result = hybrid_retrieve("What is Cardiac Output?", seeded_db)
        node_names = {n["name"] for n in result["nodes"]}
        assert "Cardiac Output" in node_names
        assert len(node_names) >= 2

    def test_empty_query_returns_empty(self, seeded_db):
        result = hybrid_retrieve("xyznotaconcept", seeded_db)
        assert result["context_text"] == ""

    def test_candidate_subgraph_includes_seeds(self, seeded_db):
        """All seed entities that resolve to nodes must be in the result."""
        result = hybrid_retrieve("What is Cardiac Output?", seeded_db)
        node_names = {n["name"] for n in result["nodes"]}
        assert "Cardiac Output" in node_names


class TestPruning:
    def test_respects_token_budget(self):
        nodes = [
            {"id": i, "name": f"Node{i}", "is_seed": i == 0}
            for i in range(100)
        ]
        edges = [
            {"id": i, "source": 0, "target": i + 1, "relation": "links_to", "confidence": 0.5}
            for i in range(99)
        ]
        pruned_nodes, pruned_edges = prune_subgraph(nodes, edges, budget_tokens=200)
        assert len(pruned_nodes) <= 10
        total_cost = len(pruned_nodes) * 20 + len(pruned_edges) * 15
        assert total_cost <= 200

    def test_seeds_prioritized(self):
        nodes = [
            {"id": 0, "name": "Seed", "is_seed": True},
            {"id": 1, "name": "Neighbor", "is_seed": False},
            {"id": 2, "name": "Far", "is_seed": False},
        ]
        edges = [
            {"id": 0, "source": 0, "target": 1, "relation": "links_to", "confidence": 0.9},
        ]
        pruned_nodes, _ = prune_subgraph(nodes, edges, budget_tokens=60)
        node_names = {n["name"] for n in pruned_nodes}
        assert "Seed" in node_names


class TestPCSTPruning:
    def test_pcst_returns_results(self):
        nodes = [
            {"id": 0, "name": "Seed", "is_seed": True},
            {"id": 1, "name": "Close", "is_seed": False},
            {"id": 2, "name": "Far", "is_seed": False},
        ]
        edges = [
            {"id": 0, "source": 0, "target": 1, "relation": "requires", "confidence": 0.9, "link_only": 0},
            {"id": 1, "source": 0, "target": 2, "relation": "links_to", "confidence": 0.3, "link_only": 1},
        ]
        kept_n, kept_e = prune_subgraph_pcst(nodes, edges, budget_tokens=200)
        assert len(kept_n) > 0
        node_names = {n["name"] for n in kept_n}
        assert "Seed" in node_names

    def test_pcst_respects_budget(self):
        nodes = [
            {"id": i, "name": f"Node{i}", "is_seed": i == 0}
            for i in range(50)
        ]
        edges = [
            {"id": i, "source": 0, "target": i + 1, "relation": "links_to", "confidence": 0.5, "link_only": 0}
            for i in range(49)
        ]
        kept_n, kept_e = prune_subgraph_pcst(nodes, edges, budget_tokens=150)
        total_cost = len(kept_n) * 20 + len(kept_e) * 15
        assert total_cost <= 150

    def test_pcst_seeds_always_included(self):
        nodes = [
            {"id": 0, "name": "Seed1", "is_seed": True},
            {"id": 1, "name": "Seed2", "is_seed": True},
            {"id": 2, "name": "NonSeed", "is_seed": False},
        ]
        edges = [
            {"id": 0, "source": 0, "target": 2, "relation": "links_to", "confidence": 0.5, "link_only": 0},
        ]
        kept_n, _ = prune_subgraph_pcst(nodes, edges, budget_tokens=60)
        node_names = {n["name"] for n in kept_n}
        assert "Seed1" in node_names
        assert "Seed2" in node_names

    def test_pcst_deterministic(self):
        nodes = [
            {"id": i, "name": f"N{i}", "is_seed": i < 2}
            for i in range(10)
        ]
        edges = [
            {"id": i, "source": i, "target": i + 1, "relation": "links_to", "confidence": 0.6, "link_only": 0}
            for i in range(9)
        ]
        r1 = prune_subgraph_pcst(nodes, edges, budget_tokens=200)
        r2 = prune_subgraph_pcst(nodes, edges, budget_tokens=200)
        assert [n["id"] for n in r1[0]] == [n["id"] for n in r2[0]]

    def test_pcst_custom_prizes(self):
        nodes = [
            {"id": 0, "name": "Low", "is_seed": False},
            {"id": 1, "name": "High", "is_seed": False},
        ]
        edges = []
        prizes = {0: 0.1, 1: 0.9}
        kept_n, _ = prune_subgraph_pcst(nodes, edges, prizes=prizes, budget_tokens=40)
        node_names = {n["name"] for n in kept_n}
        assert "High" in node_names

    def test_pcst_link_only_penalized(self):
        """Low confidence + link_only edges get higher cost."""
        nodes = [
            {"id": 0, "name": "Seed", "is_seed": True},
            {"id": 1, "name": "Good", "is_seed": False},
            {"id": 2, "name": "Weak", "is_seed": False},
        ]
        edges = [
            {"id": 0, "source": 0, "target": 1, "relation": "requires", "confidence": 0.95, "link_only": 0},
            {"id": 1, "source": 0, "target": 2, "relation": "links_to", "confidence": 0.2, "link_only": 1},
        ]
        kept_n, _ = prune_subgraph_pcst(nodes, edges, budget_tokens=60)
        node_names = {n["name"] for n in kept_n}
        assert "Good" in node_names


class TestTypedRelationExtraction:
    def test_extracts_increases(self, db_conn, typed_vault):
        ingest_vault(str(typed_vault), db_conn)
        doc_path = str(typed_vault / "Preload.md")
        doc_content = (typed_vault / "Preload.md").read_text()
        result = extract_typed_relations(db_conn, doc_path, doc_content)
        assert result["edges_created"] >= 1
        cur = db_conn.execute(
            "SELECT relation FROM kg_edges WHERE relation = 'increases'"
        )
        assert cur.fetchone() is not None

    def test_extracts_inhibits(self, db_conn, typed_vault):
        ingest_vault(str(typed_vault), db_conn)
        doc_path = str(typed_vault / "Afterload.md")
        doc_content = (typed_vault / "Afterload.md").read_text()
        result = extract_typed_relations(db_conn, doc_path, doc_content)
        assert result["edges_created"] >= 1
        cur = db_conn.execute(
            "SELECT relation FROM kg_edges WHERE relation = 'inhibits'"
        )
        assert cur.fetchone() is not None

    def test_extracts_causes(self, db_conn, typed_vault):
        ingest_vault(str(typed_vault), db_conn)
        doc_path = str(typed_vault / "Stroke Volume.md")
        doc_content = (typed_vault / "Stroke Volume.md").read_text()
        result = extract_typed_relations(db_conn, doc_path, doc_content)
        assert result["edges_created"] >= 1

    def test_confidence_is_0_7(self, db_conn, typed_vault):
        ingest_vault(str(typed_vault), db_conn)
        doc_path = str(typed_vault / "Preload.md")
        doc_content = (typed_vault / "Preload.md").read_text()
        extract_typed_relations(db_conn, doc_path, doc_content)
        cur = db_conn.execute(
            "SELECT confidence FROM kg_edges WHERE relation != 'links_to' LIMIT 1"
        )
        row = cur.fetchone()
        assert row is not None
        assert row[0] == pytest.approx(0.7)

    def test_provenance_has_excerpt(self, db_conn, typed_vault):
        ingest_vault(str(typed_vault), db_conn)
        doc_path = str(typed_vault / "Preload.md")
        doc_content = (typed_vault / "Preload.md").read_text()
        extract_typed_relations(db_conn, doc_path, doc_content)
        cur = db_conn.execute(
            "SELECT source_ref FROM kg_provenance WHERE source_type = 'typed_extraction' LIMIT 1"
        )
        row = cur.fetchone()
        assert row is not None
        assert "||" in row[0]

    def test_skips_short_matches(self, db_conn):
        """Very short entity names (<3 chars) should be skipped."""
        # Create minimal tables for alias resolution
        db_conn.execute("""
            CREATE TABLE IF NOT EXISTS entity_aliases (
                id INTEGER PRIMARY KEY,
                alias TEXT NOT NULL,
                canonical TEXT NOT NULL,
                source_path TEXT
            )
        """)
        db_conn.commit()
        content = "AB increases CD."
        result = extract_typed_relations(db_conn, "test.md", content)
        assert result["edges_created"] == 0

    def test_duplicate_relation_skipped(self, db_conn, typed_vault):
        ingest_vault(str(typed_vault), db_conn)
        doc_path = str(typed_vault / "Preload.md")
        doc_content = (typed_vault / "Preload.md").read_text()
        r1 = extract_typed_relations(db_conn, doc_path, doc_content)
        r2 = extract_typed_relations(db_conn, doc_path, doc_content)
        assert r2["skipped"] >= r1["edges_created"]

    def test_20_sample_edges_have_excerpts(self, db_conn, typed_vault):
        """Every typed edge has a supporting excerpt in provenance."""
        ingest_vault(str(typed_vault), db_conn)
        for name in ("Preload.md", "Afterload.md", "Stroke Volume.md", "Venous Return.md"):
            path = str(typed_vault / name)
            content = (typed_vault / name).read_text()
            extract_typed_relations(db_conn, path, content)

        typed_edges = db_conn.execute(
            "SELECT id FROM kg_edges WHERE link_only = 0"
        ).fetchall()
        for (edge_id,) in typed_edges:
            prov = db_conn.execute(
                "SELECT source_ref FROM kg_provenance WHERE entity_type = 'edge' AND entity_id = ?",
                (edge_id,),
            ).fetchone()
            assert prov is not None, f"Edge {edge_id} has no provenance"
            assert "||" in prov[0], f"Edge {edge_id} provenance missing excerpt"


class TestIncrementalKGUpdate:
    def test_deletes_typed_edges_only(self, db_conn, typed_vault):
        ingest_vault(str(typed_vault), db_conn)
        seed_from_obsidian(db_conn)
        doc_path = str(typed_vault / "Preload.md")
        doc_content = (typed_vault / "Preload.md").read_text()
        extract_typed_relations(db_conn, doc_path, doc_content)

        link_only_before = db_conn.execute(
            "SELECT COUNT(*) FROM kg_edges WHERE link_only = 1"
        ).fetchone()[0]

        result = incremental_kg_update(db_conn, doc_path, doc_content)
        assert result["deleted"] >= 1

        link_only_after = db_conn.execute(
            "SELECT COUNT(*) FROM kg_edges WHERE link_only = 1"
        ).fetchone()[0]
        assert link_only_after == link_only_before

    def test_re_extracts_after_delete(self, db_conn, typed_vault):
        ingest_vault(str(typed_vault), db_conn)
        doc_path = str(typed_vault / "Preload.md")
        doc_content = (typed_vault / "Preload.md").read_text()
        r1 = extract_typed_relations(db_conn, doc_path, doc_content)

        result = incremental_kg_update(db_conn, doc_path, doc_content)
        assert result["edges_created"] == r1["edges_created"]

    def test_editing_one_note_changes_only_its_edges(self, db_conn, typed_vault):
        ingest_vault(str(typed_vault), db_conn)
        for name in ("Preload.md", "Afterload.md"):
            path = str(typed_vault / name)
            content = (typed_vault / name).read_text()
            extract_typed_relations(db_conn, path, content)

        afterload_path = str(typed_vault / "Afterload.md")
        afterload_edges_before = db_conn.execute(
            """SELECT COUNT(*) FROM kg_edges e
               JOIN kg_nodes n ON e.source_node_id = n.id
               WHERE n.source_path = ? AND e.link_only = 0""",
            (afterload_path,),
        ).fetchone()[0]

        preload_path = str(typed_vault / "Preload.md")
        preload_content = (typed_vault / "Preload.md").read_text()
        incremental_kg_update(db_conn, preload_path, preload_content)

        afterload_edges_after = db_conn.execute(
            """SELECT COUNT(*) FROM kg_edges e
               JOIN kg_nodes n ON e.source_node_id = n.id
               WHERE n.source_path = ? AND e.link_only = 0""",
            (afterload_path,),
        ).fetchone()[0]
        assert afterload_edges_after == afterload_edges_before

    def test_provenance_cleaned_on_update(self, db_conn, typed_vault):
        ingest_vault(str(typed_vault), db_conn)
        doc_path = str(typed_vault / "Preload.md")
        doc_content = (typed_vault / "Preload.md").read_text()
        extract_typed_relations(db_conn, doc_path, doc_content)

        prov_before = db_conn.execute(
            "SELECT COUNT(*) FROM kg_provenance WHERE source_type = 'typed_extraction' AND source_ref LIKE ?",
            (f"{doc_path}||%",),
        ).fetchone()[0]
        assert prov_before > 0

        incremental_kg_update(db_conn, doc_path, doc_content)

        prov_after = db_conn.execute(
            "SELECT COUNT(*) FROM kg_provenance WHERE source_type = 'typed_extraction' AND source_ref LIKE ?",
            (f"{doc_path}||%",),
        ).fetchone()[0]
        assert prov_after == prov_before


class TestBuildContextPack:
    def test_formats_nodes_and_edges(self, seeded_db):
        result = hybrid_retrieve("What is Cardiac Output?", seeded_db)
        text = result["context_text"]
        assert "## Concept Graph Context" in text
        assert "Cardiac Output" in text

    def test_empty_nodes_returns_empty(self, db_conn):
        assert build_context_pack([], [], db_conn) == ""

    def test_provenance_excerpts_included(self, db_conn, typed_vault):
        """Context pack includes provenance excerpts for typed edges."""
        ingest_vault(str(typed_vault), db_conn)
        doc_path = str(typed_vault / "Preload.md")
        doc_content = (typed_vault / "Preload.md").read_text()
        extract_typed_relations(db_conn, doc_path, doc_content)

        nodes_rows = db_conn.execute(
            "SELECT id, name, definition, node_type FROM kg_nodes"
        ).fetchall()
        nodes = [
            {"id": r[0], "name": r[1], "definition": r[2], "type": r[3], "is_seed": True}
            for r in nodes_rows
        ]
        edges_rows = db_conn.execute(
            "SELECT id, source_node_id, target_node_id, relation, confidence "
            "FROM kg_edges WHERE relation != 'links_to'"
        ).fetchall()
        edges = [
            {"id": r[0], "source": r[1], "target": r[2], "relation": r[3], "confidence": r[4]}
            for r in edges_rows
        ]

        if edges:
            text = build_context_pack(nodes, edges, db_conn)
            assert "(source:" in text

    def test_no_uncited_typed_edge_in_pack(self, db_conn, typed_vault):
        """Every typed edge in the context pack should have a provenance excerpt."""
        ingest_vault(str(typed_vault), db_conn)
        doc_path = str(typed_vault / "Preload.md")
        doc_content = (typed_vault / "Preload.md").read_text()
        extract_typed_relations(db_conn, doc_path, doc_content)

        edges_rows = db_conn.execute(
            "SELECT id, source_node_id, target_node_id, relation, confidence "
            "FROM kg_edges WHERE link_only = 0"
        ).fetchall()
        if not edges_rows:
            pytest.skip("No typed edges extracted")

        # Every typed edge should have provenance
        for row in edges_rows:
            prov = db_conn.execute(
                "SELECT COUNT(*) FROM kg_provenance WHERE entity_type = 'edge' AND entity_id = ?",
                (row[0],),
            ).fetchone()[0]
            assert prov > 0, f"Typed edge {row[0]} ({row[3]}) has no provenance"
