import { expect, test } from '@playwright/test';
import AdmZip from 'adm-zip';
import fs from 'node:fs/promises';
import path from 'node:path';
import { expectFile, expectMissing, launchHarness, shot, type Harness } from './support/electron-harness';

let harness: Harness;

test.beforeEach(async () => { harness = await launchHarness(); });
test.afterEach(async () => { await harness.close(); });

/** Builds a mod zip inside the harness root and installs it through the app. */
async function installZip(name: string, entries: Record<string, string>) {
  const zip = new AdmZip();
  for (const [entry, body] of Object.entries(entries)) {
    zip.addFile(entry, Buffer.from(body));
  }
  const zipPath = path.join(harness.root, `${name}.zip`);
  await fs.writeFile(zipPath, zip.toBuffer());

  const result = await harness.page.evaluate(
    file => window.electronAPI.installMod(file),
    zipPath
  );
  expect(result.success, result.message).toBe(true);
  return zipPath;
}

async function paks() {
  const paksDir = path.join(harness.root, 'SparkingZERO', 'Content', 'Paks', '~mods');
  return (await fs.readdir(paksDir).catch(() => [])).sort();
}

async function openMods() {
  await harness.page.reload();
  await harness.page.waitForLoadState('domcontentloaded');
  await harness.page.getByRole('button', { name: 'My Mods' }).click();
}

test('homologates repairing mods wiped by a game update', async ({ browserName: _browserName }, info) => {
  const { page, root } = harness;
  await installZip('RepairMe', { 'repair.pak': 'repair-fixture' });
  const deployed = path.join(root, 'SparkingZERO', 'Content', 'Paks', '~mods', '001_repair.pak');
  await expectFile(deployed, 'repair-fixture');

  // What a game patch or a Steam file validation does to ~mods
  await fs.rm(path.dirname(deployed), { recursive: true, force: true });
  await expectMissing(deployed);
  await openMods();
  await shot(page, info, '20-deployment-wiped');

  await page.getByRole('button', { name: 'Repair Mods' }).click();
  await expect(page.getByText('Re-deployed 1 mod(s) to the game folder')).toBeVisible();
  await expectFile(deployed, 'repair-fixture');
  await shot(page, info, '21-deployment-repaired');
});

test('homologates load order changes redeploying paks', async ({ browserName: _browserName }, info) => {
  const { page } = harness;
  await installZip('OrderA', { 'alpha.pak': 'alpha-fixture' });
  await installZip('OrderB', { 'beta.pak': 'beta-fixture' });

  await openMods();
  expect(await paks()).toEqual(['001_alpha.pak', '002_beta.pak']);
  await shot(page, info, '22-load-order-before');

  const before = await page.evaluate(() => window.electronAPI.getInstalledMods());
  expect(before.map(mod => mod.name)).toEqual(['OrderB', 'OrderA']);

  // Drop OrderA on top: the grid hands the full order back to setModOrder
  const reordered = [...before].reverse().map(mod => mod.id);
  expect(await page.evaluate(ids => window.electronAPI.setModOrder(ids), reordered)).toBe(true);

  await openMods();
  const after = await page.evaluate(() => window.electronAPI.getInstalledMods());
  expect(after.map(mod => mod.name)).toEqual(['OrderA', 'OrderB']);
  expect(await paks()).toEqual(['001_beta.pak', '002_alpha.pak']);
  await shot(page, info, '23-load-order-after');
});

test('homologates loose file mods deployed outside a pak', async ({ browserName: _browserName }, info) => {
  const { page, root } = harness;
  await installZip('LooseMedia', {
    'intro.usm': 'movie-fixture',
    'Splash.bmp': 'splash-fixture',
    'Content/Chara/skin.uasset': 'asset-fixture',
  });

  const contentDir = path.join(root, 'SparkingZERO', 'Content');
  await expectFile(path.join(contentDir, 'Movies', 'intro.usm'), 'movie-fixture');
  await expectFile(path.join(contentDir, 'Splash', 'Splash.bmp'), 'splash-fixture');
  await expectFile(path.join(contentDir, 'Chara', 'skin.uasset'), 'asset-fixture');

  await openMods();
  await expect(page.getByRole('heading', { name: 'LooseMedia' })).toBeVisible();
  await shot(page, info, '24-loose-files-installed');

  // Disabling a loose mod pulls every file back out of the game folder
  await page.getByText('Enabled', { exact: true }).click();
  await expectMissing(path.join(contentDir, 'Movies', 'intro.usm'));
  await expectMissing(path.join(contentDir, 'Chara', 'skin.uasset'));
  await shot(page, info, '25-loose-files-disabled');
});

test('homologates the built-in GameBanana browser window', async ({ browserName: _browserName }, info) => {
  const { app, page } = harness;
  await page.getByRole('button', { name: 'My Mods' }).click();
  await shot(page, info, '26-gamebanana-button');

  const opened = app.waitForEvent('window');
  await page.getByRole('button', { name: 'GameBanana' }).click();
  await opened;

  const urls = () => app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows().map(window => window.webContents.getURL()));
  await expect.poll(urls).toContainEqual(expect.stringContaining('gamebanana.com'));

  // Clicking again focuses the existing window instead of stacking new ones
  await page.getByRole('button', { name: 'GameBanana' }).click();
  expect((await urls()).length).toBe(2);
});
