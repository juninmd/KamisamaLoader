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
