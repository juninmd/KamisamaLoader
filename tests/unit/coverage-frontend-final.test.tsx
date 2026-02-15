// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import '@testing-library/jest-dom';
import Mods from '../../src/pages/Mods';
import ProfileManager from '../../src/components/ProfileManager';
import CategorySidebar from '../../src/components/CategorySidebar';
import FilterBar from '../../src/components/FilterBar';
import { SettingsContext } from '../../src/components/SettingsContext';
import { ToastProvider } from '../../src/components/ToastContext';
import React from 'react';

// Mock Electron API
const mockElectron = {
    getInstalledMods: vi.fn().mockResolvedValue([]),
    getProfiles: vi.fn().mockResolvedValue([]),
    getSettings: vi.fn().mockResolvedValue({}),
    createProfile: vi.fn(),
    deleteProfile: vi.fn(),
    loadProfile: vi.fn(),
    installMod: vi.fn(),
    fetchCategories: vi.fn().mockResolvedValue([]),
    searchBySection: vi.fn().mockResolvedValue([]),
    onDownloadScanFinished: vi.fn(() => () => {}),
    onDownloadProgress: vi.fn(() => () => { }),
    onDownloadComplete: vi.fn(() => () => { }),
    checkForUpdates: vi.fn().mockResolvedValue([]),
    getModChangelog: vi.fn().mockResolvedValue([]),
    updateAllMods: vi.fn().mockResolvedValue({ successCount: 0, failCount: 0, results: [] }),
    updateMod: vi.fn().mockResolvedValue(true),
    toggleMod: vi.fn().mockResolvedValue({ success: true }),
    uninstallMod: vi.fn().mockResolvedValue({ success: true }),
    setModPriority: vi.fn().mockResolvedValue(true),
    installOnlineMod: vi.fn().mockResolvedValue({ success: true }),
    selectBackgroundImage: vi.fn().mockResolvedValue('/path/to/bg.png'),
    saveSettings: vi.fn().mockResolvedValue(true),
    selectGameDirectory: vi.fn(),
    selectModDirectory: vi.fn()
};

// Setup window mocks
Object.defineProperty(window, 'electronAPI', {
    value: mockElectron,
    writable: true
});

window.confirm = vi.fn();

const MockSettingsProvider = ({ children, customContext }: any) => (
    <SettingsContext.Provider value={customContext || {
        settings: { gamePath: '/mock', modDownloadPath: '/mods' },
        updateSettings: vi.fn(),
        selectGameDirectory: vi.fn(),
        selectModDirectory: vi.fn(),
        selectBackgroundImage: vi.fn(),
        loading: false
    }}>
        {children}
    </SettingsContext.Provider>
);

const renderWithProviders = (ui: React.ReactNode, customContext?: any) => {
    return render(
        <MockSettingsProvider customContext={customContext}>
            <ToastProvider>
                {ui}
            </ToastProvider>
        </MockSettingsProvider>
    );
};

describe('Frontend Final Coverage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Mods.tsx - Drag & Drop', () => {
        it('should handle file drop correctly', async () => {
            mockElectron.installMod.mockResolvedValue({ success: true });
            const { container } = renderWithProviders(<Mods />);

            // The outer div has the handlers
            const dropZone = container.firstChild as HTMLElement;

            const file = new File(['content'], 'test.pak', { type: 'application/octet-stream' });
            Object.defineProperty(file, 'path', { value: '/path/test.pak' });

            await act(async () => {
                fireEvent.dragEnter(dropZone, { dataTransfer: { items: [{ kind: 'file' }] } });
            });
            expect(screen.getByText('Drop to Install')).toBeInTheDocument();

            await act(async () => {
                fireEvent.drop(dropZone, { dataTransfer: { files: [file] } });
            });

            await waitFor(() => {
                expect(mockElectron.installMod).toHaveBeenCalledWith('/path/test.pak');
            });
            // Overlay should disappear
            expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
        });
    });

    describe('ProfileManager - Delete Confirmation', () => {
        it('should delete profile when confirmed', async () => {
            const profiles = [{ id: 'p1', name: 'Profile 1', modIds: [] }];
            mockElectron.getProfiles.mockResolvedValue(profiles);
            mockElectron.deleteProfile.mockResolvedValue(true);
            (window.confirm as any).mockReturnValue(true);

            renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);

            // Open dropdown
            fireEvent.click(screen.getByText('Profiles'));

            // Wait for list
            await waitFor(() => expect(screen.getByText('Profile 1')).toBeInTheDocument());

            // Click delete (hidden button, might need to force click or find by icon)
            const profileItem = screen.getByText('Profile 1').closest('div.group');
            const deleteBtn = profileItem?.querySelector('button');

            await act(async () => {
                fireEvent.click(deleteBtn!);
            });

            expect(window.confirm).toHaveBeenCalled();
            expect(mockElectron.deleteProfile).toHaveBeenCalledWith('p1');
        });

        it('should NOT delete profile when cancelled', async () => {
            const profiles = [{ id: 'p1', name: 'Profile 1', modIds: [] }];
            mockElectron.getProfiles.mockResolvedValue(profiles);
            (window.confirm as any).mockReturnValue(false);

            renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);
            fireEvent.click(screen.getByText('Profiles'));
            await waitFor(() => expect(screen.getByText('Profile 1')).toBeInTheDocument());

            const profileItem = screen.getByText('Profile 1').closest('div.group');
            const deleteBtn = profileItem?.querySelector('button');

            await act(async () => {
                fireEvent.click(deleteBtn!);
            });

            expect(window.confirm).toHaveBeenCalled();
            expect(mockElectron.deleteProfile).not.toHaveBeenCalled();
        });
    });

    describe('CategorySidebar - Empty State', () => {
        it('should display "No categories found" when empty', () => {
            renderWithProviders(
                <CategorySidebar
                    categories={[]}
                    selectedCategories={[]}
                    onCategorySelect={vi.fn()}
                />
            );
            expect(screen.getByText('No categories found')).toBeInTheDocument();
        });
    });

    describe('FilterBar - Clear & Remove', () => {
        it('should clear all filters', () => {
            const onFilterChange = vi.fn();
            const activeFilters = {
                categories: ['Cat1'],
                sortBy: 'date' as const,
                order: 'desc' as const,
                dateRange: 'all' as const
            };

            renderWithProviders(
                <FilterBar
                    availableCategories={[]}
                    activeFilters={activeFilters}
                    onFilterChange={onFilterChange}
                />
            );

            fireEvent.click(screen.getByText('Clear All'));

            expect(onFilterChange).toHaveBeenCalledWith({
                categories: [],
                sortBy: 'downloads',
                order: 'desc',
                dateRange: 'all'
            });
        });

        it('should remove specific category', () => {
            const onFilterChange = vi.fn();
            const activeFilters = {
                categories: ['Cat1', 'Cat2'],
                sortBy: 'date' as const,
                order: 'desc' as const,
                dateRange: 'all' as const
            };

            renderWithProviders(
                <FilterBar
                    availableCategories={[]}
                    activeFilters={activeFilters}
                    onFilterChange={onFilterChange}
                />
            );

            // Find the 'X' button for Cat1
            const cat1Chip = screen.getByText('Cat1').parentElement;
            const removeBtn = cat1Chip?.querySelector('button');
            fireEvent.click(removeBtn!);

            expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({
                categories: ['Cat2']
            }));
        });
    });

    describe('SettingsContext - Select Background', () => {
        it('should call selectBackgroundImage and update settings', async () => {
            // Import the real provider for this test
            const { SettingsProvider } = await import('../../src/components/SettingsContext');

            mockElectron.selectBackgroundImage.mockResolvedValue('/real/bg.png');
            mockElectron.saveSettings.mockResolvedValue(true);

            const TestComp = () => {
                const { selectBackgroundImage } = React.useContext(SettingsContext)!;
                return <button onClick={selectBackgroundImage}>Select BG</button>;
            };

            render(
                <SettingsProvider>
                    <TestComp />
                </SettingsProvider>
            );

            await act(async () => {
                fireEvent.click(screen.getByText('Select BG'));
            });

            expect(mockElectron.selectBackgroundImage).toHaveBeenCalled();
            expect(mockElectron.saveSettings).toHaveBeenCalledWith(expect.objectContaining({
                backgroundImage: '/real/bg.png'
            }));
        });
    });
});
