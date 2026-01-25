import sys
import os
from pathlib import Path

# Add project root to path
sys.path.append(os.getcwd())

try:
    from brain.dashboard import gcal
    print("Testing gcal.check_auth_status()...")
    status = gcal.check_auth_status()
    print(f"Status: {status}")
    
    config = gcal.load_gcal_config()
    print(f"Config Loaded: {config.keys() if config else 'None'}")
    
except Exception as e:
    import traceback
    traceback.print_exc()
