const gameId = 21179;
const search = 'Goku';
const page = 1;
const perPage = 20;

async function testSearch(url) {
    console.log(`Testing: ${url}`);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log(`Status: ${response.status}`);
            return;
        }
        const json = await response.json();
        console.log(`Records: ${json?._aRecords?.length || 0}`);
        if (json?._aRecords?.[0]) {
            console.log(`Example name: ${json._aRecords[0]._sName}`);
            console.log(`Keys: ${Object.keys(json._aRecords[0]).join(', ')}`);
        }
    } catch (e) {
        console.error(e);
    }
}

async function run() {
    // Current one
    await testSearch(`https://gamebanana.com/apiv11/Util/Search/Results?_sSearchString=${encodeURIComponent(search)}&_nPage=${page}&_nPerpage=${perPage}&_aFilters[Generic_Game]=${gameId}`);

    // With Sorting (app default) - Current (Failing)
    await testSearch(`https://gamebanana.com/apiv11/Util/Search/Results?_sSearchString=${encodeURIComponent(search)}&_nPage=${page}&_nPerpage=${perPage}&_aFilters[Generic_Game]=${gameId}&_sOrderBy=_tsDateAdded&_sOrder=desc`);

    // With _sSort=new
    await testSearch(`https://gamebanana.com/apiv11/Util/Search/Results?_sSearchString=${encodeURIComponent(search)}&_nPage=${page}&_nPerpage=${perPage}&_aFilters[Generic_Game]=${gameId}&_sSort=new`);

    // With _sSort=downloads
    await testSearch(`https://gamebanana.com/apiv11/Util/Search/Results?_sSearchString=${encodeURIComponent(search)}&_nPage=${page}&_nPerpage=${perPage}&_aFilters[Generic_Game]=${gameId}&_sSort=downloads`);
}

run();
