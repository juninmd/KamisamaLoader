import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Extreme Fuzz Testing Scenarios Part 13', () => {
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

  test('Fuzz rapid window resizing', async () => {
    for (let i = 0; i < 20; i++) {
        const width = Math.floor(Math.random() * 800) + 400; // between 400 and 1200
        const height = Math.floor(Math.random() * 600) + 300; // between 300 and 900
        try {
          await window.setViewportSize({ width, height });
          await window.waitForTimeout(10);
        } catch(e) {
          // Ignore
        }
    }
    await window.setViewportSize({ width: 1200, height: 800 }); // reset
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-rapid-window-resizing.png' });
  });

  test('Fuzz random double clicks', async () => {
    for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * 800);
        const y = Math.floor(Math.random() * 600);
        try {
          await window.mouse.dblclick(x, y);
          await window.waitForTimeout(10);
        } catch(e) {
          // Ignore
        }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-random-double-clicks.png' });
  });

  test('Fuzz random right clicks', async () => {
    for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * 800);
        const y = Math.floor(Math.random() * 600);
        try {
          await window.mouse.click(x, y, { button: 'right' });
          await window.waitForTimeout(10);
        } catch(e) {
          // Ignore
        }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-random-right-clicks.png' });
  });

  test('Fuzz wild scrolling', async () => {
    for (let i = 0; i < 20; i++) {
        const deltaX = Math.floor(Math.random() * 1000) - 500;
        const deltaY = Math.floor(Math.random() * 1000) - 500;
        try {
          await window.mouse.wheel(deltaX, deltaY);
          await window.waitForTimeout(10);
        } catch(e) {
          // Ignore
        }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-wild-scrolling.png' });
  });

  test('Fuzz keyboard mashing', async () => {
    const chars = 'abcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*()_+~`|}{[]:;?><,./-= \n\t';
    for (let i = 0; i < 50; i++) {
        const char = chars[Math.floor(Math.random() * chars.length)];
        try {
          await window.keyboard.press(char);
          await window.waitForTimeout(10);
        } catch(e) {
          // Ignore
        }
    }
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-keyboard-mashing.png' });
  });
});
