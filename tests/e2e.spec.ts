import { test, expect } from '@playwright/test';
import * as path from 'path';
import * as fs from 'fs';

test.describe('Kamisama Loader Frontend', () => {

  test.beforeEach(async ({ page }) => {
    // Mock the Electron API bridge
    // This allows us to test the Frontend logic without the Main process crashing
    await page.addInitScript(() => {
        window.electronAPI = {
          minimizeWindow: () => {},
          maximizeWindow: () => {},
          closeWindow: () => {},
          getInstalledMods: () => Promise.resolve([]),
          installMod: () => Promise.resolve({ success: true, message: 'Mocked Success' }),
          toggleMod: () => Promise.resolve(true),
          saveSettings: () => Promise.resolve(true),
          checkForUpdates: () => Promise.resolve([]),
          updateMod: () => Promise.resolve(true),
          // We will override this in specific tests if needed, or provide a default mock
          searchOnlineMods: async (page = 1, search = '') => {
             return [];
          },
          onDownloadProgress: (callback: any) => {},
        } as any;
    });
  });

  test('Dashboard loads and displays Launch Game button', async ({ page }) => {
    await page.goto('/');
    // Check for the "Launch Game" button which signifies the Dashboard is loaded
    await expect(page.getByRole('button', { name: /Launch Game/i })).toBeVisible();
  });

  test('Navigation to Mods works', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Mods');
    // The tabs are named "Installed" and "Browse Online" in Mods.tsx
    await expect(page.getByRole('button', { name: 'Installed' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Browse Online' })).toBeVisible();
  });

  test('Browse Online Mods loads Real API data', async ({ page }) => {
    // 1. FETCH REAL DATA (Backend Logic Simulation)
    // We hit the actual GameBanana API here in the Node.js context
    // This verifies the API is up and the response structure matches our expectations
    console.log('Fetching real data from GameBanana...');
    const response = await fetch('https://gamebanana.com/apiv11/Game/21179/Subfeed?_nPage=1&_nPerpage=15');
    expect(response.status).toBe(200);
    const json = await response.json();

    // Transform data using the EXACT logic from main.ts (replicated here to verify contract)
    const realMods = json._aRecords.map((record: any) => {
        const image = record._aPreviewMedia?._aImages?.[0];
        const iconUrl = image ? `${image._sBaseUrl}/${image._sFile220}` : '';
        return {
            id: record._idRow.toString(),
            name: record._sName,
            author: record._aSubmitter?._sName || 'Unknown',
            version: record._sVersion || '1.0',
            description: `Category: ${record._aRootCategory?._sName || 'Misc'}`,
            isEnabled: false,
            iconUrl: iconUrl,
            gameBananaId: record._idRow,
            latestVersion: record._sVersion || '1.0'
        };
    });

    expect(realMods.length).toBeGreaterThan(0);
    const firstModName = realMods[0].name;
    console.log(`First mod found: ${firstModName}`);

    // 2. INJECT REAL DATA INTO FRONTEND MOCK
    // This connects the "Real API" results to the Frontend UI
    await page.addInitScript((data) => {
         window.electronAPI.searchOnlineMods = async () => {
             return data;
         };
    }, realMods);

    // 3. NAVIGATE AND VERIFY
    await page.goto('/');
    await page.click('text=Mods');
    await page.click('text=Browse');

    // Verify the UI renders the Real Data
    // We expect the name of the first mod (fetched live) to appear on screen
    await expect(page.getByText(firstModName)).toBeVisible();

    // Check for image loading (optional, just check img tag presence)
    if (realMods[0].iconUrl) {
        // Just checking if any image is loaded
        await expect(page.locator('img').first()).toBeVisible();
    }
  });

  test('Navigation to Settings works', async ({ page }) => {
    await page.goto('/');
    await page.click('text=Settings');
    await expect(page.getByText('Game Directory')).toBeVisible();
  });

  test('Update Check API returns valid structure', async () => {
     // Verify the API used for checking updates works
     // We pick a known Dragon Ball: Sparking! ZERO mod ID
     // Example: 21179 is the Game ID, let's look for a known Mod ID from the browse results or a stable one.
     // We can just query the subfeed and pick the first one again to query its profile.

     const feedResponse = await fetch('https://gamebanana.com/apiv11/Game/21179/Subfeed?_nPage=1&_nPerpage=1');
     const feedJson = await feedResponse.json();
     const firstModId = feedJson._aRecords[0]._idRow;

     console.log(`Checking profile for mod ID: ${firstModId}`);

     const profileResponse = await fetch(`https://gamebanana.com/apiv11/Mod/${firstModId}/ProfilePage`);
     expect(profileResponse.status).toBe(200);
     const profileJson = await profileResponse.json();

     // Verify expected fields used in main.ts
     expect(profileJson).toHaveProperty('_sVersion');
     expect(profileJson).toHaveProperty('_aFiles');
     if (profileJson._aFiles && profileJson._aFiles.length > 0) {
         expect(profileJson._aFiles[0]).toHaveProperty('_idRow');
         expect(profileJson._aFiles[0]).toHaveProperty('_sDownloadUrl');
     }
  });
});
