import React from 'react';
import { Folder, Check, Download, Heart, Eye, XCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import Skeleton from './Skeleton';

interface Mod {
    id: string;
    name: string;
    author: string;
    gameBananaId?: number;
    iconUrl?: string;
    description?: string;
    viewCount?: number;
    likeCount?: number;
    downloadCount?: number;
    dateAdded?: number;
    images?: string[];
    category?: string;
    isNsfw?: boolean;
    isInstalled?: boolean;
    isEnabled?: boolean;
}

interface BrowseListProps {
    mods: Mod[];
    installedModIds?: number[];
    loading: boolean;
    onInstall: (mod: Mod) => void;
    onSelect: (mod: Mod) => void;
    installedMods?: Mod[];
    onToggle?: (id: string) => void;
}

export const BrowseModList: React.FC<BrowseListProps> = ({ mods, installedModIds = [], loading, onInstall, onSelect, installedMods = [], onToggle }) => {
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
