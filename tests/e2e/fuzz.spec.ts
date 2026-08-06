import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Fuzz Testing and Edge Cases', () => {
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

  test('Search input fuzzing', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }

    await window.waitForTimeout(1000);

    const searchInput = window.getByPlaceholder('Search mods...');

    // Fuzz inputs
    const fuzzStrings = [
      '',
      '   ',
      'a'.repeat(200),
      '<script>alert("xss")</script>',
      '\\u0000\\u0001',
      'DROP TABLE mods;',
      '👾 🤖 👻',
      '--\'; SELECT * FROM users;'
    ];

    if (await searchInput.isVisible()) {
      for (const fuzz of fuzzStrings) {
        await searchInput.fill(fuzz);
        await searchInput.press('Enter');
        await window.waitForTimeout(500);
        expect(await window.title()).toBe('Kamisama Loader');
      }
    }

    await window.screenshot({ path: 'evidence/fuzz-search.png' });
  });

  test('Random navigation fuzzing', async () => {
    // Navigate via sidebar explicitly
    const tabs = [
        { name: 'Dashboard', selector: 'text=Dashboard' },
        { name: 'Mods', selector: 'text=Mods' },
        { name: 'Settings', selector: 'button[title="Settings"], button:has(.lucide-settings)' }
    ];

    for (let i = 0; i < 5; i++) {
      const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
      await window.click(randomTab.selector);
      await window.waitForTimeout(300);
    }
    expect(await window.title()).toBe('Kamisama Loader');

    // Check Settings toggle rapidly
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(500);

    const advancedToggle = window.locator('button[role="switch"]').first();
    if (await advancedToggle.isVisible()) {
      for (let i = 0; i < 10; i++) {
         await advancedToggle.click();
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'evidence/fuzz-navigation.png' });
  });
});
