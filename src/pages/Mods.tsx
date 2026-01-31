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

    // Server-Side Pagination State
    const [browseMods, setBrowseMods] = useState<Mod[]>([]);
    const [loadingBrowse, setLoadingBrowse] = useState(false);
    const [browsePage, setBrowsePage] = useState(1);
    const [hasMore, setHasMore] = useState(true);

    const [installedLoading, setInstalledLoading] = useState(true);
    const [selectedMod, setSelectedMod] = useState<Mod | null>(null);
    const [updateDialogMod, setUpdateDialogMod] = useState<Mod | null>(null);
    const [updateChangelog, setUpdateChangelog] = useState<any | null>(null);

    const [checkingUpdates, setCheckingUpdates] = useState(false);
    const [updatingMods, setUpdatingMods] = useState<string[]>([]);

    // Drag and Drop state
    const [isDragging, setIsDragging] = useState(false);

    // Filter and Category state
    const [categories, setCategories] = useState<Category[]>([]);
    const [filters, setFilters] = useState<FilterState>({
        categories: [],
        sortBy: 'date',
        order: 'desc',
        dateRange: 'all',
        nsfw: false,
        zeroSpark: false,
        colorZ: false
    });
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);

    const dragCounter = useRef(0);
    // Ref to track if initial load happened to prevent double firing
    const initialLoadDone = useRef(false);
    // Track latest request to avoid race conditions
    const lastRequestId = useRef(0);

    // Initial load for Installed Mods
    useEffect(() => {
        loadInstalledMods();
    }, []);

    // Listen for deep link events or external changes
    useEffect(() => {
        const removeListener = window.electronAPI.onDownloadScanFinished(() => {
            loadInstalledMods();
            setActiveTab('downloads');
            showToast('Download started via external link', 'info');
        });
        return () => {
             if (removeListener) removeListener();
        };
    }, []);

    // Load Categories
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

    // Server-Side Fetch
    const loadBrowseMods = async (page: number, reset: boolean = false) => {
        // Increment request ID
        const requestId = ++lastRequestId.current;

        if (loadingBrowse && !reset) return;

        setLoadingBrowse(true);
        try {
            console.log(`[Browse] Fetching page ${page}...`);

            const options: any = {
                page,
                perPage: 20,
                gameId: 21179,
                search: searchQuery,
                sort: filters.sortBy,
                order: filters.order,
                dateRange: filters.dateRange
            };

            if (filters.categories.length > 0) {
                options.categoryId = filters.categories[0];
            }

            const results = await window.electronAPI.searchBySection(options);

            // Check if this request is stale
            if (requestId !== lastRequestId.current) {
                console.log(`[Browse] Ignoring stale request ${requestId}`);
                return;
            }

            // Mark installed status
            let processed = results.map((m: any) => ({
                 ...m,
                 isInstalled: installedMods.some(i => i.gameBananaId === m.gameBananaId)
            }));

            // Client-side filtering fallback for unsupported API filters
            if (!filters.nsfw) {
                processed = processed.filter((m: any) => !m.isNsfw);
            }
             if (filters.zeroSpark && !searchQuery.toLowerCase().includes('zerospark')) {
                processed = processed.filter((m: any) =>
                    (m.name && m.name.toLowerCase().includes('zerospark')) ||
                    (m.description && m.description.toLowerCase().includes('zerospark'))
                );
            }
            if (filters.colorZ && !searchQuery.toLowerCase().includes('colorz')) {
                processed = processed.filter((m: any) =>
                    (m.name && m.name.toLowerCase().includes('colorz')) ||
                    (m.description && m.description.toLowerCase().includes('colorz'))
                );
            }

            if (reset || page === 1) {
                setBrowseMods(processed);
                setBrowsePage(1);
            } else {
                setBrowseMods(prev => [...prev, ...processed]);
            }

            // If we got fewer results than requested, we likely hit the end
            if (results.length < 20) {
                setHasMore(false);
            } else {
                setHasMore(true);
            }

        } catch (error) {
            console.error('Failed to load online mods:', error);
            showToast('Failed to load online mods', 'error');
        } finally {
            setLoadingBrowse(false);
        }
    };

    // Effect: Initial Load on Tab Switch
    useEffect(() => {
        if (activeTab === 'browse') {
            if (browseMods.length === 0 && !initialLoadDone.current) {
                loadCategories();
                loadBrowseMods(1, true);
                initialLoadDone.current = true;
            }
        }
    }, [activeTab]);

    // Effect: Refresh on Filters/Search Change
    useEffect(() => {
        if (activeTab === 'browse') {
            const timer = setTimeout(() => {
                 setBrowsePage(1);
                 loadBrowseMods(1, true);
            }, 500); // Debounce
            return () => clearTimeout(timer);
        }
    }, [filters, searchQuery]);

    // Effect: Infinite Scroll (Page > 1)
    useEffect(() => {
        if (browsePage > 1 && activeTab === 'browse') {
            loadBrowseMods(browsePage, false);
        }
    }, [browsePage]);

    // Effect: Sync Installed Status
    useEffect(() => {
        if (browseMods.length > 0) {
            setBrowseMods(prev => {
                const installedIds = new Set(installedMods.map(m => m.gameBananaId));
                return prev.map(m => ({
                    ...m,
                    isInstalled: installedIds.has(m.gameBananaId)
                }));
            });
        }
    }, [installedMods]);

    // Infinite Scroll Observer
    const observerTarget = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (loadingBrowse || !hasMore) return;

        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting) {
                    setBrowsePage(prev => prev + 1);
                }
            },
            { threshold: 0.1 }
        );

        if (observerTarget.current) {
            observer.observe(observerTarget.current);
        }

        return () => observer.disconnect();
    }, [loadingBrowse, hasMore, browseMods]);

    // Filter Logic for Installed Mods (Local)
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
        try {
            const changelog = await window.electronAPI.getModChangelog(mod.id);
            setUpdateChangelog(changelog);
            setUpdateDialogMod(mod);
        } catch (_e) {
            console.error(_e);
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
            setUpdateDialogMod(null);
        }
    };

    const handleToggle = async (id: string) => {
        setInstalledMods(prev => prev.map(m => m.id === id ? { ...m, isEnabled: !m.isEnabled } : m));

        const mod = installedMods.find(m => m.id === id);
        if (mod) {
            const newState = !mod.isEnabled;
            const result = await window.electronAPI.toggleMod(id, newState);

            if (result.success) {
                if (result.conflict) {
                    showToast(result.conflict, 'info');
                }
            } else {
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
        if (window.confirm('Are you sure you want to permanently uninstall this mod?')) {
            try {
                const result = await window.electronAPI.uninstallMod(id);
                if (result.success) {
                    showToast('Mod uninstalled successfully', 'success');
                    loadInstalledMods();
                } else {
                    showToast(result.message || 'Failed to uninstall mod', 'error');
                }
            } catch (error) {
                console.error('Uninstall error:', error);
                showToast('An error occurred during uninstallation.', 'error');
            }
        }
    };

    const handlePriorityChange = async (modId: string, direction: 'up' | 'down') => {
        try {
            const success = await window.electronAPI.setModPriority(modId, direction);
            if (success) {
                loadInstalledMods();
            } else {
                showToast('Failed to change priority', 'error');
            }
        } catch (e) {
            console.error(e);
            showToast('Error changing priority', 'error');
        }
    };

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
            data-testid="mods-drop-zone"
        >
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-blue-600/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center border-4 border-white/20 border-dashed animate-in fade-in duration-200">
                    <UploadCloud size={80} className="text-white mb-4 animate-bounce" />
                    <h2 className="text-3xl font-bold text-white">Drop to Install</h2>
                    <p className="text-blue-100 mt-2">Release your files here to add them to the loader.</p>
                </div>
            )}

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 space-y-4 xl:space-y-0 flex-shrink-0 relative z-40">

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

                <div className="flex items-center space-x-3 w-full xl:w-auto">
                    {activeTab === 'installed' && (
                        <div className="flex items-center space-x-2">
                            <ProfileManager onProfileLoaded={() => loadInstalledMods()} />
                        </div>
                    )}

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

                            <button
                                onClick={handleCheckUpdates}
                                disabled={checkingUpdates}
                                className={`flex items-center space-x-2 bg-blue-600/20 text-blue-300 border border-blue-500/30 hover:bg-blue-600/40 px-4 py-2 rounded-xl text-sm font-bold transition-all ${checkingUpdates ? 'opacity-50 cursor-not-allowed' : ''}`}
                            >
                                <RefreshCw size={16} className={checkingUpdates ? "animate-spin" : ""} />
                                <span>{checkingUpdates ? 'Checking...' : 'Check Updates'}</span>
                            </button>

                            {hasUpdates && (
                                <button
                                    onClick={handleUpdateAll}
                                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 transition-all animate-pulse hover:animate-none"
                                >
                                    <Download size={16} />
                                    <span>Update All</span>
                                </button>
                            )}
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
                            <button
                                onClick={() => loadBrowseMods(1, true)}
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

            <div className="flex-1 overflow-auto pr-2 pb-4 scroll-smooth">
                {activeTab === 'installed' ? (
                    <ModGrid
                        mods={filteredInstalledMods}
                        installedMods={installedMods}
                        loading={installedLoading}
                        onToggle={handleToggle}
                        onUpdate={(mod) => handleUpdateClick(mod)}
                        onUninstall={handleUninstall}
                        onPriorityChange={handlePriorityChange}
                        updatingMods={updatingMods}
                        onSelect={(mod) => setSelectedMod(mod)}
                    />
                ) : activeTab === 'downloads' ? (
                    <DownloadsList />
                ) : (
                    <div className="flex gap-4">
                        <div className="flex-shrink-0">
                            <CategorySidebar
                                categories={categories}
                                selectedCategories={selectedCategories}
                                onCategorySelect={(category) => {
                                    const newSelected = selectedCategories.includes(category)
                                        ? []
                                        : [category];
                                    setSelectedCategories(newSelected);
                                    setFilters(f => ({ ...f, categories: newSelected }));
                                }}
                            />
                        </div>

                        <div className="flex-1 flex flex-col min-w-0">
                            <FilterBar
                                availableCategories={categories}
                                activeFilters={filters}
                                onFilterChange={(newFilters) => {
                                    setFilters(newFilters);
                                    setSelectedCategories(newFilters.categories);
                                }}
                            />

                            <div className="flex-1">
                                <ModGrid
                                    mods={browseMods}
                                    installedMods={installedMods}
                                    loading={loadingBrowse && browsePage === 1}
                                    onInstall={handleInstall}
                                    onSelect={(mod) => setSelectedMod(mod)}
                                    onToggle={handleToggle}
                                />
                            </div>

                            {(loadingBrowse && browsePage > 1) || (browseMods.length > 0 && hasMore) ? (
                                <div ref={observerTarget} className="flex justify-center items-center py-8 shrink-0 w-full">
                                    <div className="w-6 h-6 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                                </div>
                            ) : null}

                            {!loadingBrowse && browseMods.length === 0 && (
                                <div className="flex justify-center items-center h-64 text-gray-400">
                                    No mods found.
                                </div>
                            )}
                        </div>
                    </div>
                )}
            </div>

            {selectedMod && (
                <ModDetailsModal
                    mod={selectedMod}
                    isOpen={!!selectedMod}
                    onClose={() => setSelectedMod(null)}
                    onInstall={(mod) => handleInstall(mod as any)}
                />
            )}

            {updateDialogMod && (
                <UpdateDialog
                    mod={updateDialogMod}
                    changelog={updateChangelog}
                    isUpdating={updatingMods.includes(updateDialogMod.id)}
                    onUpdate={() => handlePerformUpdate(updateDialogMod.id)}
                    onClose={() => setUpdateDialogMod(null)}
                />
            )}
        </div >
    );
};

export default Mods;
