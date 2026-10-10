import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Extreme Fuzz Testing Scenarios Part 7', () => {
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

  test('Fuzz excessive refreshing of download list', async () => {
    // Navigate to a page to ensure app is loaded, then trigger downloads
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const downloadsBtn = window.getByRole('button', { name: 'Show Downloads' });
    if (await downloadsBtn.isVisible()) {
        for(let i=0; i<15; i++) {
             await downloadsBtn.click();
             await window.waitForTimeout(50);
        }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-excessive-downloads-toggle.png' });
  });

  test('Fuzz right click everywhere', async () => {
      for (let i = 0; i < 20; i++) {
          const x = Math.floor(Math.random() * 800);
          const y = Math.floor(Math.random() * 600);
          await window.mouse.click(x, y, { button: 'right' });
          await window.waitForTimeout(20);
      }
      await window.screenshot({ path: 'tests/evidence/homologation/fuzz-right-click-everywhere.png' });
  });

});
