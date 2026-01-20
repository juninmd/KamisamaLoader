
const https = require('https');

function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', (chunk) => data += chunk);
            res.on('end', () => {
                try {
                    resolve(JSON.parse(data));
                } catch (e) {
                    console.log("Response not JSON:", data.substring(0, 100));
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

async function testEndpoints() {
    const gameId = 21179;

    // Test 1: Subfeed with sort (Checking if it supports it)
    console.log("Testing Subfeed with sort...");
    const subfeedUrl = `https://gamebanana.com/apiv11/Game/${gameId}/Subfeed?_nPage=1&_nPerpage=5&_sSort=likes`;
    const subfeedData = await fetchUrl(subfeedUrl);
    if (subfeedData && subfeedData._aRecords) {
        console.log("Subfeed first item likes:", subfeedData._aRecords[0]?._nLikeCount);
    }

    // Test 2: Core/List/Section (Common for sorted lists)
    console.log("\nTesting Core/List/Section...");
    // Attempting to list Mods for the game, sorted by likes.
    // Parameters often include _sModel (Mod), _idGameRow (21179), _sSort (likes), _sOrder (desc)
    const listUrl = `https://gamebanana.com/apiv11/Mod/Index?_nPage=1&_nPerpage=5&_aFilters[Generic_Game]=${gameId}&_sSort=Generic_MostLikes`;
    // GameBanana V11 structure is often /{Model}/Index or similar for lists.
    // Or Util/Search/Results?

    // Let's try what was in the comment: Core/List/Section
    // But documentation for v11 is scarce.
    // Let's try getting a known category list.

    // Another guess: Mod/Index is for mods.
    const modIndexUrl = `https://gamebanana.com/apiv11/Mod/Index?_nPage=1&_nPerpage=5&_aFilters[Generic_Game]=${gameId}&_sSort=Generic_MostLikes`;
    const modIndexData = await fetchUrl(modIndexUrl);
     if (modIndexData && modIndexData._aRecords) {
        console.log("Mod/Index first item likes:", modIndexData._aRecords[0]?._nLikeCount);
        console.log("Mod/Index first item name:", modIndexData._aRecords[0]?._sName);
    } else {
        console.log("Mod/Index failed or empty.");
    }
}

testEndpoints();
