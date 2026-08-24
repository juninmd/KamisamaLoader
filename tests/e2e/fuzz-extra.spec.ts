import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Additional Fuzz Testing and Edge Cases', () => {
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

  test('Window resizing fuzzing', async () => {
    const sizes = [
      { width: 1920, height: 1080 },
      { width: 800, height: 600 },
      { width: 400, height: 800 }, // Mobile-like vertical
      { width: 2560, height: 1440 }, // Ultra-wide
      { width: 100, height: 100 }, // Extremely small
      { width: 3000, height: 50 }, // Extremely wide and short
    ];

    for (const size of sizes) {
      await window.setViewportSize(size);
      await window.waitForTimeout(100);
    }

    // Restore to a sensible default before screenshot
    await window.setViewportSize({ width: 1280, height: 720 });
    await window.waitForTimeout(500);

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'evidence/homologation/fuzz-resizing.png' });
  });

  test('Rapid modal toggling fuzzing', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const manageProfilesBtn = window.locator('button[title="Manage Mod Profiles"]');
    if (await manageProfilesBtn.isVisible()) {
      for (let i = 0; i < 15; i++) {
        await manageProfilesBtn.click({ force: true });
        await window.waitForTimeout(50);

        // If modal is open, hit Escape to close it
        const modal = window.locator('div[role="dialog"]');
        if (await modal.isVisible()) {
          await window.keyboard.press('Escape');
          await window.waitForTimeout(50);
        }
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'evidence/homologation/fuzz-modal-rapid.png' });
  });

  test('Malformed Search input fuzzing in Browse Online', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const searchInput = window.getByPlaceholder('Search mods...');
    if (await searchInput.isVisible()) {
        const fuzzStrings = [
            '../../../../etc/shadow',
            '<script>alert(1)</script>',
            'A'.repeat(5000),
            '\\0\\0\\0',
            './relative/path/to/nowhere'
        ];

        for (const fuzz of fuzzStrings) {
            await searchInput.fill(fuzz);
            // Simulate blur or enter to trigger validation if any
            await searchInput.press('Enter');
            await window.waitForTimeout(100);
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'evidence/homologation/fuzz-search-malformed.png' });
  });

  test('Mouse movement and rapid hover fuzzing', async () => {
      // Rapidly move mouse across the screen to trigger hover states
      for (let i = 0; i < 20; i++) {
          const x = Math.floor(Math.random() * 800);
          const y = Math.floor(Math.random() * 600);
          await window.mouse.move(x, y);
          await window.waitForTimeout(20);
      }

      expect(await window.title()).toBe('Kamisama Loader');
      await window.screenshot({ path: 'evidence/homologation/fuzz-mouse-hover.png' });
  });

});
