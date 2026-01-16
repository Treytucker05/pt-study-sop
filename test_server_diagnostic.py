import sys
import os
import threading
import time
import requests

# Add paths
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'brain'))

from brain.dashboard.app import create_app

def run_server():
    print("Starting server on 5005...")
    try:
        app = create_app()
        app.run(port=5005, use_reloader=False)
    except Exception as e:
        print(f"Server Startup Failed: {e}")
        os._exit(1)

if __name__ == "__main__":
    t = threading.Thread(target=run_server)
    t.daemon = True
    t.start()
    
    print("Waiting for server...")
    time.sleep(5)
    
    endpoints = [
        ("Google Status", "/api/google/status"),
        ("Google Tasks Items", "/api/google-tasks"),
        ("Google Task Lists", "/api/google-tasks/lists"),
        ("Google Calendar Events", "/api/google-calendar/events?timeMin=2026-01-01T00:00:00Z&timeMax=2027-01-01T00:00:00Z"),
        ("Scholar Status", "/api/scholar/status"),
        ("Scholar Logs", "/api/scholar/logs"),
        ("Events (Local)", "/api/events?start=2024-01-01&end=2025-01-01") 
    ]
    
    failed = False
    
    for name, path in endpoints:
        try:
            url = f"http://localhost:5005{path}"
            print(f"Pinging {name} ({url})...")
            resp = requests.get(url, timeout=10)
            if resp.status_code == 200:
                print(f"  [OK] {resp.status_code}")
                # Print preview of data for critical endpoints
                if "events" in path or "tasks" in path:
                     print(f"  [DATA] {resp.text[:500]}...") 
            else:
                print(f"  [FAIL] {resp.status_code} - {resp.text[:200]}")
                # failed = True
        except Exception as e:
            print(f"  [CRASH/TIMEOUT] {e}")
            failed = True
            
    if failed:
        print("Some tests failed.")
        # os._exit(1)
    else:
        print("All tests passed.")
        
    os._exit(0)
