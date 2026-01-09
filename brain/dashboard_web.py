
#!/usr/bin/env python3
"""
Entry point for the Dashboard v2.0.
Refactored to use brain.dashboard package.
"""
from dashboard import create_app

if __name__ == "__main__":
    app = create_app()
    # Debug disabled for production-like behavior, can be enabled if needed
    app.run(debug=True, host="127.0.0.1", port=5000)
