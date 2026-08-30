import { _electron as electron, type ElectronApplication, type Page } from 'playwright';

export async function launchFuzzApp(): Promise<{ electronApp: ElectronApplication, window: Page }> {
    const electronApp = await electron.launch({
      args: ['.'],
      env: { ...process.env, NODE_ENV: 'test' }
    });
    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);
    return { electronApp, window };
}
