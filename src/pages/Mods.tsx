import React, { useState, useEffect, useRef } from 'react';
import { Download, RefreshCw, UploadCloud } from 'lucide-react';
import { Button, SearchField, Select, Spinner, Tabs } from '@juninmd/sonido';
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
import type { Mod, LocalMod } from '../../shared/types';

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
    const [installedMods, setInstalledMods] = useState<LocalMod[]>([]);
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

    // Refresh after downloads or browsing may have changed the local catalog.
    useEffect(() => {
        if (activeTab === 'installed') loadInstalledMods();
    }, [activeTab]);

    // Server-Side Fetch
    const loadBrowseMods = async (page: number, reset: boolean = false) => {
        if (loadingBrowse && !reset) return;

        // Only after the guard: a skipped call must not turn the load in flight into a "stale" one.
        const requestId = ++lastRequestId.current;

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
                options.categoryId = categories.find(
                    category => category.name === filters.categories[0]
                )?.id;
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
            if (requestId !== lastRequestId.current) return;
            console.error('Failed to load online mods:', error);
            showToast('Failed to load online mods', 'error');
        } finally {
            // A superseded request must not switch the spinner off while the newer one is still loading.
            if (requestId === lastRequestId.current) setLoadingBrowse(false);
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
        const ids = modsToUpdate.map(m => m.id);

        if (ids.length === 0) return;

        setUpdatingMods(prev => [...new Set([...prev, ...ids])]);
        showToast(`Starting batch update for ${ids.length} mods...`, 'info');

        try {
            const result = await window.electronAPI.updateAllMods(ids);

            setInstalledMods(prev => prev.map(m => {
                const updateResult = result.results.find(r => r.id === m.id);
                if (updateResult && updateResult.success) {
                    return {
                        ...m,
                        hasUpdate: false,
                        version: m.latestVersion || m.version
                    };
                }
                return m;
            }));

            if (result.failCount > 0) {
                showToast(`Batch update finished. Success: ${result.successCount}, Failed: ${result.failCount}`, 'info');
            } else {
                showToast(`All ${result.successCount} mods updated successfully!`, 'success');
            }

        } catch (e) {
            console.error('Batch update failed', e);
            showToast('Batch update failed', 'error');
        } finally {
            setUpdatingMods(prev => prev.filter(id => !ids.includes(id)));
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
            // Cast to any to bypass strict union check against OnlineMod
            // The backend handles validation of gameBananaId
            const result = await window.electronAPI.installOnlineMod(mod as any);
            if (result.success) {
                if (result.downloadId) {
                    showToast('Download started! Added to queue.', 'success');
                    setActiveTab('downloads');
                } else {
                    showToast(result.message || 'Installed successfully', 'success');
                    loadInstalledMods();
                }
            } else {
                showToast(result.message || 'Installation failed', 'error');
            }
        } catch {
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
                showToast(result.message || 'Installation failed', 'error');
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
            {isDragging && (
                <div className="absolute inset-0 z-50 bg-blue-600/90 backdrop-blur-md rounded-xl flex flex-col items-center justify-center border-4 border-white/20 border-dashed animate-in fade-in duration-200">
                    <UploadCloud size={80} className="text-white mb-4 animate-bounce" />
                    <h2 className="text-3xl font-bold text-white">Drop to Install</h2>
                    <p className="text-blue-100 mt-2">Release your files here to add them to the loader.</p>
                </div>
            )}

            <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center mb-6 space-y-4 xl:space-y-0 flex-shrink-0 relative z-40">

                <div className="flex bg-black/40 p-1 rounded-xl backdrop-blur-sm border border-white/10">
                    <Tabs
                        items={[
                            { key: 'installed', label: 'Installed' },
                            { key: 'browse', label: 'Browse Online' },
                            { key: 'downloads', label: 'Downloads' },
                        ]}
                        value={activeTab}
                        onChange={setActiveTab}
                        label="Mod views"
                        variant="pill"
                    />
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full xl:w-auto">
                    {activeTab === 'installed' && (
                        <div className="flex items-center space-x-2 shrink-0">
                            <ProfileManager onProfileLoaded={() => loadInstalledMods()} />
                        </div>
                    )}

                    <div className="flex-1 min-w-[200px] xl:w-64">
                        <SearchField
                            label="Search mods"
                            placeholder={activeTab === 'browse' ? "Search online mods..." : "Search installed mods..."}
                            value={searchQuery}
                            onChange={setSearchQuery}
                        />
                    </div>

                    {activeTab === 'installed' && (
                        <>
                            <Select
                                label="Filter installed mods"
                                hideLabel
                                compact
                                value={filterStatus}
                                onChange={(value) => setFilterStatus(value as typeof filterStatus)}
                                options={[
                                    { value: 'all', label: 'All Mods' },
                                    { value: 'enabled', label: 'Enabled Only' },
                                    { value: 'disabled', label: 'Disabled Only' },
                                    { value: 'updates', label: 'Updates Available' },
                                ]}
                                className="w-36 shrink-0"
                            />

                            <Button
                                variant="secondary"
                                appearance="outline"
                                size="sm"
                                className="whitespace-nowrap shrink-0"
                                onClick={handleCheckUpdates}
                                loading={checkingUpdates}
                                iconStart={checkingUpdates ? undefined : <RefreshCw size={16} />}
                            >
                                {checkingUpdates ? 'Checking...' : 'Check Updates'}
                            </Button>

                            {hasUpdates && (
                                <Button
                                    variant="primary"
                                    size="sm"
                                    className="whitespace-nowrap shrink-0"
                                    onClick={handleUpdateAll}
                                    iconStart={<Download size={16} />}
                                >
                                    Update All
                                </Button>
                            )}
                            <div className="flex items-center gap-3 text-xs text-gray-400 border-l border-white/10 pl-3 ml-1 shrink-0">
                                <div className="flex flex-col">
                                    <span className="font-bold text-white">{filteredInstalledMods.length}</span>
                                    <span>Mods</span>
                                </div>
                                <div className="flex flex-col">
                                    <span className="font-bold text-white">{formatBytes(filteredInstalledMods.reduce((acc: number, mod: LocalMod) => acc + (mod.fileSize || 0), 0))}</span>
                                    <span>Size</span>
                                </div>
                            </div>
                        </>
                    )}
                    {activeTab === 'browse' && (
                        <div className="flex items-center space-x-3">
                            <Button
                                variant="secondary"
                                size="icon"
                                onClick={() => loadBrowseMods(1, true)}
                                disabled={loadingBrowse}
                                title="Refresh Online Mods"
                                aria-label="Refresh Online Mods"
                            >
                                <RefreshCw size={18} className={loadingBrowse ? "animate-spin" : ""} />
                            </Button>
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
                                    <Spinner size={24} label="Loading more mods" />
                                </div>
                            ) : null}
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
