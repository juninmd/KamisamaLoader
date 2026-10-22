import { _electron as electron } from '@playwright/test';
import { test, expect } from '@playwright/test';

test.describe('Extreme Fuzz Testing 14', () => {
  let app: any;
  let window: any;

  test.beforeEach(async () => {
    app = await electron.launch({ args: ['.'] });
    window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');
  });

  test.afterEach(async () => {
    if (app) {
      await app.close();
    }
  });

  test('Crazy mouse mashing with modifiers', async () => {
    // Generate massive rapid clicks everywhere with shift, ctrl, alt combos
    for (let i = 0; i < 50; i++) {
        const x = Math.floor(Math.random() * 800) + 100;
        const y = Math.floor(Math.random() * 600) + 100;
        const modifiers: Array<'Alt' | 'Control' | 'Meta' | 'Shift'> = [];
        if (Math.random() > 0.5) modifiers.push('Shift');
        if (Math.random() > 0.5) modifiers.push('Control');

        await window.mouse.click(x, y, { modifiers, button: Math.random() > 0.5 ? 'left' : 'right' });
    }

    await expect(window.locator('body')).toBeVisible();
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-14-1.png' });
  });

  test('Dashboard random click fuzzing', async () => {
    const dashboardButton = window.locator('text=Dashboard').first();
    await dashboardButton.click();

    for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * 800) + 100;
        const y = Math.floor(Math.random() * 600) + 100;
        await window.mouse.click(x, y, { clickCount: Math.random() > 0.8 ? 2 : 1 });
    }

    await expect(window.locator('body')).toBeVisible();
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-14-2.png' });
  });
});
