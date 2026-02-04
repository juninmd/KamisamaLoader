// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from './test-utils';
import { ModManager } from '../../electron/mod-manager';
import Dashboard from '../../src/pages/Dashboard';
import FilterBar from '../../src/components/FilterBar';
import { DownloadManager } from '../../electron/download-manager';
import fs from 'fs';
import { EventEmitter } from 'events';
import { net, shell } from 'electron'; // Mocked

// Mock dependencies
vi.mock('../../electron/api-cache', () => ({
    getAPICache: () => ({ get: vi.fn(), set: vi.fn() })
}));
vi.mock('electron', () => ({
    app: { getPath: () => '/tmp', isPackaged: true },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn(), showItemInFolder: vi.fn() },
    BrowserWindow: class {
        webContents = { send: vi.fn() }
    }
}));
vi.mock('fs/promises');
vi.mock('fs', () => ({
    default: {
        createWriteStream: vi.fn(() => ({
            write: vi.fn(),
            close: vi.fn(),
            end: vi.fn(),
            on: vi.fn()
        })),
        unlink: vi.fn((p, cb) => cb(null))
    }
}));

describe('Coverage Catch-all', () => {
    describe('Electron: ModManager', () => {
        it('should construct with packaged app path', () => {
            const mgr = new ModManager();
            expect(mgr).toBeDefined();
        });
    });

    describe('Frontend: Dashboard', () => {
        it('should render and handle events', async () => {
            (window.electronAPI.getSettings as any).mockResolvedValue({ gamePath: '' });
            (window.electronAPI.getInstalledMods as any).mockResolvedValue([]);
            (window.electronAPI.fetchFeaturedMods as any).mockResolvedValue([]);
            (window.electronAPI.fetchNewMods as any).mockResolvedValue([]);

            renderWithProviders(<Dashboard />);

            await waitFor(() => {
                expect(screen.getByText('Featured Mods')).toBeInTheDocument();
            });
        });
    });

    describe('Frontend: FilterBar', () => {
        it('should handle all interactions', () => {
            const onChange = vi.fn();
            const filters = {
                categories: [],
                sortBy: 'date',
                order: 'desc',
                dateRange: 'all',
                nsfw: false,
                zeroSpark: false,
                colorZ: false
            };

            renderWithProviders(
                <FilterBar
                    activeFilters={filters as any}
                    onFilterChange={onChange}
                    availableCategories={[{id:1, name:'Cat', count:1}]}
                />
            );

            // Toggle Sort
            const sortBtn = screen.getByText('Most Recent');
            fireEvent.click(sortBtn);

            // Toggle Order
            const buttons = screen.getAllByRole('button');
            fireEvent.click(buttons[2]);
            expect(onChange).toHaveBeenCalled();
        });
    });

    describe('Electron: DownloadManager', () => {
        let dm: DownloadManager;
        let mockRequest: any;
        let mockResponse: any;

        beforeEach(() => {
            dm = new DownloadManager();
            dm.setWindow({ webContents: { send: vi.fn() } } as any); // Fix missing window

            mockRequest = new EventEmitter();
            mockRequest.end = vi.fn();
            mockRequest.abort = vi.fn();

            mockResponse = new EventEmitter();
            mockResponse.statusCode = 200;
            mockResponse.headers = { 'content-length': '100' };

            (net.request as any).mockReturnValue(mockRequest);
        });

        it('should handle pause during data stream', () => {
            const id = dm.startDownload('http://url', '/tmp', 'file');
            mockRequest.emit('response', mockResponse);
            dm.pauseDownload(id);
            mockResponse.emit('data', Buffer.from('data'));
        });

        it('should handle request error', () => {
            const id = dm.startDownload('http://url', '/tmp', 'file');
            mockRequest.emit('error', new Error('Net Fail'));
            const dl = dm.getDownloads().find(d => d.id === id);
            expect(dl?.state).toBe('failed');
        });

        it('should handle response error', () => {
            const id = dm.startDownload('http://url', '/tmp', 'file');
            mockRequest.emit('response', mockResponse);
            mockResponse.emit('error', new Error('Stream Fail'));
            const dl = dm.getDownloads().find(d => d.id === id);
            expect(dl?.state).toBe('failed');
        });

        it('should open download folder', () => {
            const id = dm.startDownload('http://url', '/tmp', 'file');
            dm.openDownloadFolder(id);
            expect(shell.showItemInFolder).toHaveBeenCalled();
        });

        it('should clear completed', () => {
             const id = dm.startDownload('http://url', '/tmp', 'file');
             (dm as any).downloads.get(id).state = 'completed';
             dm.clearCompleted();
             expect(dm.getDownloads()).toHaveLength(0);
        });

        it('should cancel download', () => {
             const id = dm.startDownload('http://url', '/tmp', 'file');
             dm.cancelDownload(id);
             const dl = dm.getDownloads().find(d => d.id === id);
             expect(dl?.state).toBe('cancelled');
             expect(mockRequest.abort).toHaveBeenCalled();
        });

        it('should resume download', () => {
             const id = dm.startDownload('http://url', '/tmp', 'file');
             dm.pauseDownload(id);
             dm.resumeDownload(id);
             const dl = dm.getDownloads().find(d => d.id === id);
             expect(dl?.state).toBe('progressing');
        });
    });
});
