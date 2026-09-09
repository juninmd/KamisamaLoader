// @vitest-environment happy-dom
import './DownloadsList.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '../test-utils';
import { DownloadsList } from '../../../src/components/DownloadsList';
import { act } from 'react';
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
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
});
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
    });
    // Baseline: "should handle failed state and retry" called resume on a failed download.
    // Resume accepts paused transfers only; selective retries are covered in update-queue.test.tsx.
    it('should display failure without offering an unsupported resume', async () => {
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
        expect(screen.queryByTitle('Resume/Retry')).not.toBeInTheDocument();
        expect(window.electronAPI.resumeDownload).not.toHaveBeenCalled();
    });
});
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
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
        const openFolderBtn = screen.getByText('Open Folder');
        fireEvent.click(openFolderBtn);
        expect(window.electronAPI.openModsDirectory).toHaveBeenCalled();
        const showInFolderBtn = screen.getByTitle('Show in Folder');
        fireEvent.click(showInFolderBtn);
        expect(window.electronAPI.openDownloadFolder).toHaveBeenCalledWith('1');
    });
});
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
    });
    it('should update list on event', async () => {
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        renderWithProviders(<DownloadsList />);
        await waitFor(() => screen.getByText('No active downloads'));
        const calls = (window.electronAPI.onDownloadUpdate as any).mock.calls;
        expect(calls.length).toBeGreaterThan(0);
        const listener = calls[0][0];
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
});
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
    });
    it('should unsubscribe from download updates on unmount', () => {
        const unsubscribe = vi.fn();
        (window.electronAPI.onDownloadUpdate as any).mockReturnValue(unsubscribe);
        const { unmount } = renderWithProviders(<DownloadsList />);
        unmount();
        expect(unsubscribe).toHaveBeenCalledOnce();
    });
});
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
    });
    it('should poll for updates', async () => {
        vi.useFakeTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        renderWithProviders(<DownloadsList />);
        (window.electronAPI.getDownloads as any).mockResolvedValue([{
                id: 'poll', filename: 'poll.zip', state: 'progressing', progress: 0, speed: 0
            }]);
        await act(async () => {
            vi.advanceTimersByTime(1100);
        });
        expect(window.electronAPI.getDownloads).toHaveBeenCalledTimes(2);
        vi.useRealTimers();
    });
});
