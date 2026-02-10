export interface LocalMod {
    id: string;
    name: string;
    author: string;
    version: string;
    description: string;
    isEnabled: boolean;
    folderPath: string;
    priority: number;
    fileSize: number;
    gameBananaId?: number;
    latestVersion?: string;
    latestFileId?: number;
    latestFileUrl?: string;
    hasUpdate?: boolean;
    iconUrl?: string;
    deployedFiles?: string[];
    ue4ssModName?: string;
    category?: string;
    // Metadata that might be persisted or used in UI
    images?: string[];
    viewCount?: number;
    likeCount?: number;
    downloadCount?: number;
    dateAdded?: number;
    isNsfw?: boolean;
}

export interface OnlineMod {
    id: string;
    name: string;
    author: string;
    version: string;
    description: string;
    isEnabled: boolean;
    iconUrl?: string;
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
    isNsfw?: boolean;
}

export type Mod = LocalMod | OnlineMod;

export interface Profile {
    id: string;
    name: string;
    modIds: string[];
}

export interface Settings {
    gamePath: string;
    modDownloadPath?: string;
    backgroundImage?: string;
    activeProfileId?: string;
    launchArgs?: string;
    backgroundOpacity?: number;
}

export interface Download {
    id: string;
    url: string;
    filename: string;
    savePath: string;
    totalBytes: number;
    receivedBytes: number;
    state: 'progressing' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'queued';
    speed: number; // bytes per second
    progress: number; // 0-100
    startTime: number;
    error?: string;
    context?: any; // Extra data (type: 'install' | 'update', modId, etc.)
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
    dateRange?: '24h' | 'week' | 'month' | 'year' | 'all';
    filters?: Record<string, any>;
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
