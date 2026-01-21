
export interface GitHubRelease {
    tag_name: string;
    name: string;
    body: string;
    published_at: string;
    assets: {
        name: string;
        browser_download_url: string;
        size: number;
    }[];
}

export async function fetchLatestRelease(owner: string, repo: string): Promise<GitHubRelease | null> {
    console.log(`[GitHub] Fetching latest release for ${owner}/${repo}`);
    try {
        const response = await fetch(`https://api.github.com/repos/${owner}/${repo}/releases/latest`, {
            headers: {
                'User-Agent': 'Unverum-Substitute'
            }
        });

        if (!response.ok) {
            console.error(`[GitHub] Failed to fetch release: ${response.status}`);
            return null;
        }

        const release = await response.json();
        return {
            tag_name: release.tag_name,
            name: release.name,
            body: release.body,
            published_at: release.published_at,
            assets: release.assets.map((a: any) => ({
                name: a.name,
                browser_download_url: a.browser_download_url,
                size: a.size
            }))
        };
    } catch (e) {
        console.error('[GitHub] Network error', e);
        return null;
    }
}

export async function fetchUE4SSRelease(): Promise<GitHubRelease | null> {
    // Standard UE4SS repo, or we could use a specific fork if Unverum does.
    // Unverum seems to support generic UE4SS mods, so standard RE-UE4SS is a safe bet.
    return fetchLatestRelease('UE4SS-RE', 'RE-UE4SS');
}

export async function fetchAppUpdates(): Promise<GitHubRelease | null> {
    // Placeholder for this application's repository
    return null;
}
