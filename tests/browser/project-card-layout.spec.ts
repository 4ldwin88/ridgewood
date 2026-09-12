import { test, expect } from '@playwright/test';

for (const width of [390, 1280]) {
  test(`card management does not overlap the project title at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height: 844 });
    await page.goto('/tests/fixtures/app/index.html');
    await page.getByRole('button', { name: 'Business', exact: true }).click();
    const card = page.locator('.project-register-card').first();
    await expect(card).toBeVisible();
    const title = card.locator('.record-link');
    const control = card.locator('summary');
    const photo = card.locator('.photo-placeholder');
    await expect(photo).toHaveCSS('width', '112px');
    await expect(photo).toHaveCSS('height', '112px');
    const titleBox = await title.boundingBox();
    const controlBox = await control.boundingBox();
    expect(titleBox).not.toBeNull();
    expect(controlBox).not.toBeNull();
    expect(controlBox!.width).toBe(44);
    expect(controlBox!.height).toBe(44);
    expect(titleBox!.x + titleBox!.width).toBeLessThanOrEqual(controlBox!.x);
    await control.click();
    const menu = card.locator('.row-menu__items');
    await expect(menu).toBeVisible();
    const menuBox = await menu.boundingBox();
    expect(menuBox!.x).toBeGreaterThanOrEqual(0);
    expect(menuBox!.x + menuBox!.width).toBeLessThanOrEqual(width);
  });
}

for (const width of [390, 1280]) {
  for (const section of ['Business', 'Projects']) {
    test(`${section} card surface and keyboard open the state at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/tests/fixtures/app/index.html');
      await page.getByRole('button', { name: section, exact: true }).click();
      const card = page.locator('.project-register-card').first();
      const name = await card.locator('.record-link').innerText();
      await card.scrollIntoViewIfNeeded();
      const box = (await card.boundingBox())!;
      // Whitespace away from title and management controls must activate the title button.
      await page.mouse.click(box.x + 8, box.y + box.height - 8);
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
      await page.getByRole('button', { name: `← ${section}`, exact: true }).click();
      await card.locator('.record-link').focus();
      await page.keyboard.press('Enter');
      await expect(page.getByRole('heading', { name, exact: true })).toBeVisible();
    });
    test(`${section} management dismisses without unintended navigation at ${width}px`, async ({ page }) => {
      await page.setViewportSize({ width, height: 844 });
      await page.goto('/tests/fixtures/app/index.html');
      await page.getByRole('button', { name: section, exact: true }).click();
      const card = page.locator('.project-register-card').first();
      const menu = card.locator('details');
      const control = card.locator('summary');
      await control.click();
      await expect(menu).toHaveAttribute('open', '');
      await page.getByRole('searchbox').click();
      await expect(menu).not.toHaveAttribute('open', '');
      await expect(card).toBeVisible();
      await control.click();
      await page.keyboard.press('Escape');
      await expect(control).toBeFocused();
      await expect(menu).not.toHaveAttribute('open', '');
      await control.click();
      if (section === 'Business') {
        await menu.getByRole('button', { name: 'Hold', exact: true }).click();
        await expect(page.getByRole('dialog')).toBeVisible();
        await expect(menu).not.toHaveAttribute('open', '');
        await expect(card).toBeVisible();
      } else {
        await menu.getByRole('button', { name: 'Open project state' }).click();
        await expect(page.getByRole('heading', { name: 'Cedar House · Synthetic', exact: true })).toBeVisible();
      }
    });
  }
}
