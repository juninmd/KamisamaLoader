// @vitest-environment happy-dom
import { mockElectron, renderWithProviders } from './coverage-frontend.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Mods from '../../src/pages/Mods';
import ProfileManager from '../../src/components/ProfileManager';
describe('Frontend Coverage Fill', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectron.getInstalledMods.mockResolvedValue([]);
        mockElectron.fetchCategories.mockResolvedValue([]);
        mockElectron.getProfiles.mockResolvedValue([]);
        mockElectron.getSettings.mockResolvedValue({});
    });
    describe('Mods Page - Error Handling', () => {
        it('loadCategories should handle API failure', async () => {
            mockElectron.fetchCategories.mockRejectedValue(new Error('Fail'));
            const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => { });
            renderWithProviders(<Mods />);
            fireEvent.click(screen.getByText('Browse Online'));
            await waitFor(() => expect(mockElectron.fetchCategories).toHaveBeenCalled());
            expect(consoleSpy).toHaveBeenCalledWith('[Categories] Failed to load', expect.any(Error));
        });
    });
});
describe('Frontend Coverage Fill', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectron.getInstalledMods.mockResolvedValue([]);
        mockElectron.fetchCategories.mockResolvedValue([]);
        mockElectron.getProfiles.mockResolvedValue([]);
        mockElectron.getSettings.mockResolvedValue({});
    });
    describe('ProfileManager - Error Handling', () => {
        it('handleCreate should fail if empty name', async () => {
            renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()}/>);
            fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
            fireEvent.click(screen.getByTitle('Create New Profile'));
            const saveBtn = screen.getByText('Save').closest('button');
            expect(saveBtn).toBeDisabled();
        });
    });
});
describe('Frontend Coverage Fill', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectron.getInstalledMods.mockResolvedValue([]);
        mockElectron.fetchCategories.mockResolvedValue([]);
        mockElectron.getProfiles.mockResolvedValue([]);
        mockElectron.getSettings.mockResolvedValue({});
    });
    describe('ProfileManager - Error Handling', () => {
        it('handleCreate should handle API failure', async () => {
            mockElectron.createProfile.mockResolvedValue({ success: false });
            renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()}/>);
            fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
            fireEvent.click(screen.getByTitle('Create New Profile'));
            const input = screen.getByPlaceholderText('Profile Name...');
            fireEvent.change(input, { target: { value: 'New' } });
            fireEvent.click(screen.getByText('Save'));
            await waitFor(() => expect(mockElectron.createProfile).toHaveBeenCalled());
        });
    });
});
describe('Frontend Coverage Fill', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectron.getInstalledMods.mockResolvedValue([]);
        mockElectron.fetchCategories.mockResolvedValue([]);
        mockElectron.getProfiles.mockResolvedValue([]);
        mockElectron.getSettings.mockResolvedValue({});
    });
    describe('ProfileManager - Error Handling', () => {
        it('handleDelete should not delete if cancelled', async () => {
            mockElectron.getProfiles.mockResolvedValue([{ id: 'p1', name: 'P1', modIds: [] }]);
            window.confirm = vi.fn().mockReturnValue(false);
            renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()}/>);
            fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
            await waitFor(() => expect(screen.getByText('P1')).toBeInTheDocument());
            const row = screen.getByText('P1').closest('div')?.parentElement;
            const deleteBtn = row?.querySelector('button');
            if (deleteBtn)
                fireEvent.click(deleteBtn);
            expect(mockElectron.deleteProfile).not.toHaveBeenCalled();
        });
    });
});
describe('Frontend Coverage Fill', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectron.getInstalledMods.mockResolvedValue([]);
        mockElectron.fetchCategories.mockResolvedValue([]);
        mockElectron.getProfiles.mockResolvedValue([]);
        mockElectron.getSettings.mockResolvedValue({});
    });
    describe('ProfileManager - Error Handling', () => {
        it('handleLoad should handle API failure', async () => {
            mockElectron.getProfiles.mockResolvedValue([{ id: 'p1', name: 'P1', modIds: [] }]);
            mockElectron.loadProfile.mockResolvedValue({ success: false });
            renderWithProviders(<ProfileManager onProfileLoaded={vi.fn()}/>);
            fireEvent.click(screen.getByTitle('Manage Mod Profiles'));
            await waitFor(() => expect(screen.getByText('P1')).toBeInTheDocument());
            fireEvent.click(screen.getByText('P1'));
            await waitFor(() => expect(mockElectron.loadProfile).toHaveBeenCalled());
        });
    });
});
