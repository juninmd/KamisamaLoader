const fs = require('fs');

const files = [
  'tests/e2e/fuzz.spec.ts',
  'tests/e2e/fuzz-extra.spec.ts',
  'tests/e2e/fuzz-even-more.spec.ts',
  'tests/e2e/fuzz-more.spec.ts',
  'tests/e2e/fuzz-tests-more.spec.ts',
  'tests/e2e/fuzz-extreme.spec.ts'
];

let baseCode = fs.readFileSync('tests/e2e/fuzz.spec.ts', 'utf8');
const searchString = `test.beforeEach(async () => {
    const context = await setupFuzzWindow();
    electronApp = context.electronApp;
    window = context.window;
  });

  test.afterEach(async () => {
    await electronApp.close();
  });`;

files.forEach(f => {
   let content = fs.readFileSync(f, 'utf8');
   if(content.includes(searchString)) {
      console.log(`${f} has the duplicate setup block.`);
   }
});
