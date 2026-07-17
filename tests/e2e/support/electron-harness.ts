import { expect, type Page, type TestInfo } from '@playwright/test';
import { _electron as electron, type ElectronApplication } from 'playwright';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { startFixture, type Fixture } from './gamebanana-fixture';

export type Harness = {
  app: ElectronApplication;
  page: Page;
  fixture: Fixture;
  root: string;
  modsDir: string;
  deployed: string;
  close: () => Promise<void>;
};

export async function launchHarness(): Promise<Harness> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'kamisama-e2e-'));
  const gameExe = path.join(root, 'SparkingZERO.exe');
  const modsDir = path.join(root, 'Mods');
  const fixture = await startFixture();
  await fs.writeFile(gameExe, 'fixture');
  const hook = path.resolve('tests/e2e/fetch-hook.cjs').replaceAll('\\', '/');
  const app = await electron.launch({
    args: ['-r', hook, path.resolve('dist-electron/electron/main.js'), `--user-data-dir=${path.join(root, 'UserData')}`],
    env: { ...process.env, NODE_ENV: 'test', KAMISAMA_E2E_API_URL: fixture.baseUrl },
  });
  const page = await app.firstWindow();
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(async ({ gamePath, storagePath }) => {
    await window.electronAPI.saveSettings({ gamePath, modDownloadPath: storagePath });
  }, { gamePath: gameExe, storagePath: modsDir });
  await page.reload();
  await page.waitForLoadState('domcontentloaded');
  return {
    app,
    page,
    fixture,
    root,
    modsDir,
    deployed: path.join(root, 'SparkingZERO', 'Content', 'Paks', '~mods', '001_awesome.pak'),
    close: async () => {
      await app.close();
      await fixture.close();
      await fs.rm(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 200 });
    },
  };
}

export async function shot(page: Page, info: TestInfo, name: string) {
  const output = path.resolve('tests/evidence/homologation', `${name}.png`);
  await fs.mkdir(path.dirname(output), { recursive: true });
  await page.screenshot({ path: output, fullPage: true, animations: 'disabled' });
  await info.attach(name, { path: output, contentType: 'image/png' });
}

export async function expectFile(file: string, body: string) {
  await expect.poll(async () => fs.readFile(file, 'utf8').catch(() => '')).toBe(body);
}

export async function expectMissing(file: string) {
  await expect.poll(async () => fs.readFile(file).catch(() => null)).toBeNull();
}
