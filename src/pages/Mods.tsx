import React, { useState, useEffect, useRef } from 'react';
import { Search, Download, Folder, RefreshCw, UploadCloud, ChevronDown } from 'lucide-react';

interface Mod {
    id: string;
    name: string;
    author: string;
    version: string;
    isEnabled: boolean;
    hasUpdate: boolean;
    latestVersion?: string;
    iconUrl?: string;
    description?: string;
}

const MOCK_INSTALLED_MODS: Mod[] = [
    { id: '1', name: 'Goku UI Omen', author: 'ModderKing', version: '1.0', isEnabled: true, hasUpdate: true, latestVersion: '1.2', description: 'Adds UI Omen Goku.' },
    { id: '2', name: 'Vegeta Ego', author: 'PrinceOfAll', version: '2.1', isEnabled: true, hasUpdate: false, description: 'Adds Ultra Ego Vegeta.' },
    { id: '3', name: 'Gohan Beast (Fixed)', author: 'ScholarWarrior', version: '1.5', isEnabled: false, hasUpdate: false, description: 'Fixes hair physics.' },
    { id: '4', name: 'Classic BGM Pack', author: 'RetroFan', version: '3.0', isEnabled: true, hasUpdate: true, latestVersion: '3.1', description: 'Replaces BGM with classic tunes.' },
    { id: '5', name: 'High Res Textures', author: '4K_Enjoyer', version: '1.0', isEnabled: false, hasUpdate: false, description: 'Upscales environment textures.' },
];

const Mods: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'installed' | 'browse'>('installed');
    const [installedMods, setInstalledMods] = useState<Mod[]>(MOCK_INSTALLED_MODS);
    const [searchQuery, setSearchQuery] = useState('');
    const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled' | 'updates'>('all');
    const [browseMods, setBrowseMods] = useState<Mod[]>([]);
    const [loadingBrowse, setLoadingBrowse] = useState(false);
    const [browsePage, setBrowsePage] = useState(1);

    // Drag and Drop state
    const [isDragging, setIsDragging] = useState(false);

    const dragCounter = useRef(0);

    // Initial load for Browse Mods
    useEffect(() => {
        loadBrowseMods(1);
    }, []);

    const loadBrowseMods = (page: number) => {
        setLoadingBrowse(true);
        // Simulate API delay
        setTimeout(() => {
            const newMods = Array.from({ length: 9 }).map((_, i) => ({
                id: `browse-${page}-${i}`,
                name: `Community Mod ${page}-${i + 1}`,
                author: `User${Math.floor(Math.random() * 1000)}`,
                version: '1.0',
                isEnabled: false,
                hasUpdate: false,
                description: 'A fantastic community created mod that enhances your game experience.',
                iconUrl: 'https://via.placeholder.com/150'
            }));

            setBrowseMods(prev => [...prev, ...newMods]);
            setLoadingBrowse(false);
        }, 800);
    };

    // Filter Logic
    const filteredInstalledMods = installedMods.filter(mod => {
        const matchesSearch = mod.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                              mod.author.toLowerCase().includes(searchQuery.toLowerCase());

        let matchesFilter = true;
        if (filterStatus === 'enabled') matchesFilter = mod.isEnabled;
        if (filterStatus === 'disabled') matchesFilter = !mod.isEnabled;
        if (filterStatus === 'updates') matchesFilter = mod.hasUpdate;

        return matchesSearch && matchesFilter;
    });

    const hasUpdates = installedMods.some(m => m.hasUpdate);

    const handleUpdateAll = () => {
        // Simulate updating all
        const updated = installedMods.map(m => ({ ...m, hasUpdate: false, version: m.latestVersion || m.version }));
        setInstalledMods(updated);
    };

    const handleUpdateSingle = (id: string) => {
        const updated = installedMods.map(m => m.id === id ? { ...m, hasUpdate: false, version: m.latestVersion || m.version } : m);
        setInstalledMods(updated);
    };

    const handleToggle = (id: string) => {
         const updated = installedMods.map(m => m.id === id ? { ...m, isEnabled: !m.isEnabled } : m);
         setInstalledMods(updated);
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

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        dragCounter.current = 0;

        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
            // Simulate install
            const fileName = e.dataTransfer.files[0].name;
            alert(`Simulated Install: ${fileName}`);
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
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'installed'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Installed
                    </button>
                    <button
                        onClick={() => setActiveTab('browse')}
                        className={`px-6 py-2 rounded-lg text-sm font-medium transition-all ${
                            activeTab === 'browse'
                            ? 'bg-blue-600 text-white shadow-lg shadow-blue-600/20'
                            : 'text-gray-400 hover:text-white hover:bg-white/5'
                        }`}
                    >
                        Browse Online
                    </button>
                </div>

                {/* Actions Row */}
                <div className="flex items-center space-x-3 w-full xl:w-auto">
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
                    )}

                     {/* Update All Button */}
                     {activeTab === 'installed' && hasUpdates && (
                        <button
                            onClick={handleUpdateAll}
                            className="flex items-center space-x-2 bg-green-600 hover:bg-green-500 text-white px-4 py-2 rounded-xl text-sm font-bold shadow-lg shadow-green-600/20 transition-all animate-pulse hover:animate-none"
                        >
                            <RefreshCw size={16} />
                            <span>Update All</span>
                        </button>
                    )}
                </div>
            </div>

            {/* Content Area */}
            <div
                className="flex-1 overflow-y-auto pr-2 pb-4 scroll-smooth"
                onScroll={handleScroll}
            >
                {activeTab === 'installed' ? (
                    <InstalledList
                        mods={filteredInstalledMods}
                        onToggle={handleToggle}
                        onUpdate={handleUpdateSingle}
                    />
                ) : (
                    <BrowseList mods={browseMods} loading={loadingBrowse} />
                )}
            </div>
        </div>
    );
};

const InstalledList: React.FC<{
    mods: Mod[];
    onToggle: (id: string) => void;
    onUpdate: (id: string) => void;
}> = ({ mods, onToggle, onUpdate }) => {
    if (mods.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/10 rounded-2xl">
                <Folder size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">No mods found matching criteria.</p>
                <p className="text-sm">Try changing filters or drag a file here to install.</p>
            </div>
        );
    }

    return (
        <div className="space-y-3">
            {mods.map((mod) => (
                <div key={mod.id} className={`glass-panel p-4 flex flex-col md:flex-row items-start md:items-center space-y-4 md:space-y-0 md:space-x-4 transition-all hover:bg-white/5 group border ${mod.isEnabled ? 'border-white/10' : 'border-red-500/10 bg-red-500/5'}`}>

                    {/* Icon */}
                    <div className="w-16 h-16 flex-shrink-0 bg-gradient-to-br from-gray-700 to-gray-800 rounded-lg flex items-center justify-center text-gray-500 shadow-inner relative overflow-hidden">
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
                             <h3 className={`font-bold text-lg truncate ${mod.isEnabled ? 'text-gray-200' : 'text-gray-500'}`}>{mod.name}</h3>
                             {mod.hasUpdate && (
                                 <span className="px-2 py-0.5 bg-green-500/20 text-green-300 text-[10px] font-bold uppercase rounded border border-green-500/30">Update Available</span>
                             )}
                        </div>
                        <p className="text-sm text-gray-400 truncate">{mod.description}</p>
                        <div className="flex items-center space-x-3 mt-1 text-xs text-gray-500">
                            <span className="bg-white/5 px-2 py-0.5 rounded">v{mod.version}</span>
                            <span>by <span className="text-gray-400">{mod.author}</span></span>
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center space-x-4 self-end md:self-auto">
                        {mod.hasUpdate && (
                             <button
                                onClick={() => onUpdate(mod.id)}
                                className="flex items-center space-x-2 px-3 py-1.5 bg-green-600/20 text-green-300 hover:bg-green-600 hover:text-white rounded-lg transition-colors border border-green-600/30 text-xs font-bold"
                             >
                                <Download size={14} />
                                <span>Update to v{mod.latestVersion}</span>
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

const BrowseList: React.FC<{ mods: Mod[]; loading: boolean }> = ({ mods, loading }) => (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {mods.map((mod) => (
             <div key={mod.id} className="glass-panel overflow-hidden group flex flex-col hover:-translate-y-1 transition-transform duration-300 border border-white/5 hover:border-blue-500/30">
                <div className="h-40 bg-gray-800 relative group-hover:scale-105 transition-transform duration-700">
                     <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent"></div>
                     <span className="absolute top-2 right-2 bg-blue-600 text-white text-[10px] font-bold px-2 py-1 rounded shadow-lg uppercase tracking-wider">Mod</span>
                     <div className="absolute bottom-3 left-4 right-4">
                         <h4 className="font-bold text-white text-lg leading-tight line-clamp-1">{mod.name}</h4>
                         <p className="text-xs text-gray-300 mt-1">by {mod.author}</p>
                     </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between bg-black/20">
                     <p className="text-sm text-gray-400 line-clamp-2 mb-4 h-10">
                        {mod.description}
                     </p>
                     <button className="w-full flex items-center justify-center space-x-2 bg-white/10 hover:bg-blue-600 text-white py-2.5 rounded-lg transition-all text-sm font-bold border border-white/5 hover:border-blue-500 shadow-lg hover:shadow-blue-600/25 active:scale-95">
                        <Download size={16} />
                        <span>Install</span>
                     </button>
                </div>
             </div>
        ))}
        {loading && (
            <div className="col-span-full py-8 flex flex-col items-center justify-center text-gray-500 animate-pulse">
                <RefreshCw size={24} className="animate-spin mb-2" />
                <p className="text-sm font-medium">Loading more mods...</p>
            </div>
        )}
    </div>
);

export default Mods;
