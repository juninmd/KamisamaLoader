import { expect, test } from '@playwright/test';
import fs from 'node:fs/promises';
import path from 'node:path';
import { launchHarness, expectFile, expectMissing, shot } from './support/electron-harness';
import { startIncrementalFixture } from './support/incremental-fixture';

test('installs and updates through real Electron IPC, preserving unchanged files and retrying only failures', async ({ browserName: _browserName }, info) => {
  const fixture = await startIncrementalFixture();
  const h = await launchHarness(fixture);
  const errors: string[] = [];
  h.page.on('pageerror', error => errors.push(error.message));
  try {
    const { page } = h;
    await page.getByRole('button', { name: 'My Mods' }).click();
    for (const name of ['Aura Celestial', 'Traje Alternativo']) {
      await page.getByRole('button', { name: 'Browse Online' }).click();
      await page.locator('.glass-card').filter({ hasText: name }).getByRole('button', { name: 'Download', exact: true }).click();
      await expect.poll(async () => (await page.evaluate(() => window.electronAPI.getDownloads())).filter(dl => dl.state === 'completed').length)
        .toBe(name === 'Aura Celestial' ? 1 : 2);
    }
    const before = await page.evaluate(() => window.electronAPI.getInstalledMods());
    const aura = before.find(mod => mod.name === 'Aura Celestial')!;
    const costume = before.find(mod => mod.name === 'Traje Alternativo')!;
    const unchanged = aura.deployedFiles!.find(file => file.endsWith('_same.pak'))!;
    const oldTime = new Date('2020-01-01');
    await fs.utimes(unchanged, oldTime, oldTime);
    const manual = path.join(path.dirname(unchanged), '999_manual.pak');
    await fs.writeFile(manual, 'manual mod');
    fixture.advance();
    await page.getByRole('button', { name: /^Atualizações/ }).click();
    await page.getByRole('button', { name: 'Verificar atualizações', exact: true }).click();
    await expect(page.getByRole('button', { name: 'Atualizar selecionados (2)' })).toBeEnabled();
    await shot(page, info, 'incremental-01-selection');
    await page.getByRole('button', { name: 'Atualizar selecionados (2)' }).click();
    await expect(page.getByText('Resultado do lote')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Tentar novamente os que falharam' })).toBeVisible();
    expect((await fs.stat(unchanged)).mtimeMs).toBe(oldTime.getTime());
    await expectFile(aura.deployedFiles!.find(file => file.endsWith('_changed.pak'))!, 'version-2');
    await expectMissing(aura.deployedFiles!.find(file => file.endsWith('_removed.pak'))!);
    await expectFile(costume.deployedFiles!.find(file => file.endsWith('_changed.pak'))!, 'version-1');
    await expectFile(manual, 'manual mod');
    await shot(page, info, 'incremental-02-partial-failure');
    const requestsBefore = fixture.requests.filter(url => url.endsWith('/5001-v2.zip')).length;
    fixture.repair();
    await page.getByRole('button', { name: 'Tentar novamente os que falharam' }).click();
    await expect(page.getByText('1 de 1 atualizados')).toBeVisible();
    expect(fixture.requests.filter(url => url.endsWith('/5001-v2.zip'))).toHaveLength(requestsBefore);
    const after = await page.evaluate(() => window.electronAPI.getInstalledMods());
    expect(after.every(mod => mod.version === '2' && !mod.hasUpdate)).toBe(true);
    await page.getByRole('button', { name: 'Verificar atualizações', exact: true }).click();
    await expect(page.getByText('Nenhuma atualização pendente')).toBeVisible();
    await shot(page, info, 'incremental-03-completed');
    await page.setViewportSize({ width: 800, height: 720 });
    await shot(page, info, 'incremental-04-compact');
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    expect(errors).toEqual([]);
  } finally { await h.close(); }
});
