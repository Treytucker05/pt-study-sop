#!/usr/bin/env python3
"""
Stop all PT Study Brain servers running on port 5000.
"""
import subprocess
import sys

def stop_servers():
    """Find and kill all processes using port 5000."""
    try:
        # Find processes using port 5000
        result = subprocess.run(
            ["netstat", "-ano"],
            capture_output=True,
            text=True,
            check=True
        )
        
        pids = set()
        for line in result.stdout.splitlines():
            if ":5000" in line and "LISTENING" in line:
                parts = line.split()
                pid = parts[-1]
                if pid.isdigit():
                    pids.add(pid)
        
        if not pids:
            print("No servers running on port 5000.")
            return
        
        # Kill each process
        for pid in pids:
            try:
                subprocess.run(["taskkill", "/F", "/PID", pid], check=True)
                print(f"Stopped server with PID {pid}")
            except subprocess.CalledProcessError:
                print(f"Failed to stop PID {pid} (may already be stopped)")
        
        print("\nAll servers stopped successfully!")
        
    except Exception as e:
        print(f"Error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    stop_servers()
