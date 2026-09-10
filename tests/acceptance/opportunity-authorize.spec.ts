import { test, expect, type Page } from '@playwright/test';
import { execFileSync } from 'node:child_process';

const name = 'Human acceptance rehearsal';
test.afterEach(async ({ page }, testInfo) => {
  if (testInfo.status !== testInfo.expectedStatus) {
    // This suite uses only disposable synthetic identities/content, never hosted data.
    console.log('Synthetic acceptance failure state:\n' + await page.locator('body').ariaSnapshot());
  }
});
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
  let releaseOrganizations!: () => void;
  const organizationsGate = new Promise<void>(resolve => { releaseOrganizations = resolve; });
  await page.route('**/rest/v1/organizations?*', async route => {
    // Delay the real initial request; never fabricate its response.
    await organizationsGate;
    await route.continue();
  });
  let acceptDialogs = true;
  page.on('dialog', dialog => void (acceptDialogs ? dialog.accept() : dialog.dismiss()));
  await page.goto('/');
  await page.getByLabel('Email', { exact: true }).fill('edward-demo@example.invalid');
  await page.getByLabel('Password', { exact: true }).fill('Synthetic-local-only-2026!');
  await page.getByRole('button', { name: 'Sign in', exact: true }).click();
  const newOpportunity = page.getByRole('button', { name: 'New opportunity', exact: true });
  await expect(newOpportunity).toBeVisible();
  await expect(newOpportunity).toBeDisabled();
  await expect(page.getByRole('status')).toHaveText('Loading Business workspace…');
  releaseOrganizations();
  await newOpportunity.click();
  const intake = page.getByRole('dialog', { name: 'New opportunity', exact: true });
  await expect(intake).toHaveClass(/workspace-drawer/);
  await intake.getByLabel(/Project name/).fill(name);
  await intake.getByLabel('Site / location').fill('Synthetic site — not a real project');
  await intake.getByLabel('Summary / opportunity thesis').fill('Browser acceptance fixture');
  await intake.getByRole('button', { name: 'Create Project State' }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Advance to qualification' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^1.5 Attention/ })).toHaveAccessibleName('1.5 Attention — No attention needed');
  await page.getByRole('button', { name: /^1.1 Actions/ }).click();
  const actions = page.getByRole('dialog');
  await actions.getByLabel(/New action/).fill('Review synthetic opportunity');
  await expect(actions).toHaveClass(/workspace-drawer/);
  acceptDialogs = false;
  await page.keyboard.press('Escape');
  await expect(actions).toBeVisible();
  await expect(actions.getByLabel(/New action/)).toHaveValue('Review synthetic opportunity');
  acceptDialogs = true;
  await actions.getByRole('button', { name: 'Add action', exact: true }).click();
  await expect(actions.getByText('Review synthetic opportunity', { exact: true })).toBeVisible();
  const actionStatus = actions.getByLabel('Status for Review synthetic opportunity');
  await actionStatus.selectOption('done');
  await expect(actionStatus).toHaveValue('done');
  await expect(actions.getByRole('button', { name: /^Close / })).toBeEnabled();
  await actions.getByRole('button', { name: /^Close / }).click();
  const nextStep = page.locator('.guided-checklist article').filter({ has: page.getByText('Next step identified', { exact: true }) });
  await expect(nextStep).toContainText('satisfied');
  await expect(page.getByRole('button', { name: 'Advance to qualification' })).toBeEnabled();
  // No reload: cancelling the only action removes readiness, restoring it returns readiness.
  await page.getByRole('button', { name: /^1.1 Actions/ }).click();
  await actionStatus.selectOption('cancelled');
  await expect(actions.getByRole('button', { name: /^Close / })).toBeEnabled();
  await actions.getByRole('button', { name: /^Close / }).click();
  await expect(nextStep).toContainText('not started');
  await expect(page.getByRole('button', { name: 'Advance to qualification' })).toBeDisabled();
  await page.getByRole('button', { name: /^1.1 Actions/ }).click();
  await actionStatus.selectOption('done');
  await expect(actions.getByRole('button', { name: /^Close / })).toBeEnabled();
  await actions.getByRole('button', { name: /^Close / }).click();
  await expect(page.getByRole('button', { name: 'Advance to qualification' })).toBeEnabled();
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /^1.2 Risks/ }).click();
  const risks = page.getByRole('dialog');
  await expect(risks).toHaveClass(/workspace-drawer/);
  await expect(risks).toHaveCSS('width', '374px');
  await risks.getByLabel(/Title/).fill('Synthetic risk');
  await risks.getByRole('button', { name: 'Add risk / issue', exact: true }).click();
  await expect(risks.getByText('Synthetic risk', { exact: true })).toBeVisible();
  await risks.getByLabel('Status for Synthetic risk').selectOption('done');
  await expect(risks.getByRole('button', { name: /^Close / })).toBeEnabled();
  await risks.getByRole('button', { name: /^Close / }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: 'Advance to qualification' }).click();
  await page.getByRole('button', { name: /^Qualification Review/ }).click();
  await expect(page.getByRole('dialog')).toHaveClass(/workspace-drawer/);
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
    await expect(form).toHaveClass(/workspace-drawer/);
    await expect(form.locator('form.structured-form')).toBeVisible();
    for (const field of await form.locator('form.structured-form textarea').all()) await field.fill('Synthetic reviewed basis');
    await form.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(form.getByText('Saved', { exact: true })).toBeVisible();
    await expect(form).toBeVisible();
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
  await page.getByRole('dialog').getByRole('button', { name: /^Close / }).click();
  await page.getByRole('button', { name: 'Archive project', exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Archived projects', exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.getByRole('button', { name: 'View Pre-Authorization / Authorization Record' }).click();
  await expect(page.getByRole('heading', { name: 'Frozen authorization record' })).toBeVisible();
  await expect(page.getByText('Synthetic executive acceptance', { exact: true })).toBeVisible();
  execFileSync('python', ['scripts/local-acceptance-fixtures.py', 'verify-result']);
});
