import React from 'react';
import { ModCard } from './ModCard';
import type { Mod, LocalMod } from '../../../shared/types';
import { cn } from '../../lib/utils';


interface ModGridProps {
    mods: Mod[];
    installedMods?: LocalMod[];
    loading?: boolean;
    onInstall?: (mod: Mod) => void;
    onToggle?: (id: string) => void;
    onUninstall?: (id: string) => void;
    onUpdate?: (mod: Mod) => void;
    onSelect?: (mod: Mod) => void;
    onPriorityChange?: (id: string, direction: 'up' | 'down') => void;
    updatingMods?: string[];
    className?: string;
}

export const ModGrid: React.FC<ModGridProps> = ({
    mods,
    installedMods = [],
    loading,
    onInstall,
    onToggle,
    onUninstall,
    onUpdate,
    onSelect,
    onPriorityChange,
    updatingMods = [],
    className
}) => {
    // Helper to find installed version
    const getLocalMod = (gameBananaId?: number) => {
        if (!gameBananaId) return undefined;
        return installedMods.find(m => m.gameBananaId === gameBananaId);
    };

    if (loading) {
        return (
            <div className={cn("grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4", className)}>
                {Array(10).fill(0).map((_, i) => (
                    <div key={i} className="h-[280px] w-full bg-white/5 rounded-xl animate-pulse" />
                ))}
            </div>
        );
    }

    if (mods.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] text-muted-foreground p-8 border-2 border-dashed border-white/5 rounded-3xl m-4">
                <p className="text-xl font-medium mb-2">No mods found</p>
                <p className="text-sm opacity-60">Try adjusting your filters or search query.</p>
            </div>
        );
    }

    return (
        <div className={cn("grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4", className)}>
            {mods.map((mod) => {
                const localMod = mod.gameBananaId ? getLocalMod(mod.gameBananaId) : undefined;
                // If we are in "Installed" tab, the mod itself IS the local mod
                // Check if the passed mod object looks like an installed mod (has ID not strictly number, etc - relying on logic)
                // Actually safer: ModCard logic handles localMod || mod.
                // If we are passing Installed Mods, `localMod` lookup might fail if gameBananaId is missing, but `mod` is the installed one.

                // Refinment:
                // Case 1: Browser. `mod` is online mod. `localMod` is found via ID.
                // Case 2: Installed. `mod` ***IS*** the local mod. `localMod` check is redundant or returns itself.

                const effectiveLocalMod = localMod || (installedMods.find(m => m.id === mod.id));
                const isInstalled = !!effectiveLocalMod;

                return (
                    <ModCard
                        key={mod.id}
                        mod={mod}
                        localMod={effectiveLocalMod}
                        isInstalled={isInstalled}
                        onInstall={onInstall}
                        onToggle={onToggle}
                        onUninstall={onUninstall}
                        onUpdate={onUpdate}
                        onSelect={onSelect}
                        onPriorityChange={onPriorityChange}
                        isUpdating={effectiveLocalMod ? updatingMods.includes(effectiveLocalMod.id) : false}
                    />
                );
            })}
        </div>
    );
};
