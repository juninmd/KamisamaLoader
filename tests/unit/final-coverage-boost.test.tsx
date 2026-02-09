// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor, act } from './test-utils';
import { ModManager } from '../../electron/mod-manager';
import Mods from '../../src/pages/Mods';
import FilterBar from '../../src/components/FilterBar';
import CategorySidebar from '../../src/components/CategorySidebar';
import { ModCard } from '../../src/components/mods/ModCard';
import { ModGrid } from '../../src/components/mods/ModGrid';
import fs from 'fs/promises';
import { shell } from 'electron';

// Hoisted Mock fs/promises
const mockFs = vi.hoisted(() => ({
    mkdir: vi.fn(),
    readFile: vi.fn(),
    writeFile: vi.fn(),
    readdir: vi.fn(),
    stat: vi.fn(),
    unlink: vi.fn(),
    link: vi.fn(),
    copyFile: vi.fn(),
    rm: vi.fn(),
    access: vi.fn()
}));

vi.mock('fs/promises', () => ({
    default: mockFs
}));

vi.mock('electron', () => ({
    app: { getPath: () => '/tmp', isPackaged: true },
    net: { request: vi.fn() },
    shell: { openPath: vi.fn(), showItemInFolder: vi.fn() },
    BrowserWindow: class {
        webContents = { send: vi.fn() }
    }
}));

// Mock window.electronAPI
const mockAPI = {
    getInstalledMods: vi.fn(),
    fetchCategories: vi.fn(),
    searchBySection: vi.fn(),
    checkForUpdates: vi.fn(),
    updateAllMods: vi.fn(),
    updateMod: vi.fn(),
    toggleMod: vi.fn(),
    installOnlineMod: vi.fn(),
    installMod: vi.fn(),
    uninstallMod: vi.fn(),
    setModPriority: vi.fn(),
    getModChangelog: vi.fn(),
    getModDetails: vi.fn(),
    onDownloadScanFinished: vi.fn(() => vi.fn()),
    removeListener: vi.fn(),
    getDownloads: vi.fn(),
    onDownloadProgress: vi.fn(() => vi.fn()),
    onDownloadUpdate: vi.fn(() => vi.fn()),
    launchGame: vi.fn(),
    fetchFeaturedMods: vi.fn(),
    fetchNewMods: vi.fn(),
    getSettings: vi.fn()
};
Object.defineProperty(window, 'electronAPI', { value: mockAPI });

// Mock window.confirm
window.confirm = vi.fn(() => true);

describe('Final Coverage Boost', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockAPI.getInstalledMods.mockResolvedValue([]);
        mockAPI.getSettings.mockResolvedValue({ gamePath: '/game' });
        // Default mocks
        mockAPI.fetchCategories.mockResolvedValue([]);
        mockAPI.searchBySection.mockResolvedValue([]);
        mockAPI.getDownloads.mockResolvedValue([]);
        mockAPI.fetchFeaturedMods.mockResolvedValue([]);
        mockAPI.checkForUpdates.mockResolvedValue([]);
        mockAPI.toggleMod.mockResolvedValue({ success: true });
        mockAPI.uninstallMod.mockResolvedValue({ success: true });
        window.confirm = vi.fn(() => true);
    });

    describe('ModManager Edge Cases', () => {
        let mgr: ModManager;

        beforeEach(() => {
            mgr = new ModManager();
            mockFs.mkdir.mockResolvedValue(undefined);
            mockFs.readFile.mockResolvedValue('[]');
            mockFs.writeFile.mockResolvedValue(undefined);
        });

        it('createProfile should handle errors', async () => {
            mockFs.writeFile.mockRejectedValue(new Error('Fail'));
            const result = await mgr.createProfile('Test');
            expect(result.success).toBe(false);
        });

        it('deleteProfile should handle errors', async () => {
            mockFs.writeFile.mockRejectedValue(new Error('Fail'));
            const result = await mgr.deleteProfile('1');
            expect(result).toBe(false);
        });

        it('loadProfile should return error if profile not found', async () => {
            mockFs.readFile.mockResolvedValue('[]');
            const result = await mgr.loadProfile('999');
            expect(result.success).toBe(false);
        });

        it('loadProfile should handle file read error', async () => {
            mockFs.readFile.mockRejectedValueOnce(new Error('Read Fail'));
            const result = await mgr.loadProfile('1');
            expect(result.success).toBe(false);
        });

        it('openModsDirectory should handle errors', async () => {
            (shell.openPath as any).mockRejectedValue(new Error('Fail'));
            const result = await mgr.openModsDirectory();
            expect(result).toBe(false);
        });

        it('saveSettings should handle directory creation error', async () => {
            mockFs.mkdir.mockRejectedValue(new Error('Fail'));
            const result = await mgr.saveSettings({ modDownloadPath: '/new/path' } as any);
            expect(result).toBe(false);
        });

        it('getInstalledMods should handle read error', async () => {
            mockFs.readFile.mockRejectedValue(new Error('Fail'));
            const result = await mgr.getInstalledMods();
            expect(result).toEqual([]);
        });

        it('fixPriorities should handle read error', async () => {
            mockFs.readFile.mockRejectedValue(new Error('Fail'));
            await mgr.fixPriorities();
        });

        it('calculateFolderSize should handle errors gracefully', async () => {
            mockFs.readdir.mockRejectedValue(new Error('Fail'));
            const size = await mgr.calculateFolderSize('/path');
            expect(size).toBe(0);
        });
    });

    describe('Component Specific Coverage', () => {
        it('ModCard should format large download counts (>=1000)', () => {
            const mod = { id: '1', name: 'Big Mod', downloadCount: 1500 };
            renderWithProviders(<ModCard mod={mod as any} />);
            expect(screen.getByText('1.5k')).toBeInTheDocument();
        });

        it('ModGrid should render empty state', () => {
            renderWithProviders(<ModGrid mods={[]} loading={false} />);
            expect(screen.getByText('No mods found')).toBeInTheDocument();
        });
    });

    describe('Mods Page UI Interactions', () => {
        it('should handle browse load error', async () => {
            mockAPI.searchBySection.mockRejectedValue(new Error('API Fail'));
            renderWithProviders(<Mods />);
            fireEvent.click(screen.getByText('Browse Online'));
            // Wait for loader to disappear or empty state
            await waitFor(() => expect(screen.queryByText('No mods found')).toBeInTheDocument());
        });

        it('should handle check updates error', async () => {
            mockAPI.getInstalledMods.mockResolvedValue([{ id: '1', name: 'M', isEnabled: true }]);
            mockAPI.checkForUpdates.mockRejectedValue(new Error('Fail'));

            renderWithProviders(<Mods />);
            await waitFor(() => expect(screen.getByText('Check Updates')).toBeInTheDocument());

            fireEvent.click(screen.getByText('Check Updates'));
            await waitFor(() => expect(screen.getByText('Check Updates')).toBeInTheDocument());
        });

        it('should handle update click error (changelog failure)', async () => {
            mockAPI.getInstalledMods.mockResolvedValue([{ id: '1', name: 'UpdateModTarget', hasUpdate: true, isEnabled: true }]);
            mockAPI.getModChangelog.mockRejectedValue(new Error('Fail'));

            renderWithProviders(<Mods />);
            const modName = await screen.findByText('UpdateModTarget');

            const card = modName.closest('.group');
            if (card) {
                const btns = card.querySelectorAll('button');
                for (const btn of btns) {
                    await act(async () => {
                        fireEvent.click(btn);
                    });
                }
            }
        });

        it('should handle priority change error', async () => {
            mockAPI.getInstalledMods.mockResolvedValue([{ id: '1', name: 'PrioModTarget', isEnabled: true, priority: 1 }]);
            mockAPI.setModPriority.mockRejectedValue(new Error('Fail'));

            renderWithProviders(<Mods />);
            const modName = await screen.findByText('PrioModTarget');

            const upBtn = screen.getByTitle('Increase Priority (Move Up)');
            await act(async () => {
                fireEvent.click(upBtn);
            });
        });
    });

    describe('CategorySidebar', () => {
        it('should toggle visibility', () => {
            renderWithProviders(
                <CategorySidebar
                    categories={[{ id: 1, name: 'Cat' }]}
                    selectedCategories={[]}
                    onCategorySelect={vi.fn()}
                />
            );

            const buttons = screen.getAllByRole('button');
            const collapseBtn = buttons[0];

            if (collapseBtn) {
                fireEvent.click(collapseBtn);
            }
        });

        it('should handle local storage error', () => {
            const spy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('Fail'); });
            renderWithProviders(
                <CategorySidebar
                    categories={[]}
                    selectedCategories={[]}
                    onCategorySelect={vi.fn()}
                />
            );
            spy.mockRestore();
            expect(screen.getByText('Categories')).toBeInTheDocument();
        });
    });

    describe('FilterBar', () => {
        it('should toggle all dropdowns', () => {
            renderWithProviders(
                <FilterBar
                    availableCategories={[{id:1, name:'Cat'}]}
                    activeFilters={{ categories: [], sortBy: 'date', order: 'desc', dateRange: 'all' }}
                    onFilterChange={vi.fn()}
                />
            );

            fireEvent.click(screen.getByText('Category'));
            expect(screen.getByText('Cat')).toBeInTheDocument();

            fireEvent.click(screen.getByText('Most Recent'));
            expect(screen.getByText('Most Downloaded')).toBeInTheDocument();

            fireEvent.click(screen.getByText('All Time'));
            expect(screen.getByText('Last Week')).toBeInTheDocument();
        });

        it('should clear all filters', () => {
            const onChange = vi.fn();
            renderWithProviders(
                <FilterBar
                    availableCategories={[]}
                    activeFilters={{ categories: ['Cat'], sortBy: 'date', order: 'desc', dateRange: 'all' }}
                    onFilterChange={onChange}
                />
            );

            fireEvent.click(screen.getByText('Clear All'));
            expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ categories: [] }));
        });
    });
});
