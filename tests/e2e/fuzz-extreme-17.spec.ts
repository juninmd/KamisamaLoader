import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Extreme Fuzz Testing Scenarios Part 17', () => {
  let electronApp: any;
  let window: any;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('Fuzz rapid random coordinate clicking', async () => {
    for (let i = 0; i < 30; i++) {
      const x = Math.floor(Math.random() * 800);
      const y = Math.floor(Math.random() * 600);
      try {
        await window.mouse.click(x, y, { delay: 10 });
      } catch (e) {
        // Ignore
      }
    }

    await expect(window.locator('body')).toBeVisible();
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-17-random-clicks.png' });
  });

  test('Fuzz rapid Escape key presses', async () => {
    // Navigate to a page and try to open menus/modals first
    try {
      const settingsButton = window.locator('text=Settings').first();
      await settingsButton.click({ force: true });
      await window.waitForTimeout(500);
    } catch (e) {
      // Ignore
    }

    for (let i = 0; i < 20; i++) {
      try {
        await window.keyboard.press('Escape');
        await window.waitForTimeout(20);
      } catch (e) {
        // Ignore
      }
    }

    await expect(window.locator('body')).toBeVisible();
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-17-escape-spam.png' });
  });

  test('Fuzz random double clicks on random coordinates', async () => {
    for (let i = 0; i < 15; i++) {
      const x = Math.floor(Math.random() * 800);
      const y = Math.floor(Math.random() * 600);
      try {
        await window.mouse.dblclick(x, y, { delay: 10 });
      } catch (e) {
        // Ignore
      }
    }

    await expect(window.locator('body')).toBeVisible();
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-17-random-dblclicks.png' });
  });

  test('Fuzz rapid scrolling using mouse wheel', async () => {
    try {
      const modsButton = window.locator('text=Mods').first();
      await modsButton.click({ force: true });
      await window.waitForTimeout(500);
    } catch (e) {
      // Ignore
    }

    for (let i = 0; i < 30; i++) {
      const deltaY = Math.random() > 0.5 ? 500 : -500;
      try {
        await window.mouse.wheel(0, deltaY);
        await window.waitForTimeout(20);
      } catch (e) {
        // Ignore
      }
    }

    await expect(window.locator('body')).toBeVisible();
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-17-rapid-scroll.png' });
  });
});
