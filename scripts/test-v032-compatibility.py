"""Run the frozen demo frontend against the upgraded disposable database.

Only synthetic fixture identities change; application code and assertions stay
exactly at the recorded release. No hosted credentials or data are accepted.
"""
import json
import os
from pathlib import Path
import subprocess

RELEASE = '6b9b6aa1e6311891809b4d3c4010064979b19d60'
root = Path(__file__).resolve().parents[1]
status = json.loads(Path('/tmp/ridgewood-local-status.json').read_text())
assert status['API_URL'] == 'http://127.0.0.1:54321', 'Local database required'
target = Path(os.environ['RUNNER_TEMP']) / 'ridgewood-v032-compat'
assert not target.exists(), 'Refusing to overwrite an existing checkout'
subprocess.run(['git', 'fetch', '--depth=1', 'origin', RELEASE], cwd=root, check=True)
subprocess.run(['git', 'worktree', 'add', '--detach', str(target), RELEASE], cwd=root, check=True)
(target / 'node_modules').symlink_to(root / 'node_modules', target_is_directory=True)
for relative in ['scripts/local-acceptance-fixtures.py', 'tests/acceptance/opportunity-authorize.spec.ts']:
    path = target / relative
    text = path.read_text()
    assert 'edward-demo@example.invalid' in text
    path.write_text(text.replace('edward-demo@example.invalid', 'compat-v032@example.invalid')
                   .replace('outsider-demo@example.invalid', 'compat-outsider-v032@example.invalid'))
subprocess.run(['python', 'scripts/local-acceptance-fixtures.py', 'setup'], cwd=target, check=True)
subprocess.run(['npx', 'playwright', 'test', '--config', 'playwright.acceptance.config.ts'], cwd=target, check=True)
print(f'Frozen v0.32 frontend {RELEASE}: authenticated upgraded-database compatibility passed')
