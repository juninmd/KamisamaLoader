import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Ultra Fuzz Testing Scenarios', () => {
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

  test('Rapid tab switching fuzzing', async () => {
    const tabs = [
      'button[title="Dashboard"], button:has(.lucide-layout-dashboard)',
      'button[title="Mods"], button:has(.lucide-package)',
      'button[title="Settings"], button:has(.lucide-settings)'
    ];

    for (let i = 0; i < 20; i++) {
      const tab = tabs[i % tabs.length];
      const el = window.locator(tab).first();
      if (await el.isVisible()) {
          await el.click({ force: true });
          await window.waitForTimeout(50);
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-ultra-rapid-tabs.png' });
  });

  test('Wild keyboard smashing fuzzing', async () => {
    const keys = ['a', 'b', 'c', '1', '2', 'Enter', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'Space', 'Backspace'];

    for (let i = 0; i < 50; i++) {
        const key = keys[Math.floor(Math.random() * keys.length)];
        await window.keyboard.press(key);
        await window.waitForTimeout(10);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-ultra-keyboard-smash.png' });
  });

  test('Extremely large string inputs in Settings fuzzing', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(500);

    const advancedBtn = window.locator('button:has-text("Show Advanced Settings")');
    if (await advancedBtn.isVisible()) {
      await advancedBtn.click();
    }
    await window.waitForTimeout(500);

    const launchArgsInput = window.locator('input[placeholder="-dx12 -fullscreen"]');
    if (await launchArgsInput.isVisible()) {
      const hugeString = 'A'.repeat(5000) + ' ' + '-B '.repeat(1000);
      await launchArgsInput.fill(hugeString);
      await window.waitForTimeout(100);
      await launchArgsInput.press('Enter');
      await window.waitForTimeout(100);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-ultra-large-strings.png' });
  });
});
