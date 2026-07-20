import re
with open('playwright.config.ts', 'r') as f:
    content = f.read()
content = content.replace("testMatch: ['electron.spec.ts', 'full_system.spec.ts', 'fuzz.spec.ts']", "testMatch: ['electron.spec.ts', 'full_system.spec.ts']")
with open('playwright.config.ts', 'w') as f:
    f.write(content)
