import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Extreme Fuzz Testing Scenarios Part 10', () => {
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

  test('Fuzz navigation back and forth rapidly', async () => {
    const tabs = ['Dashboard', 'Mods', 'Settings'];
    for (let i = 0; i < 20; i++) {
        const tab = tabs[i % tabs.length];
        const nextTab = tabs[(i + 1) % tabs.length];
        await window.click(`text=${tab}`);
        await window.waitForTimeout(20);
        await window.click(`text=${nextTab}`);
        await window.waitForTimeout(20);
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-rapid-back-forth.png' });
  });

});
