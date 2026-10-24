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

  test('Fuzz rapid window blur and focus', async () => {
    for (let i = 0; i < 20; i++) {
        try {
          await window.evaluate(() => window.dispatchEvent(new Event('blur')));
          await window.waitForTimeout(10);
          await window.evaluate(() => window.dispatchEvent(new Event('focus')));
          await window.waitForTimeout(10);
        } catch(e) {
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
          // click somewhere else to close context menu
          await window.mouse.click(0, 0);
        } catch(e) {
          // Ignore
        }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-16-contextmenu.png' });
  });

});
