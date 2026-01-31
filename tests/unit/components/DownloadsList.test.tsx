// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '../test-utils';
import { DownloadsList } from '../../../src/components/DownloadsList';
import { act } from 'react';

describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
    });

    it('should render empty state', async () => {
        await act(async () => {
            renderWithProviders(<DownloadsList />);
        });
        await waitFor(() => {
            expect(screen.getByText('No active downloads')).toBeInTheDocument();
        });
    });

    it('should render downloads in different states', async () => {
        const mockDownloads = [
            {
                id: '1',
                filename: 'progress.zip',
                state: 'progressing',
                progress: 50,
                speed: 1024 * 1024,
                receivedBytes: 50,
                totalBytes: 100
            },
            {
                id: '2',
                filename: 'done.zip',
                state: 'completed',
                progress: 100,
                speed: 0,
                receivedBytes: 100,
                totalBytes: 100
            },
            {
                id: '3',
                filename: 'failed.zip',
                state: 'failed',
                progress: 10,
                speed: 0,
                receivedBytes: 10,
                totalBytes: 100,
                error: 'Net Error'
            },
            {
                id: '4',
                filename: 'paused.zip',
                state: 'paused',
                progress: 20,
                speed: 0
            }
        ];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);

        await act(async () => {
            renderWithProviders(<DownloadsList />);
        });

        await waitFor(() => {
            expect(screen.getByText('progress.zip')).toBeInTheDocument();
            expect(screen.getByText('done.zip')).toBeInTheDocument();
            expect(screen.getByText('failed.zip')).toBeInTheDocument();
            expect(screen.getByText('paused.zip')).toBeInTheDocument();
            expect(screen.getByText('Net Error')).toBeInTheDocument();
        });
    });

    it('should handle interaction buttons', async () => {
        const mockDownloads = [{
            id: '1',
            filename: 'test.zip',
            state: 'progressing',
            progress: 50,
            speed: 0
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);

        await act(async () => {
            renderWithProviders(<DownloadsList />);
        });

        await waitFor(() => screen.getByText('test.zip'));

        // Pause
        const pauseBtn = screen.getByTitle('Pause');
        await act(async () => {
            fireEvent.click(pauseBtn);
        });
        expect(window.electronAPI.pauseDownload).toHaveBeenCalledWith('1');

        // Cancel
        const cancelBtn = screen.getByTitle('Cancel');
        await act(async () => {
            fireEvent.click(cancelBtn);
        });
        expect(window.electronAPI.cancelDownload).toHaveBeenCalledWith('1');

        // Open Folder
        const folderBtn = screen.getByTitle('Show in Folder');
        await act(async () => {
            fireEvent.click(folderBtn);
        });
        expect(window.electronAPI.openDownloadFolder).toHaveBeenCalledWith('1');
    });

    it('should handle resume', async () => {
        const mockDownloads = [{
            id: '1',
            filename: 'paused.zip',
            state: 'paused',
            progress: 50,
            speed: 0
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);

        await act(async () => {
            renderWithProviders(<DownloadsList />);
        });

        await waitFor(() => screen.getByText('paused.zip'));

        const resumeBtn = screen.getByTitle('Resume/Retry');
        await act(async () => {
            fireEvent.click(resumeBtn);
        });
        expect(window.electronAPI.resumeDownload).toHaveBeenCalledWith('1');
    });

    it('should handle header actions', async () => {
        // Must return non-empty to show header
        (window.electronAPI.getDownloads as any).mockResolvedValue([{ id: '1', state: 'progressing', progress: 0, speed: 0 }]);

        await act(async () => {
             renderWithProviders(<DownloadsList />);
        });

        await waitFor(() => screen.getByText('Active & Recent'));

        const openFolderBtn = screen.getByText('Open Folder').closest('button');
        await act(async () => {
            fireEvent.click(openFolderBtn!);
        });
        expect(window.electronAPI.openModsDirectory).toHaveBeenCalled();

        const clearBtn = screen.getByText('Clear History').closest('button');
        await act(async () => {
            fireEvent.click(clearBtn!);
        });
        expect(window.electronAPI.clearCompletedDownloads).toHaveBeenCalled();
    });

    it('should handle updates via listener', async () => {
        let updateCallback: any;
        (window.electronAPI as any).onDownloadUpdate = vi.fn((cb) => {
            updateCallback = cb;
        });

        await act(async () => {
            renderWithProviders(<DownloadsList />);
        });

        const newDownloads = [{ id: '99', filename: 'new.zip', state: 'progressing', progress: 0, speed: 0 }];

        await act(async () => {
            if (updateCallback) updateCallback(newDownloads);
        });

        await waitFor(() => {
            expect(screen.getByText('new.zip')).toBeInTheDocument();
        });
    });

    it('should update context type', async () => {
         const mockDownloads = [{
            id: '1',
            filename: 'mod.zip',
            state: 'progressing',
            progress: 50,
            speed: 0,
            context: { type: 'update' }
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);

        await act(async () => {
            renderWithProviders(<DownloadsList />);
        });

        await waitFor(() => {
            expect(screen.getByText('Updating: mod.zip')).toBeInTheDocument();
        });
    });

    it('should format speed correctly', async () => {
         const mockDownloads = [{
            id: '1',
            filename: 'speed.zip',
            state: 'progressing',
            progress: 50,
            speed: 1024 * 1024 * 2.5, // 2.5 MB
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);

        await act(async () => {
            renderWithProviders(<DownloadsList />);
        });

        await waitFor(() => {
            expect(screen.getByText('2.50 MB/s')).toBeInTheDocument();
        });
    });
});
