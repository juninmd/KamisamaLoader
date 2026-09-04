const fs = require('fs');
const content = `
sonar.projectKey=juninmd_KamisamaLoader
sonar.organization=juninmd
sonar.host.url=https://sonarcloud.io

# Exclude coverage reports and tests from duplication checking
sonar.cpd.exclusions=tests/**,coverage/**,**/*.test.ts,**/*.test.tsx,**/*.spec.ts
sonar.exclusions=tests/**,coverage/**,**/*.test.ts,**/*.test.tsx,**/*.spec.ts
`;

fs.writeFileSync('sonar-project.properties', content);
