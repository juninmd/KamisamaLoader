import { vi } from 'vitest';

// Extend legacy filesystem doubles with the async operations used by atomic writes.
// Real filesystem integration tests never enter this branch.
export async function completeFileSystemDouble() {
  const { default: fs } = await import('node:fs/promises');
  if (!vi.isMockFunction(fs.readFile)) return;
  const mocked = fs as unknown as Record<string, unknown>;
  if (!mocked.lstat || (vi.isMockFunction(mocked.lstat) && !mocked.lstat.getMockImplementation())) mocked.lstat = vi.fn().mockRejectedValue(Object.assign(new Error('Missing'), { code: 'ENOENT' }));
  if (!mocked.mkdtemp || (vi.isMockFunction(mocked.mkdtemp) && !mocked.mkdtemp.getMockImplementation())) mocked.mkdtemp = vi.fn(async (prefix: string) => `${prefix}fixture`);
  for (const name of ['rename', 'unlink', 'rm', 'mkdir', 'link', 'copyFile', 'writeFile']) {
    if (!mocked[name]) mocked[name] = vi.fn().mockResolvedValue(undefined);
    else if (vi.isMockFunction(mocked[name]) && !mocked[name].getMockImplementation()) {
      mocked[name].mockResolvedValue(undefined);
    }
  }
}
