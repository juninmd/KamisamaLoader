import { test, expect, _electron as electron } from '@playwright/test';

test.describe('New Fuzz Testing Scenarios', () => {
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

  test('Settings - Advanced Options Rapid Toggles and Launch Arguments Fuzzing', async () => {
    // Navigate to Settings
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    // Toggle Advanced Settings rapidly
    const advancedToggle = window.locator('button[role="switch"]').first();
    if (await advancedToggle.isVisible()) {
      for (let i = 0; i < 15; i++) {
        await advancedToggle.click({ force: true });
        await window.waitForTimeout(50);
      }

      // Ensure it's active for the next part
      if (!await window.locator('text=Launch Arguments').isVisible()) {
          await advancedToggle.click();
          await window.waitForTimeout(500);
      }
    }

    // Fuzz Launch Arguments
    const launchArgsInput = window.getByPlaceholder('e.g., -noverifyfiles -nomovies');

    const fuzzStrings = [
      '',
      '   ',
      'a'.repeat(500),
      '<script>alert("xss")</script>',
      '\\u0000\\u0001',
      '-flag1 -flag2="value with spaces" --long-flag',
      '👾 🤖 👻',
      '--\'; SELECT * FROM users;'
    ];

    if (await launchArgsInput.isVisible()) {
      for (const fuzz of fuzzStrings) {
        await launchArgsInput.fill(fuzz);
        await window.waitForTimeout(200);
      }

      // Reset to safe value
      await launchArgsInput.fill('');
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-new-advanced-settings.png' });
  });

  test('Opacity Slider Rapid Adjustment', async () => {
    // Navigate to Settings
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    // Fuzz background opacity slider
    const opacityInput = window.locator('input[type="range"]');
    if (await opacityInput.isVisible()) {
      for (let i = 0; i < 50; i++) {
        // Rapidly change the value between 0.0 and 1.0
        const val = (Math.random()).toFixed(2);
        await opacityInput.evaluate((el: HTMLInputElement, val: string) => {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, val);
        await window.waitForTimeout(20);
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-new-opacity-slider.png' });
  });
});
