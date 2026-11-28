import React, { useEffect, useState } from 'react';
import { Pause, Play, X, Download as DownloadIcon, FileDown, AlertCircle, CheckCircle, Trash2, Folder } from 'lucide-react';
import { Button, EmptyState, ProgressBar } from '@juninmd/sonido';
import type { Download } from '../../shared/types';

export const DownloadsList: React.FC = () => {
    const [downloads, setDownloads] = useState<Download[]>([]);

    useEffect(() => {
        // Initial fetch
        window.electronAPI.getDownloads().then(setDownloads);

        // Listen for updates - avoiding memory leak with cleanup
        const handleUpdate = (updatedDownloads: any[]) => {
            setDownloads(updatedDownloads);
        };

        // This relies on the preload exposing the listener specifically
        // In the d.ts we added onDownloadUpdate
        const unsubscribe = window.electronAPI.onDownloadUpdate(handleUpdate);

        const interval = setInterval(() => {
            window.electronAPI.getDownloads().then(setDownloads);
        }, 1000); // Polling as backup and for speed updates if event is throttled

        return () => {
            clearInterval(interval);
            unsubscribe?.();
        };
    }, []);

    const formatSpeed = (bytesPerSec: number) => {
        if (bytesPerSec === 0) return '';
        const mb = bytesPerSec / 1024 / 1024;
        return `${mb.toFixed(2)} MB/s`;
    };

    const handlePause = (id: string) => window.electronAPI.pauseDownload(id);
    const handleResume = (id: string) => window.electronAPI.resumeDownload(id);
    const handleCancel = (id: string) => window.electronAPI.cancelDownload(id);

    if (downloads.length === 0) {
        return (
            <EmptyState
                icon={<FileDown size={40} />}
                title="No active downloads"
                description="Downloads you start will show their progress here."
                className="h-64"
            />
        );
    }

    return (
        <div className="space-y-4 p-4">
            {/* Header Actions */}
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider">Active &amp; Recent</h3>
                <div className="flex gap-2">
                    <Button
                        variant="ghost"
                        size="xs"
                        iconStart={<Folder size={12} />}
                        onClick={async () => {
                            await window.electronAPI.openModsDirectory();
                        }}
                    >
                        Open Folder
                    </Button>

                    <Button
                        variant="ghost"
                        size="xs"
                        iconStart={<Trash2 size={12} />}
                        onClick={() => window.electronAPI.clearCompletedDownloads()}
                        title="Clear Finished"
                    >
                        Clear History
                    </Button>
                </div>
            </div>

            {downloads.map((dl) => (
                <div key={dl.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                    {/* Icon based on state */}
                    <div className="p-3 bg-white/5 rounded-full">
                        {dl.state === 'completed' ? <CheckCircle className="w-6 h-6 text-green-400" /> :
                            dl.state === 'failed' ? <AlertCircle className="w-6 h-6 text-red-400" /> :
                                <DownloadIcon className="w-6 h-6 text-blue-400" />}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                            <h4 className="font-medium text-white truncate" title={dl.filename}>
                                {dl.context?.type === 'update' ? `Updating: ${dl.filename}` : dl.filename}
                            </h4>
                            <span className="text-xs text-white/50">{dl.state.toUpperCase()}</span>
                        </div>

                        {/* Progress Bar */}
                        <ProgressBar
                            value={dl.progress / 100}
                            label={`Download progress: ${dl.filename}`}
                            size="sm"
                            tone={dl.state === 'completed' ? 'aqua' : 'accent'}
                        />

                        <div className="flex justify-between text-xs text-white/40 mt-1">
                            <span>{dl.progress.toFixed(1)}%</span>
                            <span>{formatSpeed(dl.speed)}</span>
                        </div>
                        {dl.error && <p className="text-xs text-red-400 mt-1">{dl.error}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {dl.state === 'progressing' && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handlePause(dl.id)}
                                title="Pause"
                                aria-label={`Pause ${dl.filename}`}
                            >
                                <Pause className="w-4 h-4" />
                            </Button>
                        )}
                        {(dl.state === 'paused' || dl.state === 'failed') && (
                            <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleResume(dl.id)}
                                title="Resume/Retry"
                                aria-label={`${dl.state === 'failed' ? 'Retry' : 'Resume'} ${dl.filename}`}
                            >
                                <Play className="w-4 h-4" />
                            </Button>
                        )}
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancel(dl.id)}
                            title="Cancel"
                            aria-label={`Cancel ${dl.filename}`}
                        >
                            <X className="w-4 h-4 text-white/50 hover:text-red-400" />
                        </Button>
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => window.electronAPI.openDownloadFolder(dl.id)}
                            title="Show in Folder"
                            aria-label={`Show ${dl.filename} in folder`}
                        >
                            <Folder size={16} className="text-white/50 hover:text-white" />
                        </Button>
                    </div>
                </div>
            ))}
        </div>
    );
};
