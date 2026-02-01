// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '../test-utils';
import { DownloadsList } from '../../../src/components/DownloadsList';
import { act } from 'react';

describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        // Mock onDownloadUpdate to allow subscription
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
    });

    it('should render empty state', async () => {
        renderWithProviders(<DownloadsList />);
        await waitFor(() => {
            expect(screen.getByText('No active downloads')).toBeInTheDocument();
        });
    });

    it('should render downloads', async () => {
        const mockDownloads = [{
            id: '1',
            filename: 'test.zip',
            state: 'progressing',
            progress: 50,
            speed: 1024 * 1024, // 1 MB/s
            receivedBytes: 50,
            totalBytes: 100
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);

        renderWithProviders(<DownloadsList />);

        await waitFor(() => {
            expect(screen.getByText('test.zip')).toBeInTheDocument();
            expect(screen.getByText('50.0%')).toBeInTheDocument();
            expect(screen.getByText('1.00 MB/s')).toBeInTheDocument();
        });
    });

    it('should render update context correctly', async () => {
        const mockDownloads = [{
            id: 'u1',
            filename: 'mod.zip',
            state: 'progressing',
            progress: 10,
            speed: 0,
            context: { type: 'update' }
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);
        renderWithProviders(<DownloadsList />);
        await waitFor(() => screen.getByText('Updating: mod.zip'));
    });

    it('should handle pause action', async () => {
        const mockDownloads = [{
            id: '1',
            filename: 'test.zip',
            state: 'progressing',
            progress: 50,
            speed: 0
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);

        renderWithProviders(<DownloadsList />);
        await waitFor(() => screen.getByText('test.zip'));

        const pauseBtn = screen.getByTitle('Pause');
        fireEvent.click(pauseBtn);
        expect(window.electronAPI.pauseDownload).toHaveBeenCalledWith('1');
    });

    it('should handle resume action', async () => {
        const mockDownloads = [{
            id: '1',
            filename: 'test.zip',
            state: 'paused',
            progress: 50,
            speed: 0
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);

        renderWithProviders(<DownloadsList />);
        await waitFor(() => screen.getByText('PAUSED'));

        const resumeBtn = screen.getByTitle('Resume/Retry');
        fireEvent.click(resumeBtn);
        expect(window.electronAPI.resumeDownload).toHaveBeenCalledWith('1');
    });

    it('should handle cancel action', async () => {
        const mockDownloads = [{
            id: '1',
            filename: 'test.zip',
            state: 'progressing',
            progress: 10,
            speed: 0
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);
        renderWithProviders(<DownloadsList />);
        await waitFor(() => screen.getByText('test.zip'));

        const cancelBtn = screen.getByTitle('Cancel');
        fireEvent.click(cancelBtn);
        expect(window.electronAPI.cancelDownload).toHaveBeenCalledWith('1');
    });

    it('should handle completed state and clear history', async () => {
        const mockDownloads = [{
            id: '1',
            filename: 'done.zip',
            state: 'completed',
            progress: 100,
            speed: 0
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);
        renderWithProviders(<DownloadsList />);
        await waitFor(() => screen.getByText('COMPLETED'));

        const clearBtn = screen.getByTitle('Clear Finished');
        fireEvent.click(clearBtn);
        expect(window.electronAPI.clearCompletedDownloads).toHaveBeenCalled();
    });

    it('should handle failed state and retry', async () => {
         const mockDownloads = [{
            id: '1',
            filename: 'fail.zip',
            state: 'failed',
            progress: 0,
            speed: 0,
            error: 'Network Error'
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);
        renderWithProviders(<DownloadsList />);
        await waitFor(() => screen.getByText('FAILED'));
        expect(screen.getByText('Network Error')).toBeInTheDocument();

        const retryBtn = screen.getByTitle('Resume/Retry');
        fireEvent.click(retryBtn);
        expect(window.electronAPI.resumeDownload).toHaveBeenCalledWith('1');
    });

    it('should handle open folder actions', async () => {
        const mockDownloads = [{
            id: '1',
            filename: 'test.zip',
            state: 'progressing',
            progress: 10,
            speed: 0
        }];
        (window.electronAPI.getDownloads as any).mockResolvedValue(mockDownloads);
        renderWithProviders(<DownloadsList />);
        await waitFor(() => screen.getByText('Active & Recent'));

        // Open main folder
        const openFolderBtn = screen.getByText('Open Folder');
        fireEvent.click(openFolderBtn);
        expect(window.electronAPI.openModsDirectory).toHaveBeenCalled();

        // Show specific download in folder
        const showInFolderBtn = screen.getByTitle('Show in Folder');
        fireEvent.click(showInFolderBtn);
        expect(window.electronAPI.openDownloadFolder).toHaveBeenCalledWith('1');
    });

    it('should update list on event', async () => {
        // Start empty
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        renderWithProviders(<DownloadsList />);
        await waitFor(() => screen.getByText('No active downloads'));

        // Get the listener passed to onDownloadUpdate
        const calls = (window.electronAPI.onDownloadUpdate as any).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const listener = calls[0][0];

        // Trigger update
        act(() => {
            listener([{
                id: 'new',
                filename: 'new.zip',
                state: 'progressing',
                progress: 0,
                speed: 0
            }]);
        });

        await waitFor(() => screen.getByText('new.zip'));
    });

    it('should poll for updates', async () => {
        vi.useFakeTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        renderWithProviders(<DownloadsList />);

        // Advance time
        (window.electronAPI.getDownloads as any).mockResolvedValue([{
            id: 'poll', filename: 'poll.zip', state: 'progressing', progress: 0, speed: 0
        }]);

        // Advance time and check calls
        await act(async () => {
             vi.advanceTimersByTime(1100);
        });

        expect(window.electronAPI.getDownloads).toHaveBeenCalledTimes(2); // Initial + Interval
        vi.useRealTimers();
    });
});
