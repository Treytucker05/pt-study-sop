import re

path = "brain/dashboard_web.py"

with open(path, "r", encoding="utf-8") as f:
    content = f.read()

# 1. Update Imports
# Find "from flask import ("
# Add render_template if not present
if "render_template" not in content:
    content = content.replace("from flask import (", "from flask import (\n    render_template,")

# 2. Update Index Route
# Match def index(): ... return response
# We want to replace the whole function body
pattern_route = r'def index\(\):\s+response = Response\(_INDEX_HTML, mimetype="text/html"\)[\s\S]+?return response'
replacement_route = """def index():
    return render_template('dashboard.html')"""

content = re.sub(pattern_route, replacement_route, content)

# 3. Delete _INDEX_HTML variable block
# Find start
start_marker = '_INDEX_HTML = r"""'
end_marker = 'if __name__ == "__main__":'

start_idx = content.find(start_marker)
end_idx = content.find(end_marker)

if start_idx != -1 and end_idx != -1:
    # We remove from start_idx up to end_idx (keeping the if __name__ part)
    # Actually, we want to remove the preceding whitespace/newlines too?
    # Let's just slice.
    new_content = content[:start_idx] + "\n\n" + content[end_idx:]
    content = new_content
else:
    print("Warning: HTML block not found")

with open(path, "w", encoding="utf-8") as f:
    f.write(content)

print("Backend updated successfully.")
