import { launchFuzzApp } from "./support/fuzz-setup";
import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Additional Fuzz Testing and Edge Cases', () => {
  let electronApp: any;
  let window: any;

  test.beforeEach(async () => {
    const setup = await launchFuzzApp();
    electronApp = setup.electronApp;
    window = setup.window;
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
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-resizing.png' });
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
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-modal-rapid.png' });
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
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-search-malformed.png' });
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
      await window.screenshot({ path: 'tests/evidence/homologation/fuzz-mouse-hover.png' });
  });



  test('Extensive Mod Settings Fuzzing', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const filterButton = window.locator('button:has-text("All Categories")');
    if (await filterButton.isVisible()) {
        for(let i=0; i<10; i++) {
             await filterButton.click({ force: true });
             await window.waitForTimeout(50);
             await window.keyboard.press('ArrowDown');
             await window.keyboard.press('Enter');
        }
    }

    const sortButton = window.locator('button:has-text("Sort by:")');
    if (await sortButton.isVisible()) {
        for(let i=0; i<5; i++) {
            await sortButton.click({ force: true });
            await window.waitForTimeout(50);
            await window.keyboard.press('ArrowDown');
            await window.keyboard.press('Enter');
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-mod-filters.png' });
});

test('Theme Toggle Spam Fuzzing', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(500);

    const themeToggle = window.locator('button:has-text("Light"), button:has-text("Dark"), button:has-text("System")').first();
    if (await themeToggle.isVisible()) {
        for (let i = 0; i < 20; i++) {
            await themeToggle.click({ force: true });
            await window.waitForTimeout(20);
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-theme-spam.png' });
});

test('Spam Download Button Fuzzing', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const firstModCard = window.locator('.group.relative.flex.flex-col').first();
    if (await firstModCard.isVisible()) {
        const downloadBtn = firstModCard.locator('button[title="Download Mod"], button:has(.lucide-download)');
        if (await downloadBtn.isVisible()) {
            for(let i=0; i<10; i++) {
                 await downloadBtn.click({ force: true });
                 await window.waitForTimeout(10);
            }
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-download-spam.png' });
});

});
