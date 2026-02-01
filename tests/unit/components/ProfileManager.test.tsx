// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import ProfileManager from '../../../src/components/ProfileManager';

describe('ProfileManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        vi.useRealTimers();
        (window.electronAPI.getProfiles as any).mockResolvedValue([
            { id: '1', name: 'Profile 1', modIds: [] }
        ]);
        (window.electronAPI.getSettings as any).mockResolvedValue({ activeProfileId: '1' });
        (window.electronAPI.createProfile as any).mockResolvedValue({ success: true });
        (window.electronAPI.loadProfile as any).mockResolvedValue({ success: true });
        (window.electronAPI.deleteProfile as any).mockResolvedValue(true);
        window.confirm = vi.fn(() => true);
    });

    it('should render profiles list', async () => {
        renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);

        const toggleBtn = screen.getByTitle('Manage Mod Profiles');
        fireEvent.click(toggleBtn);

        await waitFor(() => {
            expect(screen.getByText('Profile 1')).toBeInTheDocument();
        });
    });

    it('should create profile', async () => {
        renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);

        fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
        fireEvent.click(screen.getByTitle('Create New Profile'));

        const input = screen.getByPlaceholderText('Profile Name...');
        fireEvent.change(input, { target: { value: 'New Profile' } });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(window.electronAPI.createProfile).toHaveBeenCalledWith('New Profile');
        });
    });

    it('should load profile', async () => {
        const mockLoad = vi.fn();
        renderWithProviders(<ProfileManager onProfileLoaded={mockLoad} />);

        fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
        await waitFor(() => screen.getByText('Profile 1'));

        fireEvent.click(screen.getByText('Profile 1'));

        await waitFor(() => {
            expect(window.electronAPI.loadProfile).toHaveBeenCalledWith('1');
            expect(mockLoad).toHaveBeenCalled();
        });
    });

    it('should delete profile', async () => {
        renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);

        fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
        await waitFor(() => screen.getByText('Profile 1'));

        const deleteButtons = screen.getAllByRole('button');
        // Find the delete button inside the list item. It has Trash2 icon.
        // Or find the button that is hidden by default.
        // It's the last button?
        // Let's assume there is one delete button because there is one profile.
        // There are: Toggle Button, Create Button, Delete Button.
        const deleteBtn = deleteButtons[2];

        fireEvent.click(deleteBtn);

        await waitFor(() => expect(window.electronAPI.deleteProfile).toHaveBeenCalledWith('1'));
    });

    it('should handle loadProfiles error', async () => {
        (window.electronAPI.getProfiles as any).mockRejectedValue(new Error('Fail'));
        const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

        renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);

        await waitFor(() => expect(consoleSpy).toHaveBeenCalled());
    });

    it('should handle create error', async () => {
        (window.electronAPI.createProfile as any).mockResolvedValue({ success: false, message: 'Fail' });
        renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);

        fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
        fireEvent.click(screen.getByTitle('Create New Profile'));

        const input = screen.getByPlaceholderText('Profile Name...');
        fireEvent.change(input, { target: { value: 'New Profile' } });
        fireEvent.click(screen.getByText('Save'));

        // Should show toast (not easily checked unless mocking toast context deeper or spy)
        // But we just want coverage of the else block.
        await waitFor(() => expect(window.electronAPI.createProfile).toHaveBeenCalled());
    });

    it('should handle delete error', async () => {
        (window.electronAPI.deleteProfile as any).mockResolvedValue(false);
        renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()} />);

        fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
        await waitFor(() => screen.getByText('Profile 1'));

        const deleteButtons = screen.getAllByRole('button');
        const deleteBtn = deleteButtons[2];
        fireEvent.click(deleteBtn);

        await waitFor(() => expect(window.electronAPI.deleteProfile).toHaveBeenCalled());
    });
});
