"""Test script for proposal similarity detection."""
from pathlib import Path
import re

def _tokenize_for_similarity(text):
    if not text:
        return set()
    words = re.split(r'[^a-z0-9]+', text.lower())
    return {w for w in words if len(w) >= 3}

def _jaccard_similarity(set_a, set_b):
    if not set_a and not set_b:
        return 0.0
    intersection = len(set_a & set_b)
    union = len(set_a | set_b)
    if union == 0:
        return 0.0
    return intersection / union

def _extract_scope_from_content(content):
    match = re.search(r'^-?\s*Scope\s*:\s*(.+)$', content, re.MULTILINE | re.IGNORECASE)
    if match:
        return match.group(1).strip()
    return ''

# Test with different queries
repo_root = Path(__file__).resolve().parents[1]
queue = repo_root / 'scholar' / 'outputs' / 'promotion_queue'

queries = [
    ('Successive Relearning Mastery Count', ''),
    ('Change Proposal Successive Relearning Mastery Count', ''),
    ('Mastery Count', 'sop/library'),
    ('Probe First Core Mode Gating', ''),
    ('Semantic Lead KWIK Flow', ''),
]

for title, scope in queries:
    candidate_text = f'{title} {scope}'
    candidate_tokens = _tokenize_for_similarity(candidate_text)
    print(f'\n=== Query: "{title}" ===')
    print(f'Tokens: {candidate_tokens}')
    
    for f in queue.glob('*.md'):
        content = f.read_text(encoding='utf-8')
        match = re.search(r'^#\s+(.+)$', content, re.MULTILINE)
        existing_title = match.group(1).strip() if match else ''
        existing_scope = _extract_scope_from_content(content)
        existing_text = f'{existing_title} {existing_scope}'
        existing_tokens = _tokenize_for_similarity(existing_text)
        sim = _jaccard_similarity(candidate_tokens, existing_tokens)
        if sim > 0.3:  # Show all with some similarity
            print(f'  {f.name}: sim={sim:.3f} (tokens: {existing_tokens})')
