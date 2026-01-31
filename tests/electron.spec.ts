import { test, expect } from '@playwright/test';
import { _electron as electron, ElectronApplication } from 'playwright';
import path from 'path';
import { fileURLToPath } from 'url';

// Fix __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let electronApp: ElectronApplication;

test.beforeAll(async () => {
    const mainScriptPath = path.join(__dirname, '../dist-electron/main.js');
    console.log('Launching Electron with main script:', mainScriptPath);

    // Launch Electron app.
    electronApp = await electron.launch({
        args: [path.join(__dirname, '../dist-electron/main.cjs')],
        // Add debugging environment variable if needed
        env: {
            ...process.env,
            // NODE_ENV: 'test' 
        },
        timeout: 30000 // Explicit launch timeout
    });
});

test.afterAll(async () => {
    if (electronApp) {
        await electronApp.close();
    }
});

test('Application launch', async () => {
    // Evaluation expression in the Electron context.
    const appPath = await electronApp.evaluate(async ({ app }) => {
        // This runs in the main Electron process, parameter here is always
        // the result of the require('electron') in the main app script.
        return app.getAppPath();
    });
    console.log('App Path:', appPath);
    expect(appPath).toBeTruthy();
});

test('Window title', async () => {
    const window = await electronApp.firstWindow();
    const title = await window.title();
    // Expect title to be 'Kamisama Loader' or whatever is set in index.html
    // Verify what your final title is
    console.log(`Window title: ${title}`);
    // expect(title).toContain('Kamisama'); 
    // Adjust expectation based on actual title
});

test('Screenshot', async () => {
    const window = await electronApp.firstWindow();
    await window.screenshot({ path: 'tests/startup-screenshot.png' });
});
