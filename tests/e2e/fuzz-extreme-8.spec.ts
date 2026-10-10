import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Extreme Fuzz Testing Scenarios Part 8', () => {
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

  test('Fuzz excessive filter clicking with search input', async () => {
    await window.click('text=Mods');
    await window.click('text=Browse Online');
    await window.waitForTimeout(500);

    const searchInput = window.getByPlaceholder('Search mods...');
    if (await searchInput.isVisible()) {
        await searchInput.fill('Spark');

        const filters = ['ZeroSpark', 'ColorZ', 'Maps'];
        for(let i=0; i<10; i++) {
             const filter = filters[i % filters.length];
             const btn = window.getByRole('button', { name: filter, exact: true });
             if (await btn.isVisible()) {
                 await btn.click({ force: true });
                 await window.waitForTimeout(50);
             }
        }
    }

    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-excessive-filters.png' });
  });

});
