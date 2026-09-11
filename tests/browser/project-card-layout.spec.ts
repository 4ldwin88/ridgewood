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
