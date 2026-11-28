import { describe, it, expect, vi } from 'vitest';
import { EventEmitter } from 'events';
import os from 'os';
import path from 'path';
import { writeFileSync } from 'fs';
import { net } from 'electron';
import { ModManager } from '../../electron/mod-manager';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => os.tmpdir()), isPackaged: false },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() },
}));

vi.mock('../../electron/gamebanana', () => ({
    fetchModProfile: vi.fn(),
    searchOnlineMods: vi.fn(),
}));

describe('ModManager.downloadFile write errors', () => {
    it('rejects instead of crashing when the destination cannot be written', async () => {
        const parentIsFile = path.join(os.tmpdir(), `kamisama-not-a-dir-${process.pid}`);
        writeFileSync(parentIsFile, 'x');
        const response = Object.assign(new EventEmitter(), { statusCode: 200, headers: {} });
        const request = Object.assign(new EventEmitter(), {
            end: () => setImmediate(() => {
                request.emit('response', response);
                response.emit('data', Buffer.from('zip-bytes'));
                setImmediate(() => response.emit('end'));
            }),
        });
        (net.request as any).mockReturnValue(request);

        const uncaught = vi.fn();
        process.on('uncaughtException', uncaught);
        try {
            const result = (new ModManager() as any).downloadFile('http://mod', path.join(parentIsFile, 'mod.zip'));
            // Windows reports ENOENT for a file used as a directory; POSIX reports
            // ENOTDIR. Both prove the write failed and was surfaced as a rejection.
            await expect(result).rejects.toThrow(/ENOENT|ENOTDIR/);
            await new Promise(r => setTimeout(r, 20));
            expect(uncaught).not.toHaveBeenCalled();
        } finally {
            process.off('uncaughtException', uncaught);
        }
    });
});
