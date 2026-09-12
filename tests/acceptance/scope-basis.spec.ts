import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';

test('scope preserves identity, references, uncertain saves and review requests',async({page})=>{
 execFileSync('python',['scripts/local-acceptance-fixtures.py','scope-setup']);
 await page.goto('/?portal=1');
 await page.getByLabel('Email').fill('edward-demo@example.invalid');
 await page.getByLabel('Password').fill('Synthetic-local-only-2026!');
 await page.getByRole('button',{name:'Sign in',exact:true}).click();
 await page.getByRole('button',{name:'Projects',exact:true}).click();
 await page.getByRole('button',{name:'Scope basis rehearsal',exact:true}).click();
 await page.getByRole('button',{name:'Project Authorization & Setup',exact:true}).click();
 const open=()=>page.getByRole('button',{name:'5.3 Scope, Exclusions & Interfaces',exact:true}).click();
 await open();const drawer=page.getByRole('dialog',{name:'5.3 Scope, Exclusions & Interfaces',exact:true});
 await drawer.getByRole('button',{name:'Add scope component',exact:true}).click();
 await drawer.getByRole('button',{name:'Save scope preparation',exact:true}).click();
 await expect(drawer.getByRole('status',{name:'Scope save status'})).toContainText('Saved scope version 1');
 await drawer.getByRole('button',{name:'Request scope review',exact:true}).click();
 await expect(drawer.getByRole('alert')).toContainText('Complete the saved scope requirements');
 await drawer.getByLabel(/Scope description/).fill('Supply and install lobby flooring');
 await drawer.getByLabel(/Classification/).selectOption('interface');
 await drawer.getByLabel(/Responsible party/).selectOption({label:'Synthetic flooring partner'});
 await drawer.getByLabel(/Governing source/).selectOption({label:'Synthetic scope specification · revision 1'});
 await drawer.getByLabel(/Acceptance specification/).selectOption({label:'Synthetic scope specification · revision 1'});
 await drawer.getByLabel(/Related program requirement/).selectOption({label:'Synthetic scope specification · revision 1'});
 let lost=false;
 await page.route('**/rest/v1/rpc/save_project_scope',async route=>{if(!lost){lost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await drawer.getByRole('button',{name:'Save scope preparation',exact:true}).click();
 await expect(drawer.getByRole('alert')).toContainText('Retry preserves the exact request');
 await expect(drawer.getByLabel(/Scope description/)).toBeDisabled();
 await drawer.getByRole('button',{name:'Retry scope save',exact:true}).click();
 await expect(drawer.getByRole('status',{name:'Scope save status'})).toContainText('Saved scope version 2');
 let requestLost=false;
 await page.route('**/rest/v1/rpc/request_project_scope_review',async route=>{if(!requestLost){requestLost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await drawer.getByRole('button',{name:'Request scope review',exact:true}).click();
 await expect(drawer.getByRole('alert')).toContainText('Retry preserves the exact request');
 await drawer.getByRole('button',{name:'Retry scope review request',exact:true}).click();
 await expect(drawer.getByRole('list',{name:'Scope review requests'})).toContainText('Version 2 · Pending');
 await page.keyboard.press('Escape');await open();
 await expect(drawer.getByLabel(/Scope description/)).toHaveValue('Supply and install lobby flooring');
 await expect(drawer.getByLabel(/Classification/)).toHaveValue('interface');
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  await drawer.getByRole('heading',{name:'Scope component 1',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/scope-basis-${width}.png`});
  await drawer.getByRole('heading',{name:'5.3.2 Request scope review',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/scope-review-${width}.png`});
 }
 await drawer.getByLabel(/Scope description/).fill('Coordinate lobby flooring interface');
 await expect(drawer.getByRole('button',{name:'Request scope review',exact:true})).toBeDisabled();
 await drawer.getByRole('button',{name:'Save scope preparation',exact:true}).click();
 await expect(drawer.getByRole('list',{name:'Scope review requests'})).toContainText('Superseded');
 execFileSync('python',['scripts/local-acceptance-fixtures.py','scope-verify']);
 await drawer.getByRole('button',{name:'Request scope review',exact:true}).click();
 await expect(drawer.getByRole('status',{name:'Scope save status'})).toContainText('Review requested for scope version 3');
 execFileSync('python',['scripts/local-acceptance-fixtures.py','scope-owner-setup']);
 const session=JSON.parse(execFileSync('node',['scripts/local-review-session.mjs','scope-contract'],{encoding:'utf8'}));
 await page.evaluate(session=>{
  const key=Object.keys(localStorage).find(k=>k.startsWith('sb-')&&k.endsWith('-auth-token'));
  if(!key)throw new Error('Synthetic session storage missing');
  localStorage.setItem(key,JSON.stringify(session));
 },session);
 await page.reload();
 await page.getByRole('button',{name:'Projects',exact:true}).click();
 await page.getByRole('button',{name:'Scope basis rehearsal',exact:true}).click();
 await page.getByRole('button',{name:'Project Authorization & Setup',exact:true}).click();
 await open();
 await drawer.getByLabel(/Owner authority/).selectOption({label:'Synthetic confirmed business owner'});
 await drawer.getByLabel(/Review outcome/).selectOption('approved');
 await drawer.getByLabel(/Decision reason/).fill('Verified exact scope, parties and current contract basis; no unresolved scope blockers.');
 for(const label of [/I verified that these scope items/,/I reviewed inclusions/,/No unresolved scope gap/])await drawer.getByLabel(label).check();
 await expect(drawer.getByLabel(/Scope description/)).toBeDisabled();
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  await drawer.getByRole('button',{name:'Record scope decision',exact:true}).scrollIntoViewIfNeeded();
  await expect(drawer.getByLabel(/No unresolved scope gap/)).toHaveCSS('width','20px');
  await page.screenshot({path:`test-results/scope-owner-confirmations-${width}.png`});
 }
 let decisionLost=false;
 await page.route('**/rest/v1/rpc/decide_project_scope_review',async route=>{if(!decisionLost){decisionLost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 page.once('dialog',dialog=>dialog.accept());
 await drawer.getByRole('button',{name:'Record scope decision',exact:true}).click();
 await expect(drawer.getByRole('alert')).toContainText('Retry retains the exact request');
 await drawer.getByRole('button',{name:'Retry scope decision',exact:true}).click();
 await expect(drawer.getByText('Decision recorded: approved.',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await open();
 await expect(drawer.getByText(/Current basis: approved/)).toBeVisible();
 await expect(drawer.getByRole('list',{name:'Scope review requests'})).toContainText('Review decision recorded');
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  await drawer.getByRole('heading',{name:'Scope decision history',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/scope-owner-history-${width}.png`});
 }
 // Clarification and change intake use the same saved scope identity.
 await drawer.getByText('Capture a scope question',{exact:true}).click();
 await drawer.getByRole('button',{name:'Save scope question',exact:true}).click();
 await expect(drawer.getByRole('alert')).toContainText('Complete the question');
 const question='Does the finish schedule already include the lobby threshold?';
 async function fillQuestion(text:string){
  await drawer.getByLabel(/Question component/).selectOption({label:'Coordinate lobby flooring interface'});
  await drawer.getByLabel(/^Scope question Required/).fill(text);
  await drawer.getByLabel(/Date identified/).fill(new Date().toISOString().slice(0,10));
  await drawer.getByLabel(/Question owner/).selectOption({index:1});
  await drawer.getByLabel(/Question source/).selectOption({label:'Synthetic scope specification · revision 1'});
 }
 await fillQuestion(question);
 await expect(drawer.getByRole('button',{name:'Save scope preparation',exact:true})).toBeDisabled();
 await expect(drawer.locator('.drawer-state')).toHaveText('Unsaved changes');
 page.once('dialog',dialog=>dialog.dismiss());
 await drawer.getByRole('button',{name:'Close 5.3 Scope, Exclusions & Interfaces',exact:true}).click();
 await expect(drawer).toBeVisible();
 for(let attempt=0;attempt<2;attempt++){page.once('dialog',dialog=>dialog.dismiss());await page.keyboard.press('Escape');await expect(drawer).toBeVisible();}
 await expect(drawer.getByLabel(/^Scope question Required/)).toHaveValue(question);
 let queryLost=false;
 await page.route('**/rest/v1/rpc/capture_project_scope_query',async route=>{if(!queryLost){queryLost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await drawer.getByRole('button',{name:'Save scope question',exact:true}).click();
 await expect(drawer.getByRole('alert')).toContainText('Retry preserves the exact request');
 await drawer.getByRole('button',{name:'Retry scope question',exact:true}).click();
 await expect(drawer.getByRole('status',{name:'Scope question status'})).toContainText('Scope question saved');
 await page.keyboard.press('Escape');await open();
 const queryHistory=drawer.getByRole('list',{name:'Scope question history'});
 await expect(queryHistory.getByText(question,{exact:true})).toHaveCount(1);
 await expect(drawer.getByText(/Current basis: review required/)).toBeVisible();
 await drawer.getByText('Respond to a saved question',{exact:true}).click();
 await drawer.getByLabel(/Open scope question/).selectOption({index:1});
 await drawer.getByLabel(/Response disposition/).selectOption('clarification');
 await drawer.getByLabel(/^Scope response Required/).fill('The current finish schedule already includes this threshold; no requirement or obligation changes.');
 await drawer.getByLabel(/Clarification authority/).selectOption({label:'Synthetic confirmed business owner'});
 await drawer.getByLabel(/I verified this answer changes no approved scope/).check();
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  await drawer.getByRole('button',{name:'Record scope response',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/scope-clarification-${width}.png`});
 }
 let responseLost=false;
 await page.route('**/rest/v1/rpc/respond_project_scope_query',async route=>{if(!responseLost){responseLost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 page.once('dialog',dialog=>dialog.accept());
 await drawer.getByRole('button',{name:'Record scope response',exact:true}).click();
 await expect(drawer.getByRole('alert')).toContainText('Retry preserves the exact request');
 await drawer.getByRole('button',{name:'Retry scope response',exact:true}).click();
 await expect(drawer.getByRole('status',{name:'Scope question status'})).toContainText('Clarification recorded');
 await expect(drawer.getByText(/Current basis: approved/)).toBeVisible();
 await page.keyboard.press('Escape');await open();
 await expect(queryHistory).toContainText('Clarification recorded');
 await drawer.getByText('Capture a scope question',{exact:true}).click();
 await fillQuestion('Could the additional threshold require changed work?');
 await drawer.getByRole('button',{name:'Save scope question',exact:true}).click();
 await expect(drawer.getByRole('status',{name:'Scope question status'})).toContainText('Scope question saved');
 await drawer.getByText('Respond to a saved question',{exact:true}).click();
 await drawer.getByLabel(/Open scope question/).selectOption({index:1});
 await drawer.getByLabel(/Response disposition/).selectOption('potential_change');
 await drawer.getByLabel(/^Scope response Required/).fill('Additional work may affect price and time. Obtain impact assessment and authorization before proceeding.');
 page.once('dialog',dialog=>dialog.accept());
 await drawer.getByRole('button',{name:'Record scope response',exact:true}).click();
 await expect(drawer.getByRole('status',{name:'Scope question status'})).toContainText('Potential change captured');
 await page.keyboard.press('Escape');await open();
 await expect(queryHistory).toContainText('Change reference:');
 await expect(queryHistory.getByText(/Change reference:/)).toHaveCount(1);
 await expect(drawer.getByText(/Current basis: review required/)).toBeVisible();
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});
  await queryHistory.getByText(/Change reference:/).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/scope-change-intake-${width}.png`});
 }
 await drawer.getByLabel(/Scope description/).fill('Proposed additional flooring area');
 await drawer.getByRole('button',{name:'Save scope preparation',exact:true}).click();

 await drawer.getByRole('button',{name:'Review change assessment',exact:true}).click();
 const change=page.getByRole('dialog',{name:'5.3.5 Changes — Assessment & Internal Review',exact:true});
 await expect(change.getByLabel(/Signed cost impact/)).toHaveValue('');
 await expect(change.getByLabel(/Signed time impact in days/)).toHaveValue('');
 await change.getByRole('button',{name:'Save change assessment',exact:true}).click();
 await expect(change.getByRole('status',{name:'Change assessment status'})).toContainText('version 1');
 await change.getByRole('button',{name:'Request change internal review',exact:true}).click();
 await expect(change.getByRole('alert')).toContainText('Complete and save the assessment');
 await change.getByLabel(/Change description/).fill('Additional flooring area with a reviewed credit and no time extension');
 await change.getByLabel(/Proposed scope version/).selectOption('4');
 await change.getByLabel(/^Cost assessment/).selectOption('assessed');
 await change.getByLabel(/Signed cost impact/).fill('-250.00');
 await change.getByLabel(/Impact currency/).fill('USD');
 await change.getByLabel(/^Time assessment/).selectOption('assessed');
 await change.getByLabel(/Signed time impact in days/).fill('0');
 await change.getByLabel(/Time calendar basis/).selectOption('working_days');
 await change.getByLabel(/Other impacts and notice implications/).fill('Reviewed procurement, quality, safety, permits, responsibilities and notices; no other impacts identified.');
 await change.getByLabel(/Material blocker assessment/).selectOption('none_identified');
 await change.getByLabel('Synthetic scope specification · revision 1',{exact:true}).check();
 page.once('dialog',dialog=>dialog.dismiss());await page.keyboard.press('Escape');await expect(change).toBeVisible();
 let changeLost=false;
 await page.route('**/rest/v1/rpc/save_project_change',async route=>{if(!changeLost){changeLost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await change.getByRole('button',{name:'Save change assessment',exact:true}).click();
 await expect(change.getByRole('alert')).toContainText('Retry preserves the exact request');
 await expect(change.getByLabel(/Change description/)).toBeDisabled();
 await change.getByRole('button',{name:'Retry change assessment save',exact:true}).click();
 await expect(change.getByRole('status',{name:'Change assessment status'})).toContainText('version 2');
 let changeRequestLost=false;
 await page.route('**/rest/v1/rpc/request_project_change_review',async route=>{if(!changeRequestLost){changeRequestLost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await change.getByRole('button',{name:'Request change internal review',exact:true}).click();
 await expect(change.getByRole('alert')).toContainText('Retry preserves the exact request');
 await change.getByRole('button',{name:'Retry change review request',exact:true}).click();
 await expect(change.getByRole('list',{name:'Change review requests'})).toContainText('Version 2 · current');
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});await change.getByLabel(/Change description/).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/change-assessment-${width}.png`});
 }
 let changeDecisionLost=false;
 await page.route('**/rest/v1/rpc/decide_project_change_dimension',async route=>{if(!changeDecisionLost){changeDecisionLost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 for(const dimension of ['scope','cost','time']){
  await change.getByLabel(/Review dimension/).selectOption(dimension);
  await change.getByLabel(/Change owner authority/).selectOption({label:'Synthetic confirmed business owner'});
  await change.getByLabel(/^Internal decision/).selectOption('approved');
  await change.getByLabel(/Change decision rationale/).fill(`Reviewed ${dimension} independently against the exact proposed scope and published evidence.`);
  await change.getByLabel(/I reviewed the selected/).check();
  page.once('dialog',dialog=>dialog.accept());
  await change.getByRole('button',{name:'Record change internal decision',exact:true}).click();
  if(dimension==='scope'){
   await expect(change.getByRole('alert')).toContainText('Retry preserves the exact request');
   await change.getByRole('button',{name:'Retry change decision',exact:true}).click();
  }
  await expect(change.getByRole('list',{name:'Change dimension status'})).toContainText(`${dimension}: approved internally`);
  if(dimension!=='time')await expect(change.getByRole('list',{name:'Change dimension status'})).toContainText('time: not reviewed');
 }
 await expect(change.getByText('All three dimensions have current internal approval.',{exact:true})).toBeVisible();
 await page.keyboard.press('Escape');await drawer.getByRole('button',{name:'Review change assessment',exact:true}).click();
 await expect(change.getByLabel(/Signed cost impact/)).toHaveValue('-250.00');
 await expect(change.getByLabel(/Signed time impact in days/)).toHaveValue('0');
 await expect(change.getByRole('list',{name:'Change decision history'}).locator(':scope > li')).toHaveCount(3);
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});await change.getByRole('heading',{name:'Execution remains blocked',exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/change-internal-decisions-${width}.png`});
  expect(await change.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 }

 execFileSync('python',['scripts/local-acceptance-fixtures.py','proposal-setup']);
 await change.getByRole('button',{name:'5.3.6 Client Change Proposal',exact:true}).click();
 const proposal=page.getByRole('dialog',{name:'5.3.6 Client Change Proposal',exact:true});
 await expect(proposal.getByLabel(/Proposed client amount/)).toHaveValue('');
 await proposal.getByRole('button',{name:'Save client proposal',exact:true}).click();
 await expect(proposal.getByRole('status',{name:'Client proposal status'})).toContainText('version 1');
 await proposal.getByLabel(/Client recipient/).selectOption({label:'Synthetic scope client'});
 await proposal.getByLabel(/Proposed client amount/).fill('-200.00');
 await proposal.getByLabel(/Markup and fee treatment/).fill('50.00 retained fee against the assessed 250.00 credit');
 await proposal.getByLabel(/Client commercial terms/).fill('Tax excluded. Valid until withdrawn in writing. No changed work directed.');
 await proposal.getByLabel(/Exact published client proposal/).selectOption({label:'Synthetic client change proposal · revision 1'});
 page.once('dialog',dialog=>dialog.dismiss());await page.keyboard.press('Escape');await expect(proposal).toBeVisible();
 await proposal.getByLabel(/Proposed client amount/).fill('1.001');
 await proposal.getByRole('button',{name:'Save client proposal',exact:true}).click();
 await expect(proposal.getByRole('alert')).toContainText('Enter a signed client amount');
 await expect(proposal.getByLabel(/Proposed client amount/)).toBeEnabled();
 await proposal.getByLabel(/Proposed client amount/).fill('-200.00');
 let proposalLost=false;
 await page.route('**/rest/v1/rpc/save_change_proposal',async route=>{if(!proposalLost){proposalLost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 await proposal.getByRole('button',{name:'Save client proposal',exact:true}).click();
 await expect(proposal.getByRole('alert')).toContainText('Retry preserves the exact request');
 await expect(proposal.getByLabel(/Proposed client amount/)).toBeDisabled();
 await proposal.getByRole('button',{name:'Retry client proposal save',exact:true}).click();
 await expect(proposal.getByRole('status',{name:'Client proposal status'})).toContainText('version 2');
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});await proposal.getByLabel(/Client recipient/).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/client-proposal-${width}.png`});
 }
 await proposal.getByLabel(/Proposal owner authority/).selectOption({label:'Synthetic confirmed business owner'});
 await proposal.getByLabel(/Proposal release outcome/).selectOption('approved');
 await proposal.getByLabel(/Proposal decision reason/).fill('Verified contract client, price, fee and exact proposal against current independently reviewed scope/time.');
 await proposal.getByLabel(/I verified the recipient is the contract client/).check();
 let releaseLost=false;
 await page.route('**/rest/v1/rpc/decide_change_proposal',async route=>{if(!releaseLost){releaseLost=true;await route.fetch();await route.abort('failed');}else await route.continue();});
 page.once('dialog',dialog=>dialog.accept());
 await proposal.getByRole('button',{name:'Record proposal release decision',exact:true}).click();
 await expect(proposal.getByRole('alert')).toContainText('Retry preserves the exact request');
 await proposal.getByRole('button',{name:'Retry proposal release decision',exact:true}).click();
 await expect(proposal.getByLabel('Proposal release state',{exact:true})).toContainText('Current proposal release is owner-authorized.');
 await page.keyboard.press('Escape');await change.getByRole('button',{name:'5.3.6 Client Change Proposal',exact:true}).click();
 await expect(proposal.getByLabel(/Proposed client amount/)).toHaveValue('-200.00');
 await expect(proposal.getByRole('list',{name:'Proposal decision history'}).locator(':scope > li')).toHaveCount(1);
 for(const width of [390,1280]){
  await page.setViewportSize({width,height:844});await proposal.getByLabel('Proposal release state',{exact:true}).scrollIntoViewIfNeeded();
  await page.screenshot({path:`test-results/client-proposal-release-${width}.png`});
  expect(await proposal.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
 }
 execFileSync('python',['scripts/local-acceptance-fixtures.py','proposal-verify']);
 await page.keyboard.press('Escape');
 await change.getByLabel(/Impact currency/).fill('CAD');
 await change.getByRole('button',{name:'Save change assessment',exact:true}).click();
 await expect(change.getByRole('status',{name:'Change assessment status'})).toContainText('version 3');
 await change.getByRole('button',{name:'5.3.6 Client Change Proposal',exact:true}).click();
 await expect(proposal.getByLabel(/Proposed client amount/)).toHaveValue('-200.00');
 await expect(proposal.getByLabel(/Proposed client amount/)).toHaveAccessibleName(/USD/);
 await expect(proposal.getByLabel('Proposal release state',{exact:true})).toContainText('Current proposal release is not authorized.');
 page.once('dialog',dialog=>dialog.accept());
 await proposal.getByRole('button',{name:'Prepare proposal against current assessment',exact:true}).click();
 await expect(proposal.getByLabel(/Proposed client amount/)).toHaveValue('');
 await expect(proposal.getByLabel(/Proposed client amount/)).toHaveAccessibleName(/CAD/);
 await proposal.getByRole('button',{name:'Save client proposal',exact:true}).click();
 await expect(proposal.getByRole('status',{name:'Client proposal status'})).toContainText('version 3');
 await page.keyboard.press('Escape');

 await page.keyboard.press('Escape');
 await expect(drawer.getByText(/A later preparation is a proposed change/)).toBeVisible();
 await expect(drawer.getByRole('option',{name:'Approve the initial scope baseline',exact:true})).toHaveJSProperty('disabled',true);
 await drawer.getByText('Original approved baseline · version 3',{exact:true}).click();
 await expect(drawer.getByText('interface · Coordinate lobby flooring interface',{exact:true}).first()).toBeVisible();
 execFileSync('python',['scripts/local-acceptance-fixtures.py','scope-owner-verify']);
});
