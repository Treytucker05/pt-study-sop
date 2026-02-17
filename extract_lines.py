from pathlib import Path
lines = Path('sop/library/15-method-library.md').read_text(encoding='utf-8').splitlines()
ranges = [28, 34, 141, 142, 147, 148, 152, 153, 167, 172, 177, 178, 248]
for r in ranges:
    print(f'{r}: {lines[r-1]}')
