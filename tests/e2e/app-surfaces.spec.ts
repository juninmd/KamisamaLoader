import { expect, test } from '@playwright/test';
import { launchHarness, shot, type Harness } from './support/electron-harness';

let harness: Harness;

test.beforeEach(async () => { harness = await launchHarness(); });
test.afterEach(async () => { await harness.close(); });

test('homologates navigation, settings and profiles', async ({ browserName: _browserName }, info) => {
  const { page, root, modsDir } = harness;
  await expect(page.getByRole('heading', { name: /SPARKING!/ })).toBeVisible();
  await expect(page.getByText('System Online')).toBeVisible();
  const hero = page.getByTestId('dashboard-hero');
  const artwork = page.getByTestId('hero-artwork');
  await expect(artwork).toHaveJSProperty('complete', true);
  await expect.poll(() => artwork.evaluate(image => (image as HTMLImageElement).naturalWidth)).toBeGreaterThan(0);
  const heroBox = await hero.boundingBox();
  const artworkBox = await artwork.boundingBox();
  const launchBox = await page.getByRole('button', { name: 'LAUNCH GAME' }).boundingBox();
  expect(heroBox && artworkBox && launchBox).toBeTruthy();
  expect(artworkBox!.y).toBeGreaterThanOrEqual(heroBox!.y);
  expect(artworkBox!.y + artworkBox!.height).toBeLessThanOrEqual(heroBox!.y + heroBox!.height);
  expect(launchBox!.y + launchBox!.height).toBeLessThan(heroBox!.y + heroBox!.height);
  await expect(page.getByRole('img', { name: /placeholder/ })).toHaveCount(3);
  await shot(page, info, '01-dashboard');

  await page.getByRole('button', { name: 'Settings' }).click();
  await expect(page.getByRole('heading', { name: 'Settings' })).toBeVisible();
  await expect(page.getByPlaceholder('Path to Dragon Ball: Sparking! ZERO executable'))
    .toHaveValue(`${root}/SparkingZERO.exe`);
  await expect(page.getByPlaceholder('Default internal directory')).toHaveValue(modsDir);
  await shot(page, info, '02-settings');

  await page.getByRole('button', { name: 'Show Advanced Settings' }).click();
  const launchArgs = page.getByPlaceholder('-dx11 -windowed');
  await launchArgs.fill('-dx11 -windowed');
  await expect.poll(() => page.evaluate(() => window.electronAPI.getSettings()))
    .toMatchObject({ launchArgs: '-dx11 -windowed' });
  await shot(page, info, '03-settings-advanced');

  await page.getByRole('button', { name: 'My Mods' }).click();
  await expect(page.getByRole('button', { name: 'Installed' })).toBeVisible();
  await shot(page, info, '04-installed-empty');
  await page.getByTitle('Manage Mod Profiles').click();
  await expect(page.getByText('No profiles saved.')).toBeVisible();
  await shot(page, info, '05-profile-menu');
  await page.getByTitle('Create New Profile').click();
  await page.getByPlaceholder('Profile Name...').fill('QA Loadout');
  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page.getByText('QA Loadout')).toBeVisible();
  await expect(page.getByText('Profile saved successfully')).toBeVisible();
  await shot(page, info, '06-profile-created');
});

test('homologates catalog, search, filters and details', async ({ browserName: _browserName }, info) => {
  const { page, fixture } = harness;
  await page.getByRole('button', { name: 'My Mods' }).click();
  await page.getByRole('button', { name: 'Browse Online' }).click();
  await expect(page.getByText('E2E Aura Pack')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Categories' })).toBeVisible();
  await shot(page, info, '07-catalog');

  const search = page.getByPlaceholder('Search online mods...');
  await search.fill('Traversal');
  await expect(page.getByText('Traversal E2E Pack')).toBeVisible();
  await expect(page.getByText('E2E Aura Pack')).toHaveCount(0);
  await shot(page, info, '08-search');
  await search.clear();
  await expect(page.getByText('E2E Aura Pack')).toBeVisible();

  await page.getByText('Aura', { exact: true }).first().click();
  await expect.poll(() => fixture.requests.some(request =>
    request.includes('Generic_Category') && request.includes('101')
  )).toBe(true);
  await expect(page.getByText('Traversal E2E Pack')).toHaveCount(0);
  await shot(page, info, '09-category-filter');

  await page.getByRole('button', { name: 'Most Recent' }).click();
  await page.getByRole('button', { name: 'Most Downloaded' }).click();
  await page.getByRole('button', { name: 'All Time' }).click();
  await page.getByRole('button', { name: 'Last Month' }).click();
  await page.getByRole('button', { name: 'NSFW' }).click();
  await shot(page, info, '10-sort-date-content-filters');

  await page.getByText('E2E Aura Pack').click();
  await expect(page.getByText('Hermetic details for E2E Aura Pack')).toBeVisible();
  await expect(page.getByText('0 views')).toBeVisible();
  await expect(page.getByRole('img', { name: 'E2E Aura Pack placeholder' }).last()).toBeVisible();
  await shot(page, info, '11-mod-details');
});
