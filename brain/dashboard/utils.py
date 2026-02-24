
import os
import json
from pathlib import Path
from config import API_CONFIG_PATH, load_env

ALLOWED_EXTENSIONS = {".md", ".markdown", ".txt"}

def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

def load_api_config():
    """Load API configuration from file, with env fallbacks."""
    # Ensure .env is loaded into os.environ (no-op if already loaded)
    load_env()

    config = {}
    if os.path.exists(API_CONFIG_PATH):
        try:
            with open(API_CONFIG_PATH, 'r', encoding='utf-8') as f:
                config = json.load(f) or {}
        except:
            config = {}

    # Defaults for LLM config — Codex OAuth is the primary provider
    merged = {
        "openai_api_key": "",
        "api_provider": "codex",
        "model": "default",
    }
    merged.update(config)

    # Env fallback (does not override explicit config values)
    if not merged.get("openai_api_key"):
        merged["openai_api_key"] = os.environ.get("OPENAI_API_KEY", "")

    return merged

def save_api_config(config):
    """Save API configuration to file."""
    os.makedirs(os.path.dirname(API_CONFIG_PATH), exist_ok=True)
    with open(API_CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)
