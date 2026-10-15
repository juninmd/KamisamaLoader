import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Extreme Fuzz Testing Scenarios Part 11', () => {
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

  test('Fuzz extreme multi-key chord smashing', async () => {
    const keys = ['Control', 'Shift', 'Alt', 'Meta', 'a', 'b', 'c', '1', '2', 'Enter', 'Escape'];
    for (let i = 0; i < 30; i++) {
      const key1 = keys[Math.floor(Math.random() * keys.length)];
      const key2 = keys[Math.floor(Math.random() * keys.length)];
      try {
        await window.keyboard.press(`${key1}+${key2}`);
        await window.waitForTimeout(10);
      } catch (e) {
        // ignore invalid combinations
      }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-multi-key-smash.png' });
  });

  test('Fuzz rapid focus cycling', async () => {
    for (let i = 0; i < 20; i++) {
      await window.keyboard.press('Tab');
      await window.waitForTimeout(10);
      await window.keyboard.press('Shift+Tab');
      await window.waitForTimeout(10);
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-rapid-focus-cycle.png' });
  });

});
