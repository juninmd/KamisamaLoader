import fs from 'node:fs/promises';
import path from 'node:path';
import { createReadStream } from 'node:fs';
import { createHash, randomUUID } from 'node:crypto';

export const isTransactionArtifact = (name: string) => /\.kamisama-[a-f0-9-]+\.(bak|tmp)$/i.test(name);

async function digest(file: string) {
  const hash = createHash('sha256');
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest('hex');
}

export async function sameFile(source: string, target: string) {
  const sourceStat = await fs.stat(source);
  let targetStat;
  try { targetStat = await fs.lstat(target); } catch (error) {
    if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false;
    throw error;
  }
  if (targetStat.isSymbolicLink() || !targetStat.isFile()) throw new Error(`Unsafe target: ${target}`);
  if (sourceStat.size !== targetStat.size) return false;
  if (sourceStat.ino && sourceStat.ino === targetStat.ino && sourceStat.dev === targetStat.dev) return true;
  return await digest(source) === await digest(target);
}

// Backups sit beside each target so rename stays on the same volume.
// Unchanged files are never opened for writing, preserving hard links and mtimes.
export class FileTransaction {
  private undo: { target: string; backup?: string }[] = [];
  readonly counts = { added: 0, changed: 0, removed: 0, unchanged: 0 };
  constructor(private protectedFiles = new Set<string>()) {}

  private async validate(target: string) {
    if ([...this.protectedFiles].some(file => path.resolve(file).toLowerCase() === path.resolve(target).toLowerCase())) {
      throw new Error(`Conflito com outro mod: ${path.basename(target)}`);
    }
    let parent = path.dirname(target);
    while (parent !== path.dirname(parent)) {
      try {
        if ((await fs.lstat(parent)).isSymbolicLink()) throw new Error(`Unsafe directory: ${parent}`);
      } catch (error) { if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error; }
      parent = path.dirname(parent);
    }
  }

  async remove(target: string) {
    await this.validate(target);
    try {
      const stat = await fs.lstat(target);
      if (!stat.isFile() || stat.isSymbolicLink()) throw new Error(`Unsafe target: ${target}`);
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'ENOENT') return;
      throw error;
    }
    const backup = `${target}.kamisama-${randomUUID()}.bak`;
    await fs.rename(target, backup);
    this.undo.push({ target, backup });
    this.counts.removed++;
  }

  async replace(source: string, target: string) {
    await this.validate(target);
    if (await sameFile(source, target)) { this.counts.unchanged++; return; }
    await fs.mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.kamisama-${randomUUID()}.tmp`;
    try {
      try { await fs.link(source, temporary); }
      catch (error) {
        if (!['EXDEV', 'EPERM', 'EACCES', 'ENOTSUP'].includes((error as NodeJS.ErrnoException).code || '')) throw error;
        await fs.copyFile(source, temporary);
      }
      const before = this.undo.length;
      await this.remove(target);
      if (before === this.undo.length) {
        this.undo.push({ target });
        this.counts.added++;
      } else {
        this.counts.removed--;
        this.counts.changed++;
      }
      await fs.rename(temporary, target);
    } finally { await fs.unlink(temporary).catch(() => undefined); }
  }

  async write(target: string, content: string) {
    await this.validate(target);
    await fs.mkdir(path.dirname(target), { recursive: true });
    const temporary = `${target}.kamisama-${randomUUID()}.tmp`;
    try { await fs.writeFile(temporary, content); await this.replace(temporary, target); }
    finally { await fs.unlink(temporary).catch(() => undefined); }
  }

  async rollback() {
    for (const { target, backup } of [...this.undo].reverse()) {
      await fs.unlink(target).catch((error: NodeJS.ErrnoException) => {
        if (error.code !== 'ENOENT') throw error;
      });
      if (backup) await fs.rename(backup, target);
    }
    this.undo = [];
  }

  async commit() {
    const entries = this.undo;
    this.undo = [];
    for (const { backup } of entries) {
      if (backup) await fs.unlink(backup).catch(error => console.warn('Backup cleanup:', error));
    }
  }
}

export async function listPackage(root: string, relative = ''): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await fs.readdir(path.join(root, relative), { withFileTypes: true })) {
    if (isTransactionArtifact(entry.name)) continue;
    const name = path.join(relative, entry.name);
    if (entry.isSymbolicLink()) throw new Error(`Links are not supported: ${name}`);
    if (entry.isDirectory()) files.push(...await listPackage(root, name));
    else if (entry.isFile()) files.push(name);
  }
  return files;
}

export async function reconcilePackage(source: string, target: string, transaction: FileTransaction) {
  const next = await listPackage(source);
  if (!next.length) throw new Error('O pacote está vazio. A instalação anterior foi preservada.');
  const previous = await listPackage(target).catch((error: NodeJS.ErrnoException) => {
    if (error.code === 'ENOENT') return [];
    throw error;
  });
  for (const file of next) await transaction.replace(path.join(source, file), path.join(target, file));
  const keep = new Set(next);
  for (const file of previous) if (!keep.has(file)) await transaction.remove(path.join(target, file));
}
