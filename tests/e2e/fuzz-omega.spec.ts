import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Omega Fuzz Testing Scenarios', () => {
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

  test('Fuzzing drag and drop events with invalid data', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const modContainer = window.locator('.flex-1.p-6.overflow-auto');
    if (await modContainer.isVisible()) {
        // Simulate dragging by triggering custom events that avoid strict DataTransfer validation in Playwright
        await modContainer.evaluate((el: any) => {
            const dragEvent = new Event('dragover', { bubbles: true });
            el.dispatchEvent(dragEvent);
        });
        await window.waitForTimeout(50);

        await modContainer.evaluate((el: any) => {
            const dropEvent = new Event('drop', { bubbles: true });
            // @ts-ignore: Mocking data transfer for React synthetic events
            dropEvent.dataTransfer = { files: [] };
            el.dispatchEvent(dropEvent);
        });
        await window.waitForTimeout(50);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-omega-drag-drop.png' });
  });

  test('Continuous window resizing with rapid navigation', async () => {
    const tabs = [
      'button[title="Dashboard"], button:has(.lucide-layout-dashboard)',
      'button[title="Mods"], button:has(.lucide-package)',
      'button[title="Settings"], button:has(.lucide-settings)'
    ];

    for (let i = 0; i < 15; i++) {
        // Random resize
        const width = Math.floor(Math.random() * 1500) + 300; // 300 to 1800
        const height = Math.floor(Math.random() * 800) + 300; // 300 to 1100
        await window.setViewportSize({ width, height });

        // Navigate
        const tab = tabs[i % tabs.length];
        const el = window.locator(tab).first();
        if (await el.isVisible()) {
            await el.click({ force: true });
        }
        await window.waitForTimeout(50);
    }

    await window.setViewportSize({ width: 1280, height: 720 });
    await window.waitForTimeout(500);

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-omega-resize-nav.png' });
  });

  test('Aggressive copy/paste shortcuts fuzzing', async () => {
      // Find an input to test copy/paste
      await window.click('button[title="Settings"], button:has(.lucide-settings)');
      await window.waitForTimeout(500);

      const advancedBtn = window.locator('button:has-text("Show Advanced Settings")');
      if (await advancedBtn.isVisible()) {
        await advancedBtn.click();
      }
      await window.waitForTimeout(500);

      const launchArgsInput = window.locator('input[placeholder="-dx12 -fullscreen"]');
      if (await launchArgsInput.isVisible()) {
          await launchArgsInput.click();
          await launchArgsInput.fill('FuzzingText123');

          for(let i = 0; i < 20; i++) {
              await window.keyboard.press('Control+A');
              await window.keyboard.press('Control+C');
              await window.keyboard.press('ArrowRight');
              await window.keyboard.press('Control+V');
              await window.waitForTimeout(10);
          }
      }

      expect(await window.title()).toBe('Kamisama Loader');
      await window.screenshot({ path: 'tests/evidence/homologation/fuzz-omega-copy-paste.png' });
  });
});
