
const GAMENAME_ID = 16900;
const url = `https://gamebanana.com/apiv11/Game/${GAMENAME_ID}/Subfeed?_nPage=1&_nPerpage=5`;

console.log(`Fetching: ${url}`);

fetch(url)
    .then(async res => {
        console.log(`Status: ${res.status}`);
        if (!res.ok) {
            console.error(await res.text());
            return;
        }
        const json = await res.json();
        console.log(JSON.stringify(json, null, 2));
    })
    .catch(err => console.error('Fetch Error:', err));
