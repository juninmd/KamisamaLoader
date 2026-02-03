import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import path from 'path';

vi.mock('fs/promises');
vi.mock('electron', () => ({
    app: { getPath: () => '/tmp', isPackaged: false },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

describe('ModManager - UE4SS & Utils', () => {
    let mm: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        mm = new ModManager();
        (fs.readFile as any).mockResolvedValue(JSON.stringify({ gamePath: '/game' }));
    });

    it('updateUE4SSModsTxt should add mod if not present', async () => {
        // We can't access private method directly easily unless we cast or export it.
        // Or we trigger it via deployMod.
        // Let's use ANY cast.
        const updateUE4SS = (mm as any).updateUE4SSModsTxt;

        (fs.readFile as any).mockResolvedValue('ExistingMod : 1\n');

        await updateUE4SS('/bin', 'NewMod', true);

        expect(fs.writeFile).toHaveBeenCalledWith(
            expect.stringContaining('mods.txt'),
            expect.stringMatching(/ExistingMod : 1\s+NewMod : 1/)
        );
    });

    it('updateUE4SSModsTxt should update existing mod', async () => {
        const updateUE4SS = (mm as any).updateUE4SSModsTxt;
        (fs.readFile as any).mockResolvedValue('MyMod : 0\nOther : 1');

        await updateUE4SS('/bin', 'MyMod', true);

        expect(fs.writeFile).toHaveBeenCalledWith(
            expect.stringContaining('mods.txt'),
            expect.stringContaining('MyMod : 1\nOther : 1')
        );
    });

    it('calculateFolderSize should sum file sizes recursively', async () => {
        (fs.readdir as any).mockImplementation(async (p: string) => {
            if (p === '/root') return ['file1', 'dir1'];
            if (p === '/root/dir1') return ['file2'];
            return [];
        });
        (fs.stat as any).mockImplementation(async (p: string) => {
            if (p.endsWith('dir1')) return { isDirectory: () => true, size: 0 };
            return { isDirectory: () => false, size: 100 };
        });

        const size = await mm.calculateFolderSize('/root');
        expect(size).toBe(200); // file1 (100) + file2 (100)
    });
});
