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

    const publicUrl = new URL(url.href);
    publicUrl.searchParams.set('release', expectedSha);
    await page.goto(publicUrl.href, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: /Built to deliver/i }).waitFor();
    const publicLogo = page.getByRole('img', { name: 'Ridgewood — Construction • Development', exact: true }).first();
    assert.ok(await publicLogo.evaluate(image => image.complete && image.naturalWidth > 0), 'Public wordmark must render');
    assert.match(new URL(await publicLogo.getAttribute('src'), url).pathname, /^\/ridgewood\/assets\/ridgewood-wordmark-primary-light-[\w-]+\.png$/);
    assert.ok(await page.getByRole('link', { name: 'Open Ridgewood OS Portal', exact: true }).isVisible());
    for (const label of ['Home', 'Build', 'Develop', 'Vision', 'Work', 'About', 'Contact']) {
      assert.ok(await page.getByRole('link', { name: label, exact: true }).isVisible(), `${label} sticky tab must render`);
    }
    assert.ok(await page.getByText('Builder knowledge. Developer thinking.', { exact: true }).isVisible(), 'Home thesis must render');
    assert.ok(await page.getByRole('heading', { name: 'From first scope to final handoff.', exact: true }).isVisible(), 'Build section must render');
    assert.ok(await page.getByRole('heading', { name: 'Finding value before construction begins.', exact: true }).isVisible(), 'Develop section must render');
    assert.ok(await page.getByRole('heading', { name: 'Building more than projects.', exact: true }).isVisible(), 'Vision section must render');
    assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), 'Public viewport overflows horizontally');

    const portalUrl = new URL(url.href);
    portalUrl.searchParams.set('portal', '1');
    portalUrl.searchParams.set('release', expectedSha);
    await page.goto(portalUrl.href, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { name: 'Sign in', exact: true }).waitFor();
    assert.ok(await page.getByText(`Ridgewood OS · ${manifest.version}`, { exact: true }).isVisible());
    const portalLogo = page.getByRole('img', { name: 'Ridgewood', exact: true });
    assert.ok(await portalLogo.evaluate(image => image.complete && image.naturalWidth > 0), 'Portal wordmark must render');
    assert.match(new URL(await portalLogo.getAttribute('src'), url).pathname, /^\/ridgewood\/assets\/ridgewood-wordmark-primary-light-[\w-]+\.png$/);
    assert.ok(await page.getByRole('button', { name: 'Sign in', exact: true }).isVisible());
    assert.ok(await page.evaluate(() => globalThis.document.documentElement.scrollWidth <= globalThis.innerWidth), 'Portal viewport overflows horizontally');

    assert.deepEqual(errors, [], 'Deployed page has asset or runtime errors');
    await page.close();
  }
  console.log(`Verified public home + portal at ${expectedSha}: desktop/mobile approved wordmark, new story navigation and route boundary. Human visual acceptance remains NOT RUN.`);
} finally {
  await browser.close();
}
