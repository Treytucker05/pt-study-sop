import json
import os

configs = [
    r"C:\Users\treyt\AppData\Roaming\Claude\claude_desktop_config.json",
    r"C:\Users\treyt\.cursor\mcp.json",
    r"C:\pt-study-sop\.mcp.json"
]

servers_to_add = {
    "stealth-computer-use": {
        "command": "python",
        "args": [r"C:\Users\treyt\OneDrive\Desktop\MCP Servers\Stealth-Computer-Use\server.py"]
    },
    "mcp-toolz": {"command": "mcp-toolz", "args": []},
    "notebooklm-mcp": {"command": "notebooklm-mcp", "args": []},
    "obsidian-mcp": {"command": "obsidian-mcp", "args": []},
    "openpencil-mcp": {"command": "openpencil-mcp", "args": []},
    "mcp-pyautogui": {"command": "mcp-pyautogui", "args": []},
    
    # Ensuring Claude's defaults are mirrored to the others
    "github": {"command": "mcp-server-github", "args": [], "env": {"GITHUB_PERSONAL_ACCESS_TOKEN": ""}},
    "memory": {"command": "mcp-server-memory", "args": []},
    "filesystem": {"command": "mcp-server-filesystem", "args": [r"C:\Users\treyt\OneDrive\Desktop", r"C:\Users\treyt\.claude"]},
    "context7": {"command": "context7-mcp", "args": []},
    "codex-cli": {"command": "codex-mcp", "args": []}
}

for config_path in configs:
    if not os.path.exists(config_path):
        print(f"Skipping (not found): {config_path}")
        continue
        
    try:
        with open(config_path, 'r', encoding='utf-8') as f:
            data = json.load(f)
            
        # Ensure mcpServers key exists
        if "mcpServers" not in data:
            data["mcpServers"] = {}
            
        # Add new servers, don't overwrite existing ones if they have custom config
        added_count = 0
        for name, config in servers_to_add.items():
            if name not in data["mcpServers"]:
                data["mcpServers"][name] = config
                added_count += 1
                
        with open(config_path, 'w', encoding='utf-8') as f:
            json.dump(data, f, indent=2)
            
        print(f"Updated {os.path.basename(config_path)}: Added {added_count} servers.")
    except Exception as e:
        print(f"Failed to update {config_path}: {e}")
