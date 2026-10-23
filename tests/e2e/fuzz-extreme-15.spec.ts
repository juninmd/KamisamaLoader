import { _electron as electron } from '@playwright/test';
import { test, expect } from '@playwright/test';

test.describe('Extreme Fuzz Testing 15', () => {
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

  test('Settings rapid toggling and input fuzzing', async () => {
    const settingsButton = window.locator('text=Settings').first();
    await settingsButton.click();
    await window.waitForTimeout(500);

    for (let i = 0; i < 20; i++) {
        // Toggle advanced settings randomly
        if (Math.random() > 0.5) {
            const advancedToggle = window.locator('text=Show Advanced Settings').first();
            if (await advancedToggle.isVisible()) {
                await advancedToggle.click();
            }
        }

        // Randomly click checkboxes
        const checkboxes = await window.locator('role=checkbox').all();
        if (checkboxes.length > 0) {
            const randomCheckbox = checkboxes[Math.floor(Math.random() * checkboxes.length)];
            await randomCheckbox.click({ force: true }).catch(() => {});
        }
    }

    await expect(window.locator('body')).toBeVisible();
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-15-1.png' });
  });

  test('Mod navigation and rapid filtering', async () => {
    const modsButton = window.locator('text=Mods').first();
    await modsButton.click();
    await window.waitForTimeout(500);

    for (let i = 0; i < 15; i++) {
        const x = Math.floor(Math.random() * 800) + 100;
        const y = Math.floor(Math.random() * 600) + 100;

        // Random clicks on screen
        await window.mouse.click(x, y, { clickCount: 1 });

        // Random keyboard inputs
        await window.keyboard.type(Math.random().toString(36).substring(7));
        await window.keyboard.press('Enter');
        await window.keyboard.press('Backspace');
    }

    await expect(window.locator('body')).toBeVisible();
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-15-2.png' });
  });
});
