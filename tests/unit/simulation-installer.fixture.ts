import { vi } from 'vitest';
import path from 'path';
import { execFile } from 'child_process';
const virtualFS: Record<string, string | Buffer> = {};
const virtualDirs: Set<string> = new Set();
const normalizePath = (p: string) => p.replace(/\\/g, '/');
const resetFS = () => {
    for (const key in virtualFS)
        delete virtualFS[key];
    virtualDirs.clear();
    virtualDirs.add('/game');
    virtualDirs.add('/game/SparkingZERO/Content/Paks/~mods');
    virtualDirs.add('/mods');
};
vi.mock('fs/promises', () => ({
    default: {
        mkdtemp: vi.fn(async (prefix) => { const dir = prefix + 'fixture'; virtualDirs.add(normalizePath(dir)); return dir; }),
        rename: vi.fn(async (from, to) => { virtualFS[normalizePath(to)] = virtualFS[normalizePath(from)]; delete virtualFS[normalizePath(from)]; }),
        lstat: vi.fn(async (p) => {
            const key = normalizePath(p);
            if (!virtualDirs.has(key) && virtualFS[key] === undefined)
                throw Object.assign(new Error('Missing'), { code: 'ENOENT' });
            return { isSymbolicLink: () => false, isDirectory: () => virtualDirs.has(key), isFile: () => virtualFS[key] !== undefined, size: 1024 };
        }),
        mkdir: vi.fn(async (p, opts) => {
            const normalized = normalizePath(p);
            virtualDirs.add(normalized);
        }),
        readFile: vi.fn(async (p) => {
            const normalized = normalizePath(p);
            if (virtualFS[normalized] !== undefined)
                return virtualFS[normalized];
            throw Object.assign(new Error(`Missing: ${p}`), { code: 'ENOENT' });
        }),
        writeFile: vi.fn(async (p, data) => {
            const normalized = normalizePath(p);
            virtualFS[normalized] = data;
        }),
        unlink: vi.fn(async (p) => {
            const normalized = normalizePath(p);
            if (virtualFS[normalized])
                delete virtualFS[normalized];
            else
                throw Object.assign(new Error('Missing'), { code: 'ENOENT' });
        }),
        link: vi.fn(async (src, dest) => {
            const nSrc = normalizePath(src);
            const nDest = normalizePath(dest);
            if (virtualFS[nSrc] === undefined)
                throw new Error('ENOENT: src not found');
            virtualFS[nDest] = virtualFS[nSrc];
        }),
        copyFile: vi.fn(async (src, dest) => {
            const nSrc = normalizePath(src);
            const nDest = normalizePath(dest);
            if (virtualFS[nSrc] === undefined)
                throw new Error('ENOENT: src not found');
            virtualFS[nDest] = virtualFS[nSrc];
        }),
        stat: vi.fn(async (p) => {
            const normalized = normalizePath(p);
            if (virtualDirs.has(normalized))
                return { isDirectory: () => true, size: 0 };
            if (virtualFS[normalized] !== undefined)
                return { isDirectory: () => false, size: 1024 };
            throw new Error(`ENOENT: no such file or directory, stat '${p}'`);
        }),
        readdir: vi.fn(async (p, options) => {
            const normalized = normalizePath(p);
            const entries = new Set<string>();
            for (const file of Object.keys(virtualFS)) {
                if (file.startsWith(normalized + '/') && file.lastIndexOf('/') === normalized.length) {
                    entries.add(path.basename(file));
                }
            }
            Object.keys(virtualFS).forEach(f => {
                if (f.startsWith(normalized + '/')) {
                    const relative = f.slice(normalized.length + 1);
                    const parts = relative.split('/');
                    entries.add(parts[0]);
                }
            });
            virtualDirs.forEach(d => {
                if (d.startsWith(normalized + '/') && d !== normalized) {
                    const relative = d.slice(normalized.length + 1);
                    const parts = relative.split('/');
                    entries.add(parts[0]);
                }
            });
            return Array.from(entries).map(name => options?.withFileTypes ? { name,
                isDirectory: () => virtualDirs.has(normalized + '/' + name),
                isFile: () => virtualFS[normalized + '/' + name] !== undefined, isSymbolicLink: () => false } : name);
        }),
        rm: vi.fn(async (p, opts) => {
            const normalized = normalizePath(p);
            Object.keys(virtualFS).forEach(k => {
                if (k.startsWith(normalized))
                    delete virtualFS[k];
            });
            virtualDirs.forEach(d => {
                if (d.startsWith(normalized))
                    virtualDirs.delete(d);
            });
        }),
        cp: vi.fn(async (src, dest) => {
            const source = normalizePath(src), target = normalizePath(dest);
            for (const key of Object.keys(virtualFS)) {
                if (key.startsWith(source)) virtualFS[target + key.slice(source.length)] = virtualFS[key];
            }
        }),
        access: vi.fn(async (p) => {
            const normalized = normalizePath(p);
            if (virtualFS[normalized] || virtualDirs.has(normalized))
                return;
            throw new Error('ENOENT');
        })
    }
}));
vi.mock('node:fs', () => ({ createReadStream: (file: string) => (async function* () { yield Buffer.from(virtualFS[normalizePath(file)]); })() }));
vi.mock('electron', () => ({
    app: { getPath: () => '/mock/app/path', isPackaged: false },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn() }
}));
vi.mock('child_process', () => ({
    execFile: vi.fn()
}));
vi.mock('../../electron/github', () => ({
    fetchLatestRelease: vi.fn()
}));
vi.mock('adm-zip', () => {
    return {
        default: vi.fn(function (buffer) {
            return {
                getEntries: vi.fn(() => []),
                extractAllToAsync: vi.fn((dest, overwrite, keep, cb) => {
                    const normalizedDest = normalizePath(dest);
                    virtualFS[`${normalizedDest}/mod_file.pak`] = 'dummy content';
                    cb(null);
                })
            };
        })
    };
});
export { virtualFS, virtualDirs, normalizePath, resetFS };
