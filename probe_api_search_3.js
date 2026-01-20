
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

    // Test 6: Search using Util/Search/Results - this one worked for search.
    // Does it support sort?
    console.log("Testing Util/Search/Results with sort...");
    const searchSortUrl = `https://gamebanana.com/apiv11/Util/Search/Results?_sSearchString=goku&_nPage=1&_nPerpage=5&_aFilters[Generic_Game]=${gameId}&_sSort=Generic_MostLikes`;
    const searchSortData = await fetchUrl(searchSortUrl);
    if (searchSortData && searchSortData._aRecords) {
        console.log("Search sort first item:", searchSortData._aRecords[0]?._sName);
        console.log("Search sort first item likes:", searchSortData._aRecords[0]?._nLikeCount);
    } else {
        console.log("Search sort failed.");
    }
}

testEndpoints();
