import { beforeEach, afterEach, describe, expect, it, vi } from 'vitest';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fixture } from './support/incremental';
vi.mock('electron', async () => {
  const os = await import('node:os');
  return { app: { getPath: () => os.tmpdir(), isPackaged: true }, net: {}, shell: {} };
});
describe('incremental installs on real files', () => {
  let f: Awaited<ReturnType<typeof fixture>>;
  beforeEach(async () => { f = await fixture(); });
  afterEach(async () => { vi.restoreAllMocks(); await f.close(); });
  it('preserves identical files and priority when reinstalling, adding and deleting only the delta', async () => {
    expect((await f.manager.installMod(await f.zip('Aura', { 'same.pak': 'same', 'changed.pak': 'old', 'removed.pak': 'old' }))).success).toBe(true);
    const first = (await f.readMods())[0];
    const source = path.join(first.folderPath, 'same.pak');
    const deployed = path.join(f.deployRoot, '001_same.pak');
    const fixed = new Date('2020-01-01');
    await fs.utimes(source, fixed, fixed); await fs.utimes(deployed, fixed, fixed);
    const before = await fs.stat(deployed);
    expect((await f.manager.installMod(await f.zip('Aura', { 'same.pak': 'same', 'changed.pak': 'new', 'added.pak': 'new' }))).success).toBe(true);
    const next = (await f.readMods())[0];
    expect(next.id).toBe(first.id); expect(next.priority).toBe(first.priority);
    expect((await fs.stat(deployed)).mtimeMs).toBe(before.mtimeMs);
    expect((await fs.stat(source)).mtimeMs).toBe(fixed.getTime());
    expect(await fs.readFile(path.join(f.deployRoot, '001_changed.pak'), 'utf8')).toBe('new');
    expect(await fs.readFile(path.join(f.deployRoot, '001_added.pak'), 'utf8')).toBe('new');
    await expect(fs.stat(path.join(f.deployRoot, '001_removed.pak'))).rejects.toMatchObject({ code: 'ENOENT' });
    expect(next.deployedFiles).toHaveLength(3);
    expect(next.fileSize).toBe(10);
  });
  it('preserves disabled status and does not deploy a reinstalled disabled mod', async () => {
    await f.manager.installMod(await f.zip('Aura', { 'a.pak': 'old' }));
    const first = (await f.readMods())[0];
    await f.manager.toggleMod(first.id, false);
    await f.manager.installMod(await f.zip('Aura', { 'a.pak': 'new' }));
    expect((await f.readMods())[0].isEnabled).toBe(false);
    await expect(fs.stat(path.join(f.deployRoot, '001_a.pak'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
  it('rolls back source, deployed files and catalog when deployment fails', async () => {
    await f.manager.installMod(await f.zip('Aura', { 'a.pak': 'old' }));
    const first = (await f.readMods())[0];
    const catalog = await fs.readFile(f.catalog, 'utf8');
    const rename = fs.rename;
    vi.spyOn(fs, 'rename').mockImplementation(async (source, target) => {
      if (String(source).endsWith('.tmp') && String(target) === path.join(f.deployRoot, '001_a.pak')) throw new Error('Disk failure');
      return rename(source, target);
    });
    expect((await f.manager.installMod(await f.zip('Aura', { 'a.pak': 'new', 'b.pak': 'added' }))).success).toBe(false);
    expect(await fs.readFile(path.join(first.folderPath, 'a.pak'), 'utf8')).toBe('old');
    expect(await fs.readFile(path.join(f.deployRoot, '001_a.pak'), 'utf8')).toBe('old');
    expect(await fs.readFile(f.catalog, 'utf8')).toBe(catalog);
    expect(await fs.readdir(first.folderPath)).toEqual(['a.pak']);
  });
  it('serializes simultaneous installations without losing catalog entries', async () => {
    const files = await Promise.all(['Aura', 'Music', 'Costume'].map(name => f.zip(name, { [`${name}.pak`]: name })));
    const results = await Promise.all(files.map(file => f.manager.installMod(file)));
    expect(results.every(result => result.success)).toBe(true);
    const mods = await f.readMods();
    expect(mods).toHaveLength(3); expect(new Set(mods.map(mod => mod.priority)).size).toBe(3);
    for (const mod of mods) expect(await fs.readFile(mod.deployedFiles![0], 'utf8')).toBe(mod.name);
  });
  it('never sweeps manually installed files during repair', async () => {
    await f.manager.installMod(await f.zip('Aura', { 'a.pak': 'old' }));
    const manual = path.join(f.deployRoot, '999_manual.pak');
    await fs.writeFile(manual, 'manual');
    await f.manager.verifyDeployment();
    expect(await fs.readFile(manual, 'utf8')).toBe('manual');
  });
  it('does not copy transaction backups into LogicMods or count them as installed bytes', async () => {
    await f.manager.installMod(await f.zip('Logic', { 'LogicMods/a.pak': 'old-content' }));
    await f.manager.installMod(await f.zip('Logic', { 'LogicMods/a.pak': 'new' }));
    const mod = (await f.readMods())[0];
    expect(mod.fileSize).toBe(3);
    expect(mod.deployedFiles).toHaveLength(1);
    expect(await fs.readdir(path.dirname(mod.deployedFiles![0]))).toEqual(['a.pak']);
  });
  it('rejects a collision with an unmanaged game file without overwriting it', async () => {
    await fs.mkdir(f.deployRoot, { recursive: true });
    const manual = path.join(f.deployRoot, '001_a.pak');
    await fs.writeFile(manual, 'manual');
    const result = await f.manager.installMod(await f.zip('Aura', { 'a.pak': 'incoming' }));
    expect(result.success).toBe(false);
    expect(await fs.readFile(manual, 'utf8')).toBe('manual');
  });
  it('rejects packages whose files map to the same deployment target', async () => {
    const result = await f.manager.installMod(await f.zip('Aura', { 'A/a.pak': 'first', 'B/a.pak': 'second' }));
    expect(result.success).toBe(false);
    await expect(fs.stat(path.join(f.deployRoot, '001_a.pak'))).rejects.toMatchObject({ code: 'ENOENT' });
  });
});
