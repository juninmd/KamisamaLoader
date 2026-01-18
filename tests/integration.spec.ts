import { test, expect } from '@playwright/test';
import { searchOnlineMods, fetchModProfile } from '../electron/gamebanana';

test.describe('Real API Integration Tests', () => {

    test('searchOnlineMods fetches real data from GameBanana', async () => {
        // Fetch page 1
        const mods = await searchOnlineMods(1);

        // Assert we got results
        expect(Array.isArray(mods)).toBe(true);
        expect(mods.length).toBeGreaterThan(0);

        // Assert structure
        const firstMod = mods[0];
        expect(firstMod).toHaveProperty('id');
        expect(firstMod).toHaveProperty('name');
        expect(firstMod).toHaveProperty('author');
        expect(firstMod).toHaveProperty('iconUrl');

        console.log(`Fetched ${mods.length} mods from real API.`);
        console.log('Sample Mod:', firstMod.name, 'by', firstMod.author);
    });

    test('searchOnlineMods handles pagination (fetching page 2)', async () => {
        const modsPage1 = await searchOnlineMods(1);
        const modsPage2 = await searchOnlineMods(2);

        expect(modsPage2.length).toBeGreaterThan(0);
        if (modsPage1.length > 0 && modsPage2.length > 0) {
            expect(modsPage1[0].id).not.toBe(modsPage2[0].id);
        }
    });

    test('fetchModProfile fetches update info for a specific mod', async () => {
        // First find a mod ID from the search to use
        const mods = await searchOnlineMods(1);
        const mod = mods[0];

        if (!mod) test.skip('No mods found to test profile fetch');

        const profile = await fetchModProfile(mod.gameBananaId);
        expect(profile).toBeDefined();
        expect(profile).not.toBeNull();
        expect(profile).toHaveProperty('_sName');
        expect(profile).toHaveProperty('_aFiles');

        if (profile._aFiles && profile._aFiles.length > 0) {
             const latestFile = profile._aFiles[0];
             expect(latestFile).toHaveProperty('_sDownloadUrl');
             console.log('Download URL found:', latestFile._sDownloadUrl);
        }
    });

});
