import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Final 100% Coverage Fuzz Testing and Edge Cases', () => {
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

  test('Rapid navigation and settings overlay double-click fuzzing', async () => {
    // Spam navigation tabs
    const navTabs = ['text=Dashboard', 'text=Mods', 'text=Dashboard', 'text=Mods'];
    for (const tab of navTabs) {
        await window.click(tab);
        await window.waitForTimeout(50);
    }

    // Frantic clicks on settings
    await window.dblclick('button[title="Settings"], button:has(.lucide-settings)', { force: true });
    await window.waitForTimeout(200);

    // Spam theme toggles and updates if present
    const checkUpdatesBtn = window.locator('button:has-text("Check for Updates")');
    if (await checkUpdatesBtn.isVisible()) {
        for (let i = 0; i < 5; i++) {
            await checkUpdatesBtn.click({ force: true });
            await window.waitForTimeout(20);
        }
    }

    const showAdvancedBtn = window.locator('button:has-text("Show Advanced Settings")');
    if (await showAdvancedBtn.isVisible()) {
        await showAdvancedBtn.click({ force: true });
        await window.waitForTimeout(200);
    }

    // Rapidly toggle advanced settings toggles
    const switches = window.locator('button[role="checkbox"]');
    const count = await switches.count();
    if (count > 0) {
        for (let i = 0; i < Math.min(count, 3); i++) {
             for (let j = 0; j < 5; j++) {
                 await switches.nth(i).click({ force: true });
                 await window.waitForTimeout(20);
             }
        }
    }

    // Capture explicit "tire prints" (screenshot)
    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-final-100.png' });
  });

  test('Chaotic drag and drop and mouse mashing', async () => {
      await window.click('text=Mods');
      await window.waitForTimeout(500);

      const container = window.locator('.flex.flex-col.h-full').first();
      if (await container.isVisible()) {
          // Send raw chaotic pointer events
          for (let i = 0; i < 20; i++) {
              const x = Math.floor(Math.random() * 500);
              const y = Math.floor(Math.random() * 500);
              await window.mouse.click(x, y, { button: 'left', force: true });
              await window.waitForTimeout(10);
          }

          await container.evaluate((el: any) => {
              const dragEvent = new DragEvent('drop', {
                  bubbles: true,
                  cancelable: true,
                  dataTransfer: new DataTransfer()
              });
              el.dispatchEvent(dragEvent);
          });
      }

      expect(await window.title()).toBe('Kamisama Loader');
      await window.screenshot({ path: 'tests/evidence/homologation/fuzz-final-100-chaotic-drag.png' });
  });
});
