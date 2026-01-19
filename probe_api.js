
async function probe() {
    try {
        // Fetch Subfeed to get a Mod ID
        const subfeed = await fetch('https://gamebanana.com/apiv11/Game/21179/Subfeed?_nPage=1&_nPerpage=1');
        const subJson = await subfeed.json();
        const modId = subJson._aRecords[0]._idRow;
        console.log('Mod ID:', modId);

        // Fetch Profile
        const profile = await fetch(`https://gamebanana.com/apiv11/Mod/${modId}/ProfilePage`);
        const profileJson = await profile.json();

        console.log('--- Images ---');
        // Check for gallery
        if (profileJson._aPreviewMedia && profileJson._aPreviewMedia._aImages) {
            console.log(JSON.stringify(profileJson._aPreviewMedia._aImages, null, 2));
        } else {
            console.log("No images found");
        }

        console.log('--- Updates/Changelog ---');
        // Check for updates section or recent files description
        console.log('--- Checking Updates Endpoint ---');
        const updates = await fetch(`https://gamebanana.com/apiv11/Mod/${modId}/Updates`);
        if (updates.ok) {
            const updatesJson = await updates.json();
            console.log('Updates:', JSON.stringify(updatesJson, null, 2));
        } else {
            console.log("Updates endpoint failed: " + updates.status);
        }

    } catch (e) {
        console.error(e);
    }
}

probe();
