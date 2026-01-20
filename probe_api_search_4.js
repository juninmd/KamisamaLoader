
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
                    resolve(null);
                }
            });
        }).on('error', reject);
    });
}

async function testEndpoints() {
    const gameId = 21179;

    // Test 1: Mod/Index without sort
    console.log("Testing Mod/Index (no sort)...");
    const modIndexUrl = `https://gamebanana.com/apiv11/Mod/Index?_nPage=1&_nPerpage=5&_aFilters[Generic_Game]=${gameId}`;
    const modIndexData = await fetchUrl(modIndexUrl);
    if (modIndexData && !modIndexData._sErrorCode) {
        console.log("Mod/Index worked!");
        console.log("Count:", modIndexData._aMetadata._nRecordCount);
    } else {
        console.log("Mod/Index failed:", modIndexData);
    }

    // Test 2: Util/Search/Results with Category Filter
    // Category "Characters" ID is 33206
    console.log("\nTesting Util/Search/Results with Category...");
    const searchUrl = `https://gamebanana.com/apiv11/Util/Search/Results?_sSearchString=goku&_nPage=1&_nPerpage=5&_aFilters[Generic_Game]=${gameId}&_aFilters[Generic_Category]=33206`;
    const searchData = await fetchUrl(searchUrl);
    if (searchData && searchData._aRecords) {
        console.log("Search with Category found:", searchData._aRecords.length);
        if(searchData._aRecords.length > 0)
             console.log("First item:", searchData._aRecords[0]._sName, "Category:", searchData._aRecords[0]._aRootCategory?._sName);
    } else {
        console.log("Search with Category failed.");
    }
}

testEndpoints();
