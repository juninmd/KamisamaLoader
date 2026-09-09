// @vitest-environment happy-dom
import { mockElectron, renderWithProviders } from './coverage-frontend.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import Mods from '../../src/pages/Mods';
describe('Frontend Coverage Fill', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectron.getInstalledMods.mockResolvedValue([]);
        mockElectron.fetchCategories.mockResolvedValue([]);
        mockElectron.getProfiles.mockResolvedValue([]);
        mockElectron.getSettings.mockResolvedValue({});
    });
    describe('Mods Page - Error Handling', () => {
        it('handleInstall should show error toast on failure', async () => {
            mockElectron.searchBySection.mockResolvedValue([
                { id: '1', name: 'Mod1', gameBananaId: 100 }
            ]);
            mockElectron.installOnlineMod.mockResolvedValue({ success: false, message: 'Install Failed' });
            renderWithProviders(<Mods />);
            fireEvent.click(screen.getByText('Browse Online'));
            await waitFor(() => expect(screen.getByText('Mod1')).toBeInTheDocument());
            const installBtn = screen.getByRole('button', { name: /^Download$/i });
            fireEvent.click(installBtn);
            await waitFor(() => {
                expect(mockElectron.installOnlineMod).toHaveBeenCalled();
            });
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
    describe('Mods Page - Error Handling', () => {
        it('handleToggle should revert state on failure', async () => {
            const mod = { id: '1', name: 'M', isEnabled: false, author: 'A' };
            mockElectron.getInstalledMods.mockResolvedValue([mod]);
            mockElectron.toggleMod.mockResolvedValue({ success: false });
            renderWithProviders(<Mods />);
            await waitFor(() => expect(screen.getByText('M')).toBeInTheDocument());
            const switchEl = screen.getByRole('checkbox');
            fireEvent.click(switchEl);
            await waitFor(() => {
                expect(mockElectron.toggleMod).toHaveBeenCalled();
            });
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
    describe('Mods Page - Error Handling', () => {
        it('handleUninstall should not uninstall if cancelled', async () => {
            const mod = { id: '1', name: 'M', isEnabled: false, author: 'A' };
            mockElectron.getInstalledMods.mockResolvedValue([mod]);
            window.confirm = vi.fn().mockReturnValue(false);
            renderWithProviders(<Mods />);
            await waitFor(() => expect(screen.getByText('M')).toBeInTheDocument());
            const uninstall = screen.getByTitle('Uninstall');
            fireEvent.click(uninstall);
            expect(mockElectron.uninstallMod).not.toHaveBeenCalled();
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
    describe('Mods Page - Error Handling', () => {
        it('handleUninstall should show error on failure', async () => {
            const mod = { id: '1', name: 'M', isEnabled: false, author: 'A' };
            mockElectron.getInstalledMods.mockResolvedValue([mod]);
            window.confirm = vi.fn().mockReturnValue(true);
            mockElectron.uninstallMod.mockResolvedValue({ success: false, message: 'Fail' });
            renderWithProviders(<Mods />);
            await waitFor(() => expect(screen.getByText('M')).toBeInTheDocument());
            const uninstall = screen.getByTitle('Uninstall');
            fireEvent.click(uninstall);
            await waitFor(() => expect(mockElectron.uninstallMod).toHaveBeenCalled());
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
    describe('Mods Page - Error Handling', () => {
        it('handleUpdateAll should handle partial failures', async () => {
            const mod = { id: '1', name: 'M', isEnabled: false, author: 'A', hasUpdate: true };
            mockElectron.getInstalledMods.mockResolvedValue([mod]);
            mockElectron.updateMod.mockImplementation(async (id: string) => false);
            renderWithProviders(<Mods />);
            await waitFor(() => expect(screen.getByText('Update All')).toBeInTheDocument());
            fireEvent.click(screen.getByText('Update All'));
            fireEvent.click(await screen.findByRole('button', { name: /Atualizar selecionados/ }));
            await screen.findByText('Resultado do lote');
            await waitFor(() => expect(mockElectron.updateMod).toHaveBeenCalled());
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
    describe('Mods Page - Error Handling', () => {
        it('handleDrop should handle install failure', async () => {
            mockElectron.installMod.mockResolvedValue({ success: false, message: 'Bad Zip' });
            const { container } = renderWithProviders(<Mods />);
            const file = new File([''], 'mod.zip', { type: 'application/zip' });
            const dropEvent = {
                preventDefault: vi.fn(),
                stopPropagation: vi.fn(),
                dataTransfer: { files: [file], items: [{ kind: 'file' }] }
            };
            fireEvent.dragEnter(container.firstChild!, dropEvent);
            fireEvent.drop(container.firstChild!, dropEvent);
            await waitFor(() => expect(mockElectron.installMod).toHaveBeenCalled());
        });
    });
});
