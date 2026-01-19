import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Folder, RefreshCw, UploadCloud, ChevronDown, Eye, Heart, Calendar, ChevronUp } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useToast } from '../components/ToastContext';
import Skeleton from '../components/Skeleton';
import ModDetailsModal from '../components/ModDetailsModal';
import UpdateDialog from '../components/UpdateDialog';
import { DownloadsList } from '../components/DownloadsList';
import ProfileManager from '../components/ProfileManager';

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
            loadBrowseMods(1);
        }
    }, [activeTab]);

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

    const loadBrowseMods = async (page: number) => {
        if (loadingBrowse) return;
        setLoadingBrowse(true);
        try {
            const newMods = await window.electronAPI.searchOnlineMods(page);
            setBrowseMods(prev => page === 1 ? newMods : [...prev, ...newMods]);
        } catch (error) {
            console.error('Failed to load online mods', error);
            showToast('Failed to load online mods', 'error');
        } finally {
            setLoadingBrowse(false);
        }
    };

    // Filter Logic
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
                    showToast(result.conflict, 'warning', 5000);
                }
            } else {
                // Revert if failed
                setInstalledMods(prev => prev.map(m => m.id === id ? { ...m, isEnabled: !newState } : m));
                showToast('Failed to toggle mod', 'error');
            }
        }
    };

    const handleInstall = async (mod: Mod) => {
        showToast(`Installing ${mod.name}...`, 'info');
        try {
            const result = await window.electronAPI.installOnlineMod(mod);
            if (result.success) {
                showToast(result.message, 'success');
                // Refresh installed mods to show the new one
                loadInstalledMods();
            } else {
                showToast(result.message, 'error');
            }
        } catch (e) {
            showToast('Installation failed unexpectedly', 'error');
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
                        placeholder="Search mods..."
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

            {/* Content Area */ }
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
                    updatingMods={updatingMods}
                    onSelect={(mod) => setSelectedMod(mod)}
                />
            )
        ) : activeTab === 'downloads' ? (
            <DownloadsList />
        ) : (
            <BrowseList mods={browseMods} loading={loadingBrowse} onInstall={handleInstall} onSelect={(mod) => setSelectedMod(mod)} />
        )}
    </div>

    {/* Mod Details Modal */ }
    {
        selectedMod && (
            <ModDetailsModal
                mod={selectedMod}
                isOpen={!!selectedMod}
                onClose={() => setSelectedMod(null)}
                onInstall={handleInstall}
            />
        )
    }

    {/* Update Dialog */ }
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
    updatingMods: string[];
    onSelect: (mod: Mod) => void;
}> = ({ mods, onToggle, onUpdate, onPriorityChange, updatingMods, onSelect }) => {
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
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

const BrowseList: React.FC<{ mods: Mod[]; loading: boolean; onInstall: (mod: Mod) => void; onSelect: (mod: Mod) => void }> = ({ mods, loading, onInstall, onSelect }) => (
    <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-4 gap-4 pb-10">
        {mods.map((mod) => (
            <div
                key={mod.id}
                onClick={() => onSelect(mod)}
                className="glass-panel overflow-hidden group flex flex-col hover:-translate-y-1 transition-transform duration-300 border border-white/5 hover:border-blue-500/30 cursor-pointer"
            >
                <div className="h-32 bg-gray-800 relative group-hover:scale-105 transition-transform duration-700">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                    {mod.iconUrl ? (
                        <img src={mod.iconUrl} alt={mod.name} className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-700">
                            <Folder size={40} className="text-gray-500" />
                        </div>
                    )}
                    <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">Mod</span>
                    <div className="absolute bottom-2 left-3 right-3 z-10">
                        <h4 className="font-bold text-white text-sm leading-tight line-clamp-1 drop-shadow-md" title={mod.name}>{mod.name}</h4>
                        <p className="text-[10px] text-gray-300 mt-0.5 drop-shadow-sm">by {mod.author}</p>
                    </div>
                </div>
                <div className="p-3 flex-1 flex flex-col justify-between bg-black/20">
                    <div className="flex items-center justify-between text-[10px] text-gray-500 mb-2">
                        <div className="flex items-center space-x-2">
                            <div className="flex items-center space-x-0.5" title="Views">
                                <Eye size={10} />
                                <span>{mod.viewCount?.toLocaleString() || 0}</span>
                            </div>
                            <div className="flex items-center space-x-0.5" title="Likes">
                                <Heart size={10} />
                                <span>{mod.likeCount?.toLocaleString() || 0}</span>
                            </div>
                        </div>
                        {mod.dateAdded && (
                            <div className="flex items-center space-x-0.5" title="Date Added">
                                <Calendar size={10} />
                                <span>{formatDistanceToNow(new Date(mod.dateAdded * 1000), { addSuffix: true })}</span>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={(e) => { e.stopPropagation(); onInstall(mod); }}
                        className="w-full flex items-center justify-center space-x-2 bg-white/10 hover:bg-blue-600 text-white py-2 rounded-lg transition-all text-xs font-bold border border-white/5 hover:border-blue-500 shadow-lg hover:shadow-blue-600/25 active:scale-95"
                    >
                        <Download size={14} />
                        <span>Install</span>
                    </button>
                </div>
            </div>
        ))}
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

export default Mods;
