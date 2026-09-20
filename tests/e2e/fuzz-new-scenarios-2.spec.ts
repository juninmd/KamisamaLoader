import { test, expect, _electron as electron } from '@playwright/test';

test.describe('More New Fuzz Testing Scenarios Part 2', () => {
  let electronApp: any;
  let window: any;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('Fuzz rapid modal opening and closing', async () => {
    // Navigate to Mods
    await window.click('button[title="Mods"], button:has(.lucide-package)');
    await window.waitForTimeout(1000);

    // Check if we can find a mod card to click and open details
    // For fuzzing, we will click randomly around the screen if not found, but we can also use Settings -> About modal if available.
    const settingsBtn = window.locator('button[title="Settings"], button:has(.lucide-settings)');

    for (let i = 0; i < 20; i++) {
        await settingsBtn.click();
        await window.waitForTimeout(50);
        await window.keyboard.press('Escape');
        await window.waitForTimeout(50);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-modal-rapid-2.png' });
  });

  test('Fuzz rapid scrolling on Mods list', async () => {
    await window.click('button[title="Mods"], button:has(.lucide-package)');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (await browseTab.isVisible() && !await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const scrollContainer = window.locator('.overflow-y-auto, main').first();

    if (await scrollContainer.isVisible()) {
        for (let i = 0; i < 30; i++) {
            const y = Math.floor(Math.random() * 5000);
            await scrollContainer.evaluate((el: HTMLElement, yVal: number) => {
                el.scrollTop = yVal;
                el.dispatchEvent(new Event('scroll'));
            }, y);
            await window.waitForTimeout(50);
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-rapid-scroll.png' });
  });

  test('Fuzz extremely small and odd window bounds', async () => {
    // Note: Playwright doesn't easily resize the *electron* window via page.setViewportSize without side effects on layout, but we can try browser window APIs.
    // We will just evaluate a script to spam resize events internally

    for (let i = 0; i < 20; i++) {
        const width = Math.floor(Math.random() * 2000) + 10;
        const height = Math.floor(Math.random() * 2000) + 10;
        await window.setViewportSize({ width, height });
        await window.waitForTimeout(50);
    }

    // Restore size
    await window.setViewportSize({ width: 1280, height: 720 });

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-window-bounds.png' });
  });

  test('Fuzz weird search keys and symbols', async () => {
    await window.click('button[title="Mods"], button:has(.lucide-package)');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (await browseTab.isVisible() && !await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const searchInput = window.getByPlaceholder('Search mods...');
    if (await searchInput.isVisible()) {
        const weirdStrings = [
            '§±!@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./',
            '\\x00\\x01\\x02\\x03',
            '\\n\\r\\t\\b\\f\\v',
            'A'.repeat(1000),
            'null', 'undefined', 'NaN', 'Infinity'
        ];

        for (const fuzz of weirdStrings) {
            await searchInput.fill(fuzz);
            await searchInput.press('Enter');
            await window.waitForTimeout(100);
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-weird-search.png' });
  });
});
