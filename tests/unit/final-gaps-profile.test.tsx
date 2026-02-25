// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProfileManager from '../../src/components/ProfileManager';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import * as ToastContext from '../../src/components/ToastContext';
import React from 'react';

// Mock Toast
const mockShowToast = vi.fn();
vi.spyOn(ToastContext, 'useToast').mockReturnValue({ showToast: mockShowToast });

// Mock Electron API
const mockElectronAPI = {
    getProfiles: vi.fn(),
    getSettings: vi.fn(),
    createProfile: vi.fn(),
    loadProfile: vi.fn(),
    deleteProfile: vi.fn()
};

// Setup window
beforeAll(() => {
    Object.defineProperty(window, 'electronAPI', {
      value: mockElectronAPI,
      writable: true
    });
    // Define confirm mock
    window.confirm = vi.fn();
});

describe('ProfileManager Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getProfiles.mockResolvedValue([]);
        mockElectronAPI.getSettings.mockResolvedValue({});
        (window.confirm as any).mockReturnValue(true); // Default to true
    });

    it('should handle create profile empty name', async () => {
        render(<ProfileManager onProfileLoaded={vi.fn()} />);
        fireEvent.click(screen.getByTitle(/Manage Mod Profiles/i));
        fireEvent.click(screen.getByTitle(/Create New Profile/i));

        const input = screen.getByPlaceholderText(/Profile Name/i);
        fireEvent.change(input, { target: { value: '   ' } }); // empty
        fireEvent.keyDown(input, { key: 'Enter' });

        expect(mockElectronAPI.createProfile).not.toHaveBeenCalled();
    });

    it('should handle create profile failure', async () => {
        mockElectronAPI.createProfile.mockResolvedValue({ success: false, message: 'fail' });
        render(<ProfileManager onProfileLoaded={vi.fn()} />);
        fireEvent.click(screen.getByTitle(/Manage Mod Profiles/i));
        fireEvent.click(screen.getByTitle(/Create New Profile/i));

        const input = screen.getByPlaceholderText(/Profile Name/i);
        fireEvent.change(input, { target: { value: 'Test' } });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(mockShowToast).toHaveBeenCalledWith('fail', 'error');
        });
    });

    it('should handle create profile failure (exception)', async () => {
        mockElectronAPI.createProfile.mockRejectedValue(new Error('Network error'));
        render(<ProfileManager onProfileLoaded={vi.fn()} />);
        fireEvent.click(screen.getByTitle(/Manage Mod Profiles/i));
        fireEvent.click(screen.getByTitle(/Create New Profile/i));

        const input = screen.getByPlaceholderText(/Profile Name/i);
        fireEvent.change(input, { target: { value: 'Test' } });
        fireEvent.click(screen.getByText('Save'));

        await waitFor(() => {
            expect(mockShowToast).toHaveBeenCalledWith('Failed to save profile', 'error');
        });
    });

    it('should handle delete cancellation', async () => {
        mockElectronAPI.getProfiles.mockResolvedValue([{ id: '1', name: 'P1', modIds: [] }]);
        (window.confirm as any).mockReturnValue(false); // Cancel

        render(<ProfileManager onProfileLoaded={vi.fn()} />);
        fireEvent.click(screen.getByTitle(/Manage Mod Profiles/i));

        await waitFor(() => screen.getByText('P1'));

        const profileItem = screen.getByText('P1').closest('.group');
        const deleteBtn = profileItem?.querySelector('button');

        fireEvent.click(deleteBtn!);

        expect(mockElectronAPI.deleteProfile).not.toHaveBeenCalled();
    });

    it('should handle delete failure', async () => {
        mockElectronAPI.getProfiles.mockResolvedValue([{ id: '1', name: 'P1', modIds: [] }]);
        (window.confirm as any).mockReturnValue(true);
        mockElectronAPI.deleteProfile.mockResolvedValue(false);

        render(<ProfileManager onProfileLoaded={vi.fn()} />);
        fireEvent.click(screen.getByTitle(/Manage Mod Profiles/i));

        await waitFor(() => screen.getByText('P1'));

        const profileItem = screen.getByText('P1').closest('.group');
        const deleteBtn = profileItem?.querySelector('button');

        fireEvent.click(deleteBtn!);

        await waitFor(() => {
            expect(mockShowToast).toHaveBeenCalledWith('Failed to delete profile', 'error');
        });
    });

    it('should handle load profile failure', async () => {
        mockElectronAPI.getProfiles.mockResolvedValue([{ id: '1', name: 'P1', modIds: [] }]);
        mockElectronAPI.loadProfile.mockResolvedValue({ success: false });

        render(<ProfileManager onProfileLoaded={vi.fn()} />);
        fireEvent.click(screen.getByTitle(/Manage Mod Profiles/i));
        await waitFor(() => screen.getByText('P1'));

        fireEvent.click(screen.getByText('P1'));

        await waitFor(() => {
             expect(mockShowToast).toHaveBeenCalledWith('Failed to load profile', 'error');
        });
    });

    it('should handle load profile exception', async () => {
        mockElectronAPI.getProfiles.mockResolvedValue([{ id: '1', name: 'P1', modIds: [] }]);
        mockElectronAPI.loadProfile.mockRejectedValue(new Error('fail'));

        render(<ProfileManager onProfileLoaded={vi.fn()} />);
        fireEvent.click(screen.getByTitle(/Manage Mod Profiles/i));
        await waitFor(() => screen.getByText('P1'));

        fireEvent.click(screen.getByText('P1'));

        await waitFor(() => {
             expect(mockShowToast).toHaveBeenCalledWith('Failed to load profile', 'error');
        });
    });
});
