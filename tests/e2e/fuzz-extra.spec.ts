import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Additional Fuzz Testing and Edge Cases', () => {
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

  test('Window resizing fuzzing', async () => {
    const sizes = [
      { width: 1920, height: 1080 },
      { width: 800, height: 600 },
      { width: 400, height: 800 }, // Mobile-like vertical
      { width: 2560, height: 1440 }, // Ultra-wide
      { width: 100, height: 100 }, // Extremely small
      { width: 3000, height: 50 }, // Extremely wide and short
    ];

    for (const size of sizes) {
      await window.setViewportSize(size);
      await window.waitForTimeout(100);
    }

    // Restore to a sensible default before screenshot
    await window.setViewportSize({ width: 1280, height: 720 });
    await window.waitForTimeout(500);

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-resizing.png' });
  });

  test('Rapid modal toggling fuzzing', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const manageProfilesBtn = window.locator('button[title="Manage Mod Profiles"]');
    if (await manageProfilesBtn.isVisible()) {
      for (let i = 0; i < 15; i++) {
        await manageProfilesBtn.click({ force: true });
        await window.waitForTimeout(50);

        // If modal is open, hit Escape to close it
        const modal = window.locator('div[role="dialog"]');
        if (await modal.isVisible()) {
          await window.keyboard.press('Escape');
          await window.waitForTimeout(50);
        }
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-modal-rapid.png' });
  });

  test('Malformed Search input fuzzing in Browse Online', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const searchInput = window.getByPlaceholder('Search mods...');
    if (await searchInput.isVisible()) {
        const fuzzStrings = [
            '../../../../etc/shadow',
            '<script>alert(1)</script>',
            'A'.repeat(5000),
            '\\0\\0\\0',
            './relative/path/to/nowhere'
        ];

        for (const fuzz of fuzzStrings) {
            await searchInput.fill(fuzz);
            // Simulate blur or enter to trigger validation if any
            await searchInput.press('Enter');
            await window.waitForTimeout(100);
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-search-malformed.png' });
  });

  test('Mouse movement and rapid hover fuzzing', async () => {
      // Rapidly move mouse across the screen to trigger hover states
      for (let i = 0; i < 20; i++) {
          const x = Math.floor(Math.random() * 800);
          const y = Math.floor(Math.random() * 600);
          await window.mouse.move(x, y);
          await window.waitForTimeout(20);
      }

      expect(await window.title()).toBe('Kamisama Loader');
      await window.screenshot({ path: 'tests/evidence/homologation/fuzz-mouse-hover.png' });
  });



  test('Extensive Mod Settings Fuzzing', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const filterButton = window.locator('button:has-text("All Categories")');
    if (await filterButton.isVisible()) {
        for(let i=0; i<10; i++) {
             await filterButton.click({ force: true });
             await window.waitForTimeout(50);
             await window.keyboard.press('ArrowDown');
             await window.keyboard.press('Enter');
        }
    }

    const sortButton = window.locator('button:has-text("Sort by:")');
    if (await sortButton.isVisible()) {
        for(let i=0; i<5; i++) {
            await sortButton.click({ force: true });
            await window.waitForTimeout(50);
            await window.keyboard.press('ArrowDown');
            await window.keyboard.press('Enter');
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-mod-filters.png' });
});

test('Theme Toggle Spam Fuzzing', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(500);

    const themeToggle = window.locator('button:has-text("Light"), button:has-text("Dark"), button:has-text("System")').first();
    if (await themeToggle.isVisible()) {
        for (let i = 0; i < 20; i++) {
            await themeToggle.click({ force: true });
            await window.waitForTimeout(20);
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-theme-spam.png' });
});

test('Spam Download Button Fuzzing', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const firstModCard = window.locator('.group.relative.flex.flex-col').first();
    if (await firstModCard.isVisible()) {
        const downloadBtn = firstModCard.locator('button[title="Download Mod"], button:has(.lucide-download)');
        if (await downloadBtn.isVisible()) {
            for(let i=0; i<10; i++) {
                 await downloadBtn.click({ force: true });
                 await window.waitForTimeout(10);
            }
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-download-spam.png' });
});

test('Fuzz rapid modal opening and closing', async () => {
    // Navigate to Mods
    await window.click('button[title="Mods"], button:has(.lucide-package)');
    await window.waitForTimeout(1000);

    // Check if we can find a mod card to click and open details
    // For fuzzing, we will click randomly around the screen if not found, but we can also use Settings -> About modal if available.
    const settingsBtn = window.locator('button[title="Settings"], button:has(.lucide-settings)');

    for (let i = 0; i < 20; i++) {
        await settingsBtn.click();
        await window.waitForTimeout(50);
        await window.keyboard.press('Escape');
        await window.waitForTimeout(50);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-modal-rapid-2.png' });
  });

  test('Fuzz rapid scrolling on Mods list', async () => {
    await window.click('button[title="Mods"], button:has(.lucide-package)');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (await browseTab.isVisible() && !await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const scrollContainer = window.locator('.overflow-y-auto, main').first();

    if (await scrollContainer.isVisible()) {
        for (let i = 0; i < 30; i++) {
            const y = Math.floor(Math.random() * 5000);
            await scrollContainer.evaluate((el: HTMLElement, yVal: number) => {
                el.scrollTop = yVal;
                el.dispatchEvent(new Event('scroll'));
            }, y);
            await window.waitForTimeout(50);
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-rapid-scroll.png' });
  });

  test('Fuzz extremely small and odd window bounds', async () => {
    // Note: Playwright doesn't easily resize the *electron* window via page.setViewportSize without side effects on layout, but we can try browser window APIs.
    // We will just evaluate a script to spam resize events internally

    for (let i = 0; i < 20; i++) {
        const width = Math.floor(Math.random() * 2000) + 10;
        const height = Math.floor(Math.random() * 2000) + 10;
        await window.setViewportSize({ width, height });
        await window.waitForTimeout(50);
    }

    // Restore size
    await window.setViewportSize({ width: 1280, height: 720 });

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-window-bounds.png' });
  });

  test('Fuzz weird search keys and symbols', async () => {
    await window.click('button[title="Mods"], button:has(.lucide-package)');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (await browseTab.isVisible() && !await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const searchInput = window.getByPlaceholder('Search mods...');
    if (await searchInput.isVisible()) {
        const weirdStrings = [
            '§±!@#$%^&*()_+{}|:"<>?~`-=[]\\;\',./',
            '\\x00\\x01\\x02\\x03',
            '\\n\\r\\t\\b\\f\\v',
            'A'.repeat(1000),
            'null', 'undefined', 'NaN', 'Infinity'
        ];

        for (const fuzz of weirdStrings) {
            await searchInput.fill(fuzz);
            await searchInput.press('Enter');
            await window.waitForTimeout(100);
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-weird-search.png' });
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


  // From fuzz-even-more.spec.ts
  test('Excessively long query string search fuzzing', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }

    await window.waitForTimeout(1000);

    const searchInput = window.getByPlaceholder('Search mods...');

    // Fuzz inputs
    const fuzzStrings = [
      'a'.repeat(10000), // Excessively long string
      'b'.repeat(20000), // Even longer
      '🍔'.repeat(5000), // Large unicode
      '123'.repeat(3000)
    ];

    if (await searchInput.isVisible()) {
      for (const fuzz of fuzzStrings) {
        await searchInput.fill(fuzz);
        await searchInput.press('Enter');
        await window.waitForTimeout(500);
        expect(await window.title()).toBe('Kamisama Loader');
      }
    }

    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-search-excessive.png' });
  });

  test('Rapid sorting and filter combination fuzzing', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const sortButton = window.locator('button:has-text("Sort by:")');
    const filterButton = window.locator('button:has-text("All Categories")');

    if (await sortButton.isVisible() && await filterButton.isVisible()) {
        for(let i=0; i<15; i++) {
            // Randomly toggle sort
            await sortButton.click({ force: true });
            await window.waitForTimeout(20);
            await window.keyboard.press('ArrowDown');
            await window.waitForTimeout(20);
            await window.keyboard.press('Enter');
            await window.waitForTimeout(20);

            // Randomly toggle filter
            await filterButton.click({ force: true });
            await window.waitForTimeout(20);
            await window.keyboard.press('ArrowDown');
            await window.waitForTimeout(20);
            await window.keyboard.press('Enter');
            await window.waitForTimeout(20);
        }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-sorting-filtering-rapid.png' });
  });

  test('Context menu and rapid escape fuzzing', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const browseTab = window.locator('button:has-text("My Mods")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(500);

    // Spam right click and escape on random parts of the screen
    for (let i = 0; i < 20; i++) {
        const x = Math.floor(Math.random() * 800);
        const y = Math.floor(Math.random() * 600);
        await window.mouse.click(x, y, { button: 'right' });
        await window.waitForTimeout(50);
        await window.keyboard.press('Escape');
        await window.waitForTimeout(50);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-context-menu-spam.png' });
  });

  test('Window minimize, maximize and restore fuzzing', async () => {
    for (let i = 0; i < 10; i++) {
      // We simulate window state changes using window.evaluate to call electron window APIs
      // Note: We might need to ensure window.electronAPI is available.
      // A simpler fuzzing is just resizing rapidly.
      const w = Math.floor(400 + Math.random() * 800);
      const h = Math.floor(400 + Math.random() * 600);
      await window.setViewportSize({ width: w, height: h });
      await window.waitForTimeout(100);
    }

    await window.setViewportSize({ width: 1280, height: 720 });
    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-window-state-rapid.png' });
  });

  test('Simulate offline and online state rapid toggling', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    for (let i = 0; i < 5; i++) {
      await window.context().setOffline(true);
      await window.waitForTimeout(200);

      const searchInput = window.getByPlaceholder('Search mods...');
      if (await searchInput.isVisible()) {
        await searchInput.fill('test');
        await searchInput.press('Enter');
      }

      await window.waitForTimeout(200);
      await window.context().setOffline(false);
      await window.waitForTimeout(200);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-offline-online-toggling.png' });
  });

  // From fuzz-extreme-2.spec.ts
  test('Rapid theme toggling and layout fuzzing', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    const themeToggle = window.locator('button[role="checkbox"]').first();

    if (await themeToggle.isVisible()) {
      for (let i = 0; i < 20; i++) {
        await themeToggle.click();
        await window.waitForTimeout(10);
      }
    }

    await window.setViewportSize({ width: 300, height: 300 });
    await window.waitForTimeout(50);
    await window.setViewportSize({ width: 1920, height: 1080 });
    await window.waitForTimeout(50);
    await window.setViewportSize({ width: 400, height: 800 });

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-2-theme-layout.png' });
  });

  test('Excessively large search payloads and rapid switching part 2', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const searchInput = window.locator('input[placeholder="Search mods..."]');
    if (await searchInput.isVisible()) {
      const longString = 'A'.repeat(5000);
      await searchInput.fill(longString);
      await window.waitForTimeout(100);

      const filterSelect = window.locator('select');
      if (await filterSelect.isVisible()) {
        await filterSelect.selectOption({ index: 1 });
        await filterSelect.selectOption({ index: 2 });
        await filterSelect.selectOption({ index: 0 });
      }

      await searchInput.fill('!@#$%^&*()_+-=[]{}|;:\'",.<>/?`~\\');
      await searchInput.press('Enter');
      await window.waitForTimeout(200);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-2-search-malformed.png' });
  });

  // From fuzz-extreme.spec.ts
  test('Excessively large search payloads and rapid switching', async () => {
    await window.click('text=Mods');
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }
    await window.waitForTimeout(1000);

    const searchInput = window.getByPlaceholder('Search mods...');
    if (await searchInput.isVisible()) {
      const hugePayload = 'A'.repeat(50000); // 50k chars
      await searchInput.fill(hugePayload);
      await searchInput.press('Enter');
      await window.waitForTimeout(100);

      const smallPayload = 'test';
      await searchInput.fill(smallPayload);
      await searchInput.press('Enter');
      await window.waitForTimeout(100);

      const emojiPayload = '🚀'.repeat(5000);
      await searchInput.fill(emojiPayload);
      await searchInput.press('Enter');
      await window.waitForTimeout(100);
    }

    // Rapid route switching
    for (let i = 0; i < 20; i++) {
        await window.click('text=Dashboard');
        await window.waitForTimeout(20);
        await window.click('text=Mods');
        await window.waitForTimeout(20);
        await window.click('button[title="Settings"], button:has(.lucide-settings)');
        await window.waitForTimeout(20);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-search-route.png' });
  });

  test('Invalid local paths and malformed URIs', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    const gameExeInput = window.getByPlaceholder('Path to Dragon Ball: Sparking! ZERO executable');

    if (await gameExeInput.isVisible()) {
      const invalidPaths = [
        'Z:\\Invalid\\Path\\To\\Game.exe',
        'file://C:/malformed/path',
        'http://localhost:3000/malformed',
        '\\\\.\\pipe\\invalid',
        '..\\..\\..\\Windows\\System32\\cmd.exe'
      ];

      for (const invalidPath of invalidPaths) {
        await gameExeInput.evaluate((el: HTMLInputElement, val: string) => {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, invalidPath);
        await gameExeInput.press('Enter');
        await window.waitForTimeout(50);
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-extreme-paths.png' });
  });

  // From fuzz-more.spec.ts
  test('Fuzz settings path inputs via events', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    const gameExeInput = window.getByPlaceholder('Path to Dragon Ball: Sparking! ZERO executable');
    const storageInput = window.getByPlaceholder('Default internal directory');

    const fuzzStrings = [
      'C:\\Windows\\System32\\cmd.exe',
      '../../../../etc/passwd',
      '/dev/null',
      'CON',
      'PRN',
      '\\u0000',
      'A'.repeat(1000),
      '<script>alert(1)</script>'
    ];

    if (await gameExeInput.isVisible()) {
      for (const fuzz of fuzzStrings) {
        // Since input might be readonly in the UI, we evaluate directly on it to fuzz the synthetic react state
        await gameExeInput.evaluate((el: HTMLInputElement, val: string) => {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, fuzz);
        await gameExeInput.press('Enter');
        await window.waitForTimeout(100);

        if (await storageInput.isVisible()) {
          await storageInput.evaluate((el: HTMLInputElement, val: string) => {
              el.value = val;
              el.dispatchEvent(new Event('input', { bubbles: true }));
              el.dispatchEvent(new Event('change', { bubbles: true }));
          }, fuzz);
          await storageInput.press('Enter');
          await window.waitForTimeout(100);
        }
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-settings-paths.png' });
  });

  test('Profile selection spamming', async () => {
    await window.click('text=Mods');
    await window.waitForTimeout(500);

    const manageProfilesBtn = window.locator('button[title="Manage Mod Profiles"]');
    if (await manageProfilesBtn.isVisible()) {
      await manageProfilesBtn.click();
      await window.waitForTimeout(500);

      const createProfileBtn = window.locator('button[title="Create New Profile"]');
      if (await createProfileBtn.isVisible()) {
        await createProfileBtn.click();
        const profileNameInput = window.getByPlaceholder('Profile Name...');
        if (await profileNameInput.isVisible()) {
          await profileNameInput.fill('Fuzz Profile');
          const saveBtn = window.locator('button:has-text("Save")');
          if (await saveBtn.isVisible()) await saveBtn.click();
          await window.waitForTimeout(500);
        }
      }

      const profileItems = window.locator('div[role="dialog"] button:has-text("Fuzz Profile")');
      if (await profileItems.count() > 0) {
        for (let i = 0; i < 20; i++) {
          await profileItems.first().click({ force: true });
          await window.waitForTimeout(20);
        }
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-profile-spam.png' });
  });

  // From fuzz-new-scenarios.spec.ts
  test('Settings - Advanced Options Rapid Toggles and Launch Arguments Fuzzing', async () => {
    // Navigate to Settings
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    // Toggle Advanced Settings rapidly
    const advancedToggle = window.locator('button[role="switch"]').first();
    if (await advancedToggle.isVisible()) {
      for (let i = 0; i < 15; i++) {
        await advancedToggle.click({ force: true });
        await window.waitForTimeout(50);
      }

      // Ensure it's active for the next part
      if (!await window.locator('text=Launch Arguments').isVisible()) {
          await advancedToggle.click();
          await window.waitForTimeout(500);
      }
    }

    // Fuzz Launch Arguments
    const launchArgsInput = window.getByPlaceholder('e.g., -noverifyfiles -nomovies');

    const fuzzStrings = [
      '',
      '   ',
      'a'.repeat(500),
      '<script>alert("xss")</script>',
      '\\u0000\\u0001',
      '-flag1 -flag2="value with spaces" --long-flag',
      '👾 🤖 👻',
      '--\'; SELECT * FROM users;'
    ];

    if (await launchArgsInput.isVisible()) {
      for (const fuzz of fuzzStrings) {
        await launchArgsInput.fill(fuzz);
        await window.waitForTimeout(200);
      }

      // Reset to safe value
      await launchArgsInput.fill('');
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-new-advanced-settings.png' });
  });

  test('Opacity Slider Rapid Adjustment', async () => {
    // Navigate to Settings
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(1000);

    // Fuzz background opacity slider
    const opacityInput = window.locator('input[type="range"]');
    if (await opacityInput.isVisible()) {
      for (let i = 0; i < 50; i++) {
        // Rapidly change the value between 0.0 and 1.0
        const val = (Math.random()).toFixed(2);
        await opacityInput.evaluate((el: HTMLInputElement, val: string) => {
            el.value = val;
            el.dispatchEvent(new Event('input', { bubbles: true }));
            el.dispatchEvent(new Event('change', { bubbles: true }));
        }, val);
        await window.waitForTimeout(20);
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-new-opacity-slider.png' });
  });

  // From fuzz-omega.spec.ts
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

  // From fuzz-tests-more.spec.ts
  test('Fuzz filter clear all combinations', async () => {
      await window.click('text=Mods');
      const browseTab = window.locator('button:has-text("Browse Online")');
      if (!await browseTab.evaluate((el: any) => el.classList.contains('bg-blue-600'))) {
          await browseTab.click();
      }

      await window.waitForTimeout(500);

      // Open categories and select a few randomly
      const categoryFilter = window.locator('button:has-text("Category")');
      if (await categoryFilter.isVisible()) {
          for (let i = 0; i < 3; i++) {
              await categoryFilter.click({ force: true });
              await window.waitForTimeout(100);
              const categories = window.locator('button:has-text("Audio"), button:has-text("Visuals"), button:has-text("UI")');
              if (await categories.count() > 0) {
                 await categories.first().click({ force: true });
              }
          }
      }

      // Close the category dropdown by clicking elsewhere or forcing the next click

      // Check nsfw, colorz rapidly
      const nsfwBtn = window.locator('button:has-text("NSFW")');
      const colorZBtn = window.locator('button:has-text("ColorZ")');

      if (await nsfwBtn.isVisible()) {
        for(let i=0; i<3; i++) {
             await nsfwBtn.click({ force: true });
             await colorZBtn.click({ force: true });
        }
      }

      const clearAllBtn = window.locator('button:has-text("Clear All")');
      if (await clearAllBtn.isVisible()) {
         await clearAllBtn.click({ force: true });
      }

      expect(await window.title()).toBe('Kamisama Loader');
      await window.screenshot({ path: 'tests/evidence/homologation/fuzz-clear-all-filters.png' });
  });

  // From fuzz-ultra.spec.ts
  test('Rapid tab switching fuzzing', async () => {
    const tabs = [
      'button[title="Dashboard"], button:has(.lucide-layout-dashboard)',
      'button[title="Mods"], button:has(.lucide-package)',
      'button[title="Settings"], button:has(.lucide-settings)'
    ];

    for (let i = 0; i < 20; i++) {
      const tab = tabs[i % tabs.length];
      const el = window.locator(tab).first();
      if (await el.isVisible()) {
          await el.click({ force: true });
          await window.waitForTimeout(50);
      }
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-ultra-rapid-tabs.png' });
  });

  test('Wild keyboard smashing fuzzing', async () => {
    const keys = ['a', 'b', 'c', '1', '2', 'Enter', 'Escape', 'Tab', 'ArrowUp', 'ArrowDown', 'Space', 'Backspace'];

    for (let i = 0; i < 50; i++) {
        const key = keys[Math.floor(Math.random() * keys.length)];
        await window.keyboard.press(key);
        await window.waitForTimeout(10);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-ultra-keyboard-smash.png' });
  });

  test('Extremely large string inputs in Settings fuzzing', async () => {
    await window.click('button[title="Settings"], button:has(.lucide-settings)');
    await window.waitForTimeout(500);

    const advancedBtn = window.locator('button:has-text("Show Advanced Settings")');
    if (await advancedBtn.isVisible()) {
      await advancedBtn.click();
    }
    await window.waitForTimeout(500);

    const launchArgsInput = window.locator('input[placeholder="-dx12 -fullscreen"]');
    if (await launchArgsInput.isVisible()) {
      const hugeString = 'A'.repeat(5000) + ' ' + '-B '.repeat(1000);
      await launchArgsInput.fill(hugeString);
      await window.waitForTimeout(100);
      await launchArgsInput.press('Enter');
      await window.waitForTimeout(100);
    }

    expect(await window.title()).toBe('Kamisama Loader');
    await window.screenshot({ path: 'tests/evidence/homologation/fuzz-ultra-large-strings.png' });
  });

});
