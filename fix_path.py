import re
with open('tests/unit/rate-limit.test.ts', 'r') as f:
    content = f.read()

content = content.replace("import { fetchCategories } from '../../electron/gamebanana';", """import { fetchCategories } from '../../electron/gamebanana';
import { vi } from 'vitest';

vi.mock('electron', () => ({
    app: { getPath: vi.fn(() => '/userData') }
}));

vi.mock('fs/promises', () => ({
    default: {
        readFile: vi.fn().mockResolvedValue('{}'),
        writeFile: vi.fn(),
        mkdir: vi.fn(),
        unlink: vi.fn()
    }
}));""")

with open('tests/unit/rate-limit.test.ts', 'w') as f:
    f.write(content)
