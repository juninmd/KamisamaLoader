import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Extreme Fuzz Testing Scenarios Part 4', () => {
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

  test('Fuzz weird profile names', async () => {
    await window.click('text=Settings');
    await window.waitForTimeout(500);
    const createBtn = window.getByRole('button', { name: 'Create New Profile' });
    if (await createBtn.isVisible()) {
        const weirdStrings = [
            '../../../../etc/passwd',
            'C:\\Windows\\System32',
            'null',
            'undefined',
            '[object Object]',
            '    ',
            '\n\t\r'
        ];
        for (const fuzz of weirdStrings) {
            await createBtn.click();
            await window.waitForTimeout(200);
            const input = window.getByPlaceholder('Profile name...');
            if (await input.isVisible()) {
                await input.fill(fuzz);
                await window.keyboard.press('Enter');
                await window.waitForTimeout(200);
            }
        }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-weird-profile-names.png' });
  });

  test('Fuzz excessive mod toggling', async () => {
    await window.click('text=Mods');
    const myModsTab = window.getByRole('tab', { name: 'My Mods' });
    if (await myModsTab.isVisible()) {
        await myModsTab.click();
    }
    await window.waitForTimeout(500);

    const switches = await window.getByRole('checkbox').all();
    if (switches.length > 0) {
        for (let i = 0; i < 20; i++) {
            const sw = switches[i % switches.length];
            await sw.click({ force: true });
            await window.waitForTimeout(50);
        }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-excessive-mod-toggling.png' });
  });
});
