import React from 'react';
import { motion } from 'framer-motion';
import { Download, RefreshCw, Trash2, Heart, Folder, ArrowUp, ArrowDown } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardFooter } from '../ui/Card';
import { Button } from '../ui/Button';
import { Badge } from '../ui/Badge';
import { Switch } from '../ui/Switch';
import { cn } from '../../lib/utils';
import type { Mod, LocalMod } from '../../types';

interface ModCardProps {
    mod: Mod;
    isInstalled?: boolean;
    localMod?: LocalMod; // Reference to the installed version if available
    onInstall?: (mod: Mod) => void;
    onToggle?: (id: string) => void;
    onUninstall?: (id: string) => void;
    onUpdate?: (mod: Mod) => void;
    onSelect?: (mod: Mod) => void;
    onPriorityChange?: (id: string, direction: 'up' | 'down') => void;
    isUpdating?: boolean;
}

export const ModCard: React.FC<ModCardProps> = ({
    mod,
    isInstalled,
    localMod,
    onInstall,
    onToggle,
    onUninstall,
    onUpdate,
    onSelect,
    onPriorityChange,
    isUpdating
}) => {
    // Determine status for visuals
    const effectiveMod = localMod || mod;
    const isEnabled = localMod?.isEnabled ?? false;
    const hasUpdate = localMod?.hasUpdate ?? false;

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5, transition: { duration: 0.2 } }}
            className="group h-full"
        >
            <Card
                className={cn(
                    "h-full flex flex-col overflow-hidden border-0 bg-black/40 shadow-xl ring-1 ring-white/10 transition-colors",
                    isEnabled && "ring-primary/50 bg-primary/5",
                    "hover:ring-primary/60 hover:bg-black/60"
                )}
                onClick={() => onSelect?.(mod)}
            >
                {/* Image Area */}
                <div className="relative aspect-video w-full overflow-hidden bg-gray-900">
                    {effectiveMod.images && effectiveMod.images.length > 0 ? (
                        <img
                            src={effectiveMod.images[0]}
                            alt={effectiveMod.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : effectiveMod.iconUrl ? (
                        <img
                            src={effectiveMod.iconUrl}
                            alt={effectiveMod.name}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-gray-600">
                            <Folder size={40} strokeWidth={1} />
                        </div>
                    )}

                    {/* Overlays */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* Badges */}
                    <div className="absolute top-2 right-2 flex flex-col gap-1 items-end">
                        {isInstalled && (
                            <Badge variant={isEnabled ? "default" : "secondary"} className="shadow-lg backdrop-blur-md">
                                {isEnabled ? "Active" : "Installed"}
                            </Badge>
                        )}
                        {hasUpdate && (
                            <Badge variant="glass" className="bg-green-500/80 text-white animate-pulse">
                                Update
                            </Badge>
                        )}
                        {mod.isNsfw && (
                            <Badge variant="destructive" className="bg-red-500/80 text-white">
                                NSFW
                            </Badge>
                        )}
                    </div>

                    {/* Quick Category Tag */}
                    <div className="absolute bottom-2 left-2 flex gap-2">
                        <Badge variant="glass" className="text-[10px] uppercase tracking-wider bg-black/60">
                            {mod.category || 'Mod'}
                        </Badge>
                        {isInstalled && localMod?.priority !== undefined && (
                            <Badge variant="glass" className="text-[10px] bg-blue-600/60 backdrop-blur-md">
                                Prio: {localMod.priority}
                            </Badge>
                        )}
                    </div>
                </div>

                {/* Content */}
                <CardContent className="flex-1 p-4 pb-2 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                        <h3 className="font-bold text-sm text-foreground line-clamp-2 leading-tight group-hover:text-primary transition-colors" title={mod.name}>
                            {mod.name}
                        </h3>
                    </div>

                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span className="truncate max-w-[120px]">by <span className="text-foreground/80">{mod.author}</span></span>
                        <span>•</span>
                        <span>{effectiveMod.version || 'v1.0'}</span>
                    </div>

                    {/* Stats Row */}
                    {(mod.downloadCount !== undefined || mod.likeCount !== undefined) && (
                        <div className="flex items-center gap-3 pt-2 text-xs text-muted-foreground/60">
                            {mod.downloadCount !== undefined && (
                                <div className="flex items-center gap-1">
                                    <Download size={10} />
                                    <span>{mod.downloadCount >= 1000 ? (mod.downloadCount / 1000).toFixed(1) + 'k' : mod.downloadCount}</span>
                                </div>
                            )}
                            {mod.likeCount !== undefined && (
                                <div className="flex items-center gap-1">
                                    <Heart size={10} />
                                    <span>{mod.likeCount}</span>
                                </div>
                            )}
                            {mod.dateAdded && (
                                <div className="ml-auto">
                                    {formatDistanceToNow(new Date(mod.dateAdded * 1000))} ago
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>

                {/* Footer Actions */}
                <CardFooter className="p-3 pt-0 gap-2">
                    {isInstalled && localMod ? (
                        <>
                            <div className="flex-1 flex items-center justify-start" onClick={(e) => e.stopPropagation()}>
                                <Switch
                                    checked={isEnabled}
                                    onChange={() => onToggle?.(localMod.id)}
                                    label={isEnabled ? "Enabled" : "Disabled"}
                                />
                            </div>

                            {hasUpdate && onUpdate && (
                                <Button
                                    variant="glass"
                                    size="icon"
                                    className="h-8 w-8 text-green-400 hover:bg-green-500/20 hover:text-green-300 border-green-500/30"
                                    onClick={(e) => { e.stopPropagation(); onUpdate(localMod); }}
                                    disabled={isUpdating}
                                >
                                    <RefreshCw size={14} className={isUpdating ? "animate-spin" : ""} />
                                </Button>
                            )}

                            {onPriorityChange && (
                                <div className="flex flex-col gap-0.5">
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onPriorityChange(localMod.id, 'up'); }}
                                        className="h-3.5 w-6 flex items-center justify-center bg-white/5 hover:bg-white/20 rounded text-xs text-gray-400 hover:text-white transition-colors"
                                        title="Increase Priority (Move Up)"
                                    >
                                        <ArrowUp size={10} />
                                    </button>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); onPriorityChange(localMod.id, 'down'); }}
                                        className="h-3.5 w-6 flex items-center justify-center bg-white/5 hover:bg-white/20 rounded text-xs text-gray-400 hover:text-white transition-colors"
                                        title="Decrease Priority (Move Down)"
                                    >
                                        <ArrowDown size={10} />
                                    </button>
                                </div>
                            )}

                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                onClick={(e) => { e.stopPropagation(); onUninstall?.(localMod.id); }}
                                aria-label="Uninstall"
                                title="Uninstall"
                            >
                                <Trash2 size={14} />
                            </Button>
                        </>
                    ) : (
                        <Button
                            variant="default"
                            size="sm"
                            className="flex-1 h-8 text-xs font-bold bg-blue-600 hover:bg-blue-500 shadow-lg shadow-blue-500/20"
                            onClick={(e) => { e.stopPropagation(); onInstall?.(mod); }}
                        >
                            <Download size={14} className="mr-1.5" />
                            Download
                        </Button>
                    )}
                </CardFooter>
            </Card>
        </motion.div>
    );
};
