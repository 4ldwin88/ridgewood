import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test('obligation planning persists shared identities without implying clearance', async ({ page }) => {
  execFileSync('python', ['scripts/local-acceptance-fixtures.py', 'obligation-setup']);
  await page.goto('/?portal=1');
  await page.getByLabel('Email').fill('edward-demo@example.invalid');
  await page.getByLabel('Password').fill('Synthetic-local-only-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await page.getByRole('button', { name: 'Obligation planning rehearsal', exact: true }).click();
  await page.getByRole('button', { name: 'Project Authorization & Setup', exact: true }).click();
  const open = () => page.getByRole('button', { name: '5.4 Permits & Responsibilities', exact: true }).click();
  await open();
  const drawer = page.getByRole('dialog', { name: '5.4 Permits & Responsibilities', exact: true });
  await drawer.getByRole('button', { name: 'Add obligation', exact: true }).click();
  page.once('dialog', dialog => dialog.dismiss());
  await page.keyboard.press('Escape');
  await expect(drawer).toBeVisible();
  await drawer.getByRole('button', { name: 'Save obligation plan', exact: true }).click();
  await expect(drawer.getByRole('status', { name: 'Obligation save status' })).toContainText('Saved obligation plan version 1');
  await expect(drawer.getByRole('complementary', { name: 'Obligation planning gaps' })).toContainText('accountable person');
  await drawer.getByLabel(/Requirement Required/).fill('Obtain building permit before excavation');
  await drawer.getByLabel(/Type Required/).selectOption('permit');
  await drawer.getByLabel(/Governing source Required/).selectOption({ label: 'Synthetic permit requirement · revision 1' });
  await drawer.getByLabel(/Accountable person Required/).selectOption({ label: 'edward-demo@example.invalid' });
  await drawer.getByLabel(/Due trigger/).fill('Before excavation');
  let lost = false;
  await page.route('**/rest/v1/rpc/save_project_obligation_plan', async route => {
    if (!lost) { lost = true; await route.fetch(); await route.abort('failed'); }
    else await route.continue();
  });
  await drawer.getByRole('button', { name: 'Save obligation plan', exact: true }).click();
  await expect(drawer.getByRole('alert')).toContainText('Retry preserves the exact request');
  await expect(drawer.getByLabel(/Requirement Required/)).toBeDisabled();
  await drawer.getByRole('button', { name: 'Retry obligation save', exact: true }).click();
  await expect(drawer.getByRole('status', { name: 'Obligation save status' })).toContainText('Saved obligation plan version 2');
  await page.keyboard.press('Escape'); await open();
  await expect(drawer.getByLabel(/Requirement Required/)).toHaveValue('Obtain building permit before excavation');
  await expect(drawer.getByRole('complementary', { name: 'Obligation planning gaps' })).toContainText('Applicability, issuance and satisfaction remain unverified');
  await expect(drawer.getByRole('button', { name: 'Discard unsaved obligation' })).toHaveCount(0);
  for (const width of [390, 1280]) {
    await page.setViewportSize({ width, height: 844 });
    await drawer.getByRole('heading', { name: 'Obligation 1', exact: true }).scrollIntoViewIfNeeded();
    expect(await drawer.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true);
    await page.screenshot({ path: `test-results/obligation-plan-${width}.png` });
  }
  await drawer.getByText(/Plan version 2 ·/).click();
  await expect(drawer.getByText('Obtain building permit before excavation', { exact: true }).last()).toBeVisible();
  execFileSync('python', ['scripts/local-acceptance-fixtures.py', 'obligation-verify']);
});
