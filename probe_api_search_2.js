
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
                    // console.log("Response not JSON:", data.substring(0, 100));
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

async function testEndpoints() {
    const gameId = 21179;

    // Test 3: Util/Search/Results
    console.log("Testing Util/Search/Results...");
    // _sSearchString is usually the key
    const searchUrl = `https://gamebanana.com/apiv11/Util/Search/Results?_sSearchString=goku&_nPage=1&_nPerpage=5&_aFilters[Generic_Game]=${gameId}`;
    const searchData = await fetchUrl(searchUrl);
    if (searchData && searchData._aRecords) {
        console.log("Search 'goku' found:", searchData._aRecords.length);
        console.log("First item:", searchData._aRecords[0]?._sName);
    } else {
        console.log("Search failed or empty.");
    }

    // Test 4: Game/Subfeed with categories
    // Does Subfeed ignore Sort? Yes, probably.

    // Test 5: New endpoint for sorted list
    // Try https://gamebanana.com/apiv11/Game/21179/Subfeed?_sSort=likes
    // If it ignores it, we get recent.

    // Let's try searching for documentation inside the codebase? No, internet is better but search failed.

    // Let's try to reverse engineer from GameBanana website network requests?
    // I can't do that directly.

    // Try Mod/Index with different params
    // _idGameRow instead of filter
     const modIndexUrl2 = `https://gamebanana.com/apiv11/Mod/Index?_nPage=1&_nPerpage=5&_idGameRow=${gameId}&_sSort=Generic_MostLikes`;
     // GameBanana uses _idGameRow for many things.

     const modIndexData2 = await fetchUrl(modIndexUrl2);
     if (modIndexData2 && modIndexData2._aRecords) {
        console.log("Mod/Index 2 found:", modIndexData2._aRecords.length);
        console.log("First item:", modIndexData2._aRecords[0]?._sName);
    } else {
        console.log("Mod/Index 2 failed.");
    }

    // Try `Game/21179/Mods` ?
}

testEndpoints();
