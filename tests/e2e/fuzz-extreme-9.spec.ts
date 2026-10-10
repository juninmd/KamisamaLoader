import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Extreme Fuzz Testing Scenarios Part 9', () => {
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

  test('Fuzz excessive double-clicking everywhere', async () => {
      for (let i = 0; i < 20; i++) {
          const x = Math.floor(Math.random() * 800);
          const y = Math.floor(Math.random() * 600);
          await window.mouse.click(x, y, { clickCount: 2 });
          await window.waitForTimeout(20);
      }
      await window.screenshot({ path: 'tests/evidence/homologation/fuzz-double-click-everywhere.png' });
  });

  test('Fuzz rapid escape pressing with search', async () => {
      await window.click('text=Mods');
      await window.click('text=Browse Online');
      await window.waitForTimeout(500);

      const searchInput = window.getByPlaceholder('Search mods...');
      if (await searchInput.isVisible()) {
          for (let i = 0; i < 10; i++) {
              await searchInput.fill('Test');
              await window.keyboard.press('Escape');
              await window.waitForTimeout(50);
          }
      }
      await window.screenshot({ path: 'tests/evidence/homologation/fuzz-rapid-escape.png' });
  });

});
