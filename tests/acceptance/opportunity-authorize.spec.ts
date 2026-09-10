import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const name = 'Human acceptance rehearsal';
async function reopen(page: Page) {
  await page.reload();
  await page.getByRole('button', { name: new RegExp(name) }).click();
}

test('real authenticated Opportunity to Authorize, revocation and lost response recovery', async ({ page }) => {
  // Requests must remain local. No hosted data or mocked success responses.
  await page.route('**/*', route => {
    const url = new URL(route.request().url());
    return url.hostname === '127.0.0.1' ? route.continue() : route.abort();
  });
  page.on('dialog', dialog => void dialog.accept());
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill('edward-demo@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-local-only-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  await page.getByRole('button', { name: 'New opportunity', exact: true }).click();
  const intake = page.getByRole('dialog', { name: 'New opportunity', exact: true });
  await intake.getByLabel(/Project name/).fill(name);
  await intake.getByLabel('Site / location').fill('Synthetic site — not a real project');
  await intake.getByLabel('Summary / opportunity thesis').fill('Browser acceptance fixture');
  await intake.getByRole('button', { name: 'Create Project State' }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Advance to qualification' })).toBeDisabled();
  await page.getByRole('button', { name: /^1.1 Actions/ }).click();
  const actions = page.getByRole('dialog');
  await actions.getByLabel(/New action/).fill('Review synthetic opportunity');
  await actions.getByRole('button', { name: 'Add action', exact: true }).click();
  await expect(actions.getByText('Review synthetic opportunity', { exact: true })).toBeVisible();
  await actions.getByRole('button', { name: /^Close / }).click();
  await reopen(page);
  await page.getByRole('button', { name: 'Advance to qualification' }).click();
  await page.getByRole('button', { name: /^Qualification Review/ }).click();
  // Select by each assessment group's stable accessible label.
  for (const label of ['2.1 Opportunity Credibility assessment','2.2 Strategic Role & Fit assessment','2.3 Relationship & Authority assessment','2.4 Commercial Plausibility assessment','2.5 Execution & Risk Plausibility assessment']) {
    const group = page.getByRole('group', { name: label, exact: true });
    await group.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(group.getByRole('button', { name: /Yes/ })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: 'Continue to Predevelopment' }).click();
  await page.getByRole('button', { name: /^3.1 Development & Site/ }).click();
  let form = page.getByRole('dialog');
  await form.getByRole('button', { name: 'Owned', exact: true }).click();
  await form.getByRole('button', { name: 'Conforming / permitted', exact: true }).click();
  await form.getByRole('group', { name: 'Approvals', exact: true }).getByRole('button', { name: 'Not assessed', exact: true }).click();
  await form.getByRole('button', { name: 'Suitable', exact: true }).click();
  await form.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(form.getByText('Draft saved.', { exact: true })).toBeVisible();
  await form.getByRole('button', { name: 'Close form', exact: true }).click();
  await reopen(page);
  await page.getByRole('button', { name: /^3.1 Development & Site/ }).click();
  form = page.getByRole('dialog');
  await expect(form.getByRole('button', { name: /Owned/ })).toHaveAttribute('aria-pressed', 'true');
  await form.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(form.getByRole('article', { name: 'Published document revision 1' })).toBeVisible();
  await form.getByRole('button', { name: 'Close form', exact: true }).click();
  for (const domain of ['3.2 Product & Program','3.3 Design & Consultants','3.4 Commercial & Feasibility','3.5 Schedule & Phasing','3.6 Risk, Decision & Evidence','3.7 Delivery Strategy']) {
    await page.getByRole('button', { name: new RegExp('^'+domain) }).click();
    form = page.getByRole('dialog');
    await expect(form.locator('form.structured-form')).toBeVisible();
    for (const field of await form.locator('form.structured-form textarea').all()) await field.fill('Synthetic reviewed basis');
    await form.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(form.getByText('Published', { exact: true })).toBeVisible();
    await form.getByRole('button', { name: /^Close / }).click();
  }
  await page.getByRole('button', { name: 'Enter authorization', exact: true }).click();
  await page.getByRole('button', { name: 'Authorize Project', exact: true }).click();
  await page.getByLabel('Authority basis', { exact: true }).fill('Synthetic executive acceptance');
  execFileSync('python', ['scripts/local-acceptance-fixtures.py', 'deny-authorization']);
  await page.getByRole('button', { name: 'Confirm Authorization', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(/missing_project_authorize_permission/)).toBeVisible();
  execFileSync('python', ['scripts/local-acceptance-fixtures.py', 'allow-authorization']);
  // Commit the real authorization, then lose only its response. Recovery must
  // read persisted state; it must not invent success or issue another command.
  await page.route('**/functions/v1/project-authorization', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const response = await route.fetch();
    expect(response.ok()).toBeTruthy();
    await route.abort('failed');
  });
  await page.getByRole('button', { name: 'Confirm Authorization', exact: true }).click();
  await expect(page.getByRole('dialog').getByText(/Project Authorization failed/)).toBeVisible();
  await page.reload();
  await page.getByRole('button', { name: 'Projects', exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View Pre-Authorization / Authorization Record' }).click();
  await expect(page.getByRole('heading', { name: 'Frozen authorization record' })).toBeVisible();
  await expect(page.getByText('Synthetic executive acceptance', { exact: true })).toBeVisible();
  execFileSync('python', ['scripts/local-acceptance-fixtures.py', 'verify-result']);
});
