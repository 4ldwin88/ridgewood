import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test('contract preparation survives lost response and reopens from the real backend', async ({page})=>{
 execFileSync('python',['scripts/local-acceptance-fixtures.py','contract-setup']);
 await page.goto('/?portal=1');
 await page.getByLabel('Email').fill('edward-demo@example.invalid');
 await page.getByLabel('Password').fill('Synthetic-local-only-2026!');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'Projects',exact:true}).click();
 await page.getByRole('button',{name:'Contract preparation rehearsal',exact:true}).click();
 await page.getByRole('button',{name:'Project Authorization & Setup',exact:true}).click();
 await page.getByRole('button',{name:'5.2 Contract & Commercial Review',exact:true}).click();
 const drawer=page.getByRole('dialog',{name:'5.2 Contract & Commercial Review',exact:true});
 await drawer.getByLabel('Synthetic legal client').check();
 await drawer.getByLabel(/Supporting agreement evidence/).selectOption({label:'Synthetic contract evidence'});
 await drawer.getByLabel(/Contractual risk assessment/).selectOption('none_identified');
 await drawer.getByLabel(/Compensation model/).selectOption('fee');
 await drawer.getByLabel(/Fee basis/).fill('Monthly management fee');
 await drawer.getByLabel(/Payment terms/).fill('Monthly invoice under agreement clause 8');
 await drawer.getByLabel(/Effective from/).fill('2026-09-12');
 await drawer.getByLabel(/Effective until/).fill('2026-09-11');
 await drawer.getByRole('button',{name:'Save contract preparation',exact:true}).click();
 await expect(drawer.getByRole('alert')).toContainText('expiry date must not precede');
 await expect(drawer.getByLabel(/Effective until/)).toBeEnabled();
 await drawer.getByLabel(/Effective until/).fill('2026-12-31');
 let lost=false;
 await page.route('**/rest/v1/rpc/save_project_contract',async route=>{if(!lost){lost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await drawer.getByRole('button',{name:'Save contract preparation',exact:true}).click();
 await expect(drawer.getByRole('alert')).toContainText('Your entries remain here');
 await drawer.getByRole('button',{name:'Retry save',exact:true}).click();
 await expect(drawer.getByRole('status',{name:'Contract save status'})).toContainText('Saved preparation version 1');
 await expect(drawer.getByRole('status',{name:'Contract save status'})).toContainText('No approval granted');
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'5.2 Contract & Commercial Review',exact:true}).click();
 await expect(drawer.getByLabel(/Fee basis/)).toHaveValue('Monthly management fee');
 await expect(drawer.getByLabel('Synthetic legal client')).toBeChecked();
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  await expect(drawer.getByLabel('Synthetic legal client')).toHaveCSS('width','20px');
  await expect(drawer.getByRole('button',{name:'Close 5.2 Contract & Commercial Review',exact:true})).toBeInViewport();
  await page.screenshot({path:`test-results/contract-preparation-${width}.png`});
 }
 execFileSync('python',['scripts/local-acceptance-fixtures.py','contract-verify']);
 let requestLost=false;
 await page.route('**/rest/v1/rpc/request_project_contract_review',async route=>{if(!requestLost){requestLost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await drawer.getByRole('button',{name:'Request authorized review',exact:true}).click();
 await expect(drawer.getByRole('alert')).toContainText('Retry uses the same request');
 await expect(drawer.getByLabel(/Fee basis/)).toBeDisabled();
 await drawer.getByRole('button',{name:'Retry review request',exact:true}).click();
 await expect(drawer.getByRole('status',{name:'Contract save status'})).toContainText('Review requested for version 1. No approval granted.');
 await expect(drawer.getByRole('button',{name:'Request authorized review',exact:true})).toBeDisabled();
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'5.2 Contract & Commercial Review',exact:true}).click();
 await expect(drawer.getByRole('list',{name:'Contract review requests'})).toContainText('Pending authorized review');
 await drawer.getByLabel(/Fee basis/).fill('Updated monthly management fee');
 await expect(drawer.getByRole('button',{name:'Request authorized review',exact:true})).toBeDisabled();
 await drawer.getByRole('button',{name:'Save contract preparation',exact:true}).click();
 await expect(drawer.getByRole('list',{name:'Contract review requests'})).toContainText('Superseded by a newer preparation');
 await expect(drawer.getByRole('button',{name:'Request authorized review',exact:true})).toBeEnabled();
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  await drawer.getByRole('heading',{name:'5.2.2 Request authorized review',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/contract-review-request-${width}.png`});
 }
 execFileSync('python',['scripts/local-acceptance-fixtures.py','contract-review-verify']);
 await expect(drawer.getByText(/No confirmed owner authority and review permission/)).toBeVisible();
 await drawer.getByRole('button',{name:'Request authorized review',exact:true}).click();
 await expect(drawer.getByRole('status',{name:'Contract save status'})).toContainText('Review requested for version 2');
 execFileSync('python',['scripts/local-acceptance-fixtures.py','contract-owner-setup']);
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'5.2 Contract & Commercial Review',exact:true}).click();
 await expect(drawer.getByText(/Recent strong verification is required/)).toBeVisible();
 await expect(drawer.getByRole('button',{name:'Record contract decision',exact:true})).toBeDisabled();
 const session=JSON.parse(execFileSync('node',['scripts/local-review-session.mjs'],{encoding:'utf8'}));
 await page.evaluate(session=>{
  const key=Object.keys(localStorage).find(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'));
  if(!key)throw new Error('Synthetic session storage missing');
  localStorage.setItem(key,JSON.stringify(session));
 },session);
 await page.reload();
 await page.getByRole('button',{name:'Projects',exact:true}).click();
 await page.getByRole('button',{name:'Contract preparation rehearsal',exact:true}).click();
 await page.getByRole('button',{name:'Project Authorization & Setup',exact:true}).click();
 await page.getByRole('button',{name:'5.2 Contract & Commercial Review',exact:true}).click();
 await expect(drawer.getByText(/Recent strong verification is required/)).toHaveCount(0);
 await drawer.getByLabel(/Owner authority/).selectOption({label:'Synthetic confirmed business owner'});
 await drawer.getByLabel(/Review outcome/).selectOption('approved');
 await drawer.getByLabel(/Decision reason/).fill('Verified synthetic agreement, parties, terms and effectiveness. No unresolved material risks.');
 for(const label of [/I verified the exact agreement/,/I reviewed the stated value/,/I verified applicable effectiveness/,/No unresolved material contractual/])await drawer.getByLabel(label).check();
 await expect(drawer.getByLabel(/Fee basis/)).toBeDisabled();
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  await drawer.getByRole('button',{name:'Record contract decision',exact:true}).scrollIntoViewIfNeeded();
  await expect(drawer.getByLabel(/No unresolved material contractual/)).toHaveCSS('width','20px');
  await page.screenshot({path:`test-results/contract-owner-confirmations-${width}.png`});
 }
 let decisionLost=false;
 await page.route('**/rest/v1/rpc/decide_project_contract_review',async route=>{if(!decisionLost){decisionLost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 page.once('dialog',dialog=>dialog.accept());
 await drawer.getByRole('button',{name:'Record contract decision',exact:true}).click();
 await expect(drawer.getByRole('alert')).toContainText('Retry retains the exact request');
 await drawer.getByRole('button',{name:'Retry contract decision',exact:true}).click();
 await expect(drawer.getByText('Decision recorded: approved.',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');
 await page.getByRole('button',{name:'5.2 Contract & Commercial Review',exact:true}).click();
 await expect(drawer.getByText(/Current basis: approved/)).toBeVisible();
 await expect(drawer.getByRole('list',{name:'Contract review requests'})).toContainText('Review decision recorded');
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  await drawer.getByRole('heading',{name:'Contract decision history',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/contract-owner-review-${width}.png`});
 }
 execFileSync('python',['scripts/local-acceptance-fixtures.py','contract-owner-verify']);

});
