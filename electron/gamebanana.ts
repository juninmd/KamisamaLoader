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
    search?: string;
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

export async function searchOnlineMods(page: number = 1, search: string = ''): Promise<Mod[]> {
    return searchBySection({
        page,
        search
    });
}

/**
 * Fetch detailed item data from GameBanana API
 * Endpoint: /Core/Item/Data
 */
export async function fetchItemData(itemType: string, itemId: number, fields: string[] = []): Promise<any> {
    console.log(`[API] Fetching Item Data: ${itemType} / ${itemId}`);
    const cache = getAPICache();
    const cacheKey = `item_${itemType}_${itemId}_${fields.join(',')}`;

    const cached = await cache.get(cacheKey);
    if (cached) return cached;

    await checkRateLimit();

    try {
        const fieldsParam = fields.length > 0 ? `&_aDataSchema=${fields.join(',')}` : '';
        const url = `https://gamebanana.com/apiv11/${itemType}/${itemId}/ProfilePage${fieldsParam}`;
        console.log(`[API] Request Info: ${url}`);

        const response = await apiLimit(() =>
            fetch(url)
        );

        console.log(`[API] Response Item Data status: ${response.status}`);
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
 * Hybrid approach:
 * - If search query present: Use /Util/Search/Results
 * - Else: Use /Game/Subfeed (Most reliable for browsing)
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
            search = ''
        } = options;

        let url = '';

        if (search && search.trim().length > 0) {
            // Use Search Endpoint
            url = `https://gamebanana.com/apiv11/Util/Search/Results?_sSearchString=${encodeURIComponent(search)}&_nPage=${page}&_nPerpage=${perPage}&_aFilters[Generic_Game]=${gameId}`;
            if (categoryId) {
                // For Search, category filter might be Generic_Category
                url += `&_aFilters[Generic_Category]=${categoryId}`;
            }
        } else {
            // Use Subfeed Endpoint (Browsing)
            url = `https://gamebanana.com/apiv11/Game/${gameId}/Subfeed?_nPage=${page}&_nPerpage=${perPage}`;

            // Add category filter if specified
            if (categoryId) {
                url += `&_aModelFilter[]=Mod&_idCategoryRowFilter=${categoryId}`;
            } else {
                // Default to just Mods if no category (Subfeed shows everything)
                url += `&_aModelFilter[]=Mod`;
            }
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
                    fileSize: record._aFiles?.[0]?._nFilesize || 0,
                    isNsfw: record._bHasNsfw || record._bIsNsfw || false
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
        // Fetch top rated mods as "featured" (using Subfeed for now as sort is unstable, or rely on client sort if small set)
        // Since we can't reliably sort by likes via API, we'll fetch recent mods and hope for the best
        // OR we can fetch 50 recent mods and sort them by likes in memory.

        const mods = await searchBySection({
            gameId,
            page: 1,
            perPage: 40, // Fetch more to find good ones
        });

        // Client-side sort by likes for "Featured" simulation
        mods.sort((a, b) => (b.likeCount || 0) - (a.likeCount || 0));
        const topMods = mods.slice(0, 10);

        await cache.set(cacheKey, topMods, 15 * 60 * 1000); // 15 minutes cache
        return topMods;
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
        const url = `https://gamebanana.com/apiv11/Game/${gameId}/ProfilePage`;
        console.log(`[API] Fetching Categories URL: ${url}`);
        const response = await apiLimit(() =>
            fetch(url)
        );

        console.log(`[API] Fetch Categories Status: ${response.status}`);
        if (!response.ok) return [];

        const data = await response.json();
        console.log('[API] Fetched Categories:', JSON.stringify(data?._aModRootCategories?.[0] || {})); // Log first category to see structure
        const categories = data?._aModRootCategories || [];

        await cache.set(cacheKey, categories, 60 * 60 * 1000); // 1 hour cache
        return categories;
    } catch (error) {
        console.error('Error fetching categories:', error);
        return [];
    }
}

export async function fetchModProfile(gameBananaId: number): Promise<any> {
    console.log(`[API] Fetching Mod Profile ID: ${gameBananaId}`);
    try {
        const url = `https://gamebanana.com/apiv11/Mod/${gameBananaId}/ProfilePage`;
        console.log(`[API] Profile URL: ${url}`);
        const response = await fetch(url);

        console.log(`[API] Mod Profile Status: ${response.status}`);
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
    console.log(`[API] Fetching Mod Updates ID: ${gameBananaId}`);
    try {
        const url = `https://gamebanana.com/apiv11/Mod/${gameBananaId}/Updates`;
        const response = await fetch(url);
        console.log(`[API] Update Info Status: ${response.status}`);

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

export async function fetchModDetails(gameBananaId: number): Promise<any> {
    console.log(`[API] Fetching Mod Details ID: ${gameBananaId}`);
    try {
        const profile = await fetchModProfile(gameBananaId);
        if (!profile) {
            console.warn(`[API] Mod Profile not found for ${gameBananaId}`);
            return null;
        }

        // Use _sBaseUrl + _sFile for high res image. _sFile220 is thumbnail.
        const images = profile._aPreviewMedia?._aImages?.map((img: any) => `${img._sBaseUrl}/${img._sFile}`) || [];
        console.log(`[API] Found ${images.length} images for ${gameBananaId}`);

        return {
            description: profile._sText || '', // HTML Description
            images: images,
            modPageUrl: profile._sProfileUrl || `https://gamebanana.com/mods/${gameBananaId}`,
            submitterUrl: profile._aSubmitter?._sProfileUrl,
            category: profile._aRootCategory?._sName || 'Misc',
            license: profile._sLicense || 'Unknown',
            credits: profile._aCredits || []
        };
    } catch (error) {
        console.error(`Error fetching details for mod ${gameBananaId}:`, error);
        return null;
    }
}
