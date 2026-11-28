import React from 'react';
import { EmptyState } from '@juninmd/sonido';
import { ModCard } from './ModCard';
import Skeleton from '../Skeleton';
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
                    <Skeleton key={i} className="h-[280px]" />
                ))}
            </div>
        );
    }

    if (mods.length === 0) {
        return (
            <EmptyState
                title="No mods found"
                description="Try adjusting your filters or search query."
                titleAs="h2"
                className="min-h-[400px] border-2 border-dashed border-white/5 rounded-3xl m-4"
            />
        );
    }

    return (
        <div className={cn("grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-4 p-4", className)}>
            {mods.map((mod) => {
                const localMod = mod.gameBananaId ? getLocalMod(mod.gameBananaId) : undefined;

                // Case 1: Browser. `mod` is online mod. `localMod` is found via ID.
                // Case 2: Installed. `mod` ***IS*** the local mod.
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
