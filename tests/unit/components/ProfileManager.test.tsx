// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import ProfileManager from '../../../src/components/ProfileManager';

describe('ProfileManager', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        (window.electronAPI.getProfiles as any).mockResolvedValue([
            { id: '1', name: 'Profile 1', modIds: [] }
        ]);
        (window.electronAPI.createProfile as any).mockResolvedValue({ success: true });
        (window.electronAPI.loadProfile as any).mockResolvedValue({ success: true });
        (window.electronAPI.deleteProfile as any).mockResolvedValue(true);
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
});
