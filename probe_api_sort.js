
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

    // Test Mod/Index with simple sort keys
    const sorts = ['likes', 'most_likes', 'views', 'downloads', 'rating', 'new', 'date'];

    for (const sort of sorts) {
        const url = `https://gamebanana.com/apiv11/Mod/Index?_nPage=1&_nPerpage=1&_aFilters[Generic_Game]=${gameId}&_sSort=${sort}`;
        const data = await fetchUrl(url);
        if (data && !data._sErrorCode) {
            console.log(`Sort '${sort}' WORKED!`);
            if(data._aRecords && data._aRecords.length > 0) {
                 console.log(`  First item: ${data._aRecords[0]._sName} (Likes: ${data._aRecords[0]._nLikeCount})`);
            }
        } else {
             // console.log(`Sort '${sort}' failed:`, data?._aErrorData?._sSort?._sErrorMessage);
        }
    }
}

testEndpoints();
