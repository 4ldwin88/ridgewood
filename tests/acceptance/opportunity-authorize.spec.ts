import { test, expect, type Page } from '@playwright/test';
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

const name = 'QA rehearsal · v0.25';
async function capture(page:Page, key:string){
 await expect(page.getByText(/(^Loading|record loading)/)).toHaveCount(0);
 await expect(page.locator('.workspace-drawer[aria-busy="true"]')).toHaveCount(0);
 for(const [device,width,height] of [['desktop',1440,1000],['mobile',390,844]] as const){
  await page.setViewportSize({width,height});
  await page.evaluate(()=>window.scrollTo(0,0));
  const close=page.locator('.workspace-drawer__header button').filter({hasText:'Close'});
  if(await close.count()) { const box=await close.boundingBox(); expect(box).not.toBeNull(); expect(box!.x+box!.width).toBeLessThanOrEqual(width); expect(box!.y).toBeGreaterThanOrEqual(0); }
  await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth)).toBeTruthy();
  const body=page.locator('.workspace-drawer__body');
  if(await body.count()) await body.evaluate(el=>{el.scrollTop=0});
  await page.evaluate(()=>new Promise<void>(resolve=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve()))));
  await page.screenshot({path:`test-results/visual/${key}-${device}.png`,fullPage:false,animations:'disabled'});
  if(await close.count()) {
   await expect(close).toBeInViewport({ratio:1});
   const geometry=await page.locator('.workspace-drawer__header').evaluate(el=>({header:el.getBoundingClientRect().toJSON(),scrollTop:el.scrollTop,parentScroll:el.parentElement?.scrollTop,children:[...el.querySelectorAll('p,h2,button')].map(c=>({text:c.textContent,rect:c.getBoundingClientRect().toJSON(),visibility:getComputedStyle(c).visibility,opacity:getComputedStyle(c).opacity,display:getComputedStyle(c).display}))}));
   mkdirSync('test-results/geometry',{recursive:true});writeFileSync(`test-results/geometry/${key}-${device}.json`,JSON.stringify(geometry));
  }
  if(await body.count()){
   const extent=await body.evaluate(el=>el.scrollHeight-el.clientHeight);
   if(extent>200){
    for(const [part,fraction] of [['middle',.5],['bottom',1]] as const){
     await body.evaluate((el,f)=>{el.scrollTop=(el.scrollHeight-el.clientHeight)*f},fraction);
     await page.screenshot({path:`test-results/visual/${key}-${device}-${part}.png`});
    }
   }
  }
 }
 await page.setViewportSize({width:1280,height:900});
}

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
  await expect(page.getByRole('status').filter({hasText:'Loading Business workspace'})).toHaveText('Loading Business workspace…');
  releaseOrganizations();
  await capture(page, '01-pipeline');
  await newOpportunity.click();
  const intake = page.getByRole('dialog', { name: 'New opportunity', exact: true });
  await expect(intake).toHaveClass(/workspace-drawer/);
  await intake.getByLabel(/Project name/).fill(name);
  await intake.getByLabel('Site / location').fill('Synthetic site — not a real project');
  await intake.getByLabel('Summary / opportunity thesis').fill('Browser acceptance fixture');
  await capture(page,'02-opportunity-intake');
  await intake.getByRole('button', { name: 'Create Project State' }).click();
  await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Advance to qualification' })).toBeDisabled();
  await expect(page.getByRole('button', { name: /^1.5 Attention/ })).toHaveAccessibleName('1.5 Attention — No attention needed');
  await page.getByLabel(`Upload photo for ${name}`).setInputFiles('assets/ridgewood-wordmark-primary-light.png');
  await expect(page.getByAltText(`${name} project photo`)).toBeVisible();
  await page.reload();
  await page.getByRole('button',{name,exact:true}).click();
  await expect(page.getByAltText(`${name} project photo`)).toBeVisible();
  await page.getByRole('button',{name:'Open profile menu'}).click();
  await page.getByRole('button',{name:'Switch to dark mode'}).click();
  await page.getByRole('button',{name:'Close profile menu'}).click();
  await expect(page.locator('.app-frame')).toHaveAttribute('data-theme','dark');
  await capture(page,'03-opportunity-dark');
  await page.getByRole('button',{name:'Open profile menu'}).click();
  await page.getByRole('button',{name:'Switch to light mode'}).click();
  await page.getByRole('button',{name:'Close profile menu'}).click();
  await capture(page,'03-opportunity');
  await page.getByRole('button', { name: /^1.1 Actions/ }).click();
  const actions = page.getByRole('dialog');
  await expect(actions.getByLabel('Custom action')).toHaveCount(0);
  await actions.getByRole('button',{name:'Add action',exact:true}).click();
  await actions.getByRole('combobox',{name:'Action',exact:true}).selectOption('__custom');
  await actions.getByLabel('Custom action').fill('Review synthetic opportunity');
  await expect(actions).toHaveClass(/workspace-drawer/);
  acceptDialogs = false;
  await page.keyboard.press('Escape');
  await expect(actions).toBeVisible();
  await expect(actions.getByLabel('Custom action')).toHaveValue('Review synthetic opportunity');
  acceptDialogs = true;
  await capture(page,'04-actions');
  await actions.getByRole('button', { name: 'Save action', exact: true }).click();
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
  await expect(risks.getByLabel(/Title/)).toHaveCount(0);
  await risks.getByRole('button',{name:'Add Risk/Issue',exact:true}).click();
  await risks.getByLabel(/Title/).fill('Synthetic risk');
  await capture(page,'05-risks');
  await risks.getByRole('button', { name: 'Save risk / issue', exact: true }).click();
  await expect(risks.getByText('Synthetic risk', { exact: true })).toBeVisible();
  await risks.getByLabel('Status for Synthetic risk').selectOption('done');
  await expect(risks.getByRole('button', { name: /^Close / })).toBeEnabled();
  await risks.getByRole('button', { name: /^Close / }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button',{name:'Edit Opportunity',exact:true}).click();
  const basics=page.getByRole('dialog');
  await basics.getByLabel('Summary / opportunity thesis').fill('Revised synthetic opportunity basis');
  await basics.getByRole('button',{name:'Save',exact:true}).click();
  await expect(page.getByText('Opportunity saved.',{exact:true})).toBeVisible();
  await expect(basics).not.toBeVisible();
  await capture(page,'05b-saved-opportunity');
  await expect(basics).not.toBeVisible();
  for(const [tool,key] of [[/^1.3 Decisions/,'decisions'],[/^1.4 Evidence/,'evidence'],[/^1.5 Attention/,'attention']] as const){
   await page.getByRole('button',{name:tool}).click();
   await capture(page,`05c-${key}`);
   await page.getByRole('dialog').getByRole('button',{name:/^Close /}).click();
  }
  await page.getByRole('button', { name: 'Advance to qualification' }).click();
  await page.getByRole('button', { name: /^Qualification Review/ }).click();
  await expect(page.getByRole('dialog')).toHaveClass(/workspace-drawer/);
  // Select by each assessment group's stable accessible label.
  for (const label of ['2.1 Opportunity Credibility assessment','2.2 Strategic Role & Fit assessment','2.3 Relationship & Authority assessment','2.4 Commercial Plausibility assessment','2.5 Execution & Risk Plausibility assessment']) {
    const group = page.getByRole('group', { name: label, exact: true });
    await group.getByRole('button', { name: 'Yes', exact: true }).click();
    await expect(group.getByRole('button', { name: /Yes/ })).toHaveAttribute('aria-pressed', 'true');
  }
  await capture(page,'06-qualification');
  await page.getByRole('button', { name: 'Continue to Predevelopment' }).click();
  await expect(page.getByRole('dialog')).toHaveCount(0);
  await expect(page.getByRole('button',{name:/^3.1 Development & Site/})).toBeVisible();
  await capture(page,'07-predevelopment');
  await page.getByRole('button', { name: /^3.1 Development & Site/ }).click();
  let form = page.getByRole('dialog');
  await form.getByRole('button', { name: 'Owned', exact: true }).click();
  await form.getByRole('button', { name: 'Conforming / permitted', exact: true }).click();
  await form.getByRole('group', { name: 'Approvals (Required)', exact: true }).getByRole('button', { name: 'Not assessed', exact: true }).click();
  await expect(form.getByRole('group',{name:'Overall development readiness (Optional)'}).getByRole('button',{pressed:true})).toHaveCount(0);
  await form.getByRole('button', { name: 'Manageable constraints', exact: true }).click();
  await form.getByPlaceholder('Describe access limitations and how they will be managed').fill('Synthetic narrow access; scheduled deliveries.');
  await capture(page,'08-site-draft');
  await form.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(form).not.toBeVisible();
  await reopen(page);
  await page.getByRole('button', { name: /^3.1 Development & Site/ }).click();
  form = page.getByRole('dialog');
  await expect(form.getByRole('button', { name: /Owned/ })).toHaveAttribute('aria-pressed', 'true');
  await form.getByRole('button', { name: 'Publish', exact: true }).click();
  await expect(form).not.toBeVisible();
  await page.getByRole('button', { name: /^3.1 Development & Site/ }).click();
  form = page.getByRole('dialog');
  await expect(form.getByRole('article', { name: 'Published document revision 1' })).toBeVisible();
  await capture(page,'09-site-published');
  await form.getByRole('button', { name: 'Close form', exact: true }).click();
  for (const domain of ['3.2 Product & Program','3.3 Design & Consultants','3.4 Commercial & Feasibility','3.5 Schedule & Phasing','3.6 Risk, Decision & Evidence','3.7 Delivery Strategy']) {
    await page.getByRole('button', { name: new RegExp('^'+domain) }).click();
    form = page.getByRole('dialog');
    await expect(form).toHaveClass(/workspace-drawer/);
    await expect(form.locator('form.structured-form')).toBeVisible();
    for(const preset of await form.locator('.preset-options').all()) await preset.getByRole('button').first().click();
    for (const field of await form.locator('form.structured-form textarea').all()) await field.fill('Synthetic reviewed basis');
    await capture(page,`domain-${domain.slice(0,3)}`);
    await form.getByRole('button', { name: 'Save draft', exact: true }).click();
    await expect(form).not.toBeVisible();
    await page.getByRole('button', { name: new RegExp('^'+domain) }).click();
    form = page.getByRole('dialog');
    await form.getByRole('button', { name: 'Publish', exact: true }).click();
    await expect(form).not.toBeVisible();
  }
  await page.getByRole('button', { name: 'Enter authorization', exact: true }).click();
  await expect(page.getByText('Authorization package',{exact:true})).toBeVisible();
  await capture(page,'10-authorization');
  await page.getByRole('button', { name: 'Authorize Project', exact: true }).click();
  await capture(page,'11-confirmation');
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
  await capture(page,'12-projects');
  await expect(page.getByRole('button', { name: 'View Pre-Authorization / Authorization Record' })).toHaveCount(0);
  await page.getByRole('button', { name, exact: true }).click();
  await page.getByRole('button', { name: 'View Pre-Authorization / Authorization Record' }).click();
  await expect(page.getByRole('heading', { name: 'Frozen authorization record' })).toBeVisible();
  await expect(page.getByText('Synthetic executive acceptance', { exact: true })).toBeVisible();
  await capture(page,'13-frozen-record');
  execFileSync('python', ['scripts/local-acceptance-fixtures.py', 'verify-result']);
  await page.getByRole('dialog').getByRole('button', { name: /^Close / }).click();
  execFileSync('python', ['scripts/local-acceptance-fixtures.py', 'setup-gate-authority']);
  await page.getByRole('button', { name: 'Project Authorization & Setup', exact: true }).click();
  const setup = page.getByRole('dialog', { name: 'Project Authorization & Setup' });
  await expect(setup.getByText(/Saved version 0/)).toBeVisible();
  await setup.locator('summary').first().click();
  await setup.getByLabel(/Reviewed basis and responsibilities/).first().fill('Synthetic legal client; approved delivery name retained');
  await setup.getByLabel(/Controlling document/).first().fill('fixture:reviewed-contract');
  await setup.getByLabel(/Accountable person/).first().selectOption({ index: 1 });
  await setup.getByLabel(/Assessment/).first().selectOption('satisfied');
  let loseSetupResponse = true;
  await page.route('**/rest/v1/rpc/save_project_setup', async route => {
    if (route.request().method() !== 'POST' || !loseSetupResponse) return route.continue();
    loseSetupResponse = false;
    const response = await route.fetch();
    expect(response.ok()).toBeTruthy();
    await route.abort('failed');
  });
  await setup.getByRole('button', { name: 'Save Setup', exact: true }).click();
  await expect(setup.getByRole('alert')).toBeVisible();
  await setup.getByRole('button', { name: 'Retry save', exact: true }).click();
  await expect(setup.locator('.setup-workspace > [role="status"]')).toContainText('Saved version 1');
  await expect(setup.getByText(/^Version 1 ·/)).toHaveCount(1);
  await page.setViewportSize({ width: 390, height: 844 });
  await capture(page,'setup-mobile-saved');
  await setup.getByRole('button', { name: 'Close Project Authorization & Setup', exact: true }).click();
  await page.getByRole('button', { name: 'Project Authorization & Setup', exact: true }).click();
  await setup.locator('summary').first().click();
  await expect(setup.getByLabel(/Reviewed basis and responsibilities/).first()).toHaveValue('Synthetic legal client; approved delivery name retained');
  await expect(setup.locator('.setup-workspace > [role="status"]')).toContainText('11 unresolved requirements');
  for (const section of await setup.locator('details.setup-section').all()) {
    if ((await section.getAttribute('open')) === null) await section.locator('summary').click();
    await section.getByLabel(/Reviewed basis and responsibilities/).fill('Synthetic reviewed setup basis and role coverage');
    await section.getByLabel(/Controlling document/).fill('fixture:approved-setup-basis');
    await section.getByLabel(/Accountable person/).selectOption({ index: 1 });
    await section.getByLabel(/Assessment/).selectOption('satisfied');
  }
  for (const role of ['project lead', 'coordination document control', 'commercial finance', 'oversight']) await setup.getByLabel(new RegExp(role+' Required coverage')).selectOption({ index: 1 });
  await setup.getByLabel('Field leadership applicability', { exact: true }).selectOption('not_applicable');
  await setup.getByLabel('Field leadership applicability reason', { exact: true }).fill('No field activity in this synthetic Setup');
  await setup.getByRole('button', { name: 'Save Setup', exact: true }).click();
  await expect(setup.locator('.setup-workspace > [role="status"]')).toContainText('Saved version 2');
  await setup.getByLabel('Approval authority').selectOption({ index: 1 });
  await setup.getByLabel('Decision reason').fill('Synthetic hold pending coordination');
  await setup.getByRole('button', { name: 'Record Gate 01 decision', exact: true }).click();
  await expect(setup.getByText('Synthetic hold pending coordination', { exact: true })).toBeVisible();
  await setup.getByLabel('Disposition', { exact: true }).selectOption('go');
  await setup.getByLabel('Decision reason').fill('Synthetic approved Setup gate review');
  let loseGateResponse = true;
  await page.route('**/rest/v1/rpc/decide_project_gate01', async route => {
    if (route.request().method() !== 'POST' || !loseGateResponse) return route.continue();
    loseGateResponse = false;
    const response = await route.fetch(); expect(response.ok()).toBeTruthy();
    await route.abort('failed');
  });
  await setup.getByRole('button', { name: 'Record Gate 01 decision', exact: true }).click();
  await expect(setup.getByRole('alert')).toBeVisible();
  await setup.getByRole('button', { name: 'Retry decision', exact: true }).click();
  await expect(setup.locator('.setup-workspace > [role="status"]')).toContainText('preconstruction mobilization');
  await capture(page,'setup-gate01-advanced');
  execFileSync('python', ['scripts/local-acceptance-fixtures.py', 'verify-gate']);

  await setup.getByRole('button', { name: 'Close Project Authorization & Setup', exact: true }).click();
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.getByRole('button', { name: '← Projects', exact: true }).click();
  await page.getByLabel(`Manage ${name}`, { exact: true }).click();
  await page.getByRole('button', { name: 'Archive project', exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toHaveCount(0);
  await page.getByRole('button', { name: 'Archived projects', exact: true }).click();
  await expect(page.getByText(name, { exact: true })).toBeVisible();
  await page.getByRole('button', { name, exact: true }).click();
  await expect(page.getByRole('button', { name: 'View Pre-Authorization / Authorization Record' })).toBeVisible();
  await capture(page,'14-archived');
  await page.getByRole('button', { name: 'View Pre-Authorization / Authorization Record' }).click();
  await expect(page.getByRole('heading', { name: 'Frozen authorization record' })).toBeVisible();
  await expect(page.getByText('Synthetic executive acceptance', { exact: true })).toBeVisible();
  execFileSync('python', ['scripts/local-acceptance-fixtures.py', 'verify-gate']);
});
