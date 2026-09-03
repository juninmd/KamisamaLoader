import { describe, it, expect, vi } from 'vitest';
import * as Archive from '../../../electron/archive';
import { extractArchive } from '../../../electron/archive';

vi.mock('node:fs/promises', () => ({
    default: {
        readFile: vi.fn().mockResolvedValue(Buffer.from('PK\x03\x04')),
    }
}));

const mockExtractAllToAsync = vi.fn((dest, overwrite, keepOrig, callback) => callback());

vi.mock('adm-zip', () => {
    return {
        default: vi.fn(function() {
            return {
                getEntries: () => [{
                    entryName: 'test.txt',
                    isDirectory: false,
                    header: { size: 100, compressedSize: 50 }
                }],
                extractAllToAsync: mockExtractAllToAsync
            };
        })
    };
});

describe('Archive Coverage', () => {
    it('should throw error on invalid entry size', () => {
        const entries = [{
            entryName: 'test.txt',
            isDirectory: false,
            size: -1,
            compressedSize: 100
        }];
        expect(() => Archive.validateArchiveEntries(entries)).toThrow('Invalid entry size');
    });

    it('should throw error on invalid entry compressed size', () => {
        const entries = [{
            entryName: 'test.txt',
            isDirectory: false,
            size: 100,
            compressedSize: -1
        }];
        expect(() => Archive.validateArchiveEntries(entries)).toThrow('Invalid entry size');
    });

    it('should throw error on unsafe paths', () => {
        const entries = [{
            entryName: '../test.txt',
            isDirectory: false,
            size: 10,
            compressedSize: 10
        }];
        expect(() => Archive.validateArchiveEntries(entries)).toThrow('Unsafe archive path');
    });

    it('should throw error on null byte path', () => {
        const entries = [{
            entryName: 'test\0.txt',
            isDirectory: false,
            size: 10,
            compressedSize: 10
        }];
        expect(() => Archive.validateArchiveEntries(entries)).toThrow('Unsafe archive path');
    });

    it('should throw error on absolute path unix', () => {
        const entries = [{
            entryName: '/test.txt',
            isDirectory: false,
            size: 10,
            compressedSize: 10
        }];
        expect(() => Archive.validateArchiveEntries(entries)).toThrow('Unsafe archive path');
    });

    it('should throw error on absolute path windows', () => {
        const entries = [{
            entryName: 'C:\\test.txt',
            isDirectory: false,
            size: 10,
            compressedSize: 10
        }];
        expect(() => Archive.validateArchiveEntries(entries)).toThrow('Unsafe archive path');
    });

    it('should throw error on suspicious compression ratio', () => {
        const entries = [{
            entryName: 'test.txt',
            isDirectory: false,
            size: 1024 * 1024 * 2,
            compressedSize: 1
        }];
        expect(() => Archive.validateArchiveEntries(entries)).toThrow('Archive compression ratio is suspicious');
    });

    it('should throw error on Infinity compression ratio', () => {
        const entries = [{
            entryName: 'test.txt',
            isDirectory: false,
            size: 1024 * 1024 * 2,
            compressedSize: 0
        }];
        expect(() => Archive.validateArchiveEntries(entries)).toThrow('Archive compression ratio is suspicious');
    });

    it('should pass on valid entries', () => {
        const entries = [{
            entryName: 'dir/',
            isDirectory: true,
            size: 0,
            compressedSize: 0
        }];
        expect(() => Archive.validateArchiveEntries(entries)).not.toThrow();
    });

    it('should not throw on valid entries with ratio check', () => {
        const entries = [{
            entryName: 'test.txt',
            isDirectory: false,
            size: 1024 * 1024 * 2,
            compressedSize: 1024 * 1024
        }];
        expect(() => Archive.validateArchiveEntries(entries)).not.toThrow();
    });

    it('should throw error when expanded bytes exceed limit', () => {
        const entries = [{
            entryName: 'test.txt',
            isDirectory: false,
            size: 5 * 1024 ** 3,
            compressedSize: 100
        }];
        expect(() => Archive.validateArchiveEntries(entries)).toThrow('Archive expanded size exceeds 4 GiB.');
    });

    it('should throw error when there are too many entries', () => {
        const entries = Array(50001).fill({
            entryName: 'test.txt',
            isDirectory: false,
            size: 10,
            compressedSize: 10
        });
        expect(() => Archive.validateArchiveEntries(entries)).toThrow('Archive has too many entries.');
    });

    it('should reject extractArchive on error', async () => {
        mockExtractAllToAsync.mockImplementationOnce((dest, overwrite, keepOrig, cb) => cb(new Error('Extract error')));
        await expect(extractArchive('dummy.zip', 'dest')).rejects.toThrow('Extract error');
    });

    it('should resolve extractArchive on success', async () => {
        mockExtractAllToAsync.mockImplementationOnce((dest, overwrite, keepOrig, cb) => cb());
        await expect(extractArchive('dummy.zip', 'dest')).resolves.toBeUndefined();
    });
});
