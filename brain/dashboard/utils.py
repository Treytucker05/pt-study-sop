
import os
import json
from pathlib import Path
from config import API_CONFIG_PATH

ALLOWED_EXTENSIONS = {".md", ".markdown", ".txt"}

def allowed_file(filename: str) -> bool:
    return Path(filename).suffix.lower() in ALLOWED_EXTENSIONS

def load_api_config():
    """Load API configuration from file."""
    if os.path.exists(API_CONFIG_PATH):
        try:
            with open(API_CONFIG_PATH, 'r', encoding='utf-8') as f:
                return json.load(f)
        except:
            pass
    return {
        "openai_api_key": "",
        "openrouter_api_key": "",
        "api_provider": "openrouter",  # Default to OpenRouter
        "model": "zai-ai/glm-4.7"
    }

def save_api_config(config):
    """Save API configuration to file."""
    os.makedirs(os.path.dirname(API_CONFIG_PATH), exist_ok=True)
    with open(API_CONFIG_PATH, 'w', encoding='utf-8') as f:
        json.dump(config, f, indent=2)
