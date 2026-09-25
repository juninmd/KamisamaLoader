import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Extreme Fuzz Testing Scenarios Part 3', () => {
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

  test('Fuzz filter UI combinations rapidly', async () => {
    await window.click('text=Mods');
    await window.click('text=Browse Online');
    await window.waitForTimeout(1000);

    // Rapidly toggle filters
    const filters = ['ZeroSpark', 'ColorZ'];
    for (let i = 0; i < 5; i++) {
        for (const filter of filters) {
            const btn = window.getByRole('button', { name: filter, exact: true });
            if (await btn.isVisible()) {
                await btn.click();
            }
        }
    }

    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-filter-combos.png' });
  });

  test('Fuzz rapid game directory changes with invalid paths', async () => {
    await window.click('text=Settings');
    await window.waitForTimeout(1000);

    const changePathBtn = window.getByRole('button', { name: 'Change Path' });
    if (await changePathBtn.isVisible()) {
        for (let i = 0; i < 5; i++) {
            await changePathBtn.click();
        }
    }

    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-settings-path-clicks.png' });
  });
});
