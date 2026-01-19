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
}

export interface ModUpdateInfo {
    hasUpdate: boolean;
    latestVersion: string;
    latestFileId: number;
    latestFileUrl: string;
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
                return {
                    id: record._idRow.toString(),
                    name: record._sName,
                    author: record._aSubmitter?._sName || 'Unknown',
                    version: record._sVersion || '1.0',
                    description: `Category: ${record._aRootCategory?._sName || 'Misc'}`,
                    isEnabled: false,
                    iconUrl: iconUrl,
                    gameBananaId: record._idRow,
                    latestVersion: record._sVersion || '1.0'
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
