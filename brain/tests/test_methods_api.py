"""
Tests for the Composable Method Library API (api_methods.py).

Covers: CRUD for method blocks, chains, ratings, and analytics endpoint.
Uses a fresh in-memory database for isolation.
"""

import json
import os
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
