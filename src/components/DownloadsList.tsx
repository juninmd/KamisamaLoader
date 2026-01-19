import React, { useEffect, useState } from 'react';
import { Pause, Play, X, Download, FileDown, AlertCircle, CheckCircle } from 'lucide-react';

interface DownloadItem {
    id: string;
    url: string;
    filename: string;
    state: 'progressing' | 'paused' | 'completed' | 'failed' | 'cancelled' | 'queued';
    speed: number;
    progress: number;
    error?: string;
    context?: any;
}

export const DownloadsList: React.FC = () => {
    const [downloads, setDownloads] = useState<DownloadItem[]>([]);

    useEffect(() => {
        // Initial fetch
        window.electronAPI.getDownloads().then(setDownloads);

        // Listen for updates - avoiding memory leak with cleanup
        const handleUpdate = (updatedDownloads: any[]) => {
            setDownloads(updatedDownloads);
        };

        // This relies on the preload exposing the listener specifically
        // In the d.ts we added onDownloadUpdate
        window.electronAPI.onDownloadUpdate(handleUpdate);

        const interval = setInterval(() => {
            window.electronAPI.getDownloads().then(setDownloads);
        }, 1000); // Polling as backup and for speed updates if event is throttled

        return () => {
            clearInterval(interval);
            // removeListener would be ideal here if exposed
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
            <div className="flex flex-col items-center justify-center h-64 text-white/40 space-y-4">
                <FileDown className="w-16 h-16 opacity-20" />
                <p>No active downloads</p>
            </div>
        );
    }

    return (
        <div className="space-y-4 p-4">
            {downloads.map((dl) => (
                <div key={dl.id} className="bg-white/5 border border-white/10 rounded-lg p-4 flex items-center gap-4 animate-in fade-in slide-in-from-bottom-2">
                    {/* Icon based on state */}
                    <div className="p-3 bg-white/5 rounded-full">
                        {dl.state === 'completed' ? <CheckCircle className="w-6 h-6 text-green-400" /> :
                            dl.state === 'failed' ? <AlertCircle className="w-6 h-6 text-red-400" /> :
                                <Download className="w-6 h-6 text-blue-400" />}
                    </div>

                    <div className="flex-1 min-w-0">
                        <div className="flex justify-between mb-1">
                            <h4 className="font-medium text-white truncate" title={dl.filename}>
                                {dl.context?.type === 'update' ? `Updating: ${dl.filename}` : dl.filename}
                            </h4>
                            <span className="text-xs text-white/50">{dl.state.toUpperCase()}</span>
                        </div>

                        {/* Progress Bar */}
                        <div className="h-2 bg-white/10 rounded-full overflow-hidden mb-1">
                            <div
                                className={`h-full transition-all duration-300 ${dl.state === 'failed' ? 'bg-red-500' :
                                        dl.state === 'completed' ? 'bg-green-500' :
                                            dl.state === 'paused' ? 'bg-yellow-500' :
                                                'bg-blue-500'
                                    }`}
                                style={{ width: `${dl.progress}%` }}
                            />
                        </div>

                        <div className="flex justify-between text-xs text-white/40">
                            <span>{dl.progress.toFixed(1)}%</span>
                            <span>{formatSpeed(dl.speed)}</span>
                        </div>
                        {dl.error && <p className="text-xs text-red-400 mt-1">{dl.error}</p>}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                        {dl.state === 'progressing' && (
                            <button onClick={() => handlePause(dl.id)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Pause">
                                <Pause className="w-4 h-4 text-white" />
                            </button>
                        )}
                        {(dl.state === 'paused' || dl.state === 'failed') && (
                            <button onClick={() => handleResume(dl.id)} className="p-2 hover:bg-white/10 rounded-full transition-colors" title="Resume/Retry">
                                <Play className="w-4 h-4 text-white" />
                            </button>
                        )}
                        <button onClick={() => handleCancel(dl.id)} className="p-2 hover:bg-red-500/20 rounded-full transition-colors group" title="Cancel">
                            <X className="w-4 h-4 text-white/50 group-hover:text-red-400" />
                        </button>
                    </div>
                </div>
            ))}
        </div>
    );
};
