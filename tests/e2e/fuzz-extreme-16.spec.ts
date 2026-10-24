import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Extreme Fuzz Testing Scenarios Part 16', () => {
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

  test('Extreme navigation fuzzing between tabs', async () => {
    const tabs = ['text=Dashboard', 'text=Mods', 'text=Settings'];

    for (let i = 0; i < 30; i++) {
      const randomTab = tabs[Math.floor(Math.random() * tabs.length)];
      const tabLocator = window.locator(randomTab).first();
      await tabLocator.click({ force: true }).catch(() => {});
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

  test('Fuzz rapid window blur and focus', async () => {
    for (let i = 0; i < 20; i++) {
      try {
        await window.evaluate(() => window.dispatchEvent(new Event('blur')));
        await window.waitForTimeout(10);
        await window.evaluate(() => window.dispatchEvent(new Event('focus')));
        await window.waitForTimeout(10);
      } catch (e) {
        // Ignore
      }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-16-blur-focus.png' });
  });

  test('Fuzz rapid context menu spamming', async () => {
    for (let i = 0; i < 20; i++) {
      const x = Math.floor(Math.random() * 800);
      const y = Math.floor(Math.random() * 600);
      try {
        await window.evaluate((pos) => {
          const ev = new MouseEvent('contextmenu', {
            bubbles: true,
            cancelable: true,
            clientX: pos.x,
            clientY: pos.y
          });
          document.elementFromPoint(pos.x, pos.y)?.dispatchEvent(ev);
        }, { x, y });
        await window.waitForTimeout(10);
        await window.mouse.click(0, 0);
      } catch (e) {
        // Ignore
      }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-16-contextmenu.png' });
  });
});
