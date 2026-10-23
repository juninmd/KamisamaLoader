import { _electron as electron } from '@playwright/test';
import { test, expect } from '@playwright/test';

test.describe('Extreme Fuzz Testing 16', () => {
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

  test('Extreme navigation fuzzing between tabs', async () => {
    const tabs = ['text=Dashboard', 'text=Mods', 'text=Settings'];

    // Rapidly switch between tabs to ensure unmounting/mounting stability
    for (let i = 0; i < 30; i++) {
        const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
        const tabLocator = window.locator(randomTab).first();
        await tabLocator.click({ force: true }).catch(() => {});
        // Occasional wait to allow renders
        if (i % 5 === 0) {
           await window.waitForTimeout(100);
        }
    }

    await expect(window.locator('body')).toBeVisible();
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-16-1.png' });
  });

  test('Fuzz drag and drop layout areas', async () => {
    const modsButton = window.locator('text=Mods').first();
    await modsButton.click();
    await window.waitForTimeout(500);

    const targetArea = window.locator('body').first();

    for (let i = 0; i < 20; i++) {
        // Trigger simulated drag events over random locations
        const x = Math.floor(Math.random() * 800) + 100;
        const y = Math.floor(Math.random() * 600) + 100;

        await targetArea.evaluate((el: Element, opts) => {
            const dragEvent = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                clientX: opts.x,
                clientY: opts.y,
            });
            Object.defineProperty(dragEvent, 'dataTransfer', {
                value: { files: [] }
            });
            el.dispatchEvent(dragEvent);
        }, { x, y });

        await targetArea.evaluate((el: Element, opts) => {
             const dragEnterEvent = new DragEvent('dragenter', {
                 bubbles: true,
                 cancelable: true,
                 clientX: opts.x,
                 clientY: opts.y,
             });
             Object.defineProperty(dragEnterEvent, 'dataTransfer', {
                 value: { files: [] }
             });
             el.dispatchEvent(dragEnterEvent);
        }, { x, y });
    }

    await expect(window.locator('body')).toBeVisible();
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-16-2.png' });
  });
});
