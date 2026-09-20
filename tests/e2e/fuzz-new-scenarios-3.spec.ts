import { test, expect, _electron as electron } from '@playwright/test';

test.describe('More New Fuzz Testing Scenarios Part 3', () => {
  let electronApp: any;
  let window: any;

  test.beforeEach(async () => {
    electronApp = await electron.launch({
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(1000);
  });

  test.afterEach(async () => {
    await electronApp.close();
  });

  test('Fuzz keyboard mash inside inputs', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    const inputs = await window.locator('input[type="text"]').all();
    if (inputs.length > 0) {
      for (const input of inputs) {
        if (await input.isVisible() && await input.isEditable()) {
           await input.focus();
           for (let i = 0; i < 20; i++) {
               // Spam random control keys
               const keys = ['Control+A', 'Control+C', 'Control+V', 'Backspace', 'Delete', 'Enter', 'Escape', 'ArrowLeft', 'ArrowRight'];
               const key = keys[Math.floor(Math.random() * keys.length)];
               await window.keyboard.press(key);
               await window.waitForTimeout(20);
               // Add a random char
               await window.keyboard.type(String.fromCharCode(97 + Math.floor(Math.random() * 26)));
           }
        }
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-keyboard-mash-inputs.png' });
  });

  test('Fuzz rapid double clicks on UI buttons', async () => {
    const buttons = await window.locator('button').all();

    // Pick first 5 visible buttons to spam double clicks on
    let count = 0;
    for (const btn of buttons) {
        if (await btn.isVisible() && count < 5) {
            for(let i=0; i < 5; i++) {
                await btn.dblclick({ force: true });
                await window.waitForTimeout(50);
            }
            count++;
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-rapid-dblclick.png' });
  });

  test('Fuzz rapid profile selection', async () => {
    // Navigate to Mods
    await window.click('button[title="Mods"], button:has(.lucide-package)');
    await window.waitForTimeout(1000);

    const profileSelect = window.locator('select'); // assuming the profile dropdown is a select element
    if (await profileSelect.isVisible()) {
        const options = await profileSelect.locator('option').allInnerTexts();
        if (options.length > 1) {
            for (let i = 0; i < 20; i++) {
                const randomOption = options[Math.floor(Math.random() * options.length)];
                await profileSelect.selectOption({ label: randomOption });
                await window.waitForTimeout(50);
            }
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-rapid-profiles.png' });
  });
});
