"""Protect the recovered applied history; new migrations must follow its checkpoint."""
import hashlib
import json
import re
from pathlib import Path

root = Path(__file__).resolve().parents[1]
manifest = json.loads((root / 'docs/development/recovered-migration-manifest.json').read_text())
directory = root / 'supabase/migrations'
expected = {row['file']: row['sha256'] for row in manifest['migrations']}
checkpoint = max(name[:14] for name in expected)
errors = []
for name, digest in expected.items():
    path = directory / name
    if not path.exists() or hashlib.sha256(path.read_bytes()).hexdigest() != digest:
        errors.append(f'Applied migration missing or changed: {name}')
for path in directory.glob('*.sql'):
    if not re.fullmatch(r'\d{14}_[a-z0-9_]+\.sql', path.name):
        errors.append(f'Invalid migration filename: {path.name}')
    elif path.name not in expected and path.name[:14] <= checkpoint:
        errors.append(f'New migration inserted into applied history: {path.name}')
if errors:
    raise SystemExit('\n'.join(errors))
print(f'Verified {len(expected)} recovered migrations; new files follow {checkpoint}.')
