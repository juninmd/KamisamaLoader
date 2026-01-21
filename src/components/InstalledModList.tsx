import React from 'react';
import { Folder, ChevronUp, ChevronDown, Download, Eye, Trash2 } from 'lucide-react';

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
    viewCount?: number;
    images?: string[];
}

interface InstalledListProps {
    mods: Mod[];
    onToggle: (id: string) => void;
    onUpdate: (mod: Mod) => void;
    onPriorityChange: (id: string, direction: 'up' | 'down') => void;
    onUninstall: (id: string) => void;
    updatingMods: string[];
    onSelect: (mod: Mod) => void;
    viewMode: 'list' | 'card';
}

export const InstalledModList: React.FC<InstalledListProps> = ({ mods, onToggle, onUpdate, onPriorityChange, onUninstall, updatingMods, onSelect, viewMode }) => {
    if (mods.length === 0) {
        return (
            <div className="h-64 flex flex-col items-center justify-center text-gray-500 border-2 border-dashed border-white/10 rounded-2xl">
                <Folder size={48} className="mb-4 opacity-50" />
                <p className="text-lg font-medium">No mods installed.</p>
                <p className="text-sm">Browse online or drag files to install.</p>
            </div>
        );
    }

    if (viewMode === 'card') {
        return (
            <div className="grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-2">
                {mods.map(mod => (
                    <div
                        key={mod.id}
                        className={`glass-panel p-3 flex flex-col h-full transition-all hover:scale-[1.02] hover:bg-white/5 border ${mod.isEnabled ? 'border-white/10' : 'border-red-500/10 bg-red-500/5'} cursor-pointer`}
                        onClick={() => onSelect(mod)}
                    >
                        {/* Image/Icon */}
                        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-gray-800 mb-3 group">
                            {mod.images && mod.images.length > 0 ? (
                                <img src={mod.images[0]} alt={mod.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            ) : mod.iconUrl ? (
                                <img src={mod.iconUrl} alt={mod.name} className="w-full h-full object-cover transition-transform group-hover:scale-110" />
                            ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-600">
                                    <Folder size={32} />
                                </div>
                            )}

                            <div className="absolute top-2 right-2 flex space-x-1">
                                {mod.hasUpdate && (
                                    <span className="bg-green-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded shadow">UPDATE</span>
                                )}
                            </div>
                        </div>

                        {/* Title & Author */}
                        <div className="flex-1 min-w-0 mb-2">
                            <h3 className={`font-bold text-sm truncate ${mod.isEnabled ? 'text-gray-100' : 'text-gray-500'}`} title={mod.name}>{mod.name}</h3>
                            <p className="text-xs text-gray-500 truncate">by {mod.author}</p>
                        </div>

                        {/* Actions */}
                        <div className="mt-auto pt-2 border-t border-white/5 flex items-center justify-between gap-2">
                            <button
                                onClick={(e) => { e.stopPropagation(); onToggle(mod.id); }}
                                className={`flex-1 py-1.5 rounded text-[10px] font-bold uppercase tracking-wider transition-colors ${mod.isEnabled ? 'bg-blue-600/20 text-blue-300 hover:bg-blue-600/40' : 'bg-gray-700/50 text-gray-400 hover:bg-gray-600'}`}
                            >
                                {mod.isEnabled ? 'Enabled' : 'Disabled'}
                            </button>
                            <div className="flex items-center space-x-1">
                                <button onClick={(e) => { e.stopPropagation(); onPriorityChange(mod.id, 'up'); }} className="p-1 hover:bg-white/10 rounded text-gray-400" title="Priority Up"><ChevronUp size={12} /></button>
                                <button onClick={(e) => { e.stopPropagation(); onPriorityChange(mod.id, 'down'); }} className="p-1 hover:bg-white/10 rounded text-gray-400" title="Priority Down"><ChevronDown size={12} /></button>
                            </div>
                        </div>
                    </div>
                ))}
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
};
