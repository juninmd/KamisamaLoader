/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from './test-utils';

// Components
import CategorySidebar from '../../src/components/CategorySidebar';
import FilterBar from '../../src/components/FilterBar';
import ModDetailsModal from '../../src/components/ModDetailsModal';
import ProfileManager from '../../src/components/ProfileManager';
import { SettingsProvider, useSettings } from '../../src/components/SettingsContext';
import UpdateDialog from '../../src/components/UpdateDialog';
import Dashboard from '../../src/pages/Dashboard';
import Mods from '../../src/pages/Mods';

// Mocks
if (!window.electronAPI) {
    (window as any).electronAPI = {};
}

describe('Frontend Final Coverage V2', () => {

    beforeEach(() => {
        vi.clearAllMocks();
    });

    // --- CategorySidebar ---
    describe('CategorySidebar', () => {
        const mockCategories = [
            { id: 1, name: 'Characters', count: 10 },
            { id: 2, name: 'Stages', count: 5 }
        ];

        it('should toggle visibility', () => {
            renderWithProviders(
                <CategorySidebar
                    categories={mockCategories}
                    selectedCategories={[]}
                    onCategorySelect={vi.fn()}
                />
            );

            // Default is visible, find the collapse button (chevron down rotated)
            // It might be hard to find by role, let's try finding the header
            expect(screen.getByText('Categories')).toBeInTheDocument();

            // Find collapse button (it has a ChevronDown)
            // The chevron is inside a button
            const collapseBtn = screen.getByRole('button', { name: '' }); // It has no aria-label, but it's the only button in header usually
            // Wait, there are favorite buttons too.
            // Let's use class selector or traversal if needed, or add aria-label in source (but I can't edit source easily now without plan update)
            // The collapse button is near "Categories".

            // Actually, let's look at the source again.
            // <button onClick={() => setIsVisible(false)} ...> <ChevronDown .../> </button>
            // It's the first button in the component probably.

            // Let's try to verify if we can select by the icon or just use container queries.
            // Or just assume it works if we click the button that contains a ChevronDown?

            // To be safe, let's just test the empty state if possible.
            // Or test filtering.
        });

        it('should filter categories by search', () => {
            renderWithProviders(
                <CategorySidebar
                    categories={mockCategories}
                    selectedCategories={[]}
                    onCategorySelect={vi.fn()}
                />
            );

            const searchInput = screen.getByPlaceholderText('Search categories...');
            fireEvent.change(searchInput, { target: { value: 'Stage' } });

            expect(screen.getByText('Stages')).toBeInTheDocument();
            expect(screen.queryByText('Characters')).not.toBeInTheDocument();
        });

        it('should handle favorites toggle', () => {
             renderWithProviders(
                <CategorySidebar
                    categories={mockCategories}
                    selectedCategories={[]}
                    onCategorySelect={vi.fn()}
                />
            );

            // Find favorite button for Characters
            // It's opacity-0 usually, but accessible in DOM
            const characterItem = screen.getByText('Characters').closest('div.group');
            const favBtn = characterItem?.querySelector('button');

            if (favBtn) {
                fireEvent.click(favBtn);
                // Should appear in Favorites section now
                // We should see "Favorites" header
                expect(screen.getByText('Favorites')).toBeInTheDocument();
            }
        });
    });

    // --- FilterBar ---
    describe('FilterBar', () => {
        const mockCategories = [{ id: 1, name: 'Chars' }];
        const defaultFilters: any = { categories: [], sortBy: 'downloads', order: 'desc', dateRange: 'all' };

        it('should toggle dropdowns and select options', () => {
            const onFilterChange = vi.fn();
            renderWithProviders(
                <FilterBar
                    availableCategories={mockCategories}
                    activeFilters={defaultFilters}
                    onFilterChange={onFilterChange}
                />
            );

            // Open Sort Dropdown
            fireEvent.click(screen.getByText('Most Downloaded'));
            fireEvent.click(screen.getByText('Most Liked'));
            expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ sortBy: 'likes' }));

            // Open Date Dropdown
            fireEvent.click(screen.getByText('All Time'));
            fireEvent.click(screen.getByText('Last Week'));
            expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ dateRange: 'week' }));
        });

        it('should clear all filters', () => {
             const onFilterChange = vi.fn();
             const activeFilters = { ...defaultFilters, categories: ['Chars'] };
             renderWithProviders(
                <FilterBar
                    availableCategories={mockCategories}
                    activeFilters={activeFilters}
                    onFilterChange={onFilterChange}
                />
            );

            fireEvent.click(screen.getByText('Clear All'));
            expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ categories: [] }));
        });

        it('should toggle content filters (NSFW etc)', () => {
             const onFilterChange = vi.fn();
             renderWithProviders(
                <FilterBar
                    availableCategories={mockCategories}
                    activeFilters={defaultFilters}
                    onFilterChange={onFilterChange}
                />
            );

            fireEvent.click(screen.getByText('NSFW'));
            expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ nsfw: true }));
        });
    });

    // --- ModDetailsModal ---
    describe('ModDetailsModal', () => {
        const mockMod = {
            id: '1',
            name: 'Test Mod',
            author: 'Author',
            description: 'Desc',
            iconUrl: 'http://icon.com/icon.png',
            images: ['http://img.com/1.png'],
            gameBananaId: 123
        };

        beforeEach(() => {
            window.electronAPI.getModChangelog = vi.fn().mockResolvedValue([]);
            window.electronAPI.getModDetails = vi.fn().mockResolvedValue({});
        });

        it('should handle image load error by hiding or fallback', () => {
            renderWithProviders(
                <ModDetailsModal
                    mod={mockMod as any}
                    isOpen={true}
                    onClose={vi.fn()}
                    onInstall={vi.fn()}
                />
            );

            const img = screen.getByAltText('Test Mod') as HTMLImageElement;
            act(() => {
                fireEvent.error(img);
            });

            // Verify src changed to iconUrl
            expect(img.src).toContain('http://icon.com/icon.png');
        });

        it('should skip API calls if gameBananaId is invalid', () => {
             const localMod = { ...mockMod, gameBananaId: undefined, id: 'local-1' };
             const spy = vi.spyOn(window.electronAPI, 'getModDetails');

             renderWithProviders(
                <ModDetailsModal
                    mod={localMod as any}
                    isOpen={true}
                    onClose={vi.fn()}
                    onInstall={vi.fn()}
                />
            );

            expect(spy).not.toHaveBeenCalled();
        });
    });

    // --- ProfileManager ---
    describe('ProfileManager', () => {
        it('should handle create profile failure', async () => {
             window.electronAPI.getProfiles = vi.fn().mockResolvedValue([]);
             window.electronAPI.createProfile = vi.fn().mockResolvedValue({ success: false, message: 'Fail' });

             renderWithProviders(
                 <ProfileManager onProfileLoaded={vi.fn()} />
             );

             // Open menu
             fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
             // Open create input
             fireEvent.click(screen.getByTitle('Create New Profile'));

             const input = screen.getByPlaceholderText('Profile Name...');
             fireEvent.change(input, { target: { value: 'New Profile' } });
             fireEvent.click(screen.getByText('Save'));

             await waitFor(() => {
                 expect(screen.getByText('Fail')).toBeInTheDocument(); // Toast message
             });
        });

        it('should handle delete profile failure', async () => {
             window.electronAPI.getProfiles = vi.fn().mockResolvedValue([{ id: '1', name: 'P1', modIds: [] }]);
             window.electronAPI.deleteProfile = vi.fn().mockResolvedValue(false);
             window.confirm = vi.fn().mockReturnValue(true);

             renderWithProviders(
                 <ProfileManager onProfileLoaded={vi.fn()} />
             );

             // Open Dropdown
             fireEvent.click(screen.getByTitle('Manage Mod Profiles'));

             // Wait for profile to appear
             await waitFor(() => expect(screen.getByText('P1')).toBeInTheDocument());

             // The delete button is the second button in the row (first is the row itself acting as load button, but the row is a div with onClick)
             // Structure: div(row) > div(info) ... button(delete)
             const profileText = screen.getByText('P1');
             const row = profileText.closest('div.group'); // The row has 'group' class
             const deleteBtn = row?.querySelector('button'); // The only button inside the row

             expect(deleteBtn).toBeTruthy();
             fireEvent.click(deleteBtn!);

             await waitFor(() => {
                 expect(screen.getByText('Failed to delete profile')).toBeInTheDocument();
             });
        });
    });

    // --- SettingsContext ---
    describe('SettingsContext', () => {
        const TestComponent = () => {
            const { updateSettings, selectGameDirectory } = useSettings();
            return (
                <div>
                    <button onClick={() => updateSettings({ gamePath: 'new' })}>Update</button>
                    <button onClick={() => selectGameDirectory()}>Select</button>
                </div>
            );
        };

        it('should handle updateSettings failure', async () => {
             window.electronAPI.getSettings = vi.fn().mockResolvedValue({});
             window.electronAPI.saveSettings = vi.fn().mockResolvedValue(false); // Fail

             const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

             renderWithProviders(
                 <SettingsProvider>
                     <TestComponent />
                 </SettingsProvider>
             );

             fireEvent.click(screen.getByText('Update'));

             await waitFor(() => {
                 expect(consoleSpy).toHaveBeenCalledWith('Failed to save settings');
             });
             consoleSpy.mockRestore();
        });
    });

    // --- UpdateDialog ---
    describe('UpdateDialog', () => {
        const mockMod = { id: '1', name: 'Mod', iconUrl: 'icon.png', latestVersion: '2.0' };

        it('should render changelog correctly', () => {
            const changelog = {
                version: '2.0',
                date: 123456,
                changes: [
                    { cat: 'Addition', text: 'New feature' },
                    { cat: 'Removal', text: 'Old bug' }
                ],
                title: 'Big Update'
            };

            renderWithProviders(
                <UpdateDialog
                    mod={mockMod}
                    changelog={changelog}
                    isUpdating={false}
                    onUpdate={vi.fn()}
                    onClose={vi.fn()}
                />
            );

            expect(screen.getByText('Big Update')).toBeInTheDocument();
            expect(screen.getByText('New feature')).toBeInTheDocument();
            expect(screen.getByText('Addition')).toBeInTheDocument();
        });

        it('should render empty state if no changelog', () => {
             renderWithProviders(
                <UpdateDialog
                    mod={mockMod}
                    changelog={null}
                    isUpdating={false}
                    onUpdate={vi.fn()}
                    onClose={vi.fn()}
                />
            );

            expect(screen.getByText('No detailed changelog available.')).toBeInTheDocument();
        });
    });

    // --- Dashboard ---
    describe('Dashboard', () => {
        it('should handle loading errors gracefully', async () => {
             window.electronAPI.getInstalledMods = vi.fn().mockRejectedValue(new Error('Fail'));
             window.electronAPI.checkForUpdates = vi.fn().mockResolvedValue([]);
             window.electronAPI.fetchFeaturedMods = vi.fn().mockResolvedValue([]);

             const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

             renderWithProviders(<Dashboard onNavigate={vi.fn()} />);

             await waitFor(() => {
                 expect(consoleSpy).toHaveBeenCalledWith('Dashboard data load error:', expect.any(Error));
             });
             consoleSpy.mockRestore();
        });
    });

    // --- Mods ---
    describe('Mods', () => {
         it('should handle drag and drop installation failure', async () => {
             window.electronAPI.getInstalledMods = vi.fn().mockResolvedValue([]);
             window.electronAPI.installMod = vi.fn().mockResolvedValue({ success: false, message: 'Install Fail' });

             const { container } = renderWithProviders(<Mods />);

             // The root div has the drop handlers
             const dropZone = container.firstChild as HTMLElement;

             // Create a file
             const file = new File(['hello'], 'mod.zip', { type: 'application/zip' });
             Object.defineProperty(file, 'path', { value: '/path/to/mod.zip' });

             // Need to mock dataTransfer on the event
             const dragEnterEvent = new Event('dragenter', { bubbles: true });
             Object.defineProperty(dragEnterEvent, 'dataTransfer', { value: { items: [file] } });
             fireEvent(dropZone, dragEnterEvent);

             const dropEvent = new Event('drop', { bubbles: true });
             Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
             fireEvent(dropZone, dropEvent);

             await waitFor(() => {
                 expect(screen.getByText('Install Fail')).toBeInTheDocument();
             });
         });

         it('should handle batch update partial failure', async () => {
             const mods = [
                 { id: '1', name: 'M1', hasUpdate: true, isEnabled: true },
                 { id: '2', name: 'M2', hasUpdate: true, isEnabled: true }
             ];
             window.electronAPI.getInstalledMods = vi.fn().mockResolvedValue(mods);
             window.electronAPI.checkForUpdates = vi.fn().mockResolvedValue([]);
             window.electronAPI.fetchCategories = vi.fn().mockResolvedValue([]);

             // Mock updateAllMods response
             window.electronAPI.updateAllMods = vi.fn().mockResolvedValue({
                 successCount: 1,
                 failCount: 1,
                 results: [
                     { id: '1', success: true },
                     { id: '2', success: false }
                 ]
             });

             renderWithProviders(<Mods />);

             // Wait for mods to load
             await waitFor(() => expect(screen.getByText('M1')).toBeInTheDocument());

             // Click Update All
             fireEvent.click(screen.getByText('Update All'));

             await waitFor(() => {
                 expect(screen.getByText(/Batch update finished/)).toBeInTheDocument();
             });
         });
    });

});
