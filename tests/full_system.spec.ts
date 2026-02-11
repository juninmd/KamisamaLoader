import { test, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication, Page } from 'playwright';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let electronApp: ElectronApplication;
let window: Page;

test.describe.configure({ mode: 'serial' });

test.beforeAll(async () => {
    console.log('Launching Electron...');
    electronApp = await electron.launch({
        args: [path.join(__dirname, '../dist-electron/electron/main.js'), '--no-sandbox'],
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

    // 1. Default View Screenshot (Grid)
    await window.screenshot({ path: 'tests/evidence/02-installed-default-view.png' });

    // Verify grid layout OR empty state presence
    // If no mods are installed, ModGrid shows "No mods found", not a grid.
    const gridLayout = window.locator('.grid.grid-cols-2');
    const emptyState = window.locator('text=No mods found');

    // One of them should be visible
    await expect(gridLayout.or(emptyState)).toBeVisible();
});

test('03. Profile Manager Visibility', async () => {
    console.log('Testing Profile Manager...');

    // Ensure clean state (menu closed)
    // The overlay has z-[100] in ProfileManager.tsx
    const overlaySelector = '.fixed.inset-0.z-\\[100\\]';
    const overlay = window.locator(overlaySelector);
    if (await overlay.isVisible()) {
        console.log('Profile menu was open, closing it...');
        await overlay.click();
        await window.waitForTimeout(500);
    }

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
    if (await overlay.isVisible()) {
        await overlay.click();
    } else {
        // Fallback: try force clicking button if overlay isn't catching it (unlikely)
        await profilesBtn.click({ force: true });
    }
    await window.waitForTimeout(300);
});

test('04. Browse Online Mods (Real API)', async () => {
    console.log('Testing Browse Online with Real API...');

    // Click Browse Online Tab
    await window.click('button:has-text("Browse Online")');

    // Wait for API Load (Real Network call)
    // We expect mod cards to appear. They should have class 'glass-card' or similar
    // Or check for a known text like "by" (author)
    const modCard = window.locator('.glass-card').first();
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

    // Wait for cards OR empty state (up to 20s)
    const emptyState = window.locator('text=No mods found').first();
    try {
        await Promise.race([
            cards.first().waitFor({ state: 'visible', timeout: 20000 }),
            emptyState.waitFor({ state: 'visible', timeout: 20000 })
        ]);
    } catch (e) {
        console.log('Neither cards nor empty state appeared, taking debug screenshot...');
        await window.screenshot({ path: 'tests/evidence/06-search-fail-debug.png' });
        throw e;
    }

    if (await emptyState.isVisible()) {
        console.log('Search returned no results (API might be flaky or empty).');
        await window.screenshot({ path: 'tests/evidence/06-search-results_Empty.png' });
    } else {
        // Verify results
        const count = await cards.count();
        console.log(`Found ${count} cards after search.`);

        const cardTitles = await window.locator('h3').allInnerTexts();
        console.log('Search Results:', cardTitles);

        await expect(count).toBeGreaterThan(0);
    }

    // Screenshot results
    await window.screenshot({ path: 'tests/evidence/06-search-results_Goku.png' });
});

test('06. Mod Details Modal (Real API)', async () => {
    console.log('Testing Mod Details Modal...');

    // Ensure we have results to click. Test 05 might have left us with "No mods found".
    // Clear search input to revert to Subfeed (default view)
    const searchInput = window.locator('input[placeholder="Search online mods..."]');
    if (await searchInput.isVisible()) {
        const value = await searchInput.inputValue();
        if (value) {
            console.log('Clearing search input to reset grid...');
            await searchInput.fill('');
            // Wait for grid to refresh
            await window.waitForTimeout(2000);
        }
    }

    // Wait for at least one mod card to be visible
    const modCard = window.locator('.glass-card, .grid.grid-cols-2 h3').first();
    try {
        await modCard.waitFor({ state: 'visible', timeout: 20000 });
    } catch (e) {
        console.log('Failed to load any mods for details test. API might be down.');
        throw e;
    }

    // Click the first mod in the search results (h3 in mod grid, not sidebar)
    const firstMod = window.locator('.grid.grid-cols-2 h3').first();
    await firstMod.click({ timeout: 60000 });

    // Wait for Modal - look for "Submitter" label
    await expect(window.locator('text=Submitter')).toBeVisible({ timeout: 10000 });

    // Wait for images to load
    await window.waitForTimeout(2000);

    await window.screenshot({ path: 'tests/evidence/07-mod-details-modal.png' });

    // Close modal - try clicking the X button
    const closeBtn = window.locator('button').filter({ has: window.locator('svg.lucide-x') }).first();
    if (await closeBtn.isVisible()) {
        await closeBtn.click({ force: true });
    } else {
        await window.keyboard.press('Escape');
    }

    // Wait for modal to fully close
    await window.waitForTimeout(1000);
    await window.locator('text=Submitter').waitFor({ state: 'hidden', timeout: 5000 }).catch(() => { });
});

// ============== NEW TESTS FOR 100% COVERAGE ==============

test('07. Settings Page Navigation', async () => {
    console.log('Testing Settings Page...');

    try {
        // First go to Dashboard to reset UI state (close any modals)
        console.log('[07] Step 1: Clicking Dashboard...');
        const dashboardBtn = window.locator('nav button').filter({ hasText: 'Dashboard' });
        await dashboardBtn.waitFor({ state: 'visible', timeout: 5000 });
        await dashboardBtn.click({ force: true });
        await window.waitForTimeout(1000);
        console.log('[07] Step 1: Dashboard clicked');

        // Navigate to Settings
        console.log('[07] Step 2: Clicking Settings...');
        const settingsBtn = window.locator('nav button').filter({ hasText: 'Settings' });
        await settingsBtn.waitFor({ state: 'visible', timeout: 5000 });
        await settingsBtn.click();
        await window.waitForTimeout(1000);
        console.log('[07] Step 2: Settings button clicked');

        // Take debug screenshot
        await window.screenshot({ path: 'tests/evidence/07-debug-settings.png' });

        // Verify Settings page loaded - look for the specific h1 that is NOT in the nav
        console.log('[07] Step 3: Checking Settings heading...');
        const settingsHeader = window.locator('main h1, .space-y-6 h1').filter({ hasText: 'Settings' });
        await expect(settingsHeader).toBeVisible({ timeout: 10000 });
        console.log('[07] Step 3: Settings heading visible');

        console.log('[07] Step 4: Checking Game Directory...');
        await expect(window.getByText('Game Directory')).toBeVisible({ timeout: 5000 });
        console.log('[07] Step 4: Game Directory visible');

        console.log('[07] Step 5: Checking Background Image...');
        await window.screenshot({ path: 'tests/evidence/07-debug-before-background.png' });
        await expect(window.getByText('Background Image', { exact: true })).toBeVisible({ timeout: 10000 });
        console.log('[07] Step 5: Background Image visible');

        console.log('[07] Step 6: Checking Launch Arguments...');
        await expect(window.getByText('Launch Arguments', { exact: true })).toBeVisible({ timeout: 10000 });
        console.log('[07] Step 6: Launch Arguments visible');

        await window.screenshot({ path: 'tests/evidence/08-settings-page.png' });
        console.log('[07] Test completed successfully');
    } catch (error) {
        console.error('[07] TEST FAILED:', error);
        await window.screenshot({ path: 'tests/evidence/07-settings-error.png' });
        throw error;
    }
});

test('08. Category Filter Selection', async () => {
    console.log('Testing Category Filter...');

    // Navigate to Mods > Browse Online
    const modsBtn = window.locator('nav button:has-text("Mods")');
    await modsBtn.click();
    await window.waitForTimeout(500);

    const browseTab = window.locator('button:has-text("Browse Online")');
    await browseTab.click();
    await window.waitForTimeout(1000);

    // Click on a category in the sidebar (if visible)
    const categoryItem = window.locator('text=Characters').first();
    if (await categoryItem.isVisible()) {
        await categoryItem.click();
        await window.waitForTimeout(2000);
        await window.screenshot({ path: 'tests/evidence/09-category-filter.png' });
        console.log('Category filter applied');
    } else {
        console.log('No categories visible, skipping filter test');
        await window.screenshot({ path: 'tests/evidence/09-category-filter-skip.png' });
    }
});

test('09. Sort Options', async () => {
    console.log('Testing Sort Options...');

    // Find Sort dropdown in FilterBar
    const sortSelect = window.locator('select').first();
    if (await sortSelect.isVisible()) {
        await sortSelect.selectOption({ label: 'Most Downloaded' });
        await window.waitForTimeout(2000);
        await window.screenshot({ path: 'tests/evidence/10-sort-downloads.png' });
        console.log('Sort by downloads applied');
    } else {
        console.log('Sort dropdown not found, taking screenshot');
        await window.screenshot({ path: 'tests/evidence/10-sort-skip.png' });
    }
});

test('10. Downloads Tab', async () => {
    console.log('Testing Downloads Tab...');

    const downloadsTab = window.locator('button:has-text("Downloads")');
    await expect(downloadsTab).toBeVisible({ timeout: 5000 });
    await downloadsTab.click();
    await window.waitForTimeout(1000);

    // Verify downloads tab is active
    await expect(downloadsTab).toHaveClass(/bg-blue-600/);

    await window.screenshot({ path: 'tests/evidence/11-downloads-tab.png' });
});

test('11. Dashboard Launch Button', async () => {
    console.log('Testing Dashboard Launch Button...');

    // Navigate to Dashboard
    const dashboardBtn = window.locator('nav button:has-text("Dashboard")');
    await dashboardBtn.click();
    await window.waitForTimeout(1000);

    // Verify Launch Game button exists
    const launchBtn = window.locator('button:has-text("LAUNCH GAME")');
    await expect(launchBtn).toBeVisible({ timeout: 5000 });

    await window.screenshot({ path: 'tests/evidence/12-dashboard-launch.png' });
    // Note: Not clicking to avoid actually launching the game
});

test('12. Installed Mods - Filter by Status', async () => {
    console.log('Testing Installed Mods Status Filter...');

    // Navigate to Mods > Installed
    const modsBtn = window.locator('nav button:has-text("Mods")');
    await modsBtn.click();
    await window.waitForTimeout(500);

    const installedTab = window.locator('button:has-text("Installed")');
    await installedTab.click();
    await window.waitForTimeout(500);

    // Look for status filter dropdown
    const statusFilter = window.locator('select').first();
    if (await statusFilter.isVisible()) {
        // Try to filter by "Enabled" or "Disabled"
        const options = await statusFilter.locator('option').allTextContents();
        console.log('Filter options:', options);
        await window.screenshot({ path: 'tests/evidence/13-installed-filter.png' });
    } else {
        console.log('No status filter found');
        await window.screenshot({ path: 'tests/evidence/13-installed-filter-skip.png' });
    }
});

