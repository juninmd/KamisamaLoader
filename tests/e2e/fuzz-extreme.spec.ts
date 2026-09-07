import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Extreme Fuzz Testing Scenarios', () => {
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

  test('Excessively large search payloads and rapid switching', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const searchInput = window.getByPlaceholder('Search mods...');
    if (await searchInput.isVisible()) {
      const hugePayload = 'A'.repeat(50000); // 50k chars
      await searchInput.fill(hugePayload);
      await searchInput.press('Enter');
      await window.waitForTimeout(100);

      const smallPayload = 'test';
      await searchInput.fill(smallPayload);
      await searchInput.press('Enter');
      await window.waitForTimeout(100);

      const emojiPayload = '🚀'.repeat(5000);
      await searchInput.fill(emojiPayload);
      await searchInput.press('Enter');
      await window.waitForTimeout(100);
    }

    // Rapid route switching
    for (let i = 0; i < 20; i++) {
        await window.click('text=Dashboard');
        await window.waitForTimeout(20);
        await window.click('text=Mods');
        await window.waitForTimeout(20);
        await window.click('button[title="Settings"], button:has(.lucide-settings)');
        await window.waitForTimeout(20);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-search-route.png' });
  });

  test('Invalid local paths and malformed URIs', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    const gameExeInput = window.getByPlaceholder('Path to Dragon Ball: Sparking! ZERO executable');

    if (await gameExeInput.isVisible()) {
      const invalidPaths = [
        'Z:\\Invalid\\Path\\To\\Game.exe',
        'file://C:/malformed/path',
        'http://localhost:3000/malformed',
        '\\\\.\\pipe\\invalid',
        '..\\..\\..\\Windows\\System32\\cmd.exe'
      ];

      for (const invalidPath of invalidPaths) {
        await gameExeInput.evaluate((el: HTMLInputElement, val: string) => {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, invalidPath);
        await gameExeInput.press('Enter');
        await window.waitForTimeout(50);
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-paths.png' });
  });
});
