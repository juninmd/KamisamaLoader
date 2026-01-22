export interface Mod {
    id: string;
    name: string;
    author: string;
    version: string;
    isEnabled: boolean;
    hasUpdate?: boolean;
    latestVersion?: string;
    iconUrl?: string;
    description?: string;
    gameBananaId?: number;
    folderPath?: string;
    viewCount?: number;
    likeCount?: number;
    downloadCount?: number;
    dateAdded?: number;
    images?: string[];
    category?: string;
    license?: string;
    submitter?: string;
    submitterUrl?: string;
    isNsfw?: boolean;
    // Client-side only properties
    isInstalled?: boolean;
    fileSize?: number;
}
