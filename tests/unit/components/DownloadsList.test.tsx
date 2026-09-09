// @vitest-environment happy-dom
import './DownloadsList.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from '../test-utils';
import { DownloadsList } from '../../../src/components/DownloadsList';
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
    });
    it('should render empty state', async () => {
        renderWithProviders(<DownloadsList />);
        await waitFor(() => {
            expect(screen.getByText('No active downloads')).toBeInTheDocument();
        });
    });
});
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
    });
    it('should render downloads', async () => {
        const mockDownloads = [{
                id: '1',
                filename: 'test.zip',
                state: 'progressing',
                progress: 50,
                speed: 1024 * 1024,
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
});
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
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
});
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
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
});
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
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
});
describe('DownloadsList', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getDownloads as any).mockResolvedValue([]);
        (window.electronAPI as any).onDownloadUpdate = vi.fn();
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
});
