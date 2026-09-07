import { test as base, _electron as electron, type Page, type ElectronApplication } from '@playwright/test';

type FuzzTestFixtures = {
  window: Page;
  electronApp: ElectronApplication;
};

export const test = base.extend<FuzzTestFixtures>({
  electronApp: async ({}, use) => {
    const app = await electron.launch({
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    await use(app);
    await app.close();
  },
  window: async ({ electronApp }, use) => {
    const win = await electronApp.firstWindow();
    await win.waitForLoadState('domcontentloaded');
    await win.waitForTimeout(2000);
    await use(win);
  }
});

export { expect } from '@playwright/test';
