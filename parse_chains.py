import json
from pathlib import Path
import yaml

chains = []
for path in sorted(Path('sop/library/chains').glob('*.yaml')):
    raw = path.read_text(encoding='utf-8')
    data = yaml.safe_load(raw)
    stage = data.get('context_tags', {}).get('stage')
    chains.append({
        'file': str(path).replace('\\', '/'),
        'chain_id': data.get('id'),
        'description': data.get('description', '').strip(),
        'stage': stage,
        'methods': data.get('blocks', []),
        'default_knobs': data.get('default_knobs') or [],
        'gates': data.get('gates') or [],
        'failure_actions': data.get('failure_actions') or [],
        'line_count': len(raw.splitlines())
    })
print(json.dumps(chains, indent=2))
