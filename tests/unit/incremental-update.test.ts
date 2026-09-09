import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './support/incremental';
import { fetchModProfile } from '../../electron/gamebanana';
vi.mock('electron', async () => {
  const os = await import('node:os');
  return { app: { getPath: () => os.tmpdir(), isPackaged: true }, net: {}, shell: {} };
});
vi.mock('../../electron/gamebanana', () => ({ fetchModProfile: vi.fn() }));
describe('incremental updates on real files', () => {
  let f: Awaited<ReturnType<typeof fixture>>;
  beforeEach(async () => { f = await fixture(); });
  afterEach(async () => { vi.restoreAllMocks(); await f.close(); });
  it('keeps a pending update across repeated checks and records installed identity only after applying', async () => {
    await f.manager.installMod(await f.zip('Aura', { 'a.pak': 'old', 'same.pak': 'same' }));
    const mods = await f.readMods();
    Object.assign(mods[0], { gameBananaId: 42, installedFileId: 100, latestFileId: 100 });
    await fs.writeFile(f.catalog, JSON.stringify(mods));
    vi.mocked(fetchModProfile).mockResolvedValue({ _sVersion: '2.0', _aFiles: [{ _idRow: 200, _sDownloadUrl: 'https://example.com/v2.zip' }] } as never);
    expect(await f.manager.checkForUpdates()).toEqual([mods[0].id]);
    expect(await f.manager.checkForUpdates()).toEqual([mods[0].id]);
    const pending = await f.readMods();
    expect(pending[0].installedFileId).toBe(100);
    const untouched = path.join(f.deployRoot, '001_same.pak');
    const before = await fs.stat(untouched);
    const archive = await f.zip('update', { 'a.pak': 'new', 'same.pak': 'same' });
    expect(await f.manager.finalizeUpdate(pending[0], archive, pending, f.catalog)).toBe(true);
    expect((await f.readMods())[0]).toMatchObject({ version: '2.0', installedFileId: 200, hasUpdate: false });
    expect((await fs.stat(untouched)).mtimeMs).toBe(before.mtimeMs);
    expect(await f.manager.checkForUpdates()).toEqual([]);
    expect(await f.manager.updateMod(mods[0].id)).toBe(true); // No download manager required for a no-op.
  });
  it('merges concurrent completions into the latest catalog rather than losing successful updates', async () => {
    await f.manager.installMod(await f.zip('Aura', { 'a.pak': 'old' }));
    await f.manager.installMod(await f.zip('Music', { 'b.pak': 'old' }));
    const mods = await f.readMods();
    mods.forEach(mod => Object.assign(mod, { hasUpdate: true, latestVersion: '2.0', latestFileId: 20 }));
    await fs.writeFile(f.catalog, JSON.stringify(mods));
    const archives = await Promise.all([f.zip('update-a', { 'a.pak': 'new-a' }), f.zip('update-b', { 'b.pak': 'new-b' })]);
    expect(await Promise.all(mods.map((mod, index) => f.manager.finalizeUpdate(mod, archives[index], mods, f.catalog)))).toEqual([true, true]);
    expect((await f.readMods()).every(mod => mod.version === '2.0' && !mod.hasUpdate)).toBe(true);
    expect(await fs.readFile(path.join(f.deployRoot, '001_a.pak'), 'utf8')).toBe('new-a');
    expect(await fs.readFile(path.join(f.deployRoot, '002_b.pak'), 'utf8')).toBe('new-b');
  });
  it('leaves the old version intact when the archive is invalid', async () => {
    await f.manager.installMod(await f.zip('Aura', { 'a.pak': 'old' }));
    const mods = await f.readMods();
    const archive = path.join(f.root, 'broken.zip');
    await fs.writeFile(archive, 'invalid');
    const before = await fs.readFile(f.catalog, 'utf8');
    expect(await f.manager.finalizeUpdate(mods[0], archive, mods, f.catalog)).toBe(false);
    expect(await fs.readFile(f.catalog, 'utf8')).toBe(before);
    expect(await fs.readFile(mods[0].deployedFiles![0], 'utf8')).toBe('old');
  });
  it('rejects an update that would overwrite another mod and rolls back the local package', async () => {
    await f.manager.installMod(await f.zip('LogicA', { 'LogicMods/a.pak': 'A' }));
    await f.manager.installMod(await f.zip('LogicB', { 'LogicMods/b.pak': 'B' }));
    const mods = await f.readMods();
    const archive = await f.zip('conflict', { 'LogicMods/a.pak': 'new A', 'LogicMods/b.pak': 'conflict' });
    expect(await f.manager.finalizeUpdate(mods[0], archive, mods, f.catalog)).toBe(false);
    expect(await fs.readFile(mods[1].deployedFiles![0], 'utf8')).toBe('B');
    expect(await fs.readFile(path.join(mods[0].folderPath, 'LogicMods/a.pak'), 'utf8')).toBe('A');
  });
});
