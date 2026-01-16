import requests
import json

def test():
    base = "http://localhost:5005/api"
    print("--- TESTING GOOGLE TASK LISTS ---")
    try:
        r = requests.get(f"{base}/google-tasks/lists", timeout=10)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Count: {len(data)}")
            print(json.dumps(data[:2], indent=2))
        else:
            print(r.text)
    except Exception as e:
        print(e)

    print("--- TESTING GOOGLE TASKS ---")
    try:
        r = requests.get(f"{base}/google-tasks", timeout=10)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Count: {len(data)}")
            print(json.dumps(data[:2], indent=2))
        else:
            print(r.text)
    except Exception as e:
        print(e)
        
    print("\n--- TESTING GOOGLE CALENDAR EVENTS (2026) ---")
    try:
        r = requests.get(f"{base}/google-calendar/events?timeMin=2026-01-01T00:00:00Z&timeMax=2027-01-01T00:00:00Z", timeout=10)
        print(f"Status: {r.status_code}")
        if r.status_code == 200:
            data = r.json()
            print(f"Count: {len(data)}")
            print(json.dumps(data[:2], indent=2))
        else:
            print(r.text)
    except Exception as e:
        print(e)

if __name__ == "__main__":
    test()
