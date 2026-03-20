from pywinauto import Application
from pywinauto import Desktop
import sys

def list_windows():
    print("Listing visible top-level windows...")
    windows = Desktop(backend="uia").windows(visible_only=True)
    for w in windows:
        if w.window_text().strip():
            print(f"- {w.window_text()} (Class: {w.class_name()})")

if __name__ == "__main__":
    list_windows()
