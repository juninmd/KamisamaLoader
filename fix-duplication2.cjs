const fs = require('fs');

const file1 = 'tests/e2e/fuzz.spec.ts';
const file2 = 'tests/e2e/fuzz-extra.spec.ts';

// Combine fuzzing files to reduce boilerplate and thus reduce duplication percentage?
// Actually, SonarCloud flags code duplication. Having identical `test.beforeEach` and `test.afterEach` blocks in 6 different files is likely what triggered it.
// We can extract a custom test instance with playwright.

console.log('Extracting custom test fixture to tests/e2e/support/fuzz-test.ts');
