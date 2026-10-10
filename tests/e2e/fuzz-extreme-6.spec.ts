import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Extreme Fuzz Testing Scenarios Part 6', () => {
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

  test('Fuzz excessive window maximizing and unmaximizing', async () => {
    for (let i = 0; i < 5; i++) {
        await window.evaluate(() => {
            if (window.electronAPI && window.electronAPI.maximizeWindow) {
                 window.electronAPI.maximizeWindow();
            }
        });
        await window.waitForTimeout(200);
        await window.evaluate(() => {
            if (window.electronAPI && window.electronAPI.minimizeWindow) {
                 window.electronAPI.minimizeWindow();
            }
        });
        await window.waitForTimeout(200);
        await window.evaluate(() => {
             // restore by toggling maximize again or similar
             if (window.electronAPI && window.electronAPI.maximizeWindow) {
                 window.electronAPI.maximizeWindow();
            }
        });
        await window.waitForTimeout(200);
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-excessive-window-maximize.png' });
  });

  test('Fuzz drag over non-droppable elements', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const nav = window.getByRole('navigation');
    if (await nav.isVisible()) {
        await nav.evaluate((el: HTMLElement) => {
            const dt = new DataTransfer();
            dt.effectAllowed = 'all';
            const event = new DragEvent('dragover', {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt
            });
            el.dispatchEvent(event);
        });
        await window.waitForTimeout(100);

        await nav.evaluate((el: HTMLElement) => {
            const dt = new DataTransfer();
            dt.effectAllowed = 'all';
            const event = new DragEvent('drop', {
                bubbles: true,
                cancelable: true,
                dataTransfer: dt
            });
            el.dispatchEvent(event);
        });
    }

    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-drag-non-droppable.png' });
  });

});
