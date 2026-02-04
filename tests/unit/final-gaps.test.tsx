// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from './test-utils';
import Dashboard from '../../src/pages/Dashboard';
import { ModManager } from '../../electron/mod-manager';
import fs from 'fs/promises';
import { execFile } from 'child_process';

// Hoist the mocks so they are available before imports
const fsMocks = vi.hoisted(() => ({
    readFile: vi.fn(),
    writeFile: vi.fn(),
    mkdir: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    access: vi.fn(),
    rm: vi.fn(),
    unlink: vi.fn(),
    link: vi.fn(),
    copyFile: vi.fn()
}));

const cpMocks = vi.hoisted(() => ({
    execFile: vi.fn()
}));

// Mock Dependencies
vi.mock('../../electron/api-cache', () => ({
    getAPICache: () => ({ get: vi.fn(), set: vi.fn() })
}));
vi.mock('electron', () => ({
    app: { getPath: () => '/tmp', isPackaged: false },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn(), showItemInFolder: vi.fn() },
    BrowserWindow: class { webContents = { send: vi.fn() } }
}));

// Mock fs/promises using the hoisted object
vi.mock('fs/promises', () => ({
    default: fsMocks
}));

vi.mock('child_process', () => ({
    execFile: cpMocks.execFile,
    default: { execFile: cpMocks.execFile }
}));

describe('Final Coverage Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Reset default mock implementations
        fsMocks.readFile.mockResolvedValue('{}');
        fsMocks.stat.mockResolvedValue({ isDirectory: () => false, size: 100 });
        fsMocks.readdir.mockResolvedValue([]);
    });

    describe('Dashboard.tsx', () => {
        it('should handle API errors gracefully during load', async () => {
            (window.electronAPI.getInstalledMods as any).mockRejectedValue(new Error('Fail'));
            // Ensure other calls don't crash if they run in parallel or sequence
            (window.electronAPI.checkForUpdates as any).mockResolvedValue([]);
            (window.electronAPI.fetchFeaturedMods as any).mockResolvedValue([]);

            renderWithProviders(<Dashboard />);

            await waitFor(() => {
                // It should render the static parts even if data load fails
                expect(screen.getByText('System Status')).toBeInTheDocument();
            });
        });

        it('should render active mods and updates available', async () => {
            (window.electronAPI.getInstalledMods as any).mockResolvedValue([
                { id: '1', isEnabled: true }, { id: '2', isEnabled: false }
            ]);
            (window.electronAPI.checkForUpdates as any).mockResolvedValue(['1']);
            (window.electronAPI.fetchFeaturedMods as any).mockResolvedValue([
                { id: '10', name: 'Cool Mod', downloadCount: 100, viewCount: 50, author: 'Author', category: 'Misc', iconUrl: 'img' }
            ]);

            const onNavigate = vi.fn();
            renderWithProviders(<Dashboard onNavigate={onNavigate} />);

            await waitFor(() => {
                expect(screen.getByText('1 Updates Available')).toBeInTheDocument();
                expect(screen.getByText('Cool Mod')).toBeInTheDocument();
            });

            // Click Update Banner
            fireEvent.click(screen.getByText('1 Updates Available'));
            expect(onNavigate).toHaveBeenCalledWith('mods');
        });

        it('should handle launch game interaction', async () => {
             (window.electronAPI.getInstalledMods as any).mockResolvedValue([]);
             (window.electronAPI.checkForUpdates as any).mockResolvedValue([]);
             (window.electronAPI.fetchFeaturedMods as any).mockResolvedValue([]);
             (window.electronAPI.launchGame as any).mockResolvedValue(true);

             renderWithProviders(<Dashboard />);

             const launchBtn = screen.getByText('LAUNCH GAME');
             fireEvent.click(launchBtn);

             await waitFor(() => expect(screen.getByText('INITIALIZING...')).toBeInTheDocument());
             expect(window.electronAPI.launchGame).toHaveBeenCalled();
        });

        it('should handle launch game error', async () => {
             (window.electronAPI.getInstalledMods as any).mockResolvedValue([]);
             (window.electronAPI.checkForUpdates as any).mockResolvedValue([]);
             (window.electronAPI.fetchFeaturedMods as any).mockResolvedValue([]);
             (window.electronAPI.launchGame as any).mockRejectedValue(new Error('Launch Fail'));

             const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
             renderWithProviders(<Dashboard />);

             const launchBtn = screen.getByText('LAUNCH GAME');
             fireEvent.click(launchBtn);

             await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
        });
    });

    describe('ModManager.ts Gaps', () => {
        it('should handle getSettings file read error', async () => {
            const mgr = new ModManager();
            fsMocks.readFile.mockRejectedValue(new Error('Fail'));
            const settings = await mgr.getSettings();
            expect(settings).toEqual({ gamePath: '' });
        });

        it('should handle calculateFolderSize recursion error', async () => {
            const mgr = new ModManager();
            fsMocks.readdir.mockResolvedValue(['a']);
            fsMocks.stat.mockRejectedValue(new Error('Stat fail'));
            const size = await mgr.calculateFolderSize('/path');
            expect(size).toBe(0);
        });

        it('should handle launchGame with directory containing no exe', async () => {
             const mgr = new ModManager();

             // We mock the internal getSettings call by spying on the instance
             // BUT ModManager calls fs.readFile for getSettings.
             // We can just mock fs.readFile to return the settings we want
             fsMocks.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/dir' }));

             // Mock stat to say it is a directory
             fsMocks.stat.mockImplementation(async () => ({ isDirectory: () => true }));

             // Mock access to fail (simulating no exe found)
             fsMocks.access.mockRejectedValue(new Error('No exe'));

             await expect(mgr.launchGame()).rejects.toThrow('Could not find SparkingZERO.exe');
        });

        it('should launch game with launch args', async () => {
             const mgr = new ModManager();
             fsMocks.readFile.mockResolvedValue(JSON.stringify({ gamePath: '/game.exe', launchArgs: '-dx12' }));
             fsMocks.stat.mockImplementation(async () => ({ isDirectory: () => false }));

             await mgr.launchGame();

             expect(cpMocks.execFile).toHaveBeenCalledWith(
                 expect.any(String),
                 expect.arrayContaining(['-fileopenlog', '-dx12']),
                 expect.anything(),
                 expect.anything()
             );
        });
    });
});
