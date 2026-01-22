import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, RefreshCw, UploadCloud, ChevronDown } from 'lucide-react';
import { useToast } from '../components/ToastContext';
import ModDetailsModal from '../components/ModDetailsModal';
import UpdateDialog from '../components/UpdateDialog';
import { DownloadsList } from '../components/DownloadsList';
import ProfileManager from '../components/ProfileManager';
import FilterBar from '../components/FilterBar';
import type { FilterState } from '../components/FilterBar';
import CategorySidebar from '../components/CategorySidebar';
import type { Category } from '../components/CategorySidebar';
import { ModGrid } from '../components/mods/ModGrid';
import type { Mod } from '../types';

function formatBytes(bytes: number, decimals = 2) {
    if (!+bytes) return '0 Bytes';
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return `${parseFloat((bytes / Math.pow(k, i)).toFixed(dm))} ${sizes[i]}`;
}

const Mods: React.FC = () => {
    const { showToast } = useToast();
    const [activeTab, setActiveTab] = useState<'installed' | 'browse' | 'downloads'>('installed');
    const [installedMods, setInstalledMods] = useState<Mod[]>([]);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled' | 'updates'>('all');

    // New: Client-Side Mod Handling Support
    const [allOnlineMods, setAllOnlineMods] = useState<Mod[]>([]); // New: Full Local Dataset
    const [browseMods, setBrowseMods] = useState<Mod[]>([]); // Displayed Page
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
        if (activeTab === 'browse' && browseMods.length === 0 && allOnlineMods.length === 0) {
            loadCategories();
            loadBrowseMods(1, false);
        }
    }, [activeTab]);

    // Reset page when filters change
    useEffect(() => {
        if (activeTab === 'browse') {
            setBrowsePage(1);
        }
    }, [filters, searchQuery]);

    const loadCategories = async () => {
        try {
            const cats = await window.electronAPI.fetchCategories();
            if (cats && Array.isArray(cats)) {
                setCategories(cats.map((cat: any, idx: number) => ({
                    id: cat._idRow || idx,
                    name: cat._sName || cat.name || 'Unknown',
                    count: cat._nItemCount || cat._nModCount || 0
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
            console.error('Failed to load installed mods', 'error');
            showToast('Failed to load installed mods', 'error');
        } finally {
            setInstalledLoading(false);
        }
    };

    const loadBrowseMods = async (page: number, reset: boolean = false, forceRefresh: boolean = false) => {
        if (loadingBrowse && !reset && !forceRefresh) return;

        // Trigger fetch if we don't have data OR forced refresh
        if (allOnlineMods.length === 0 || forceRefresh) {
            setLoadingBrowse(true);
            try {
                console.log('[Browse] Fetching full online mod list...');
                const fullList = await window.electronAPI.getAllOnlineMods(forceRefresh);
                console.log(`[Browse] Fetched ${fullList.length} total mods.`);
                setAllOnlineMods(fullList);
                if (forceRefresh) showToast("Online mod list updated", "success");
            } catch (error) {
                console.error('Failed to fetch all online mods:', error);
                showToast('Failed to load online mods', 'error');
            } finally {
                setLoadingBrowse(false);
            }
        }

        // Ensure page is set correctly
        if (reset || page === 1) {
            setBrowsePage(1);
        } else {
            setBrowsePage(page);
        }
    };

    // Master Effect for Client-Side Filtering, Sorting, and Pagination
    useEffect(() => {
        if (activeTab !== 'browse') return;
        if (allOnlineMods.length === 0) return;

        console.log('[Browse] Applying local filters...', { filters, searchQuery, page: browsePage });

        let result = [...allOnlineMods];

        // 1. Search
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            result = result.filter(m =>
                m.name.toLowerCase().includes(query) ||
                (m.description && m.description.toLowerCase().includes(query)) ||
                m.author.toLowerCase().includes(query)
            );
        }

        // 2. Categories
        if (filters.categories.length > 0) {
            const selectedCat = filters.categories[0];
            result = result.filter(m => m.category === selectedCat);
        }

        // 3. NSFW
        if (!filters.nsfw) {
            result = result.filter(m => !m.isNsfw);
        }

        // 4. ZeroSpark / ColorZ
        if (filters.zeroSpark && !searchQuery.toLowerCase().includes('zerospark')) {
            result = result.filter(m =>
                (m.name && m.name.toLowerCase().includes('zerospark')) ||
                (m.description && m.description.toLowerCase().includes('zerospark'))
            );
        }

        if (filters.colorZ && !searchQuery.toLowerCase().includes('colorz')) {
            result = result.filter(m =>
                (m.name && m.name.toLowerCase().includes('colorz')) ||
                (m.description && m.description.toLowerCase().includes('colorz'))
            );
        }

        // 5. Sort
        result.sort((a: any, b: any) => {
            let valA, valB;
            switch (filters.sortBy) {
                case 'downloads':
                    valA = a.downloadCount || 0; valB = b.downloadCount || 0;
                    break;
                case 'views':
                    valA = a.viewCount || 0; valB = b.viewCount || 0;
                    break;
                case 'likes':
                    valA = a.likeCount || 0; valB = b.likeCount || 0;
                    break;
                case 'date':
                default:
                    valA = a.dateAdded || 0; valB = b.dateAdded || 0;
                    break;
            }
            return filters.order === 'asc' ? valA - valB : valB - valA;
        });

        // 6. Pagination
        const start = (browsePage - 1) * 20; // 20 items per page
        const end = start + 20;
        const sliced = result.slice(start, end);

        // Mark installed
        const installedIds = new Set(installedMods.map(m => m.gameBananaId));
        const finalMods = sliced.map(m => ({
            ...m,
            isInstalled: installedIds.has(m.gameBananaId)
        }));

        setBrowseMods(finalMods);

    }, [allOnlineMods, filters, searchQuery, browsePage, installedMods, activeTab]);

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
        } catch (_e) {
            console.error(_e);
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
        } catch (_e) {
            console.error(_e);
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
        } catch (_e) {
            console.error(_e);
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
        } catch (_e) {
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

            {/* Top Bar - High Z-Index for Dropdowns */}
            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 space-y-4 xl:space-y-0 flex-shrink-0 relative z-40">

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
                        <div className="flex items-center space-x-2">
                            <ProfileManager onProfileLoaded={() => loadInstalledMods()} />
                        </div>
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
                                    <option value="all" className="bg-[#1a1b26] text-white">All Mods</option>
                                    <option value="enabled" className="bg-[#1a1b26] text-white">Enabled Only</option>
                                    <option value="disabled" className="bg-[#1a1b26] text-white">Disabled Only</option>
                                    <option value="updates" className="bg-[#1a1b26] text-white">Updates Available</option>
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
                            {/* Stats */}
                            <div className="flex items-center space-x-3 text-xs text-gray-400 border-l border-white/10 pl-3 ml-2">
                                <div className="flex flex-col">
                                    <span className="font-bold text-white">{filteredInstalledMods.length}</span>
                                    <span>Mods</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white">{formatBytes(filteredInstalledMods.reduce((acc: number, mod: any) => acc + (mod.fileSize || 0), 0))}</span>
                                    <span>Size</span>
                                </div>
                            </div>
                        </>
                    )}
                    {activeTab === 'browse' && (
                        <div className="flex items-center space-x-3">
                            <div className="flex items-center space-x-3 text-xs text-gray-400 border-r border-white/10 pr-3 mr-2">
                                <div className="flex flex-col items-end">
                                    <span className="font-bold text-white">{allOnlineMods.length}</span>
                                    <span>Total Mods</span>
                                </div>
                            </div>
                            <button
                                onClick={() => loadBrowseMods(1, true, true)} // Force refresh
                                disabled={loadingBrowse}
                                className="bg-white/10 hover:bg-white/20 p-2 rounded-xl transition-colors text-white"
                                title="Refresh Online Mods"
                            >
                                <RefreshCw size={18} className={loadingBrowse ? "animate-spin" : ""} />
                            </button>
                        </div>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div
                className="flex-1 overflow-auto pr-2 pb-4 scroll-smooth"
            >
                {activeTab === 'installed' ? (
                    <ModGrid
                        mods={filteredInstalledMods}
                        installedMods={installedMods}
                        loading={installedLoading}
                        onToggle={handleToggle}
                        onUpdate={(mod) => handleUpdateClick(mod)}
                        onUninstall={handleUninstall}
                        updatingMods={updatingMods}
                        onSelect={(mod) => setSelectedMod(mod)}
                    />
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
                                <ModGrid
                                    mods={browseMods}
                                    installedMods={installedMods}
                                    loading={loadingBrowse || (allOnlineMods.length === 0 && loadingBrowse)}
                                    onInstall={handleInstall}
                                    onSelect={(mod) => setSelectedMod(mod)}
                                    onToggle={handleToggle}
                                />
                            </div>

                            {/* Pagination Controls for Browse Tab */}
                            {!loadingBrowse && browseMods.length > 0 && (
                                <div className="flex justify-center items-center space-x-4 py-8 shrink-0">
                                    <button
                                        onClick={() => {
                                            if (browsePage > 1) {
                                                setBrowsePage(browsePage - 1);
                                            }
                                        }}
                                        disabled={browsePage === 1}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Previous
                                    </button>
                                    <span className="text-sm text-gray-400">Page {browsePage}</span>
                                    <button
                                        onClick={() => {
                                            // Check if we have more pages (approximate check since we filter locally)
                                            // If current slice is full, assume there is a next page
                                            if (browseMods.length === 20) {
                                                setBrowsePage(browsePage + 1);
                                            }
                                        }}
                                        disabled={browseMods.length < 20}
                                        className="px-4 py-2 bg-white/5 hover:bg-white/10 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
                                    >
                                        Next
                                    </button>
                                </div>
                            )}
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

export default Mods;
