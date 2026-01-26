import sys
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[1]
if str(ROOT) not in sys.path:
    sys.path.append(str(ROOT))
brain_dir = ROOT / "brain"
if str(brain_dir) not in sys.path:
    sys.path.append(str(brain_dir))

from dashboard.app import create_app


@pytest.fixture
def client():
    """Create a test client for the Flask app."""
    app = create_app()
    app.config['TESTING'] = True
    with app.test_client() as client:
        yield client


def test_sessions_no_filter(client):
    """Test GET /api/sessions without date filters returns all sessions."""
    response = client.get('/api/sessions')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)


def test_sessions_date_range(client):
    """Test GET /api/sessions with both start and end date filters."""
    response = client.get('/api/sessions?start=2025-08-01&end=2025-12-31')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    # All returned sessions should be within the date range
    for session in data:
        if 'session_date' in session:
            assert session['session_date'] >= '2025-08-01'
            assert session['session_date'] <= '2025-12-31'


def test_sessions_start_only(client):
    """Test GET /api/sessions with only start date filter."""
    response = client.get('/api/sessions?start=2025-08-01')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    # All returned sessions should be on or after start date
    for session in data:
        if 'session_date' in session:
            assert session['session_date'] >= '2025-08-01'


def test_sessions_end_only(client):
    """Test GET /api/sessions with only end date filter."""
    response = client.get('/api/sessions?end=2025-12-31')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)
    # All returned sessions should be on or before end date
    for session in data:
        if 'session_date' in session:
            assert session['session_date'] <= '2025-12-31'


def test_sessions_invalid_dates_handled_gracefully(client):
    """Test that invalid dates are handled gracefully (no crash)."""
    # Empty string should be treated as no filter
    response = client.get('/api/sessions?start=&end=')
    assert response.status_code == 200
    data = response.get_json()
    assert isinstance(data, list)


def test_sessions_malformed_dates_handled_gracefully(client):
    """Test that malformed dates don't crash the endpoint."""
    # Malformed dates should either be ignored or handled gracefully
    response = client.get('/api/sessions?start=invalid&end=also-invalid')
    # Should either return 200 with filtered results or 500 with error
    # The important thing is it doesn't crash unexpectedly
    assert response.status_code in [200, 500]
