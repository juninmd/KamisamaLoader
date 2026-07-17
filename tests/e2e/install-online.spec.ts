import { test, expect } from '@playwright/test';
import { _electron as electron } from 'playwright';
import AdmZip from 'adm-zip';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';

test('user downloads and installs a GameBanana mod', async () => {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kamisama-e2e-'));
  const gameExe = path.join(root, 'SparkingZERO.exe');
  const modsDir = path.join(root, 'Mods');
  const zip = new AdmZip();
  zip.addFile('AuraPack/awesome.pak', Buffer.from('e2e-pak-fixture'));
  const archive = zip.toBuffer();
  const unsafeZip = new AdmZip();
  unsafeZip.addFile('safe.pak', Buffer.from('must-not-escape'));
  const unsafeArchive = unsafeZip.toBuffer();
  const safeName = Buffer.from('safe.pak');
  const unsafeName = Buffer.from('../x.pak');
  for (let offset = unsafeArchive.indexOf(safeName); offset >= 0; offset = unsafeArchive.indexOf(safeName, offset + 1)) {
    unsafeName.copy(unsafeArchive, offset);
  }
  const requests: string[] = [];

  const server = http.createServer((request, response) => {
    const url = new URL(request.url ?? '/', 'http://localhost');
    requests.push(url.pathname);
    response.setHeader('Content-Type', 'application/json');
    if (url.pathname.endsWith('/Game/21179/Subfeed')) {
      response.end(JSON.stringify({ _aRecords: [
        { _idRow: 4242, _sName: 'E2E Aura Pack', _sVersion: '2.0',
          _aSubmitter: { _sName: 'Kamisama QA' }, _aRootCategory: { _sName: 'Aura' } },
        { _idRow: 4343, _sName: 'Broken E2E Pack', _sVersion: '1.0',
          _aSubmitter: { _sName: 'Kamisama QA' }, _aRootCategory: { _sName: 'Aura' } },
        { _idRow: 4444, _sName: 'Traversal E2E Pack', _sVersion: '1.0',
          _aSubmitter: { _sName: 'Kamisama QA' }, _aRootCategory: { _sName: 'Security' } },
      ] }));
    } else if (url.pathname.endsWith('/Game/21179/ProfilePage')) {
      response.end(JSON.stringify({ _aModRootCategories: [] }));
    } else if (url.pathname.endsWith('/Mod/4242/ProfilePage')) {
      response.end(JSON.stringify({
        _sName: 'E2E Aura Pack', _sVersion: '2.0', _sText: 'Hermetic fixture',
        _aSubmitter: { _sName: 'Kamisama QA' },
        _aFiles: [{ _idRow: 7, _sDownloadUrl: `${baseUrl}/fixture.zip` }],
      }));
    } else if (url.pathname.endsWith('/Mod/4343/ProfilePage')) {
      response.end(JSON.stringify({
        _sName: 'Broken E2E Pack', _sVersion: '1.0', _sText: 'Invalid archive fixture',
        _aSubmitter: { _sName: 'Kamisama QA' },
        _aFiles: [{ _idRow: 8, _sDownloadUrl: `${baseUrl}/broken.zip` }],
      }));
    } else if (url.pathname.endsWith('/Mod/4444/ProfilePage')) {
      response.end(JSON.stringify({
        _sName: 'Traversal E2E Pack', _sVersion: '1.0', _sText: 'Traversal fixture',
        _aSubmitter: { _sName: 'Kamisama QA' },
        _aFiles: [{ _idRow: 9, _sDownloadUrl: `${baseUrl}/unsafe.zip` }],
      }));
    } else if (url.pathname.endsWith('/Mod/4242/Updates')) {
      response.end('[]');
    } else if (url.pathname === '/fixture.zip') {
      response.setHeader('Content-Type', 'application/zip');
      response.setHeader('Content-Length', archive.length);
      response.end(archive);
    } else if (url.pathname === '/broken.zip') {
      response.setHeader('Content-Type', 'application/zip');
      response.end('not-a-zip');
    } else if (url.pathname === '/unsafe.zip') {
      response.setHeader('Content-Type', 'application/zip');
      response.end(unsafeArchive);
    } else {
      response.statusCode = 404;
      response.end('{}');
    }
  });

  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Fixture server failed');
  const baseUrl = `http://127.0.0.1:${address.port}`;
  await fs.writeFile(gameExe, 'fixture');

  const hook = path.resolve('tests/e2e/fetch-hook.cjs').replaceAll('\\', '/');
  const app = await electron.launch({
    args: ['-r', hook, path.resolve('dist-electron/electron/main.js'), `--user-data-dir=${path.join(root, 'UserData')}`],
    env: { ...process.env, NODE_ENV: 'test', KAMISAMA_E2E_API_URL: baseUrl },
  });

  try {
    const page = await app.firstWindow();
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(async ({ gamePath, storagePath }) => {
      await window.electronAPI.saveSettings({ gamePath, modDownloadPath: storagePath });
    }, { gamePath: gameExe, storagePath: modsDir });

    await page.getByRole('button', { name: 'Mods' }).click();
    await page.getByRole('button', { name: 'Browse Online' }).click();
    await expect.poll(() => requests).toContain('/apiv11/Game/21179/Subfeed');
    const valid = page.locator('.glass-card').filter({ hasText: 'E2E Aura Pack' });
    await expect(valid).toBeVisible();
    await valid.getByRole('button', { name: 'Download', exact: true }).click();
    await expect(page.getByText('COMPLETED')).toBeVisible();

    const deployed = path.join(root, 'SparkingZERO', 'Content', 'Paks', '~mods', '001_awesome.pak');
    await expect.poll(async () => fs.readFile(deployed, 'utf8').catch(() => '')).toBe('e2e-pak-fixture');
    await page.getByRole('button', { name: 'Installed' }).click();
    await expect(page.getByRole('heading', { name: 'E2E Aura Pack' })).toBeVisible();
    await page.getByText('Enabled', { exact: true }).click();
    await expect(page.getByText('Disabled', { exact: true })).toBeVisible();
    await expect.poll(async () => fs.readFile(deployed).catch(() => null)).toBeNull();
    await page.getByText('Disabled', { exact: true }).click();
    await expect(page.getByText('Enabled', { exact: true })).toBeVisible();
    await expect.poll(async () => fs.readFile(deployed, 'utf8').catch(() => '')).toBe('e2e-pak-fixture');

    await page.getByRole('button', { name: 'Browse Online' }).click();
    const broken = page.locator('.glass-card').filter({ hasText: 'Broken E2E Pack' });
    await broken.getByRole('button', { name: 'Download', exact: true }).click();
    await expect(page.getByText('FAILED', { exact: true })).toBeVisible();
    await page.getByRole('button', { name: 'Installed' }).click();
    await expect(page.getByRole('heading', { name: 'Broken E2E Pack' })).toHaveCount(0);

    await page.getByRole('button', { name: 'Browse Online' }).click();
    const traversal = page.locator('.glass-card').filter({ hasText: 'Traversal E2E Pack' });
    await traversal.getByRole('button', { name: 'Download', exact: true }).click();
    await expect(page.getByText('Unsafe archive path', { exact: false })).toBeVisible();
    await expect.poll(async () => fs.readFile(path.join(modsDir, 'x.pak')).catch(() => null)).toBeNull();

    await page.getByRole('button', { name: 'Installed' }).click();
    page.once('dialog', dialog => dialog.accept());
    await page.getByRole('button', { name: 'Uninstall' }).click();
    await expect(page.getByRole('heading', { name: 'E2E Aura Pack' })).toHaveCount(0);
    await expect.poll(async () => fs.readFile(deployed).catch(() => null)).toBeNull();
  } finally {
    await app.close();
    await new Promise<void>((resolve) => server.close(() => resolve()));
    await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
  }
});
