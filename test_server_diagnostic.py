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
    app = create_app()
    app.run(port=5005, use_reloader=False)

if __name__ == "__main__":
    t = threading.Thread(target=run_server)
    t.daemon = True
    t.start()
    
    print("Waiting for server...")
    time.sleep(5)
    
    try:
        print("Pinging /api/google/status...")
        resp = requests.get("http://localhost:5005/api/google/status")
        print(f"Status: {resp.status_code}")
        print(f"Response: {resp.text}")
        
        print("Pinging /api/google-tasks...")
        resp2 = requests.get("http://localhost:5005/api/google-tasks")
        print(f"Tasks Status: {resp2.status_code}")
        # print(f"Response: {resp2.text}") 
        
    except Exception as e:
        print(f"FAILED: {e}")
        
    print("Done.")
    os._exit(0)
