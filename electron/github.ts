export async function fetchLatestRelease(owner: string, repo: string): Promise<string | null> {
    const url = `https://api.github.com/repos/${owner}/${repo}/releases/latest`;
    console.log(`[GitHub] Fetching latest release for ${owner}/${repo}`);

    try {
        const response = await fetch(url, {
            headers: {
                'User-Agent': 'Kamisama-Mod-Loader',
                'Accept': 'application/vnd.github.v3+json'
            }
        });

        if (!response.ok) {
            console.error(`[GitHub] Failed to fetch release: ${response.status} ${response.statusText}`);
            return null;
        }

        const data = await response.json();

        if (!data.assets || !Array.isArray(data.assets)) {
            console.error('[GitHub] No assets found in release');
            return null;
        }

        // Specific logic for UE4SS: look for zUE4SS_v*.zip
        // Otherwise, look for the first .zip
        let asset = data.assets.find((a: any) => a.name.startsWith('zUE4SS_v') && a.name.endsWith('.zip'));

        if (!asset) {
             asset = data.assets.find((a: any) => a.name.endsWith('.zip'));
        }

        if (asset) {
            console.log(`[GitHub] Found asset: ${asset.name}`);
            return asset.browser_download_url;
        }

        console.error('[GitHub] No suitable asset found');
        return null;

    } catch (error) {
        console.error('[GitHub] Error fetching release:', error);
        return null;
    }
}
