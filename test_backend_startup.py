import sys
import os

# Set paths
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), 'brain'))

try:
    print("Attempting to import app factory...")
    from brain.dashboard.app import create_app
    print("Factory imported.")
    
    print("Creating app...")
    app = create_app()
    print("App created successfully!")
    
    print("Registered routes:")
    for rule in app.url_map.iter_rules():
        if "google-tasks" in str(rule):
            print(f" - {rule}")
            
except Exception as e:
    print(f"CRASH: {e}")
    import traceback
    traceback.print_exc()
