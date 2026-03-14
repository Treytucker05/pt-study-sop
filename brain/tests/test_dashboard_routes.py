"""Regression coverage for Flask app-shell route handling."""

from pathlib import Path
import sys

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from dashboard.app import create_app


def test_support_pages_hard_refresh_through_app_shell(tmp_path):
    dist_dir = tmp_path / "dist"
    dist_dir.mkdir(parents=True, exist_ok=True)
    (dist_dir / "index.html").write_text("<html><body>study-shell</body></html>", encoding="utf-8")

    app = create_app()
    app.config["TESTING"] = True
    app.static_folder = str(tmp_path)
    client = app.test_client()

    for route in (
        "/",
        "/brain",
        "/calendar",
        "/scholar",
        "/tutor",
        "/library",
        "/mastery",
        "/methods",
        "/vault-health",
    ):
        response = client.get(route)
        assert response.status_code == 200
        assert b"study-shell" in response.data


def test_unknown_api_route_keeps_json_404_contract():
    app = create_app()
    app.config["TESTING"] = True
    client = app.test_client()

    response = client.get("/api/not-a-real-route")

    assert response.status_code == 404
    assert response.get_json() == {"error": "API route not found"}
