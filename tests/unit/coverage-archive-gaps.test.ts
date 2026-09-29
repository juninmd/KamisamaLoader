import { describe, it, expect } from 'vitest';
import { validateArchiveEntries } from '../../electron/archive';

describe('Archive Gaps', () => {
    it('covers invalid entry size in archive', () => {
        const entries = [
            { entryName: 'test.pak', isDirectory: false, size: -1, compressedSize: 10 }
        ];

        expect(() => validateArchiveEntries(entries as any)).toThrow('Invalid entry size in archive');
    });

    it('covers suspicious compression ratio', () => {
        const entries = [
            { entryName: 'test.pak', isDirectory: false, size: 2 * 1024 * 1024 * 1024, compressedSize: 0 } // Infinity ratio
        ];

        expect(() => validateArchiveEntries(entries as any)).toThrow('Archive compression ratio is suspicious');
    });

    it('covers Max expanded bytes', () => {
        const entries = [
            { entryName: 'test.pak', isDirectory: false, size: 5 * 1024 * 1024 * 1024, compressedSize: 1024 * 1024 * 1024 }
        ];

        expect(() => validateArchiveEntries(entries as any)).toThrow('Archive expanded size exceeds 4 GiB.');
    });
});
