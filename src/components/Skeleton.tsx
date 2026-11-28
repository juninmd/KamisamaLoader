import React from 'react';
import { Skeleton as SonidoSkeleton } from '@juninmd/sonido';
import { cn } from '../lib/utils';

interface SkeletonProps {
    className?: string;
    label?: string;
}

/** Mod-card placeholder: Sonido's shimmering skeleton inside the app surface. */
const Skeleton: React.FC<SkeletonProps> = ({ className, label = 'Loading mods' }) => (
    <div className={cn('glass-panel overflow-hidden border border-white/5 h-[320px] p-4', className)}>
        <SonidoSkeleton media rows={3} label={label} />
    </div>
);

export default Skeleton;
