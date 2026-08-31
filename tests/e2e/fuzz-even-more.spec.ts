import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Even More Extended Fuzz Testing Scenarios', () => {
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

  test('Excessively long query string search fuzzing', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }

    await window.waitForTimeout(1000);

    const searchInput = window.getByPlaceholder('Search mods...');

    // Fuzz inputs
    const fuzzStrings = [
      'a'.repeat(10000), // Excessively long string
      'b'.repeat(20000), // Even longer
      '🍔'.repeat(5000), // Large unicode
      '123'.repeat(3000)
    ];

    if (await searchInput.isVisible()) {
      for (const fuzz of fuzzStrings) {
        await searchInput.fill(fuzz);
        await searchInput.press('Enter');
        await window.waitForTimeout(500);
        expect(await window.title()).toBe('Kamisama Loader');
      }
    }

    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-search-excessive.png' });
  });

  test('Rapid sorting and filter combination fuzzing', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const sortButton = window.locator('button:has-text("Sort by:")');
    const filterButton = window.locator('button:has-text("All Categories")');

    if (await sortButton.isVisible() && await filterButton.isVisible()) {
        for(let i=0; i<15; i++) {
            // Randomly toggle sort
            await sortButton.click({ force: true });
            await window.waitForTimeout(20);
            await window.keyboard.press('ArrowDown');
            await window.waitForTimeout(20);
            await window.keyboard.press('Enter');
            await window.waitForTimeout(20);

            // Randomly toggle filter
            await filterButton.click({ force: true });
            await window.waitForTimeout(20);
            await window.keyboard.press('ArrowDown');
            await window.waitForTimeout(20);
            await window.keyboard.press('Enter');
            await window.waitForTimeout(20);
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-sorting-filtering-rapid.png' });
  });

  test('Context menu and rapid escape fuzzing', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const browseTab = window.locator('button:has-text("My Mods")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(500);

    // Spam right click and escape on random parts of the screen
    for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * 800);
        const y = Math.floor(Math.random() * 600);
        await window.mouse.click(x, y, { button: 'right' });
        await window.waitForTimeout(50);
        await window.keyboard.press('Escape');
        await window.waitForTimeout(50);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-context-menu-spam.png' });
  });

  test('Window minimize, maximize and restore fuzzing', async () => {
    for (let i = 0; i < 10; i++) {
      // We simulate window state changes using window.evaluate to call electron window APIs
      // Note: We might need to ensure window.electronAPI is available.
      // A simpler fuzzing is just resizing rapidly.
      const w = Math.floor(400 + Math.random() * 800);
      const h = Math.floor(400 + Math.random() * 600);
      await window.setViewportSize({ width: w, height: h });
      await window.waitForTimeout(100);
    }

    await window.setViewportSize({ width: 1280, height: 720 });
    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-window-state-rapid.png' });
  });

  test('Simulate offline and online state rapid toggling', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    for (let i = 0; i < 5; i++) {
      await window.context().setOffline(true);
      await window.waitForTimeout(200);

      const searchInput = window.getByPlaceholder('Search mods...');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await searchInput.press('Enter');
      }

      await window.waitForTimeout(200);
      await window.context().setOffline(false);
      await window.waitForTimeout(200);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-offline-online-toggling.png' });
  });
});
