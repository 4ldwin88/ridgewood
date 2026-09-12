import { test, expect } from '@playwright/test';
for (const width of [390, 1280]) {
  test(`authorized basis preserves frozen contents in a drawer at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/tests/fixtures/app/index.html');
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    await page.getByRole('button', { name: 'Cedar House · Synthetic', exact: true }).click();
    await page.getByRole('button', { name: '5.1 Authorized Basis', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: '5.1 Authorized Basis' });
    await expect(drawer.getByRole('heading', { name: '5.1.1 Frozen mandate' })).toBeVisible();
    await expect(drawer.getByText('Consultant coordination only; no trade commitments', { exact: true })).toBeVisible();
    await expect(drawer.getByRole('textbox')).toHaveCount(0);
    await drawer.locator('summary').filter({ hasText: 'Authorized scope' }).click();
    await expect(drawer.getByText('Frozen scope at authorization', { exact: true })).toBeVisible();
    await expect(drawer.getByText('Project at publication: Cedar House at authorization')).toBeVisible();
    await drawer.getByRole('button', { name: 'Zoom in', exact: true }).click();
    await expect(drawer.getByText('125%', { exact: true })).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveCount(0);
    await expect(page.getByRole('button', { name: '5.1 Authorized Basis', exact: true })).toBeFocused();
  });
}
for (const mode of ['missing', 'error', 'partial']) {
  test(`authorized basis exposes ${mode} evidence without false readiness`, async ({ page }) => {
    await page.goto(`/tests/fixtures/app/index.html?basis=${mode}`);
    await page.getByRole('button', { name: 'Projects', exact: true }).click();
    await page.getByRole('button', { name: 'Cedar House · Synthetic', exact: true }).click();
    await page.getByRole('button', { name: '5.1 Authorized Basis', exact: true }).click();
    const drawer = page.getByRole('dialog', { name: '5.1 Authorized Basis' });
    if (mode === 'partial') {
      await drawer.locator('summary').filter({ hasText: 'Authorized scope' }).click();
      await expect(drawer.getByRole('button', { name: 'Print / Save as PDF' })).toBeDisabled();
      await expect(drawer.getByRole('alert')).toContainText('frozen publication snapshot is unavailable');
    } else {
      await expect(drawer.getByRole('alert')).toContainText(mode === 'missing' ? 'No frozen authorization record' : 'Synthetic basis read failure');
      await expect(drawer.getByText('Loading authorized basis…')).toHaveCount(0);
    }
  });
}
