import { test, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';

let electronApp: ElectronApplication;
let window: Page;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
    console.log('Launching Electron...');
    electronApp = await electron.launch({
        args: [path.join(__dirname, '../dist-electron/main.js')],
        env: { ...process.env, NODE_ENV: 'test' }
    });
    window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.setViewportSize({ width: 1280, height: 800 });
    // Wait for app hydration
    await window.waitForTimeout(5000);

    // Ensure screenshot directory exists
    if (!fs.existsSync('tests/evidence')) {
        fs.mkdirSync('tests/evidence');
    }
});

test.afterAll(async () => {
    console.log('Closing Electron...');
    await electronApp.close();
});

test('01. Dashboard Loads and Navigation', async () => {
    console.log('Verifying Dashboard...');
    // Wait for initial render
    await window.waitForTimeout(3000);

    // Verify Sidebar exists
    const sidebar = window.locator('nav'); // Adjust selector as needed based on your structure
    await expect(sidebar).toBeVisible();

    // Verify Title
    const title = await window.title();
    console.log(`Window Title: ${title}`);

    await window.screenshot({ path: 'tests/evidence/01-dashboard.png' });
});

test('02. Verify Installed Mods Tab (View Modes)', async () => {
    console.log('Testing Installed Mods UI...');
    // Navigate to Mods (if not already there - usually it's default or we click it)
    const modsBtn = window.locator('nav button:has-text("Mods")');
    await modsBtn.waitFor({ state: 'visible', timeout: 10000 });
    await modsBtn.click();
    await window.waitForTimeout(1000);

    // Verify "Installed" tab is active by default
    const installedTab = window.locator('button:has-text("Installed")');
    await expect(installedTab).toHaveClass(/bg-blue-600/); // Basic check for active styling

    // 1. List View Screenshot
    await window.screenshot({ path: 'tests/evidence/02-installed-list-view.png' });

    // 2. Switch to Card View
    // Finding the toggle button. It has LayoutGrid icon.
    // Use title attribute for robustness if added, or find by icon SVG class
    const cardViewBtn = window.locator('button[title="Card View"]');
    await expect(cardViewBtn).toBeVisible();
    await cardViewBtn.click();
    await window.waitForTimeout(1000); // Wait for transition

    // Verify grid layout presence
    const gridLayout = window.locator('.grid.grid-cols-2');
    await expect(gridLayout).toBeVisible();

    await window.screenshot({ path: 'tests/evidence/03-installed-card-view.png' });

    // Switch back to List
    const listViewBtn = window.locator('button[title="List View"]');
    await listViewBtn.click();
});

test('03. Profile Manager Visibility', async () => {
    console.log('Testing Profile Manager...');
    // Click Profiles button
    const profilesBtn = window.locator('button:has-text("Profiles")');
    await profilesBtn.click();
    await window.waitForTimeout(500);

    // Verify dropdown exists - looking for the specific header text
    const dropdown = window.locator('text=Saved Loadouts');
    await expect(dropdown).toBeVisible({ timeout: 5000 });

    // Take screenshot of open dropdown
    await window.screenshot({ path: 'tests/evidence/04-profile-dropdown.png' });

    // Close it
    // Attempt to click the overlay if it exists, otherwise the button
    const overlay = window.locator('.fixed.inset-0.z-\\[9998\\]');
    if (await overlay.isVisible()) {
        await overlay.click();
    } else {
        await profilesBtn.click();
    }
    await window.waitForTimeout(300);
});

test('04. Browse Online Mods (Real API)', async () => {
    console.log('Testing Browse Online with Real API...');

    // Click Browse Online Tab
    await window.click('button:has-text("Browse Online")');

    // Wait for API Load (Real Network call)
    // We expect mod cards to appear. They should have class 'glass-panel' or similar
    // Or check for a known text like "by" (author)
    const modCard = window.locator('.glass-panel').first();
    await expect(modCard).toBeVisible({ timeout: 15000 }); // Give API time

    await window.screenshot({ path: 'tests/evidence/05-browse-online-initial.png' });
});

test('05. Search and Filter (Real API)', async () => {
    test.setTimeout(60000); // Allow more time for API
    console.log('Testing Search...');

    // Listen for console logs
    window.on('console', msg => console.log(`[APP]: ${msg.text()}`));

    // Screenshot initial state
    await window.screenshot({ path: 'tests/evidence/05-debug-start.png' });

    // Make sure we are on Mods page
    await window.click('text=Mods');

    // Ensure we are on the Browse Online tab
    const browseTab = window.locator('button:has-text("Browse Online")');
    if (!await browseTab.evaluate(el => el.classList.contains('bg-blue-600'))) {
        await browseTab.click();
    }

    // Find Search Input
    const searchInput = window.locator('input[placeholder="Search online mods..."]');
    console.log('Waiting for search input...');
    try {
        await searchInput.waitFor({ state: 'visible', timeout: 5000 });
    } catch (e) {
        console.log('Search input NOT visible.');
        await window.screenshot({ path: 'tests/evidence/05-debug-no-input.png' });
        throw e;
    }
    console.log('Search input found, filling...');
    await searchInput.fill('Goku', { force: true });
    console.log('Filled "Goku", pressing Enter...');
    await window.keyboard.press('Enter');
    console.log('Pressed Enter, waiting for results...');

    // Wait for debounce and API reload, then wait for at least one card
    await window.waitForTimeout(2000); // Initial debounce
    const cards = window.locator('.grid h3'); // h3 inside the grid for mod titles

    // Wait for cards to appear (up to 10s)
    try {
        await cards.first().waitFor({ state: 'visible', timeout: 10000 });
    } catch (e) {
        console.log('Cards did not appear, taking debug screenshot...');
        await window.screenshot({ path: 'tests/evidence/06-search-fail-debug.png' });
        const html = await window.content();
        console.log('Page HTML:', html.substring(0, 1000));
        throw e;
    }

    // Verify results
    const count = await cards.count();
    console.log(`Found ${count} cards after search.`);

    const cardTitles = window.locator('h3').allInnerTexts();
    console.log('Search Results:', await cardTitles);

    await expect(count).toBeGreaterThan(0);

    // Screenshot results
    await window.screenshot({ path: 'tests/evidence/06-search-results_Goku.png' });
});

test('06. Mod Details Modal (Real API)', async () => {
    console.log('Testing Mod Details Modal...');

    // Click the first mod in the search results (h3 in mod grid, not sidebar)
    const firstMod = window.locator('.grid.grid-cols-2 h3').first();
    await firstMod.click();

    // Wait for Modal
    const modal = window.locator('div[role="dialog"]'); // Assuming standard role, or verify by text
    // Actually our modal might not have role="dialog", let's look for known specific Modal UI element like "Download" big button
    // Or the Close button
    // Based on code: fixed inset-0 z-50 ...

    // Let's rely on visual containment or text that appears in modal
    // The modal shows "Category", "Submitter", etc. labels
    await expect(window.locator('text=Submitter')).toBeVisible({ timeout: 10000 });

    // Wait for images to load (optional, but good for evidence)
    await window.waitForTimeout(2000);

    await window.screenshot({ path: 'tests/evidence/07-mod-details-modal.png' });

    // Close modal
    // Assuming clicking outside or close button.
    // There is usually a close button (X)
    // Based on inspecting ModDetailsModal.tsx would be better, but let's try clicking overlay or pressing Esc
    await window.keyboard.press('Escape');
    await window.waitForTimeout(500);
});
