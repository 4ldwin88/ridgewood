import assert from 'node:assert/strict';
import { chromium } from '@playwright/test';

const url = new URL(process.env.PAGE_URL ?? 'http://127.0.0.1:4175/ridgewood/');
const expectedSha = process.env.EXPECTED_SHA;
assert.match(expectedSha ?? '', /^[a-f0-9]{40}$/);
let manifest;
for (let attempt = 0; attempt < 24; attempt++) {
  try {
    const response = await fetch(new URL(`release.json?sha=${expectedSha}&attempt=${attempt}`, url), { signal: AbortSignal.timeout(10000) });
    manifest = await response.json();
    if (response.ok && manifest.commit === expectedSha) break;
  } catch { /* Deployment propagation can lag the deployment API. */ }
  await new Promise(resolve => setTimeout(resolve, 5000));
}
assert.equal(manifest?.commit, expectedSha, 'Deployed commit is not the requested candidate');
assert.equal(manifest.backend, 'leikcvdfvovycjcjtflq');
const browser = await chromium.launch();
try {
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('response', response => {
      if (response.url().startsWith(url.origin) && response.status() >= 400) errors.push(`${response.status()} ${response.url()}`);
    });
    const portalUrl = new URL(url.href);
    portalUrl.searchParams.set('portal', '1');
    portalUrl.searchParams.set('release', expectedSha);
    await page.goto(portalUrl.href, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor();
    assert.ok(await page.getByText(`Ridgewood OS · ${manifest.version}`, { exact: true }).isVisible());
    const logo = page.getByRole('img', { name: 'Ridgewood', exact: true });
    assert.ok(await logo.evaluate(image => image.complete && image.naturalWidth > 0), 'Logo must render');
    assert.match(new URL(await logo.getAttribute('src'), url).pathname, /^\/ridgewood\/assets\/ridgewood-horizontal-light-[\w-]+\.svg$/);
    assert.ok(await page.getByRole('button', { name: 'Sign in', exact: true }).isVisible());
    assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), 'Viewport overflows horizontally');
    assert.deepEqual(errors, [], 'Deployed page has asset or runtime errors');
    await page.close();
  }
  console.log(`Verified ${manifest.version} at ${expectedSha}: desktop/mobile portal sign-in and assets. Human acceptance remains NOT RUN.`);
} finally {
  await browser.close();
}
