import { getAPICache } from './api-cache.js';
import pLimit from 'p-limit';

// Rate limiting - max 60 requests per minute
const apiLimit = pLimit(10);
let requestCount = 0;
let requestWindow = Date.now();

function checkRateLimit() {
    const now = Date.now();
    if (now - requestWindow > 60000) {
        requestCount = 0;
        requestWindow = now;
    }
    if (requestCount >= 60) {
        const waitTime = 60000 - (now - requestWindow);
        console.log(`[API] Rate limit reached, waiting ${waitTime}ms`);
        return new Promise(resolve => setTimeout(resolve, waitTime));
    }
    requestCount++;
    return Promise.resolve();
}

export interface SearchOptions {
    itemType?: 'Mod' | 'Sound' | 'WiP' | 'Skin';
    gameId?: number;
    page?: number;
    perPage?: number;
    sort?: 'downloads' | 'views' | 'likes' | 'date' | 'name';
    order?: 'asc' | 'desc';
    categoryId?: number;
    filters?: Record<string, any>;
}

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
                    submitterUrl: record._aSubmitter?._sProfileUrl || '',
                    license: record._sLicense || 'Unknown',
                    isNsfw: record._bHasNsfw || record._bIsNsfw || false
                };
            });
        }
        return [];
    } catch (error) {
        console.error('Error fetching online mods:', error);
        return [];
    }
}

/**
 * Fetch detailed item data from GameBanana API
 * Endpoint: /Core/Item/Data
 */
export async function fetchItemData(itemType: string, itemId: number, fields: string[] = []): Promise<any> {
    const cache = getAPICache();
    const cacheKey = `item_${itemType}_${itemId}_${fields.join(',')}`;

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    await checkRateLimit();

    try {
        const fieldsParam = fields.length > 0 ? `&_aDataSchema=${fields.join(',')}` : '';
        const response = await apiLimit(() =>
            fetch(`https://gamebanana.com/apiv11/${itemType}/${itemId}/ProfilePage${fieldsParam}`)
        );

        if (!response.ok) {
            console.error(`[API] Failed to fetch item data: ${response.status}`);
            return null;
        }

        const data = await response.json();
        await cache.set(cacheKey, data, 10 * 60 * 1000); // 10 minutes cache
        return data;
    } catch (error) {
        console.error('Error fetching item data:', error);
        return null;
    }
}

/**
 * Search mods with advanced filters and sorting
 * Endpoint: /Core/List/Section
 */
export async function searchBySection(options: SearchOptions): Promise<Mod[]> {
    const cache = getAPICache();
    const cacheKey = `search_${JSON.stringify(options)}`;

    const cached = await cache.get(cacheKey);
    if (cached) {
        console.log(`[API] Cache hit for search`);
        return cached;
    }

    await checkRateLimit();

    try {
        const {
            gameId = 21179, // Dragon Ball Sparking ZERO
            page = 1,
            perPage = 20,
            categoryId,
        } = options;

        // Use the simple Subfeed endpoint that works
        let url = `https://gamebanana.com/apiv11/Game/${gameId}/Subfeed?_nPage=${page}&_nPerpage=${perPage}`;

        // Add category filter if specified
        if (categoryId) {
            url += `&_aModelFilter[]=Mod&_idCategoryRowFilter=${categoryId}`;
        }

        console.log(`[API] Fetching: ${url}`);

        const response = await apiLimit(() => fetch(url));
        if (!response.ok) {
            console.error(`[API] Search failed: ${response.status} - ${response.statusText}`);
            const errorText = await response.text();
            console.error(`[API] Error body: ${errorText.substring(0, 200)}`);
            return [];
        }

        const json = await response.json();
        if (json && json._aRecords && Array.isArray(json._aRecords)) {
            const mods = json._aRecords.map((record: any) => {
                const image = record._aPreviewMedia?._aImages?.[0];
                const iconUrl = image ? `${image._sBaseUrl}/${image._sFile220}` : '';
                const images = record._aPreviewMedia?._aImages?.map((img: any) => `${img._sBaseUrl}/${img._sFile}`) || [];
                return {
                    id: record._idRow.toString(),
                    name: record._sName,
                    author: record._aSubmitter?._sName || 'Unknown',
                    version: record._sVersion || '1.0',
                    description: record._sText || '',
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
                    license: record._sLicense || 'Unknown',
                    fileSize: record._aFiles?.[0]?._nFilesize || 0
                };
            });

            await cache.set(cacheKey, mods, 3 * 60 * 1000); // 3 minutes cache
            return mods;
        }
        return [];
    } catch (error) {
        console.error('Error searching mods:', error);
        return [];
    }
}

/**
 * Fetch newest mods
 * Endpoint: /Core/List/New
 */
export async function fetchNewMods(page: number = 1, gameId: number = 21179): Promise<Mod[]> {
    return searchBySection({
        gameId,
        page,
        perPage: 20,
        sort: 'date',
        order: 'desc'
    });
}

/**
 * Fetch featured mods
 * Endpoint: /Rss/Featured (adapted)
 */
export async function fetchFeaturedMods(gameId: number = 21179): Promise<Mod[]> {
    const cache = getAPICache();
    const cacheKey = `featured_${gameId}`;

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    await checkRateLimit();

    try {
        // GameBanana doesn't have a direct featured endpoint in v11
        // So we fetch top rated mods as "featured"
        const mods = await searchBySection({
            gameId,
            page: 1,
            perPage: 10,
            sort: 'likes',
            order: 'desc'
        });

        await cache.set(cacheKey, mods, 15 * 60 * 1000); // 15 minutes cache
        return mods;
    } catch (error) {
        console.error('Error fetching featured mods:', error);
        return [];
    }
}

/**
 * Get available categories for a game
 */
export async function fetchCategories(gameId: number = 21179): Promise<any[]> {
    const cache = getAPICache();
    const cacheKey = `categories_${gameId}`;

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    await checkRateLimit();

    try {
        const response = await apiLimit(() =>
            fetch(`https://gamebanana.com/apiv11/Game/${gameId}?_aDataSchema=_aCategory`)
        );

        if (!response.ok) return [];

        const data = await response.json();
        const categories = data?._aCategory || [];

        await cache.set(cacheKey, categories, 60 * 60 * 1000); // 1 hour cache
        return categories;
    } catch (error) {
        console.error('Error fetching categories:', error);
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
        return null;
    } catch (error) {
        console.error(`Error fetching updates for mod ${gameBananaId}:`, error);
        return null;
    }
}

export async function getModChangelog(gameBananaId: number): Promise<any[]> {
    try {
        const response = await fetch(`https://gamebanana.com/apiv11/Mod/${gameBananaId}/Updates`);
        if (!response.ok) return [];

        const updates = await response.json();
        if (Array.isArray(updates) && updates.length > 0) {
            return updates.map((u: any) => ({
                version: u._sVersion || 'Update',
                date: u._tsDateAdded,
                text: u._sText || u._sTitle || '',
                title: u._sTitle
            }));
        }
        return [];
    } catch (error) {
        console.error(`Error fetching changelog for mod ${gameBananaId}:`, error);
        return [];
    }
}
