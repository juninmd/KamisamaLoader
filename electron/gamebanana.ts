export interface Mod {
    id: string;
    name: string;
    author: string;
    version: string;
    description: string;
    isEnabled: boolean;
    iconUrl: string;
    gameBananaId: number;
    latestVersion: string;
    viewCount?: number;
    likeCount?: number;
    downloadCount?: number;
    dateAdded?: number;
    images?: string[];
    category?: string;
    fileSize?: number;
    license?: string;
    submitter?: string;
}

export interface ModUpdateInfo {
    hasUpdate: boolean;
    latestVersion: string;
    latestFileId: number;
    latestFileUrl: string;
}

export interface ModChangelog {
    version: string;
    date: number;
    changes: { cat: string; text: string }[];
    title?: string;
}

export async function searchOnlineMods(page: number = 1): Promise<Mod[]> {
    try {
        const response = await fetch(`https://gamebanana.com/apiv11/Game/21179/Subfeed?_nPage=${page}&_nPerpage=15`);
        if (!response.ok) {
            return [];
        }

        const json = await response.json();

        // Type guard for the expected structure
        if (json && json._aRecords && Array.isArray(json._aRecords)) {
            return json._aRecords.map((record: any) => {
                const image = record._aPreviewMedia?._aImages?.[0];
                const iconUrl = image ? `${image._sBaseUrl}/${image._sFile220}` : '';
                const images = record._aPreviewMedia?._aImages?.map((img: any) => `${img._sBaseUrl}/${img._sFile}`) || [];
                return {
                    id: record._idRow.toString(),
                    name: record._sName,
                    author: record._aSubmitter?._sName || 'Unknown',
                    version: record._sVersion || '1.0',
                    description: record._sText || '', // Use text body if available, else category
                    isEnabled: false,
                    iconUrl: iconUrl,
                    gameBananaId: record._idRow,
                    latestVersion: record._sVersion || '1.0',
                    viewCount: record._nViewCount || 0,
                    likeCount: record._nLikeCount || 0,
                    downloadCount: record._nDownloadCount || 0,
                    dateAdded: record._tsDateAdded || 0,
                    images: images,
                    category: record._aRootCategory?._sName || 'Misc',
                    submitter: record._aSubmitter?._sName || 'Unknown',
                    license: record._sLicense || 'Unknown'
                };
            });
        }
        return [];
    } catch (error) {
        console.error('Error fetching online mods:', error);
        return [];
    }
}

export async function fetchModProfile(gameBananaId: number): Promise<any> {
    try {
        const response = await fetch(`https://gamebanana.com/apiv11/Mod/${gameBananaId}/ProfilePage`);
        if (!response.ok) {
            return null;
        }
        return await response.json();
    } catch (error) {
        console.error(`Error fetching profile for mod ${gameBananaId}:`, error);
        return null;
    }
}

export async function fetchModUpdates(gameBananaId: number): Promise<ModChangelog | null> {
    try {
        const response = await fetch(`https://gamebanana.com/apiv11/Mod/${gameBananaId}/Updates`);
        if (!response.ok) return null;

        const updates = await response.json();
        if (Array.isArray(updates) && updates.length > 0) {
            // Get latest update
            const latest = updates[0];
            return {
                version: latest._sVersion,
                date: latest._tsDateAdded,
                changes: latest._aChangeLog || [],
                title: latest._sName || latest._sTitle
            };
        }
        return null;
    } catch (error) {
        console.error(`Error fetching updates for mod ${gameBananaId}:`, error);
        return null;
    }
}
