import re
import os

def extract_assets():
    source_path = 'brain/dashboard_web.py'
    html_out_path = 'brain/templates/dashboard.html'
    css_out_path = 'brain/static/css/dashboard.css'
    js_out_path = 'brain/static/js/dashboard.js'

    with open(source_path, 'r', encoding='utf-8') as f:
        content = f.read()

    # Extract HTML string
    start_marker = '_INDEX_HTML = r"""'
    end_marker = '"""\n\n\nif __name__ == "__main__":'
    
    start_idx = content.find(start_marker)
    if start_idx == -1:
        print("Error: HTML start marker not found")
        return
    
    start_idx += len(start_marker)
    
    # approximate end finding (look for valid end)
    # The file ends with if __name__ ...
    end_idx = content.find('if __name__ == "__main__":')
    # Backtrack to find the triple quotes
    end_quote_idx = content.rfind('"""', start_idx, end_idx)
    
    if end_quote_idx == -1:
        print("Error: HTML end marker not found")
        return

    raw_html = content[start_idx:end_quote_idx].strip()
    
    print(f"Extracted HTML length: {len(raw_html)}")

    # Extract CSS
    css_start = raw_html.find('<style>')
    css_end = raw_html.find('</style>')
    
    if css_start == -1 or css_end == -1:
        print("Error: CSS markers not found")
        return

    css_content = raw_html[css_start+7:css_end].strip()
    with open(css_out_path, 'w', encoding='utf-8') as f:
        f.write(css_content)
    print(f"Wrote CSS to {css_out_path}")

    # Remove CSS from HTML
    html_no_css = raw_html[:css_start] + '<link rel="stylesheet" href="/static/css/dashboard.css">' + raw_html[css_end+8:]

    # Extract JS
    # We have multiple script blocks
    # Regex to find all script blocks
    # <script>...</script>
    
    scripts = []
    
    # We will reconstruct HTML without scripts, and append one link at the end
    # But we need to handle the fact that one script was in head (openTab) and one in body (init)
    
    # Simple strategy: Find all matches, join content, remove matches, add link at end of body
    
    pattern = re.compile(r'<script>(.*?)</script>', re.DOTALL)
    
    final_js_content = ""
    
    def replace_script(match):
        nonlocal final_js_content
        final_js_content += match.group(1).strip() + "\n\n"
        return "" # Remove script tag entirely
        
    html_no_js = pattern.sub(replace_script, html_no_css)
    
    # Write JS
    with open(js_out_path, 'w', encoding='utf-8') as f:
        f.write(final_js_content)
    print(f"Wrote JS to {js_out_path}")
    
    # Insert JS Link before </body>
    # We put it in Head so openTab is available? 
    # Or just put it in Head.
    # The user wanted "openTab" to be instant.
    # But initDashboard needs DOM.
    # If we put <script src="..." defer></script> in head, it works for both.
    
    head_end = html_no_js.find('</head>')
    html_final = html_no_js[:head_end] + '  <script src="/static/js/dashboard.js" defer></script>\n' + html_no_js[head_end:]
    
    with open(html_out_path, 'w', encoding='utf-8') as f:
        f.write(html_final)
    print(f"Wrote HTML to {html_out_path}")

if __name__ == '__main__':
    extract_assets()
