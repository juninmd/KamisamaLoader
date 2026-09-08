import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Extreme Fuzz Testing Scenarios Part 2', () => {
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

  test('Rapid theme toggling and layout fuzzing', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    const themeToggle = window.locator('button[role="checkbox"]').first();

    if (await themeToggle.isVisible()) {
      for (let i = 0; i < 20; i++) {
        await themeToggle.click();
        await window.waitForTimeout(10);
      }
    }

    await window.setViewportSize({ width: 300, height: 300 });
    await window.waitForTimeout(50);
    await window.setViewportSize({ width: 1920, height: 1080 });
    await window.waitForTimeout(50);
    await window.setViewportSize({ width: 400, height: 800 });

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-2-theme-layout.png' });
  });

  test('Excessively large search payloads and rapid switching part 2', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const searchInput = window.locator('input[placeholder="Search mods..."]');
    if (await searchInput.isVisible()) {
      const longString = 'A'.repeat(5000);
      await searchInput.fill(longString);
      await window.waitForTimeout(100);

      const filterSelect = window.locator('select');
      if (await filterSelect.isVisible()) {
        await filterSelect.selectOption({ index: 1 });
        await filterSelect.selectOption({ index: 2 });
        await filterSelect.selectOption({ index: 0 });
      }

      await searchInput.fill('!@#$%^&*()_+-=[]{}|;:\'",.<>/?`~\\');
      await searchInput.press('Enter');
      await window.waitForTimeout(200);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-2-search-malformed.png' });
  });
});
