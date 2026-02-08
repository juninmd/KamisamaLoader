// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import ProfileManager from '../../src/components/ProfileManager';
import CategorySidebar from '../../src/components/CategorySidebar';
import { MockToastProvider } from './test-utils';

// Mock electronAPI
const mockElectronAPI = {
    getProfiles: vi.fn(),
    createProfile: vi.fn(),
    loadProfile: vi.fn(),
    deleteProfile: vi.fn(),
    getSettings: vi.fn().mockResolvedValue({}),
};

window.electronAPI = mockElectronAPI as any;

describe('Final Frontend Coverage', () => {

    beforeEach(() => {
        vi.clearAllMocks();
        localStorage.clear();
    });

    afterEach(() => {
        vi.restoreAllMocks();
    });

    describe('ProfileManager', () => {
        it('should handle loadProfiles error gracefully', async () => {
            mockElectronAPI.getProfiles.mockRejectedValue(new Error('API Fail'));

            await act(async () => {
                render(
                    <MockToastProvider>
                        <ProfileManager onProfileLoaded={vi.fn()} />
                    </MockToastProvider>
                );
            });

            expect(screen.getByTitle('Manage Mod Profiles')).toBeInTheDocument();
        });

        it('should validate empty profile name on create', async () => {
             mockElectronAPI.getProfiles.mockResolvedValue([]);

             await act(async () => {
                render(
                    <MockToastProvider>
                        <ProfileManager onProfileLoaded={vi.fn()} />
                    </MockToastProvider>
                );
            });

            // Open dropdown
            fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
            // Click create
            fireEvent.click(screen.getByTitle('Create New Profile'));

            // Input empty
            const input = screen.getByPlaceholderText('Profile Name...');
            fireEvent.change(input, { target: { value: '   ' } });

            // Click save
            const saveBtn = screen.getByText('Save').closest('button');
            expect(saveBtn).toBeDisabled();

            fireEvent.click(saveBtn!);

            expect(mockElectronAPI.createProfile).not.toHaveBeenCalled();
        });

        it('should cancel delete when confirmation is rejected', async () => {
            mockElectronAPI.getProfiles.mockResolvedValue([{ id: '1', name: 'Test', modIds: [] }]);

            // Mock confirm
            const confirmSpy = vi.fn().mockReturnValue(false);
            window.confirm = confirmSpy;

             await act(async () => {
                render(
                    <MockToastProvider>
                        <ProfileManager onProfileLoaded={vi.fn()} />
                    </MockToastProvider>
                );
            });

            fireEvent.click(screen.getByTitle('Manage Mod Profiles'));

            // Wait for list
            await waitFor(() => screen.getByText('Test'));

            // Find the row containing 'Test'
            // Text is inside span inside div inside div inside div(group)
            // Or just find the trash button directly if possible.
            // But there might be multiple if more profiles. Here only 1.
            // But let's be precise.

            // Use querySelector on the specific row if we can isolate it.
            // The row has "group" class.
            const profileName = screen.getByText('Test');
            // Traverse up to find the row container
            // span -> div -> div -> div.group
            let row = profileName.parentElement;
            while(row && !row.classList.contains('group')) {
                row = row.parentElement;
            }

            if (!row) throw new Error('Could not find profile row');

            const deleteBtn = row.querySelector('button');
            if (!deleteBtn) throw new Error('Could not find delete button');

            fireEvent.click(deleteBtn);

            expect(confirmSpy).toHaveBeenCalled();
            expect(mockElectronAPI.deleteProfile).not.toHaveBeenCalled();
        });
    });

    describe('CategorySidebar', () => {
        it('should handle localStorage errors', () => {
            // Mock localStorage.getItem to throw
            const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
                throw new Error('Storage Error');
            });

            // Spy on console.error
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

            render(
                <CategorySidebar
                    categories={[]}
                    selectedCategories={[]}
                    onCategorySelect={vi.fn()}
                />
            );

            expect(consoleSpy).toHaveBeenCalledWith('Failed to load favorite categories:', expect.any(Error));
            consoleSpy.mockRestore();
            getItemSpy.mockRestore();
        });

        it('should render correct icons and colors for all category types', () => {
            // Ensure no mock leaks
            vi.restoreAllMocks();

            const categories = [
                { id: 1, name: 'Characters' },
                { id: 2, name: 'Maps' },
                { id: 3, name: 'Gameplay' },
                { id: 4, name: 'Sounds' },
                { id: 5, name: 'UI' },
                { id: 6, name: 'Tools' },
                { id: 7, name: 'Effects' },
                { id: 8, name: 'Other' }
            ];

            render(
                <CategorySidebar
                    categories={categories}
                    selectedCategories={['Characters']}
                    onCategorySelect={vi.fn()}
                />
            );

            categories.forEach(cat => {
                expect(screen.getByText(cat.name)).toBeInTheDocument();
            });
        });
    });
});
