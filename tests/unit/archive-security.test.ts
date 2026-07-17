import { describe, expect, it } from 'vitest';
import { validateArchiveEntries } from '../../electron/archive';

const entry = (entryName: string, size = 10, compressedSize = 5) => ({
  entryName,
  isDirectory: false,
  size,
  compressedSize,
});

describe('archive extraction policy', () => {
  it('accepts normal nested mod files', () => {
    expect(() => validateArchiveEntries([
      entry('AuraPack/paks/aura.pak'),
      entry('AuraPack/ue4ss/Scripts/main.lua'),
    ])).not.toThrow();
  });

  it.each([
    '../escape.pak',
    'folder/../../escape.pak',
    '/absolute.pak',
    'C:\\Windows\\escape.dll',
    'C:drive-relative.pak',
    'safe.pak:alternate-stream',
    '\\\\server\\share\\escape.pak',
    'safe/evil\0.pak',
  ])('rejects unsafe entry path %s', (entryName) => {
    expect(() => validateArchiveEntries([entry(entryName)])).toThrow(/unsafe archive path/i);
  });

  it('rejects archives with excessive expanded size', () => {
    expect(() => validateArchiveEntries([entry('huge.pak', 4 * 1024 ** 3 + 1)]))
      .toThrow(/expanded size/i);
  });

  it('rejects suspicious compression ratios', () => {
    expect(() => validateArchiveEntries([entry('bomb.pak', 2 * 1024 ** 2, 1)]))
      .toThrow(/compression ratio/i);
  });

  it('rejects excessive entry counts', () => {
    const entries = Array.from({ length: 50_001 }, (_, index) => entry(`${index}.pak`));
    expect(() => validateArchiveEntries(entries)).toThrow(/too many entries/i);
  });
});
