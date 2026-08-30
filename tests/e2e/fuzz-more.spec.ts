import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Extended Fuzz Testing Scenarios', () => {
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

  test('Fuzz settings path inputs via events', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    const gameExeInput = window.getByPlaceholder('Path to Dragon Ball: Sparking! ZERO executable');
    const storageInput = window.getByPlaceholder('Default internal directory');

    const fuzzStrings = [
      'C:\\Windows\\System32\\cmd.exe',
      '../../../../etc/passwd',
      '/dev/null',
      'CON',
      'PRN',
      '\\u0000',
      'A'.repeat(1000),
      '<script>alert(1)</script>'
    ];

    if (await gameExeInput.isVisible()) {
      for (const fuzz of fuzzStrings) {
        // Since input might be readonly in the UI, we evaluate directly on it to fuzz the synthetic react state
        await gameExeInput.evaluate((el: HTMLInputElement, val: string) => {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, fuzz);
        await gameExeInput.press('Enter');
        await window.waitForTimeout(100);

        if (await storageInput.isVisible()) {
          await storageInput.evaluate((el: HTMLInputElement, val: string) => {
              el.value = val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
          }, fuzz);
          await storageInput.press('Enter');
          await window.waitForTimeout(100);
        }
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-settings-paths.png' });
  });

  test('Profile selection spamming', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const manageProfilesBtn = window.locator('button[title="Manage Mod Profiles"]');
    if (await manageProfilesBtn.isVisible()) {
      await manageProfilesBtn.click();
      await window.waitForTimeout(500);

      const createProfileBtn = window.locator('button[title="Create New Profile"]');
      if (await createProfileBtn.isVisible()) {
        await createProfileBtn.click();
        const profileNameInput = window.getByPlaceholder('Profile Name...');
        if (await profileNameInput.isVisible()) {
          await profileNameInput.fill('Fuzz Profile');
          const saveBtn = window.locator('button:has-text("Save")');
          if (await saveBtn.isVisible()) await saveBtn.click();
          await window.waitForTimeout(500);
        }
      }

      const profileItems = window.locator('div[role="dialog"] button:has-text("Fuzz Profile")');
      if (await profileItems.count() > 0) {
        for (let i = 0; i < 20; i++) {
          await profileItems.first().click({ force: true });
          await window.waitForTimeout(20);
        }
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-profile-spam.png' });
  });
});
