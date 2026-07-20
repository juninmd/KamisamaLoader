import { describe, it, expect, vi, beforeEach } from 'vitest';
import { DownloadManager } from '../../electron/download-manager';

vi.mock('electron', () => ({
    net: {
        request: vi.fn(() => ({
            on: vi.fn(),
            end: vi.fn(),
            abort: vi.fn()
        }))
    },
    app: {
        getPath: vi.fn()
    },
    shell: {
        showItemInFolder: vi.fn()
    }
}));

describe('DownloadManager Coverage Complete', () => {
    let dm: DownloadManager;

    beforeEach(() => {
        vi.clearAllMocks();
        dm = new DownloadManager();
    });

    it('should clearCompleted only removes specific states', () => {
        const id1 = dm.startDownload('http://test.com/1', '/dl', '1.zip');
        const id2 = dm.startDownload('http://test.com/2', '/dl', '2.zip');
        const id3 = dm.startDownload('http://test.com/3', '/dl', '3.zip');
        const id4 = dm.startDownload('http://test.com/4', '/dl', '4.zip');

        const map = (dm as any).downloads;
        map.get(id1).state = 'completed';
        map.get(id2).state = 'cancelled';
        map.get(id3).state = 'failed';
        map.get(id4).state = 'progressing';

        dm.clearCompleted();

        expect(map.has(id1)).toBe(false);
        expect(map.has(id2)).toBe(false);
        expect(map.has(id3)).toBe(false);
        expect(map.has(id4)).toBe(true);
    });

    it('should openDownloadFolder safely', () => {
        // Just checking execution without crash
        const id = dm.startDownload('http://test.com', '/dl', 'test.zip');
        dm.openDownloadFolder(id);

        dm.openDownloadFolder('non-existent');
    });


    it('should hit branch when item missing in failDownload', () => {
        dm.failDownload('nonexistent', 'Error');
    });

    it('should catch error when state is paused inside fail helper in download-transfer', () => {
        const id = dm.startDownload('http://test.com', '/dl', 'test.zip');
        const item = (dm as any).downloads.get(id);
        item.state = 'paused';
        dm.failDownload(id, 'error msg');
        expect(item.state).toBe('failed');
    });
});
