"""
Tests for the Composable Method Library API (api_methods.py).

Covers: CRUD for method blocks, chains, ratings, and analytics endpoint.
Uses a fresh in-memory database for isolation.
"""

import json
import os
import sqlite3
import sys
import tempfile
import pytest

# Ensure brain/ is on the path
sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

# Override DB_PATH before any project imports
_tmp_db = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
_tmp_db.close()
os.environ["PT_STUDY_DB"] = _tmp_db.name

import config
config.DB_PATH = _tmp_db.name

import db_setup
from db_setup import init_database
from dashboard.app import create_app


@pytest.fixture(scope="module")
def app():
    """Create a test Flask app with fresh database."""
    init_database()
    app = create_app()
    app.config["TESTING"] = True
    return app


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


# ---------------------------------------------------------------------------
# Method Blocks
# ---------------------------------------------------------------------------

class TestMethodBlocks:
    def test_list_methods(self, client):
        resp = client.get("/api/methods")
        assert resp.status_code == 200
        assert isinstance(resp.get_json(), list)

    def test_list_methods_survives_locked_seed_sync(self, client, monkeypatch):
        class LockedSeedModule:
            @staticmethod
            def seed_methods(*args, **kwargs):
                raise sqlite3.OperationalError("database is locked")

        monkeypatch.setattr(db_setup, "_METHOD_LIBRARY_ENSURED", False)
        monkeypatch.setattr(db_setup, "_load_seed_methods_module", lambda: LockedSeedModule())

        resp = client.get("/api/methods")
        assert resp.status_code == 200
        assert isinstance(resp.get_json(), list)

    def test_prime_methods_include_knob_contract(self, client):
        # Seed a PRIME method with an active knob so the test is self-contained
        create_resp = client.post(
            "/api/methods",
            data=json.dumps({
                "name": "Prime Knob Test Method",
                "category": "prepare",
                "description": "Seed for knob contract test",
                "default_duration_min": 5,
                "energy_cost": "low",
                "control_stage": "PRIME",
                "knobs": {"intensity": {"value": 3, "fallback": 1}},
            }),
            content_type="application/json",
        )
        assert create_resp.status_code == 201

        resp = client.get("/api/methods?category=prepare")
        assert resp.status_code == 200
        methods = resp.get_json()
        prime = [m for m in methods if str(m.get("control_stage", "")).upper() == "PRIME"]
        assert prime, "Expected at least one PRIME method"
        assert any(bool(m.get("has_active_knobs")) for m in prime)
        first_with_knobs = next(m for m in prime if m.get("has_active_knobs"))
        assert isinstance(first_with_knobs.get("knobs"), dict)
        knob = next(iter(first_with_knobs["knobs"].values()))
        assert isinstance(knob, dict)
        assert "fallback" in knob

    def test_create_method(self, client):
        resp = client.post(
            "/api/methods",
            data=json.dumps({
                "name": "Test Method XYZ",
                "category": "prepare",
                "description": "A unique test method",
                "default_duration_min": 3,
                "energy_cost": "low",
                "tags": ["test-tag-1", "test-tag-2"],
                "evidence": "Test et al. (2024); evidence for testing",
            }),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["name"] == "Test Method XYZ"
        assert "id" in data
        # Store for later tests
        TestMethodBlocks._created_id = data["id"]

    def test_list_after_create(self, client):
        resp = client.get("/api/methods")
        assert resp.status_code == 200
        methods = resp.get_json()
        assert len(methods) >= 1
        # Find the specific one we created by ID (name may not be unique across suite runs)
        match = [m for m in methods if m["id"] == TestMethodBlocks._created_id]
        assert len(match) == 1
        assert match[0]["name"] == "Test Method XYZ"
        assert match[0]["tags"] == ["test-tag-1", "test-tag-2"]

    def test_get_single(self, client):
        resp = client.get(f"/api/methods/{TestMethodBlocks._created_id}")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["name"] == "Test Method XYZ"

    def test_get_not_found(self, client):
        resp = client.get("/api/methods/999")
        assert resp.status_code == 404

    def test_evidence_round_trip(self, client):
        """Verify evidence field persists through create → get."""
        mid = TestMethodBlocks._created_id
        resp = client.get(f"/api/methods/{mid}")
        data = resp.get_json()
        assert data["evidence"] == "Test et al. (2024); evidence for testing"

    def test_filter_by_category(self, client):
        # Create another method in a different category
        client.post(
            "/api/methods",
            data=json.dumps({"name": "Test Encode XYZ", "category": "encode"}),
            content_type="application/json",
        )
        resp = client.get("/api/methods?category=prepare")
        methods = resp.get_json()
        assert all(m["category"] == "prepare" for m in methods)

    def test_update_method(self, client):
        mid = TestMethodBlocks._created_id
        resp = client.put(
            f"/api/methods/{mid}",
            data=json.dumps({"description": "Updated description"}),
            content_type="application/json",
        )
        assert resp.status_code == 200
        assert resp.get_json()["updated"] is True

        # Verify
        resp = client.get(f"/api/methods/{mid}")
        assert resp.get_json()["description"] == "Updated description"

    def test_update_method_knobs_round_trip(self, client):
        mid = TestMethodBlocks._created_id
        resp = client.put(
            f"/api/methods/{mid}",
            data=json.dumps(
                {
                    "knobs": {
                        "scope_mode": {
                            "type": "enum",
                            "options": ["module_all", "single_focus"],
                            "default": "module_all",
                        }
                    }
                }
            ),
            content_type="application/json",
        )
        assert resp.status_code == 200

        get_resp = client.get(f"/api/methods/{mid}")
        assert get_resp.status_code == 200
        data = get_resp.get_json()
        assert isinstance(data.get("knobs"), dict)
        assert "scope_mode" in data["knobs"]
        assert data["knobs"]["scope_mode"]["fallback"]["mode"] == "default_on_invalid"

    def test_delete_method(self, client):
        # Create then delete
        resp = client.post(
            "/api/methods",
            data=json.dumps({"name": "Temp Method", "category": "prepare"}),
            content_type="application/json",
        )
        new_id = resp.get_json()["id"]
        resp = client.delete(f"/api/methods/{new_id}")
        assert resp.status_code == 204

        resp = client.get(f"/api/methods/{new_id}")
        assert resp.status_code == 404

    def test_create_missing_fields(self, client):
        resp = client.post(
            "/api/methods",
            data=json.dumps({"name": "No category"}),
            content_type="application/json",
        )
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Chains
# ---------------------------------------------------------------------------

class TestChains:
    def test_create_chain(self, client):
        resp = client.post(
            "/api/chains",
            data=json.dumps({
                "name": "Test Chain",
                "description": "A test chain",
                "block_ids": [TestMethodBlocks._created_id],
                "context_tags": {"stage": "review"},
                "is_template": 0,
            }),
            content_type="application/json",
        )
        assert resp.status_code == 201
        data = resp.get_json()
        assert data["name"] == "Test Chain"
        TestChains._created_id = data["id"]

    def test_list_chains(self, client):
        resp = client.get("/api/chains")
        assert resp.status_code == 200
        chains = resp.get_json()
        assert len(chains) >= 1

    def test_list_chains_survives_locked_seed_sync(self, client, monkeypatch):
        class LockedSeedModule:
            @staticmethod
            def seed_methods(*args, **kwargs):
                raise sqlite3.OperationalError("database is locked")

        monkeypatch.setattr(db_setup, "_METHOD_LIBRARY_ENSURED", False)
        monkeypatch.setattr(db_setup, "_load_seed_methods_module", lambda: LockedSeedModule())

        resp = client.get("/api/chains")
        assert resp.status_code == 200
        assert isinstance(resp.get_json(), list)

    def test_get_chain_with_blocks(self, client):
        cid = TestChains._created_id
        resp = client.get(f"/api/chains/{cid}")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "blocks" in data
        assert isinstance(data["blocks"], list)

    def test_update_chain(self, client):
        cid = TestChains._created_id
        mid = TestMethodBlocks._created_id
        resp = client.put(
            f"/api/chains/{cid}",
            data=json.dumps({"block_ids": [mid]}),
            content_type="application/json",
        )
        assert resp.status_code == 200

    def test_delete_chain(self, client):
        resp = client.post(
            "/api/chains",
            data=json.dumps({"name": "Temp Chain"}),
            content_type="application/json",
        )
        new_id = resp.get_json()["id"]
        resp = client.delete(f"/api/chains/{new_id}")
        assert resp.status_code == 204


# ---------------------------------------------------------------------------
# Ratings
# ---------------------------------------------------------------------------

class TestRatings:
    def test_rate_method(self, client):
        mid = TestMethodBlocks._created_id
        resp = client.post(
            f"/api/methods/{mid}/rate",
            data=json.dumps({
                "effectiveness": 4,
                "engagement": 3,
                "notes": "Good method",
                "context": {"stage": "first_exposure"},
            }),
            content_type="application/json",
        )
        assert resp.status_code == 201
        assert resp.get_json()["rated"] is True

    def test_rate_chain(self, client):
        cid = TestChains._created_id
        resp = client.post(
            f"/api/chains/{cid}/rate",
            data=json.dumps({
                "effectiveness": 5,
                "engagement": 4,
            }),
            content_type="application/json",
        )
        assert resp.status_code == 201

    def test_rate_nonexistent_method(self, client):
        resp = client.post(
            "/api/methods/999/rate",
            data=json.dumps({"effectiveness": 3, "engagement": 3}),
            content_type="application/json",
        )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Analytics
# ---------------------------------------------------------------------------

class TestAnalytics:
    def test_analytics_endpoint(self, client):
        resp = client.get("/api/methods/analytics")
        assert resp.status_code == 200
        data = resp.get_json()
        assert "block_stats" in data
        assert "chain_stats" in data
        assert "recent_ratings" in data
        # Should have stats from the ratings we created
        assert len(data["block_stats"]) >= 1
        assert len(data["recent_ratings"]) >= 1


# Cleanup temp db
@pytest.fixture(scope="module", autouse=True)
def cleanup():
    yield
    try:
        os.unlink(_tmp_db.name)
    except OSError:
        pass


class TestMethodLibrarySeeding:
    def test_runtime_seed_check_skips_strict_sync_by_default_when_library_exists(self, monkeypatch):
        class FakeCursor:
            def __init__(self):
                self._calls = 0

            def execute(self, _sql):
                self._calls += 1

            def fetchone(self):
                return (5,) if self._calls == 1 else (3,)

        class FakeConnection:
            def __init__(self):
                self._cursor = FakeCursor()

            def cursor(self):
                return self._cursor

            def close(self):
                return None

        called = {"load": False}

        monkeypatch.setattr(db_setup, "_METHOD_LIBRARY_ENSURED", False)
        monkeypatch.delenv("PT_METHOD_LIBRARY_STRICT_SYNC", raising=False)
        monkeypatch.setattr(db_setup, "get_connection", lambda: FakeConnection())

        def fake_load():
            called["load"] = True
            raise AssertionError("seed loader should not run when the library already exists")

        monkeypatch.setattr(db_setup, "_load_seed_methods_module", fake_load)

        db_setup.ensure_method_library_seeded()

        assert db_setup._METHOD_LIBRARY_ENSURED is True
        assert called["load"] is False

    def test_init_database_rebuilds_legacy_method_blocks_constraint_for_teach(self, monkeypatch):
        fd, legacy_db = tempfile.mkstemp(suffix=".db")
        os.close(fd)
        try:
            conn = sqlite3.connect(legacy_db)
            cur = conn.cursor()
            cur.executescript(
                """
                CREATE TABLE method_blocks (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    method_id TEXT,
                    name TEXT NOT NULL,
                    category TEXT,
                    control_stage TEXT DEFAULT 'ENCODE' CHECK(control_stage IN ('PRIME', 'CALIBRATE', 'ENCODE', 'REFERENCE', 'RETRIEVE', 'OVERLEARN')),
                    description TEXT,
                    default_duration_min INTEGER DEFAULT 5,
                    energy_cost TEXT DEFAULT 'medium',
                    best_stage TEXT,
                    tags TEXT,
                    created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
                );

                INSERT INTO method_blocks (name, control_stage, description)
                VALUES ('Legacy Encode Block', 'ENCODE', 'pre-existing row');
                """
            )
            conn.commit()
            conn.close()

            monkeypatch.setattr(db_setup, "DB_PATH", legacy_db)
            db_setup.init_database()

            conn = sqlite3.connect(legacy_db)
            cur = conn.cursor()
            cur.execute(
                "SELECT sql FROM sqlite_master WHERE type='table' AND name='method_blocks'"
            )
            sql = cur.fetchone()[0]
            assert "'TEACH'" in sql

            cur.execute(
                "INSERT INTO method_blocks (name, control_stage, description) VALUES (?, ?, ?)",
                ("Teach-ready Block", "TEACH", "insert after rebuild"),
            )
            conn.commit()

            cur.execute("SELECT COUNT(*) FROM method_blocks WHERE control_stage = 'TEACH'")
            assert cur.fetchone()[0] == 1
            cur.execute(
                "SELECT COUNT(*) FROM method_blocks WHERE name = 'Legacy Encode Block'"
            )
            assert cur.fetchone()[0] == 1
            conn.close()
        finally:
            try:
                os.unlink(legacy_db)
            except OSError:
                pass
