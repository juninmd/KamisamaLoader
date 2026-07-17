import fs from 'node:fs/promises';
import AdmZip from 'adm-zip';

const MAX_ENTRIES = 50_000;
const MAX_EXPANDED_BYTES = 4 * 1024 ** 3;
const MAX_COMPRESSION_RATIO = 1_000;
const RATIO_CHECK_MIN_BYTES = 1024 ** 2;

export interface ArchiveEntryInfo {
  entryName: string;
  isDirectory: boolean;
  size: number;
  compressedSize: number;
}

export function validateArchiveEntries(entries: ArchiveEntryInfo[]) {
  if (entries.length > MAX_ENTRIES) throw new Error('Archive has too many entries.');
  let expandedBytes = 0;

  for (const entry of entries) {
    const name = entry.entryName;
    const parts = name.split(/[\\/]+/);
    const absolute = /^[a-zA-Z]:/.test(name) || /^[\\/]/.test(name);
    if (!name || name.includes('\0') || name.includes(':') || absolute || parts.includes('..')) {
      throw new Error(`Unsafe archive path: ${name}`);
    }
    if (entry.isDirectory) continue;
    if (entry.size < 0 || entry.compressedSize < 0) {
      throw new Error(`Invalid entry size in archive: ${name}`);
    }
    expandedBytes += entry.size;
    if (expandedBytes > MAX_EXPANDED_BYTES) {
      throw new Error('Archive expanded size exceeds 4 GiB.');
    }
    if (entry.size >= RATIO_CHECK_MIN_BYTES) {
      const ratio = entry.compressedSize ? entry.size / entry.compressedSize : Infinity;
      if (ratio > MAX_COMPRESSION_RATIO) {
        throw new Error(`Archive compression ratio is suspicious: ${name}`);
      }
    }
  }
}

export async function extractArchive(zipPath: string, destination: string) {
  const zip = new AdmZip(await fs.readFile(zipPath));
  validateArchiveEntries(zip.getEntries().map((entry) => ({
    entryName: entry.entryName,
    isDirectory: entry.isDirectory,
    size: entry.header.size,
    compressedSize: entry.header.compressedSize,
  })));
  await new Promise<void>((resolve, reject) => {
    zip.extractAllToAsync(destination, true, false, (error) => {
      if (error) reject(error);
      else resolve();
    });
  });
}