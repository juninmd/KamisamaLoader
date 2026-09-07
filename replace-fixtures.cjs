const fs = require('fs');

const files = [
  'tests/e2e/fuzz.spec.ts',
  'tests/e2e/fuzz-extra.spec.ts',
  'tests/e2e/fuzz-even-more.spec.ts',
  'tests/e2e/fuzz-more.spec.ts',
  'tests/e2e/fuzz-tests-more.spec.ts',
  'tests/e2e/fuzz-extreme.spec.ts'
];

files.forEach(f => {
  let content = fs.readFileSync(f, 'utf8');

  // Replace import
  content = content.replace(
    /import \{ test, expect \} from '@playwright\/test';\nimport \{ setupFuzzWindow \} from '\.\/support\/electron-harness';/,
    `import { test, expect } from './support/fuzz-test';`
  );

  // Remove variables
  content = content.replace(/  let electronApp: any;\n  let window: any;\n\n/g, '');

  // Remove beforeEach and afterEach
  const setupBlock = `  test.beforeEach(async () => {
    const context = await setupFuzzWindow();
    electronApp = context.electronApp;
    window = context.window;
  });

  test.afterEach(async () => {
    await electronApp.close();
  });\n\n`;
  content = content.replace(setupBlock, '');

  // Replace test signature
  content = content.replace(/test\('([^']+)', async \(\) => \{/g, `test('$1', async ({ window }) => {`);

  fs.writeFileSync(f, content);
  console.log(`Updated ${f}`);
});
