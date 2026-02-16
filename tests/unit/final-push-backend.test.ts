import { describe, it, expect, vi, beforeEach } from 'vitest';
import { EventEmitter } from 'events';

// Mocks
const { mockFs } = vi.hoisted(() => {
    return {
        mockFs: {
            readFile: vi.fn(),
            writeFile: vi.fn(),
            mkdir: vi.fn(),
            unlink: vi.fn(),
            stat: vi.fn(),
            readdir: vi.fn(),
            link: vi.fn(),
            copyFile: vi.fn(),
            rm: vi.fn(),
            cp: vi.fn()
        }
    };
});

vi.mock('fs', async () => ({
    default: { ...mockFs, unlink: vi.fn((p, cb) => cb(null)) },
    createWriteStream: vi.fn(() => ({
        write: vi.fn(),
        close: vi.fn(),
        end: vi.fn(),
        on: vi.fn(),
    })),
}));
vi.mock('fs/promises', () => ({ default: mockFs }));

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/tmp'), isPackaged: false },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));

import { ModManager } from '../../electron/mod-manager';

describe('Final Push Backend', () => {
    let modManager: ModManager;

    beforeEach(() => {
        vi.clearAllMocks();
        modManager = new ModManager();
        mockFs.readdir.mockResolvedValue([]);
        mockFs.stat.mockResolvedValue({ isDirectory: () => false, size: 0 });
    });

    describe('Priority Normalization', () => {
        it('should normalize non-sequential priorities', async () => {
            const mods = [
                { id: '1', name: 'A', priority: 100, isEnabled: true },
                { id: '2', name: 'B', priority: 50, isEnabled: true }
            ];
            mockFs.readFile.mockResolvedValue(JSON.stringify(mods));
            mockFs.writeFile.mockResolvedValue(undefined);

            await modManager.fixPriorities();

            expect(mockFs.writeFile).toHaveBeenCalled();
            const written = JSON.parse(mockFs.writeFile.mock.calls[0][1]);
            // Length 2. High priority first.
            // A (100) -> 2
            // B (50) -> 1
            const modA = written.find((m: any) => m.name === 'A');
            const modB = written.find((m: any) => m.name === 'B');
            expect(modA.priority).toBe(2);
            expect(modB.priority).toBe(1);
        });
    });

    describe('Toggle Conflict Check', () => {
        it('should detect category conflict', async () => {
            const mods = [
                { id: '1', name: 'Mod1', category: 'Skin', isEnabled: true },
                { id: '2', name: 'Mod2', category: 'Skin', isEnabled: false }
            ];
            mockFs.readFile.mockResolvedValue(JSON.stringify(mods));

            // Should warn when enabling Mod2
            const result = await modManager.toggleMod('2', true);
            expect(result.success).toBe(true);
            expect(result.conflict).toContain('This mod conflicts with "Mod1"');
        });

        it('should ignore conflict for generic categories', async () => {
            const mods = [
                { id: '1', name: 'Mod1', category: 'UI', isEnabled: true },
                { id: '2', name: 'Mod2', category: 'UI', isEnabled: false }
            ];
            mockFs.readFile.mockResolvedValue(JSON.stringify(mods));

            const result = await modManager.toggleMod('2', true);
            expect(result.success).toBe(true);
            expect(result.conflict).toBeNull();
        });
    });
});
