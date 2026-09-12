import { test, expect, type Page } from '@playwright/test';

test.use({ viewport: { width: 390, height: 844 }, hasTouch: true, isMobile: true });

// Real Chromium touch input, not dispatchEvent or a click disguised as a swipe.
async function swipe(page: Page, target: string, dx: number, dy = 0) {
  const box = await page.locator(target).boundingBox();
  if (!box) throw new Error('Gesture surface missing');
  const x = box.x + Math.min(18, box.width / 2), y = box.y + box.height / 2;
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y }] });
  for (let i = 1; i <= 8; i++) {
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * i / 8, y: y + dy * i / 8 }] });
  }
  await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await cdp.detach();
}

test('edge and header swipes close; short, reverse and vertical gestures do not; dirty and busy guards survive', async ({ page }) => {
  let releaseSave!: () => void;
  const gate = new Promise<void>(resolve => { releaseSave = resolve; });
  await page.route('**/*.supabase.co/**', async route => {
    if (route.request().url().includes('/rpc/create_project_state_document_draft')) {
      await gate;
      return route.fulfill({ status: 500, json: { message: 'Synthetic offline save' } });
    }
    return route.fulfill({ status: 200, json: [] });
  });
  await page.goto('/tests/fixtures/forms/index.html');
  const open = page.getByRole('button', { name: 'Open site review' });
  const drawer = page.getByRole('dialog');
  await open.click();
  await expect(page.locator('.workspace-drawer__edge')).toHaveCSS('width', '44px');
  await swipe(page, '.workspace-drawer__edge', 24);
  await expect(drawer).toBeVisible();
  await swipe(page, '.workspace-drawer__header', -20);
  await expect(drawer).toBeVisible();
  await swipe(page, '.workspace-drawer__header', 0, 100);
  await expect(drawer).toBeVisible();
  await swipe(page, '.workspace-drawer__edge', 180);
  await expect(drawer).not.toBeVisible();
  await expect(open).toBeFocused();
  await open.click();
  await swipe(page, '.workspace-drawer__header', 180);
  await expect(drawer).not.toBeVisible();
  await open.click();
  await page.getByRole('button', { name: 'Owned', exact: true }).click();
  page.once('dialog', dialog => dialog.dismiss());
  await swipe(page, '.workspace-drawer__edge', 180);
  await expect(drawer).toBeVisible();
  await expect(page.getByRole('button', { name: /Owned/ })).toHaveAttribute('aria-pressed', 'true');
  for (let attempt=0; attempt<2; attempt++) {
    page.once('dialog', dialog => dialog.dismiss());
    await page.keyboard.press('Escape');
    await expect(drawer).toBeVisible();
    await expect(page.getByRole('button', { name: /Owned/ })).toHaveAttribute('aria-pressed', 'true');
  }
  await page.getByRole('button', { name: 'Save draft', exact: true }).click();
  await expect(drawer).toHaveAttribute('aria-busy', 'true');
  await swipe(page, '.workspace-drawer__header', 180);
  await page.keyboard.press('Escape');
  await expect(drawer).toBeVisible();
  releaseSave();
  await expect(drawer).toHaveAttribute('aria-busy', 'false');
  page.once('dialog', dialog => dialog.accept());
  await swipe(page, '.workspace-drawer__header', 180);
  await expect(drawer).not.toBeVisible();
});


test('a failed domain action save retains its pending title', async ({page})=>{
 await page.route('**/*.supabase.co/**',route=>route.request().method()==='POST'?route.fulfill({status:500,json:{message:'Synthetic save rejected'}}):route.fulfill({status:200,json:[]}));
 await page.goto('/tests/fixtures/forms/index.html');
 await page.getByRole('button',{name:'Open site review'}).click();
 await page.getByRole('button',{name:'Actions (0)',exact:true}).click();
 const child=page.getByRole('dialog',{name:'3.1 Development & Site · Actions',exact:true});
 await child.getByRole('textbox', {name: 'Action · Required', exact: true}).fill('Keep this pending action');
 await child.getByRole('button',{name:'Add action',exact:true}).click();
 await expect(child.getByText('Synthetic save rejected',{exact:true})).toBeVisible();
 await expect(child.getByRole('textbox', {name: 'Action · Required', exact: true})).toHaveValue('Keep this pending action');
});
