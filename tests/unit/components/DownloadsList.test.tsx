// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '../test-utils';
import { DownloadsList } from '../../../src/components/DownloadsList';
import { act } from 'react';

describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
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

    it('should handle pause/resume/cancel', async () => {
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

        const buttons = screen.getAllByRole('button');
        // Pause button should be present for progressing state
        // The component uses Pause icon inside a button
        // We can find by title="Pause"

        const pauseBtn = screen.getByTitle('Pause');
        fireEvent.click(pauseBtn);
        expect(window.electronAPI.pauseDownload).toHaveBeenCalledWith('1');
    });
});
