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

    await window.screenshot({ path: 'tests/evidence/fuzz-search.png' });
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
    await window.screenshot({ path: 'tests/evidence/fuzz-navigation.png' });
  });

  test('Rapid button clicks fuzzing', async () => {
    await window.click('text=Dashboard');
    await window.waitForTimeout(500);

    const updateAllBtn = window.locator('button:has-text("Update All")');
    if (await updateAllBtn.isVisible()) {
      for (let i = 0; i < 15; i++) {
        await updateAllBtn.click({ force: true });
      }
    }

    await window.click('text=Mods');
    await window.waitForTimeout(500);

    // Rapidly toggle mods
    const modToggles = window.locator('button[role="switch"]');
    const count = await modToggles.count();

    if (count > 0) {
      for (let i = 0; i < 10; i++) {
        // Toggle the first available mod switch repeatedly
        await modToggles.first().click({ force: true });
        await window.waitForTimeout(50);
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/fuzz-rapid-clicks.png' });
  });

  test('Settings themes and values fuzzing', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    const themeButtons = window.locator('button:has-text("Light"), button:has-text("Dark"), button:has-text("System")');
    const themeCount = await themeButtons.count();

    if (themeCount > 0) {
        for(let i=0; i<15; i++) {
            const randomThemeIndex = Math.floor(Math.random() * themeCount);
            await themeButtons.nth(randomThemeIndex).click({force: true});
            await window.waitForTimeout(100);
        }
    }

    // Fuzz background opacity slider if present
    const opacityInput = window.locator('input[type="range"]');
    if (await opacityInput.isVisible()) {
      for (let i = 0; i < 5; i++) {
        const val = (Math.floor(Math.random() * 20) * 0.05).toFixed(2);
        await opacityInput.evaluate((el: HTMLInputElement, val: string) => {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, val);
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/fuzz-settings-rapid.png' });
  });
});
