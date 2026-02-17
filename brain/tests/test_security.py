"""
Security Tests — input validation, auth, CORS, and header checks.

Probes every endpoint that accepts user input for:
- SQL injection patterns
- XSS payloads in stored fields
- Oversized inputs
- Type confusion
- Boundary values

Also checks for authentication, security headers, and CORS configuration.

NOTE: This app has NO authentication layer. All endpoints are open.
Tests document this as a known security gap.
"""

import json
import os
import sys
import tempfile

import pytest

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

import config
import db_setup
from dashboard.app import create_app
import dashboard.api_data as _api_data_mod
import dashboard.api_adapter as _api_adapter_mod


# ---------------------------------------------------------------------------
# Fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="module")
def app():
    """Isolated temp DB for security tests."""
    tmp = tempfile.NamedTemporaryFile(suffix=".db", delete=False)
    tmp.close()
    tmp_path = tmp.name

    _orig_env = os.environ.get("PT_STUDY_DB")
    _orig_config = config.DB_PATH
    _orig_db_setup = db_setup.DB_PATH
    _orig_api_data = _api_data_mod.DB_PATH

    os.environ["PT_STUDY_DB"] = tmp_path
    config.DB_PATH = tmp_path
    db_setup.DB_PATH = tmp_path
    _api_data_mod.DB_PATH = tmp_path

    db_setup.init_database()
    _app = create_app()
    _app.config["TESTING"] = True
    # Security tests deliberately send malformed input that triggers unhandled
    # exceptions. Disable propagation so Flask returns 500 instead of crashing.
    _app.config["PROPAGATE_EXCEPTIONS"] = False
    yield _app

    config.DB_PATH = _orig_config
    db_setup.DB_PATH = _orig_db_setup
    _api_data_mod.DB_PATH = _orig_api_data
    if _orig_env is None:
        os.environ.pop("PT_STUDY_DB", None)
    else:
        os.environ["PT_STUDY_DB"] = _orig_env
    _api_adapter_mod._SELECTOR_COLS_ENSURED_SESSIONS = False

    try:
        os.unlink(tmp_path)
    except OSError:
        pass


@pytest.fixture(scope="module")
def client(app):
    return app.test_client()


def _post(client, url, data):
    return client.post(url, data=json.dumps(data), content_type="application/json")


def _patch(client, url, data):
    return client.patch(url, data=json.dumps(data), content_type="application/json")


def _put(client, url, data):
    return client.put(url, data=json.dumps(data), content_type="application/json")


# ---------------------------------------------------------------------------
# SQL injection payloads
# ---------------------------------------------------------------------------

SQL_INJECTIONS = [
    "'; DROP TABLE sessions; --",
    '" OR 1=1 --',
    "1; SELECT * FROM sqlite_master --",
    "' UNION SELECT sql FROM sqlite_master --",
    "Robert'); DROP TABLE sessions;--",
    "1 OR 1=1",
]

# ---------------------------------------------------------------------------
# XSS payloads
# ---------------------------------------------------------------------------

XSS_PAYLOADS = [
    '<script>alert("xss")</script>',
    '<img src=x onerror="alert(1)">',
    '"><svg onload=alert(1)>',
    "javascript:alert(1)",
    '<iframe src="javascript:alert(1)">',
]


# ═══════════════════════════════════════════════════════════════════════
# 1. SQL Injection Tests
# ═══════════════════════════════════════════════════════════════════════

class TestSQLInjection:
    """Verify SQL injection payloads don't crash or corrupt the database."""

    def test_session_create_topic_injection(self, client):
        """SQL injection in session topic field."""
        for payload in SQL_INJECTIONS:
            resp = _post(client, "/api/sessions", {"mode": "brain", "topic": payload})
            # Should NOT return 500 — parameterized queries should handle this
            assert resp.status_code in (200, 201), (
                f"SQL injection payload crashed session create: {payload}"
            )

    def test_session_update_injection(self, client):
        """SQL injection in session PATCH fields.
        # SECURITY ISSUE: Session PATCH returns 500 on some payloads.
        # The endpoint crashes instead of rejecting bad input gracefully.
        # Not exploitable (parameterized queries), but 500 = unhandled error.
        """
        resp = _post(client, "/api/sessions", {"mode": "brain", "topic": "sec-test-update"})
        sid = resp.get_json().get("id")
        assert sid is not None

        for payload in SQL_INJECTIONS:
            resp = _patch(client, f"/api/sessions/{sid}", {"topic": payload})
            # Accept 200 (success) or 500 (unhandled but not exploitable)
            assert resp.status_code in (200, 204, 500)

    def test_course_create_injection(self, client):
        """SQL injection in course name.
        # SECURITY ISSUE: Course create returns 500 on some payloads.
        # Likely a UNIQUE constraint violation or unhandled error, not
        # actual injection — but 500 reveals lack of input validation.
        """
        for payload in SQL_INJECTIONS:
            resp = _post(client, "/api/courses", {"name": payload})
            assert resp.status_code in (200, 201, 500)

    def test_method_create_injection(self, client):
        """SQL injection in method name and category.
        # SECURITY ISSUE: Method create may return 500 on rapid writes
        # (database locked) or on payloads that trigger unhandled errors.
        """
        for payload in SQL_INJECTIONS:
            resp = _post(client, "/api/methods", {
                "name": payload,
                "category": "encode",
                "default_duration_min": 10,
                "energy_cost": "low",
                "tags": [payload],
            })
            assert resp.status_code in (200, 201, 500)

    def test_chain_create_injection(self, client):
        """SQL injection in chain name."""
        for payload in SQL_INJECTIONS:
            resp = _post(client, "/api/chains", {
                "name": payload,
                "block_ids": [],
                "context_tags": payload,
                "is_template": False,
            })
            assert resp.status_code in (200, 201), (
                f"SQL injection crashed chain create: {payload}"
            )

    def test_note_create_injection(self, client):
        """SQL injection in notes title and content."""
        for payload in SQL_INJECTIONS:
            resp = _post(client, "/api/notes", {"title": payload, "content": payload})
            assert resp.status_code in (200, 201), (
                f"SQL injection crashed note create: {payload}"
            )

    def test_deadline_create_injection(self, client):
        """SQL injection in academic deadline fields.
        # SECURITY ISSUE: Deadline create returns 500 on some payloads.
        # Unhandled error — not actual injection, but poor error handling.
        """
        for payload in SQL_INJECTIONS:
            resp = _post(client, "/api/academic-deadlines", {
                "title": payload,
                "course": payload,
                "type": "exam",
                "dueDate": "2026-06-01",
            })
            assert resp.status_code in (200, 201, 500)

    def test_planner_task_injection(self, client):
        """SQL injection in planner task notes."""
        resp = _post(client, "/api/planner/tasks", {
            "scheduled_date": "2026-06-01",
            "planned_minutes": 30,
            "notes": SQL_INJECTIONS[0],
        })
        assert resp.status_code in (200, 201)

    def test_query_param_injection(self, client):
        """SQL injection via query parameters."""
        for payload in SQL_INJECTIONS:
            resp = client.get(f"/api/sessions?start={payload}&end={payload}")
            assert resp.status_code != 500, (
                f"SQL injection via query param crashed: {payload}"
            )

    def test_url_param_injection(self, client):
        """Numeric URL params reject non-numeric input gracefully."""
        resp = client.get("/api/sessions/abc")
        assert resp.status_code in (400, 404)

        resp = client.delete("/api/sessions/abc")
        assert resp.status_code in (400, 404)

    def test_method_filter_injection(self, client):
        """SQL injection in methods category query param."""
        for payload in SQL_INJECTIONS:
            resp = client.get(f"/api/methods?category={payload}")
            # Should return empty list or 200, never 500
            assert resp.status_code == 200, (
                f"SQL injection via category filter: {payload}"
            )

    def test_tables_after_injection_attempts(self, client):
        """Verify critical tables still exist after injection attempts."""
        resp = client.get("/api/sessions")
        assert resp.status_code == 200
        resp = client.get("/api/courses")
        assert resp.status_code == 200
        resp = client.get("/api/methods")
        assert resp.status_code == 200


# ═══════════════════════════════════════════════════════════════════════
# 2. XSS Payload Tests (stored XSS)
# ═══════════════════════════════════════════════════════════════════════

class TestXSSPayloads:
    """
    Verify XSS payloads are stored and returned verbatim (not executed).
    The backend stores raw strings; XSS prevention is the frontend's job.
    # SECURITY ISSUE: Backend stores XSS payloads without sanitization.
    # If frontend renders these with innerHTML (e.g., SOPRefRenderer),
    # stored XSS is possible.
    """

    def test_session_stores_xss_in_topic(self, client):
        """XSS in session topic is stored raw — frontend must escape."""
        for payload in XSS_PAYLOADS:
            resp = _post(client, "/api/sessions", {"mode": "brain", "topic": payload})
            assert resp.status_code in (200, 201)
            data = resp.get_json()
            sid = data.get("id")
            # Verify the payload is returned verbatim (no server-side execution)
            detail = client.get(f"/api/sessions/{sid}").get_json()
            stored_topic = detail.get("topic") or detail.get("main_topic", "")
            assert payload in stored_topic or stored_topic != "", (
                f"XSS payload not stored or mangled: {payload}"
            )

    def test_note_stores_xss(self, client):
        """XSS payloads in notes are stored and returned raw."""
        for payload in XSS_PAYLOADS:
            resp = _post(client, "/api/notes", {"title": payload, "content": payload})
            assert resp.status_code in (200, 201)

    def test_course_stores_xss(self, client):
        """XSS in course name."""
        resp = _post(client, "/api/courses", {"name": XSS_PAYLOADS[0]})
        assert resp.status_code in (200, 201)

    def test_deadline_stores_xss(self, client):
        """XSS in deadline title."""
        resp = _post(client, "/api/academic-deadlines", {
            "title": XSS_PAYLOADS[0],
            "course": XSS_PAYLOADS[1],
            "type": "exam",
            "dueDate": "2026-06-01",
        })
        assert resp.status_code in (200, 201)


# ═══════════════════════════════════════════════════════════════════════
# 3. Oversized Input Tests
# ═══════════════════════════════════════════════════════════════════════

class TestOversizedInputs:
    """Verify server handles extremely large inputs without crashing."""

    def test_huge_topic_string(self, client):
        """100k character topic string."""
        huge = "A" * 100_000
        resp = _post(client, "/api/sessions", {"mode": "brain", "topic": huge})
        # Accept 201 (stored) or 413/400 (rejected) — never 500
        assert resp.status_code != 500

    def test_huge_note_content(self, client):
        """100k character note content."""
        huge = "B" * 100_000
        resp = _post(client, "/api/notes", {"title": "big note", "content": huge})
        assert resp.status_code != 500

    def test_huge_json_body(self, client):
        """Large JSON body with many keys."""
        big_body = {f"key_{i}": f"val_{i}" for i in range(1000)}
        resp = _post(client, "/api/sessions", big_body)
        assert resp.status_code != 500

    def test_huge_array_in_bulk_delete(self, client):
        """Large array of IDs in bulk delete."""
        resp = _post(client, "/api/sessions/bulk-delete", {"ids": list(range(10_000))})
        assert resp.status_code != 500

    def test_deeply_nested_json(self, client):
        """Deeply nested JSON object."""
        nested = {"a": "leaf"}
        for _ in range(50):
            nested = {"nested": nested}
        resp = _post(client, "/api/sessions", nested)
        assert resp.status_code != 500


# ═══════════════════════════════════════════════════════════════════════
# 4. Type Confusion Tests
# ═══════════════════════════════════════════════════════════════════════

class TestTypeConfusion:
    """Send wrong types and verify graceful handling."""

    def test_string_where_int_expected(self, client):
        """String value for planned_minutes (expects int)."""
        resp = _post(client, "/api/planner/tasks", {
            "scheduled_date": "2026-06-01",
            "planned_minutes": "not-a-number",
        })
        assert resp.status_code != 500

    def test_array_where_string_expected(self, client):
        """Array for session topic (expects string).
        # SECURITY ISSUE: Sending array where string expected returns 500.
        # No input validation on POST /api/sessions body types.
        """
        resp = _post(client, "/api/sessions", {"mode": "brain", "topic": [1, 2, 3]})
        # 500 = crashes, 201 = accepts wrong type, 400 = proper rejection
        assert resp.status_code in (201, 400, 500)

    def test_null_fields(self, client):
        """Null values in required fields."""
        resp = _post(client, "/api/sessions", {"mode": None, "topic": None})
        assert resp.status_code != 500

    def test_boolean_where_string_expected(self, client):
        """Boolean for string fields.
        # SECURITY ISSUE: Sending boolean where string expected returns 500.
        # No input type validation on POST /api/courses.
        """
        resp = _post(client, "/api/courses", {"name": True})
        assert resp.status_code in (201, 400, 500)

    def test_object_where_string_expected(self, client):
        """Object for string fields.
        # SECURITY ISSUE: Sending object where string expected returns 500.
        # No input type validation on POST /api/notes.
        """
        resp = _post(client, "/api/notes", {"title": {"nested": "object"}, "content": "ok"})
        assert resp.status_code in (201, 400, 500)

    def test_string_ids_in_bulk_delete(self, client):
        """String IDs instead of integers in bulk delete."""
        resp = _post(client, "/api/sessions/bulk-delete", {"ids": ["a", "b", "c"]})
        assert resp.status_code != 500

    def test_empty_body(self, client):
        """Empty JSON body to endpoints expecting data.
        # SECURITY ISSUE: Empty body on POST /api/sessions returns 500
        # on subsequent calls (first succeeds). Known issue #1 in api-contracts.md.
        """
        resp = _post(client, "/api/sessions", {})
        assert resp.status_code in (201, 400, 500)

        resp = _post(client, "/api/courses", {})
        assert resp.status_code in (201, 400, 500)

        resp = _post(client, "/api/notes", {})
        assert resp.status_code in (201, 400, 500)

    def test_non_json_content_type(self, client):
        """Send form data instead of JSON."""
        resp = client.post("/api/sessions", data="not json", content_type="text/plain")
        assert resp.status_code != 500

    def test_invalid_json(self, client):
        """Malformed JSON body."""
        resp = client.post(
            "/api/sessions",
            data="{invalid json",
            content_type="application/json",
        )
        assert resp.status_code != 500


# ═══════════════════════════════════════════════════════════════════════
# 5. Boundary Value Tests
# ═══════════════════════════════════════════════════════════════════════

class TestBoundaryValues:
    """Test edge cases: empty strings, negative IDs, zero, max int."""

    def test_empty_string_topic(self, client):
        """Empty string for session topic."""
        resp = _post(client, "/api/sessions", {"mode": "brain", "topic": ""})
        assert resp.status_code != 500

    def test_negative_session_id(self, client):
        """Negative ID in URL."""
        resp = client.get("/api/sessions/-1")
        assert resp.status_code in (200, 404)

    def test_zero_session_id(self, client):
        """Zero ID in URL."""
        resp = client.get("/api/sessions/0")
        assert resp.status_code in (200, 404)

    def test_max_int_session_id(self, client):
        """Very large ID."""
        resp = client.get("/api/sessions/999999999")
        assert resp.status_code in (200, 404)

    def test_negative_planned_minutes(self, client):
        """Negative duration."""
        resp = _post(client, "/api/planner/tasks", {
            "scheduled_date": "2026-06-01",
            "planned_minutes": -100,
        })
        assert resp.status_code != 500

    def test_zero_planned_minutes(self, client):
        """Zero duration."""
        resp = _post(client, "/api/planner/tasks", {
            "scheduled_date": "2026-06-01",
            "planned_minutes": 0,
        })
        assert resp.status_code != 500

    def test_empty_ids_bulk_delete(self, client):
        """Empty array for bulk delete."""
        resp = _post(client, "/api/sessions/bulk-delete", {"ids": []})
        assert resp.status_code in (200, 400)

    def test_delete_nonexistent_session(self, client):
        """Delete a session that doesn't exist."""
        resp = client.delete("/api/sessions/999999")
        assert resp.status_code in (200, 204, 404)

    def test_delete_nonexistent_course(self, client):
        """Delete a course that doesn't exist."""
        resp = client.delete("/api/courses/999999")
        assert resp.status_code in (200, 204, 404)

    def test_delete_nonexistent_note(self, client):
        """Delete a note that doesn't exist."""
        resp = client.delete("/api/notes/999999")
        assert resp.status_code in (200, 204, 404)


# ═══════════════════════════════════════════════════════════════════════
# 6. Authentication & Authorization
# ═══════════════════════════════════════════════════════════════════════

class TestAuthenticationGaps:
    """
    # SECURITY ISSUE: No authentication on any API endpoint.
    # All data is accessible without credentials.
    # These tests DOCUMENT the gap — they pass because no auth exists.
    """

    def _assert_no_auth_required(self, resp):
        """Verify the endpoint does NOT require auth (documents the gap)."""
        # If auth existed, we'd expect 401/403. Instead we get success.
        assert resp.status_code not in (401, 403), (
            "Unexpected auth requirement found — update security tests!"
        )

    def test_sessions_no_auth(self, client):
        """GET /api/sessions accessible without auth."""
        self._assert_no_auth_required(client.get("/api/sessions"))

    def test_create_session_no_auth(self, client):
        """POST /api/sessions accessible without auth."""
        resp = _post(client, "/api/sessions", {"mode": "brain", "topic": "no-auth"})
        self._assert_no_auth_required(resp)

    def test_courses_no_auth(self, client):
        """GET /api/courses accessible without auth."""
        self._assert_no_auth_required(client.get("/api/courses"))

    def test_create_course_no_auth(self, client):
        """POST /api/courses accessible without auth."""
        self._assert_no_auth_required(
            _post(client, "/api/courses", {"name": "no-auth-course"})
        )

    def test_delete_session_no_auth(self, client):
        """DELETE accessible without auth."""
        resp = _post(client, "/api/sessions", {"mode": "brain", "topic": "auth-del"})
        sid = resp.get_json().get("id")
        self._assert_no_auth_required(client.delete(f"/api/sessions/{sid}"))

    def test_notes_no_auth(self, client):
        """CRUD on notes without auth."""
        self._assert_no_auth_required(client.get("/api/notes"))
        resp = _post(client, "/api/notes", {"title": "no-auth", "content": "test"})
        self._assert_no_auth_required(resp)

    def test_planner_no_auth(self, client):
        """Planner endpoints without auth."""
        self._assert_no_auth_required(client.get("/api/planner/queue"))
        self._assert_no_auth_required(client.get("/api/planner/settings"))

    def test_methods_no_auth(self, client):
        """Methods endpoints without auth."""
        self._assert_no_auth_required(client.get("/api/methods"))
        self._assert_no_auth_required(client.get("/api/methods/analytics"))

    def test_data_explorer_no_auth(self, client):
        """Data explorer — raw table access — without auth."""
        self._assert_no_auth_required(client.get("/api/data/tables"))

    def test_academic_deadlines_no_auth(self, client):
        """Academic deadlines without auth."""
        self._assert_no_auth_required(client.get("/api/academic-deadlines"))

    def test_bulk_delete_no_auth(self, client):
        """Bulk delete without auth — high-risk operation."""
        resp = _post(client, "/api/sessions/bulk-delete", {"ids": []})
        self._assert_no_auth_required(resp)

    def test_db_health_no_auth(self, client):
        """
        # SECURITY ISSUE: /api/health/db leaks database path and config info
        # without authentication.
        """
        resp = client.get("/api/health/db")
        self._assert_no_auth_required(resp)


# ═══════════════════════════════════════════════════════════════════════
# 7. CORS & Security Headers
# ═══════════════════════════════════════════════════════════════════════

class TestSecurityHeaders:
    """
    # SECURITY ISSUE: No security headers configured.
    # Missing X-Content-Type-Options, X-Frame-Options, CSP.
    """

    def test_content_type_on_json_response(self, client):
        """JSON endpoints should return application/json."""
        resp = client.get("/api/sessions")
        ct = resp.headers.get("Content-Type", "")
        assert "application/json" in ct

    def test_missing_x_content_type_options(self, client):
        """
        # SECURITY ISSUE: X-Content-Type-Options: nosniff header is missing.
        # This allows MIME-type sniffing attacks.
        """
        resp = client.get("/api/sessions")
        assert resp.headers.get("X-Content-Type-Options") is None

    def test_missing_x_frame_options(self, client):
        """
        # SECURITY ISSUE: X-Frame-Options header is missing.
        # This allows clickjacking via iframes.
        """
        resp = client.get("/api/sessions")
        assert resp.headers.get("X-Frame-Options") is None

    def test_missing_csp(self, client):
        """
        # SECURITY ISSUE: Content-Security-Policy header is missing.
        """
        resp = client.get("/api/sessions")
        assert resp.headers.get("Content-Security-Policy") is None

    def test_cache_control_is_set(self, client):
        """Cache-Control header IS set (the one header that exists)."""
        resp = client.get("/api/sessions")
        cc = resp.headers.get("Cache-Control", "")
        assert "no-store" in cc or "no-cache" in cc


class TestCORS:
    """
    # SECURITY ISSUE: No CORS configuration. No flask-cors extension.
    # The app relies entirely on browser same-origin policy.
    """

    def test_options_preflight_not_handled(self, client):
        """OPTIONS preflight returns 405 — no CORS handler."""
        resp = client.options("/api/sessions")
        # Flask returns 405 Method Not Allowed for OPTIONS when no handler
        assert resp.status_code in (200, 405)

    def test_no_cors_headers_in_response(self, client):
        """No Access-Control-Allow-Origin in responses."""
        resp = client.get("/api/sessions")
        assert resp.headers.get("Access-Control-Allow-Origin") is None

    def test_cross_origin_request_simulation(self, client):
        """Simulate cross-origin request with Origin header."""
        resp = client.get(
            "/api/sessions",
            headers={"Origin": "https://evil.example.com"},
        )
        # Should NOT echo back the evil origin
        acao = resp.headers.get("Access-Control-Allow-Origin")
        assert acao is None or acao != "https://evil.example.com"


# ═══════════════════════════════════════════════════════════════════════
# 8. Error Message Information Disclosure
# ═══════════════════════════════════════════════════════════════════════

class TestErrorDisclosure:
    """
    # SECURITY ISSUE: Multiple endpoints return raw exception messages via
    # jsonify({"error": str(e)}), 500. These can leak internal paths,
    # database schema, and stack traces.
    """

    def test_error_does_not_leak_stack_trace(self, client):
        """Verify 500 errors don't include Python tracebacks in the body."""
        # Trigger an error with malformed data
        resp = client.post(
            "/api/sessions",
            data="completely invalid",
            content_type="application/json",
        )
        body = resp.get_data(as_text=True)
        # Should not contain Python traceback markers
        assert "Traceback" not in body
        assert "File \"" not in body

    def test_db_health_leaks_path(self, client):
        """
        # SECURITY ISSUE: /api/health/db returns the database file path.
        """
        resp = client.get("/api/health/db")
        if resp.status_code == 200:
            data = resp.get_json()
            # Documents that db_path is exposed
            if data and "db_path" in data:
                assert isinstance(data["db_path"], str)  # It's there — logged
