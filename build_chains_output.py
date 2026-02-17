import json
from pathlib import Path
import yaml

category_map = {
    'first_exposure': 'first exposure',
    'consolidation': 'consolidation',
    'exam_prep': 'exam ramp',
    'review': 'maintenance',
}

chains = []
for path in sorted(Path('sop/library/chains').glob('*.yaml')):
    raw = path.read_text(encoding='utf-8')
    data = yaml.safe_load(raw)
    lines = raw.splitlines()
    methods = []
    line_idx = 0
    for idx, line in enumerate(lines, start=1):
        stripped = line.strip()
        if stripped.startswith('- M-'):
            methods.append({'id': stripped[2:].strip(), 'line': idx})
    stage_value = data.get('context_tags', {}).get('stage')
    stage_line = None
    for idx, line in enumerate(lines, start=1):
        if 'stage:' in line:
            stage_line = idx
            break
    category_value = category_map.get(stage_value, 'unspecified')
    category_source = None
    if stage_value == 'first_exposure':
        category_source = 'sop/library/15-method-library.md:L141-L153'
    elif stage_value == 'review':
        category_source = 'sop/library/15-method-library.md:L147-L153'
    elif stage_value == 'exam_prep':
        category_source = 'sop/library/15-method-library.md:L167-L172'
    elif stage_value == 'consolidation':
        category_source = 'sop/library/15-method-library.md:L177-L178'

    chains.append({
        'file': str(path).replace('\\', '/'),
        'line_range': [1, len(lines)],
        'chain_id': data.get('id'),
        'category': {
            'value': category_value,
            'canonical_reference': category_source,
            'stage_line': stage_line,
            'stage_raw': stage_value,
        },
        'assessment_modes': ['unspecified'],
        'methods': methods,
        'default_knobs': data.get('default_knobs') or [],
        'gates': data.get('gates') or [],
        'failure_actions': data.get('failure_actions') or [],
        'description': data.get('description', '').strip(),
        'description_line': next((idx for idx, line in enumerate(lines, start=1) if line.strip().startswith('description:')), None),
        'evidence_sources': data.get('evidence', []) or [],
    })
print(json.dumps({'chains': chains, 'chain_count': len(chains), 'ordered_chain_ids': [c['chain_id'] for c in chains]}, indent=2))
