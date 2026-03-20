import os

path = r"C:\pt-study-sop\dashboard_rebuild\client\src\index.css"
with open(path, "r", encoding="utf-8") as f:
    content = f.read()

def n(s): return s.replace('\r\n', '\n')

old_block = """    @media (min-width: 1024px) {
      .page-shell__header {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }

      .page-shell__meta {
        justify-content: flex-end;
        max-width: 44%;
      }"""

new_block = """    @media (min-width: 1024px) {
      .page-shell__header {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }

      .page-shell__meta {
        justify-content: flex-end;
        flex-wrap: nowrap;
        flex-shrink: 0;
      }
      .page-shell__actions {
        flex-wrap: nowrap;
      }"""

c = n(content)
o2 = """    @media (min-width: 1024px) {
      .page-shell__header {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }

      .page-shell__meta {
        justify-content: flex-end;
        max-width: 44%;
      }"""
o3 = """    @media (min-width: 1024px) {
      .page-shell__header {
        flex-direction: row;
        justify-content: space-between;
        align-items: flex-start;
      }

      .page-shell__meta {
        justify-content: flex-end;
        max-width: 44%;
      }"""

# Since I don't know the exact indentation, let's just use regex
import re
c = re.sub(
    r'\.page-shell__meta\s*\{\s*justify-content:\s*flex-end;\s*max-width:\s*44%;\s*\}',
    '.page-shell__meta {\n        justify-content: flex-end;\n        flex-wrap: nowrap;\n        flex-shrink: 0;\n      }\n      .page-shell__actions {\n        flex-wrap: nowrap;\n      }',
    c
)

with open(path, "w", encoding="utf-8", newline="") as f:
    f.write(c)
print('Done!')
