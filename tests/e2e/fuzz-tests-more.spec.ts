import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Additional Extra Fuzz Testing Scenarios', () => {
  let electronApp: any;
  let window: any;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('Fuzz filter clear all combinations', async () => {
      await window.click('text=Mods');
      const browseTab = window.locator('button:has-text("Browse Online")');
      if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
          await browseTab.click();
      }

      await window.waitForTimeout(500);

      // Open categories and select a few randomly
      const categoryFilter = window.locator('button:has-text("Category")');
      if (await categoryFilter.isVisible()) {
          for (let i = 0; i < 3; i++) {
              await categoryFilter.click({ force: true });
              await window.waitForTimeout(100);
              const categories = window.locator('button:has-text("Audio"), button:has-text("Visuals"), button:has-text("UI")');
              if (await categories.count() > 0) {
                 await categories.first().click({ force: true });
              }
          }
      }

      // Close the category dropdown by clicking elsewhere or forcing the next click

      // Check nsfw, colorz rapidly
      const nsfwBtn = window.locator('button:has-text("NSFW")');
      const colorZBtn = window.locator('button:has-text("ColorZ")');

      if (await nsfwBtn.isVisible()) {
        for(let i=0; i<3; i++) {
             await nsfwBtn.click({ force: true });
             await colorZBtn.click({ force: true });
        }
      }

      const clearAllBtn = window.locator('button:has-text("Clear All")');
      if (await clearAllBtn.isVisible()) {
         await clearAllBtn.click({ force: true });
      }

      expect(await window.title()).toBe('Kamisama Loader');
      await window.screenshot({ path: 'tests/evidence/homologation/fuzz-clear-all-filters.png' });
  });
});
