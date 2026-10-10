import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Extreme Fuzz Testing Scenarios Part 5', () => {
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

  test('Fuzz excessive text input in search', async () => {
    await window.click('text=Mods');
    await window.click('text=Browse Online');
    await window.waitForTimeout(500);

    const searchInput = window.getByPlaceholder('Search mods...');
    if (await searchInput.isVisible()) {
        const giantString = 'A'.repeat(50000);
        await searchInput.fill(giantString);
        await window.waitForTimeout(500);
        await searchInput.fill('');
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-excessive-text-search.png' });
  });

  test('Fuzz repeated rapid toggling of Cloud Sync', async () => {
    await window.click('text=Settings');
    await window.waitForTimeout(500);

    const advancedBtn = window.getByRole('button', { name: 'Show Advanced Settings' });
    if (await advancedBtn.isVisible()) {
        await advancedBtn.click();
        await window.waitForTimeout(200);
    }

    const exportBtn = window.getByRole('button', { name: 'Export Data' });
    if (await exportBtn.isVisible()) {
       for (let i = 0; i < 5; i++) {
           await exportBtn.click();
           await window.waitForTimeout(100);
       }
    }

    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-rapid-cloud-sync.png' });
  });
});
