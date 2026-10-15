import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Extreme Fuzz Testing Scenarios Part 12', () => {
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

  test('Fuzz rapid and random mouse clicks', async () => {
    for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * 800);
        const y = Math.floor(Math.random() * 600);
        try {
          await window.mouse.click(x, y);
          await window.waitForTimeout(10);
        } catch(e) {
          // Ignore
        }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-random-mouse-clicks.png' });
  });

  test('Fuzz random mouse dragging', async () => {
    for (let i = 0; i < 15; i++) {
        const startX = Math.floor(Math.random() * 800);
        const startY = Math.floor(Math.random() * 600);
        const endX = Math.floor(Math.random() * 800);
        const endY = Math.floor(Math.random() * 600);

        try {
          await window.mouse.move(startX, startY);
          await window.mouse.down();
          await window.mouse.move(endX, endY, { steps: 5 });
          await window.mouse.up();
          await window.waitForTimeout(10);
        } catch(e) {
            // Ignore
        }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-random-mouse-drag.png' });
  });

});
