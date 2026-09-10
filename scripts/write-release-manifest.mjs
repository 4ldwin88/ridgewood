import { readFileSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const source = readFileSync('src/app/shell/AppShell.tsx', 'utf8');
const version = source.match(/APP_VERSION = '(v[\d.]+)'/)?.[1];
const commit = process.env.GITHUB_SHA ?? execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
if (!version || !/^[a-f0-9]{40}$/.test(commit)) throw new Error('Invalid release identity');
writeFileSync('dist/release.json', JSON.stringify({
  version, commit, backend: 'leikcvdfvovycjcjtflq', humanAcceptance: 'NOT RUN',
}, null, 2) + '\n');
