// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProfileManager from '../../../src/components/ProfileManager.tsx';

// Mock useToast hook
const mockShowToast = vi.fn();
vi.mock('../../../src/components/ToastContext.tsx', () => ({
    useToast: () => ({ showToast: mockShowToast })
}));

describe('ProfileManager Final Gaps', () => {
    const mockOnProfileLoaded = vi.fn();

    const mockProfiles = [
        { id: 'p1', name: 'Profile 1', modIds: ['m1'] },
        { id: 'p2', name: 'Profile 2', modIds: ['m2'] }
    ];

    beforeEach(() => {
        vi.clearAllMocks();
        window.electronAPI = {
            getProfiles: vi.fn().mockResolvedValue(mockProfiles),
            getSettings: vi.fn().mockResolvedValue({ activeProfileId: 'p1' }),
            createProfile: vi.fn(),
            deleteProfile: vi.fn().mockResolvedValue(true),
            loadProfile: vi.fn().mockResolvedValue({ success: true })
        } as any;

        // Mock confirm
        global.confirm = vi.fn().mockReturnValue(true);
    });

    it('should load a profile when clicked', async () => {
        render(<ProfileManager onProfileLoaded={mockOnProfileLoaded} />);

        // Open dropdown
        const toggleBtn = screen.getByTitle('Manage Mod Profiles');
        fireEvent.click(toggleBtn);

        // Wait for profiles to load and appear
        await waitFor(() => {
            expect(screen.getByText('Profile 2')).toBeInTheDocument();
        });

        // Click Profile 2 to load
        const profile2 = screen.getByText('Profile 2');
        // Click on the row (parent div)
        fireEvent.click(profile2.closest('.group')!);

        // Should call loadProfile
        await waitFor(() => {
            expect(window.electronAPI.loadProfile).toHaveBeenCalledWith('p2');
        });

        expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('Loading profile'), 'info');

        // Should eventually succeed and call onProfileLoaded
        await waitFor(() => {
            expect(mockOnProfileLoaded).toHaveBeenCalled();
            expect(mockShowToast).toHaveBeenCalledWith(expect.stringContaining('loaded'), 'success');
        });
    });

    it('should delete a profile when trash icon is clicked', async () => {
        render(<ProfileManager onProfileLoaded={mockOnProfileLoaded} />);

        // Open dropdown
        const toggleBtn = screen.getByTitle('Manage Mod Profiles');
        fireEvent.click(toggleBtn);

        await waitFor(() => {
            expect(screen.getByText('Profile 2')).toBeInTheDocument();
        });

        // Find delete button for Profile 2
        const profile2Text = screen.getByText('Profile 2');
        const row = profile2Text.closest('.group');
        expect(row).toBeInTheDocument();

        const deleteBtn = row?.querySelector('button');
        expect(deleteBtn).toBeInTheDocument();

        fireEvent.click(deleteBtn!);

        expect(global.confirm).toHaveBeenCalled();
        expect(window.electronAPI.deleteProfile).toHaveBeenCalledWith('p2');

        await waitFor(() => {
            expect(mockShowToast).toHaveBeenCalledWith('Profile deleted', 'success');
        });
    });

    it('should create a new profile', async () => {
        render(<ProfileManager onProfileLoaded={mockOnProfileLoaded} />);

        // Open dropdown
        const toggleBtn = screen.getByTitle('Manage Mod Profiles');
        fireEvent.click(toggleBtn);

        // Click create button (+)
        const createBtn = screen.getByTitle('Create New Profile');
        fireEvent.click(createBtn);

        // Input appears
        const input = screen.getByPlaceholderText('Profile Name...');
        fireEvent.change(input, { target: { value: 'New Profile' } });

        // Click Save
        const saveBtn = screen.getByText('Save');
        (window.electronAPI.createProfile as any).mockResolvedValue({ success: true });
        fireEvent.click(saveBtn);

        expect(window.electronAPI.createProfile).toHaveBeenCalledWith('New Profile');

        await waitFor(() => {
            expect(mockShowToast).toHaveBeenCalledWith('Profile saved successfully', 'success');
        });
    });
});
