import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Folder, RefreshCw, UploadCloud, ChevronDown, Eye, Heart, Check, XCircle, ChevronUp, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '../components/ToastContext';
import Skeleton from '../components/Skeleton';
import ModDetailsModal from '../components/ModDetailsModal';
import UpdateDialog from '../components/UpdateDialog';
import { DownloadsList } from '../components/DownloadsList';
import ProfileManager from '../components/ProfileManager';
import FilterBar from '../components/FilterBar';
import type { FilterState } from '../components/FilterBar';
import CategorySidebar from '../components/CategorySidebar';
import type { Category } from '../components/CategorySidebar';

interface Mod {
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
}

const Mods: React.FC = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'installed' | 'browse' | 'downloads'>('installed');
    const [installedMods, setInstalledMods] = useState<Mod[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled' | 'updates'>('all');
    const [browseMods, setBrowseMods] = useState<Mod[]>([]);
    const [loadingBrowse, setLoadingBrowse] = useState(false);
    const [browsePage, setBrowsePage] = useState(1);
    const [installedLoading, setInstalledLoading] = useState(true);
    const [selectedMod, setSelectedMod] = useState<Mod | null>(null);
    const [updateDialogMod, setUpdateDialogMod] = useState<Mod | null>(null);
    const [updateChangelog, setUpdateChangelog] = useState<any | null>(null);

    const [checkingUpdates, setCheckingUpdates] = useState(false);
    const [updatingMods, setUpdatingMods] = useState<string[]>([]); // List of IDs currently updating

    // Drag and Drop state
    const [isDragging, setIsDragging] = useState(false);

    // New: Filter and Category state
    const [categories, setCategories] = useState<Category[]>([]);
    const [filters, setFilters] = useState<FilterState>({
        categories: [],
        sortBy: 'date', // Default to date as it is most reliable
        order: 'desc',
        dateRange: 'all',
        nsfw: false,
        zeroSpark: false,
        colorZ: false
    });
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const dragCounter = useRef(0);

    // Initial load for Installed Mods
    useEffect(() => {
        loadInstalledMods();
    }, []);

    // Listen for deep link events or external changes
    useEffect(() => {
        window.electronAPI.onDownloadScanFinished(() => {
            loadInstalledMods();
            setActiveTab('downloads');
            showToast('Download started via external link', 'info');
        });
    }, []);

    // Load Browse Mods on tab change if empty
    useEffect(() => {
        if (activeTab === 'browse' && browseMods.length === 0) {
            loadCategories();
            loadBrowseMods(1, true);
        }
    }, [activeTab]);

    // Reload when filters change (debounced search handled by user not typing, but here triggering on filter state change)
    useEffect(() => {
        if (activeTab === 'browse') {
            loadBrowseMods(1, true);
        }
    }, [filters, searchQuery]); // Also trigger on search query change if user hits enter or we debounce it (currently instant)

    const loadCategories = async () => {
        try {
            const cats = await window.electronAPI.fetchCategories();
            if (cats && Array.isArray(cats)) {
                setCategories(cats.map((cat: any, idx: number) => ({
                    id: cat._idRow || idx,
                    name: cat._sName || cat.name || 'Unknown',
                    count: cat._nModCount || 0
                })));
            }
        } catch (error) {
            console.error('[Categories] Failed to load', error);
        }
    };

    const loadInstalledMods = async () => {
        // Don't show full loading spinner if just refreshing
        if (installedMods.length === 0) setInstalledLoading(true);
        try {
            const mods = await window.electronAPI.getInstalledMods();
            setInstalledMods(mods);
        } catch (error) {
            console.error('Failed to load installed mods', error);
            showToast('Failed to load installed mods', 'error');
        } finally {
            setInstalledLoading(false);
        }
    };

    const loadBrowseMods = async (page: number, reset: boolean = false) => {
        if (loadingBrowse && !reset) return; // Allow reset even if loading
        setLoadingBrowse(true);
        console.log(`[Browse] Loading page ${page}, reset=${reset}, filters:`, filters, "Query:", searchQuery);

        try {
            // Prepare options for API
            const options: any = {
                page,
                perPage: 20,
                search: searchQuery,
                sort: filters.sortBy,
                order: filters.order
            };

            // Map Category Name to ID
            if (filters.categories.length > 0) {
                // Find ID for the first selected category (API supports one primary filter comfortably)
                const catName = filters.categories[0];
                const cat = categories.find(c => c.name === catName);
                if (cat) {
                    options.categoryId = cat.id;
                }
            }

            // Fetch mods from API
            // Use searchBySection exposed as searchOnlineMods (via wrapper) or directly if exposed
            // The plan updated `searchOnlineMods` to take args in main process?
            // `window.electronAPI.searchOnlineMods` definition might need check.
            // Assuming `window.electronAPI.searchBySection` exists or `searchOnlineMods` handles options.
            // Let's use `searchBySection` if available or assume `searchOnlineMods` is the one.
            // In `electron/main.ts`, `search-online-mods` takes `(page, search)`.
            // In `electron/main.ts`, `search-by-section` takes `options`.
            // We should use `search-by-section` for advanced filtering.

            let newMods = [];

            // Note: Update src/vite-env.d.ts if searchBySection is missing from type definition,
            // but for now we assume dynamic access or existing exposure.
            if ((window.electronAPI as any).searchBySection) {
                newMods = await (window.electronAPI as any).searchBySection(options);
            } else {
                // Fallback
                newMods = await window.electronAPI.searchOnlineMods(page, searchQuery);
            }

            console.log(`[Browse] Received ${newMods?.length || 0} mods from API`);

            // Get installed mod IDs to mark them
            const installed = await window.electronAPI.getInstalledMods();
            const installedIds = new Set(installed.map((m: any) => m.gameBananaId));

            if (!newMods || newMods.length === 0) {
                if (reset || page === 1) {
                    setBrowseMods([]);
                }
                console.log('[Browse] No mods returned from API');
            } else {
                // Mark mods that are already installed
                let processedMods = newMods.map((mod: any) => ({
                    ...mod,
                    isInstalled: installedIds.has(mod.gameBananaId)
                }));

                // Client-side filtering for properties not supported by API search (like NSFW flag in some feeds)
                if (!filters.nsfw) {
                    processedMods = processedMods.filter((m: any) => !m.isNsfw);
                }

                // ZeroSpark / ColorZ local filtering if not covered by search query
                if (filters.zeroSpark && !searchQuery.toLowerCase().includes('zerospark')) {
                    processedMods = processedMods.filter((m: any) =>
                        (m.name && m.name.toLowerCase().includes('zerospark')) ||
                        (m.description && m.description.toLowerCase().includes('zerospark'))
                    );
                }

                if (filters.colorZ && !searchQuery.toLowerCase().includes('colorz')) {
                    processedMods = processedMods.filter((m: any) =>
                        (m.name && m.name.toLowerCase().includes('colorz')) ||
                        (m.description && m.description.toLowerCase().includes('colorz'))
                    );
                }

                // If API didn't sort (e.g. Subfeed), we can try to sort locally, but only for the current page.
                // This is "better than nothing" for Sort By Likes on a feed.
                if (filters.sortBy === 'likes') {
                    processedMods.sort((a: any, b: any) => (b.likeCount || 0) - (a.likeCount || 0));
                } else if (filters.sortBy === 'downloads') {
                    processedMods.sort((a: any, b: any) => (b.downloadCount || 0) - (a.downloadCount || 0));
                } else if (filters.sortBy === 'views') {
                    processedMods.sort((a: any, b: any) => (b.viewCount || 0) - (a.viewCount || 0));
                }
                // Date is usually default

                setBrowseMods(prev => reset || page === 1 ? processedMods : [...prev, ...processedMods]);
            }

            if (reset || page === 1) {
                setBrowsePage(1);
            }
        } catch (error) {
            console.error('[Browse] Failed to load online mods:', error);
            showToast('Failed to load online mods', 'error');
        } finally {
            setLoadingBrowse(false);
        }
    };

    // Filter Logic for Installed Mods
    const filteredInstalledMods = installedMods.filter(mod => {
        const matchesSearch = mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            mod.author.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesFilter = true;
        if (filterStatus === 'enabled') matchesFilter = mod.isEnabled;
        if (filterStatus === 'disabled') matchesFilter = !mod.isEnabled;
        if (filterStatus === 'updates') matchesFilter = mod.hasUpdate || false;

        return matchesSearch && matchesFilter;
    });

    const hasUpdates = installedMods.some(m => m.hasUpdate);

    const handleCheckUpdates = async () => {
        setCheckingUpdates(true);
        try {
            const updatedIds = await window.electronAPI.checkForUpdates();
            if (updatedIds.length > 0) {
                // Refresh list to show updates
                await loadInstalledMods();
            } else {
                showToast('No updates found', 'info');
            }
        } catch (e) {
            console.error(e);
        } finally {
            setCheckingUpdates(false);
        }
    };

    const handleUpdateAll = async () => {
        const modsToUpdate = installedMods.filter(m => m.hasUpdate);
        for (const mod of modsToUpdate) {
            await handlePerformUpdate(mod.id);
        }
    };

    const handleUpdateClick = async (mod: Mod) => {
        // Fetch Changelog
        try {
            const changelog = await window.electronAPI.getModChangelog(mod.id);
            setUpdateChangelog(changelog);
            setUpdateDialogMod(mod);
        } catch (e) {
            console.error(e);
            // Fallback if failed, just show empty
            setUpdateChangelog(null);
            setUpdateDialogMod(mod);
        }
    };

    const handlePerformUpdate = async (id: string) => {
        setUpdatingMods(prev => [...prev, id]);
        try {
            const success = await window.electronAPI.updateMod(id);
            if (success) {
                setInstalledMods(prev => prev.map(m => {
                    if (m.id === id) {
                        return {
                            ...m,
                            hasUpdate: false,
                            version: m.latestVersion || m.version
                        };
                    }
                    return m;
                }));
                showToast('Mod updated successfully', 'success');
            } else {
                showToast('Failed to update mod', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Failed to update mod', 'error');
        } finally {
            setUpdatingMods(prev => prev.filter(mid => mid !== id));
            setUpdateDialogMod(null); // Close dialog if open
        }
    };

    const handleToggle = async (id: string) => {
        // Optimistic Update
        setInstalledMods(prev => prev.map(m => m.id === id ? { ...m, isEnabled: !m.isEnabled } : m));

        const mod = installedMods.find(m => m.id === id);
        if (mod) {
            const newState = !mod.isEnabled;
            const result = await window.electronAPI.toggleMod(id, newState);

            if (result.success) {
                if (result.conflict) {
                    showToast(result.conflict, 'info'); // changed warning to info as warning is not in ToastContextType
                }
            } else {
                // Revert if failed
                setInstalledMods(prev => prev.map(m => m.id === id ? { ...m, isEnabled: !newState } : m));
                showToast('Failed to toggle mod', 'error');
            }
        }
    };

    const handleInstall = async (mod: Mod) => {
        showToast(`Requesting download for ${mod.name}...`, 'info');
        try {
            const result = await window.electronAPI.installOnlineMod(mod);
            if (result.success) {
                if (result.downloadId) {
                    showToast('Download started! Added to queue.', 'success');
                    setActiveTab('downloads');
                } else {
                    showToast(result.message, 'success');
                    loadInstalledMods();
                }
            } else {
                showToast(result.message, 'error');
            }
        } catch (e) {
            showToast('Installation request failed', 'error');
        }
    };

    const handleUninstall = async (id: string) => {
        // Using native confirm for simplicity, a custom modal would be better for UX
        if (window.confirm('Are you sure you want to permanently uninstall this mod?')) {
            try {
                const result = await window.electronAPI.uninstallMod(id);
                if (result.success) {
                    showToast('Mod uninstalled successfully', 'success');
                    loadInstalledMods(); // Refresh the list
                } else {
                    showToast(result.message || 'Failed to uninstall mod', 'error');
                }
            } catch (error) {
                console.error('Uninstall error:', error);
                showToast('An error occurred during uninstallation.', 'error');
            }
        }
    };

    // Drag and Drop Handlers
    const handleDragEnter = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current++;
        if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
            setIsDragging(true);
        }
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        dragCounter.current--;
        if (dragCounter.current === 0) {
            setIsDragging(false);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            const filePath = (e.dataTransfer.files[0] as any).path;
            const result = await window.electronAPI.installMod(filePath);
            if (result.success) {
                // Refresh list
                loadInstalledMods();
                showToast('Mod installed successfully', 'success');
            } else {
                showToast(result.message, 'error');
            }
        }
    };

    // Infinite Scroll
    const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
        const { scrollTop, clientHeight, scrollHeight } = e.currentTarget;
        if (scrollHeight - scrollTop <= clientHeight + 100 && !loadingBrowse && activeTab === 'browse') {
            const nextPage = browsePage + 1;
            setBrowsePage(nextPage);
            loadBrowseMods(nextPage);
        }
    };

    // Debounced search for Browse Tab
    useEffect(() => {
        if (activeTab === 'browse') {
            const delayDebounceFn = setTimeout(() => {
                loadBrowseMods(1, true);
            }, 600);

            return () => clearTimeout(delayDebounceFn);
        }
    }, [searchQuery, activeTab]);

    return (
        <div
            className="h-full flex flex-col relative"
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
        >
            {/* Drag Overlay */}
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-blue-600/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center border-4 border-white/20 border-dashed animate-in fade-in duration-200">
                    <UploadCloud size={80} className="text-white mb-4 animate-bounce" />
                    <h2 className="text-3xl font-bold text-white">Drop to Install</h2>
                    <p className="text-blue-100 mt-2">Release your files here to add them to the loader.</p>
                </div>
            )}

            {/* Top Bar */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 space-y-4 xl:space-y-0 flex-shrink-0">

                {/* Tabs */}
                <div className="flex bg-black/40 p-1 rounded-xl backdrop-blur-sm border border-white/10">
                    <button
                        onClick={() => setActiveTab('installed')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'installed'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Installed
                    </button>
                    <button
                        onClick={() => setActiveTab('browse')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'browse'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Browse Online
                    </button>
                    <button
                        onClick={() => setActiveTab('downloads')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === 'downloads'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                            }`}
                    >
                        Downloads
                    </button>
                </div>

                {/* Actions Row */}
                <div className="flex items-center space-x-3 w-full xl:w-auto">
                    {/* Profile Manager */}
                    {activeTab === 'installed' && (
                        <ProfileManager onProfileLoaded={() => loadInstalledMods()} />
                    )}

                    {/* Search */}
                    <div className="relative group flex-1 xl:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-400 transition-colors" size={18} />
                        <input
                            type="text"
                            placeholder={activeTab === 'browse' ? "Search online mods..." : "Search installed mods..."}
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-xl py-2 pl-10 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        />
                    </div>

                    {/* Filter (Only for Installed) */}
                    {activeTab === 'installed' && (
                        <>
                            <div className="relative">
                                <select
                                    value={filterStatus}
                                    onChange={(e) => setFilterStatus(e.target.value as any)}
                                    className="appearance-none bg-black/30 border border-white/10 rounded-xl py-2 pl-4 pr-10 text-sm text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 cursor-pointer hover:bg-white/5 transition-colors"
                                >
                                    <option value="all">All Mods</option>
                                    <option value="enabled">Enabled Only</option>
                                    <option value="disabled">Disabled Only</option>
                                    <option value="updates">Updates Available</option>
                                </select>
                                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" size={16} />
                            </div>

                            {/* Check Updates Button */}
                            <button
                                onClick={handleCheckUpdates}
                                disabled={checkingUpdates}
                                className={`flex items-center space-x-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/40 px-4 py-2 rounded-xl text-sm font-bold transition-all ${checkingUpdates ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <RefreshCw size={16} className={checkingUpdates ? "animate-spin" : ""} />
                                <span>{checkingUpdates ? 'Checking...' : 'Check Updates'}</span>
                            </button>

                            {/* Update All Button */}
                            {hasUpdates && (
                                <button
                                    onClick={handleUpdateAll}
                                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 transition-all animate-pulse hover:animate-none"
                                >
                                    <Download size={16} />
                                    <span>Update All</span>
                                </button>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div
                className="flex-1 overflow-y-auto pr-2 pb-4 scroll-smooth"
                onScroll={handleScroll}
            >
                {activeTab === 'installed' ? (
                    installedLoading ? (
                        <div className="h-64 flex items-center justify-center text-gray-500">
                            <RefreshCw size={24} className="animate-spin mb-2" />
                        </div>
                    ) : (
                        <InstalledList
                            mods={filteredInstalledMods}
                            onToggle={handleToggle}
                            onUpdate={(mod) => handleUpdateClick(mod)}
                            onPriorityChange={async (id, dir) => {
                                await window.electronAPI.setModPriority(id, dir);
                                loadInstalledMods();
                            }}
                            onUninstall={handleUninstall}
                            updatingMods={updatingMods}
                            onSelect={(mod) => setSelectedMod(mod)}
                        />
                    )
                ) : activeTab === 'downloads' ? (
                    <DownloadsList />
                ) : (
                    <div className="flex gap-4">
                        {/* Category Sidebar - Fixed width, non-overlapping */}
                        <div className="flex-shrink-0">
                            <CategorySidebar
                                categories={categories}
                                selectedCategories={selectedCategories}
                                onCategorySelect={(category) => {
                                    const newSelected = selectedCategories.includes(category)
                                        ? [] // Deselect if same
                                        : [category]; // Single select for API simplicity
                                    setSelectedCategories(newSelected);
                                    setFilters(f => ({ ...f, categories: newSelected }));
                                }}
                            />
                        </div>

                        {/* Main Content - Takes remaining space */}
                        <div className="flex-1 flex flex-col min-w-0">
                            {/* Filter Bar */}
                            <FilterBar
                                availableCategories={categories}
                                activeFilters={filters}
                                onFilterChange={(newFilters) => {
                                    console.log('[FilterBar] New filters:', newFilters);
                                    setFilters(newFilters);
                                    setSelectedCategories(newFilters.categories);
                                }}
                            />

                            {/* Browse List */}
                            <div className="flex-1">
                                <BrowseList
                                    mods={browseMods}
                                    installedModIds={installedMods.map(m => m.gameBananaId).filter((id): id is number => id !== undefined)}
                                    loading={loadingBrowse}
                                    onInstall={handleInstall}
                                    onSelect={(mod) => setSelectedMod(mod)}
                                    installedMods={installedMods}
                                    onToggle={handleToggle}
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Mod Details Modal */}
            {
                selectedMod && (
                    <ModDetailsModal
                        mod={selectedMod}
                        isOpen={!!selectedMod}
                        onClose={() => setSelectedMod(null)}
                        onInstall={(mod) => handleInstall(mod as any)}
                    />
                )
            }

            {/* Update Dialog */}
            {
                updateDialogMod && (
                    <UpdateDialog
                        mod={updateDialogMod}
                        changelog={updateChangelog}
                        isUpdating={updatingMods.includes(updateDialogMod.id)}
                        onUpdate={() => handlePerformUpdate(updateDialogMod.id)}
                        onClose={() => setUpdateDialogMod(null)}
                    />
                )
            }
        </div >
    );
};

const InstalledList: React.FC<{
    mods: Mod[];
    onToggle: (id: string) => void;
    onUpdate: (mod: Mod) => void;
    onPriorityChange: (id: string, direction: 'up' | 'down') => void;
    onUninstall: (id: string) => void;
    updatingMods: string[];
    onSelect: (mod: Mod) => void;
}> = ({ mods, onToggle, onUpdate, onPriorityChange, onUninstall, updatingMods, onSelect }) => {
    if (mods.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/10 rounded-2xl">
                <Folder size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">No mods installed.</p>
                <p className="text-sm">Browse online or drag files to install.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {mods.map((mod) => (
                <div key={mod.id} className={`glass-panel p-4 flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-4 transition-all hover:bg-white/5 group border ${mod.isEnabled ? 'border-white/10' : 'border-red-500/10 bg-red-500/5'}`}>

                    {/* Icon */}
                    <div
                        className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center text-gray-500 shadow-inner relative overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
                        onClick={() => onSelect(mod)}
                    >
                        {mod.iconUrl ? (
                            <img src={mod.iconUrl} alt="icon" className="w-full h-full object-cover" />
                        ) : (
                            <Folder size={24} className="group-hover:text-blue-200" />
                        )}
                        {mod.hasUpdate && (
                            <div className="absolute top-0 right-0 w-3 h-3 bg-green-500 rounded-full border border-black shadow-[0_0_10px_#22c55e]"></div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center space-x-2">
                            <h3 className={`font-bold text-lg truncate ${mod.isEnabled ? 'text-gray-200' : 'text-gray-500'} cursor-pointer hover:text-blue-400 transition-colors`} onClick={() => onSelect(mod)}>{mod.name}</h3>
                            {mod.hasUpdate && (
                                <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-[10px] font-bold uppercase rounded border border-green-500/30">Update Available</span>
                            )}
                        </div>
                        <p className="text-sm text-gray-400 truncate cursor-pointer" onClick={() => onSelect(mod)}>{mod.description}</p>
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                            <span className="bg-white/5 px-2 py-0.5 rounded">v{mod.version}</span>
                            <span>by <span className="text-gray-400">{mod.author}</span></span>
                            {mod.viewCount !== undefined && (
                                <span className="flex items-center space-x-1" title="Views">
                                    <Eye size={10} /> <span>{mod.viewCount.toLocaleString()}</span>
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-4 self-end md:self-auto">

                        {/* Priority Controls */}
                        <div className="flex flex-col items-center space-y-1 mr-2">
                            <button onClick={() => onPriorityChange(mod.id, 'up')} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="Increase Priority (Overwrite others)">
                                <ChevronUp size={14} />
                            </button>
                            <button onClick={() => onPriorityChange(mod.id, 'down')} className="p-1 hover:bg-white/10 rounded text-gray-400 hover:text-white" title="Decrease Priority">
                                <ChevronDown size={14} />
                            </button>
                        </div>
                        {mod.hasUpdate && (
                            <button
                                onClick={() => onUpdate(mod)}
                                disabled={updatingMods.includes(mod.id)}
                                className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg transition-colors border text-xs font-bold ${updatingMods.includes(mod.id) ? 'bg-gray-700 text-gray-400 border-gray-600' : 'bg-green-600/20 text-green-300 hover:bg-green-600 hover:text-white border-green-600/30'}`}
                            >
                                <Download size={14} className={updatingMods.includes(mod.id) ? "animate-bounce" : ""} />
                                <span>{updatingMods.includes(mod.id) ? 'Updating...' : `Update to v${mod.latestVersion}`}</span>
                            </button>
                        )}

                        <div className="flex items-center space-x-2">
                            <span className={`text-xs font-medium uppercase ${mod.isEnabled ? 'text-blue-400' : 'text-gray-600'}`}>
                                {mod.isEnabled ? 'Active' : 'Disabled'}
                            </span>
                            <button
                                onClick={() => onToggle(mod.id)}
                                className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ${mod.isEnabled ? 'bg-blue-600' : 'bg-gray-700'}`}
                            >
                                <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform duration-300 ${mod.isEnabled ? 'translate-x-6' : 'translate-x-0'}`}></div>
                            </button>
                            <button
                                onClick={() => onUninstall(mod.id)}
                                className="p-2 hover:bg-red-500/20 rounded-full text-gray-500 hover:text-red-400 transition-colors"
                                title="Uninstall Mod"
                            >
                                <Trash2 size={16} />
                            </button>
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

const BrowseList: React.FC<{
    mods: Mod[];
    installedModIds?: number[];
    loading: boolean;
    onInstall: (mod: Mod) => void;
    onSelect: (mod: Mod) => void;
    installedMods?: Mod[];
    onToggle?: (id: string) => void;
}> = ({ mods, installedModIds = [], loading, onInstall, onSelect, installedMods = [], onToggle }) => {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-3 pb-10 p-2">
            {mods.map((mod) => {
                const isInstalled = (mod.gameBananaId !== undefined && installedModIds.includes(mod.gameBananaId)) || (mod as any).isInstalled;
                // Find local mod if installed to check status
                const localMod = isInstalled && installedMods ? installedMods.find(m => m.gameBananaId === mod.gameBananaId) : null;

                return (
                    <div
                        key={mod.id}
                        className={`bg-gray-900 border ${isInstalled ? 'border-green-500/30' : 'border-white/10 hover:border-blue-500/50'} rounded-lg overflow-hidden flex flex-col transition-all duration-200 hover:transform hover:-translate-y-1 hover:shadow-xl group ring-1 ring-white/5 relative`}
                    >
                        {/* Image Header */}
                        <div
                            className="relative aspect-video w-full bg-black cursor-pointer overflow-hidden group-hover:brightness-110 transition-all"
                            onClick={() => onSelect(mod)}
                        >
                            {mod.images && mod.images.length > 0 ? (
                                <img src={mod.images[0]} alt={mod.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : mod.iconUrl ? (
                                <img src={mod.iconUrl} alt={mod.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center bg-gray-800">
                                    <Folder size={32} className="text-gray-600" />
                                </div>
                            )}

                            {/* Overlay Gradient */}
                            <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/80 to-transparent" />

                            {/* Installed Badge */}
                            {isInstalled && (
                                <div className={`absolute top-1 right-1 ${localMod && !localMod.isEnabled ? 'bg-yellow-600' : 'bg-green-600'} text-white text-[9px] uppercase font-bold px-1.5 py-0.5 rounded backdrop-blur-md flex items-center gap-1 shadow-sm`}>
                                    <Check size={8} strokeWidth={4} /> <span>{localMod && !localMod.isEnabled ? 'Disabled' : 'Installed'}</span>
                                </div>
                            )}

                            {/* Category Badge */}
                            <div className="absolute bottom-1 left-2 text-white/90 text-[10px] font-bold flex items-center gap-1 shadow-sm drop-shadow-md">
                                {mod.category || 'Mod'}
                            </div>
                        </div>

                        {/* Content */}
                        <div className="p-2 flex flex-col flex-1 gap-1.5 bg-[#0f1115]">
                            <div className="flex-1 min-w-0">
                                <h3
                                    className="font-bold text-sm text-gray-100 line-clamp-1 hover:text-blue-400 cursor-pointer"
                                    onClick={() => onSelect(mod)}
                                    title={mod.name}
                                >
                                    {mod.name}
                                </h3>
                                <div className="flex items-center gap-1.5 mb-1">
                                    {mod.iconUrl ? (
                                        <img src={mod.iconUrl} className="w-4 h-4 rounded-full object-cover bg-gray-800" alt="avatar" />
                                    ) : (
                                        <div className="w-4 h-4 rounded-full bg-gray-700"></div>
                                    )}
                                    <span className="text-[10px] text-gray-400 truncate">by <span className="text-gray-300 font-medium hover:text-white transition-colors">{mod.author}</span></span>
                                </div>
                            </div>

                            {/* Stats Grid */}
                            <div className="flex items-center justify-between text-[10px] text-gray-400 bg-black/20 rounded px-1.5 py-1">
                                <div className="flex items-center gap-1" title="Downloads">
                                    <Download size={10} />
                                    <span className="font-bold text-gray-300">{mod.downloadCount !== undefined ? (mod.downloadCount >= 1000 ? (mod.downloadCount / 1000).toFixed(1) + 'k' : mod.downloadCount) : 0}</span>
                                </div>
                                <div className="flex items-center gap-1" title="Likes">
                                    <Heart size={10} />
                                    <span className="font-bold text-gray-300">{mod.likeCount?.toLocaleString() || 0}</span>
                                </div>
                                <div className="flex items-center gap-1" title="Views">
                                    <Eye size={10} />
                                    <span className="font-bold text-gray-300">{mod.viewCount !== undefined ? (mod.viewCount >= 1000 ? (mod.viewCount / 1000).toFixed(1) + 'k' : mod.viewCount) : 0}</span>
                                </div>
                            </div>

                            <div className="flex items-center justify-between text-[9px] text-gray-500 px-0.5">
                                <span>{mod.dateAdded ? formatDistanceToNow(new Date(mod.dateAdded * 1000)) + ' ago' : ''}</span>
                                {mod.isNsfw && <span className="text-red-500 font-bold border border-red-500/20 px-1 rounded bg-red-500/5">NSFW</span>}
                            </div>

                            {/* Actions */}
                            <div className="grid grid-cols-2 gap-2 mt-auto pt-1">
                                <button
                                    onClick={() => onSelect(mod)}
                                    className="flex items-center justify-center px-2 py-1.5 rounded bg-white/5 hover:bg-white/10 text-gray-300 text-[10px] font-semibold transition-colors border border-white/5"
                                >
                                    More Info
                                </button>
                                {isInstalled && localMod && onToggle ? (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onToggle(localMod.id); }}
                                        className={`flex items-center justify-center px-2 py-1.5 rounded text-white text-[10px] font-bold shadow-lg transition-all active:scale-95 ${localMod.isEnabled ? 'bg-red-600/80 hover:bg-red-500 border border-red-500/30' : 'bg-green-600 hover:bg-green-500 border border-green-500/30'}`}
                                        title={localMod.isEnabled ? "Disable Mod" : "Enable Mod"}
                                    >
                                        {localMod.isEnabled ? (
                                            <>
                                                <XCircle size={12} className="mr-1" />
                                                Disable
                                            </>
                                        ) : (
                                            <>
                                                <Check size={12} className="mr-1" />
                                                Enable
                                            </>
                                        )}
                                    </button>
                                ) : (
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onInstall(mod); }}
                                        className="flex items-center justify-center px-2 py-1.5 rounded bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold shadow-lg shadow-blue-900/20 transition-all active:scale-95 group-hover:shadow-blue-600/40"
                                    >
                                        <Download size={12} className="mr-1" />
                                        Download
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                );
            })}
            {loading && (
                <>
                    <Skeleton />
                    <Skeleton />
                    <Skeleton />
                    <Skeleton />
                </>
            )}
        </div>
    );
};

export default Mods;
