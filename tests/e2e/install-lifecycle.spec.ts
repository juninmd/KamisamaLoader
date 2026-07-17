import { expect, test } from '@playwright/test';
import path from 'node:path';
import { expectFile, expectMissing, launchHarness, shot, type Harness } from './support/electron-harness';

let harness: Harness;

test.beforeEach(async () => { harness = await launchHarness(); });
test.afterEach(async () => { await harness.close(); });

async function browse() {
  await harness.page.getByRole('button', { name: 'My Mods' }).click();
  await harness.page.getByRole('button', { name: 'Browse Online' }).click();
  await expect(harness.page.getByText('E2E Aura Pack')).toBeVisible();
}

async function download(name: string) {
  const card = harness.page.locator('.glass-card').filter({ hasText: name });
  await card.getByRole('button', { name: 'Download', exact: true }).click();
}

test('homologates install lifecycle and hostile archives', async ({ browserName: _browserName }, info) => {
  const { page, deployed, modsDir } = harness;
  await browse();
  await download('E2E Aura Pack');
  await expect(page.getByText('PROGRESSING', { exact: true })).toBeVisible();
  await shot(page, info, '12-download-progress');
  await expect(page.getByText('COMPLETED', { exact: true })).toBeVisible();
  await expectFile(deployed, 'e2e-pak-fixture');
  await shot(page, info, '13-download-completed');

  await page.getByRole('button', { name: 'Installed' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Aura Pack' })).toBeVisible();
  await shot(page, info, '14-installed-enabled');
  await page.getByText('Enabled', { exact: true }).click();
  await expect(page.getByText('Disabled', { exact: true })).toBeVisible();
  await expectMissing(deployed);
  await shot(page, info, '15-installed-disabled');
  await page.getByText('Disabled', { exact: true }).click();
  await expectFile(deployed, 'e2e-pak-fixture');
  await shot(page, info, '16-installed-reenabled');

  await page.getByRole('button', { name: 'Browse Online' }).click();
  await download('Broken E2E Pack');
  await expect(page.getByText('FAILED', { exact: true })).toBeVisible();
  await shot(page, info, '17-corrupt-zip-rejected');
  await page.getByRole('button', { name: 'Browse Online' }).click();
  await download('Traversal E2E Pack');
  await expect(page.getByText('Unsafe archive path', { exact: false })).toBeVisible();
  await expectMissing(path.join(modsDir, 'x.pak'));
  await shot(page, info, '18-traversal-rejected');

  await page.getByRole('button', { name: 'Installed' }).click();
  page.once('dialog', dialog => dialog.accept());
  await page.getByRole('button', { name: 'Uninstall' }).click();
  await expect(page.getByRole('heading', { name: 'E2E Aura Pack' })).toHaveCount(0);
  await expectMissing(deployed);
  await shot(page, info, '19-uninstalled-clean');
});
