// @vitest-environment happy-dom
import { mockElectronAPI } from './final-gaps-frontend.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Mods from '../../src/pages/Mods';
import { MockToastProvider, MockSettingsProvider } from './test-utils';
describe('Frontend Final Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
        mockElectronAPI.searchBySection.mockResolvedValue([]);
        mockElectronAPI.checkForUpdates.mockResolvedValue([]);
        mockElectronAPI.getProfiles.mockResolvedValue([]);
        mockElectronAPI.getSettings.mockResolvedValue({});
    });
    describe('Mods Page Error Handling', () => {
        it('should handle updateAllMods failure', async () => {
            const mod = { id: '1', name: 'Mod 1', hasUpdate: true, version: '1.0' };
            mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);
            mockElectronAPI.updateMod.mockRejectedValue(new Error('Update Failed'));
            await act(async () => {
                render(<MockToastProvider>
                        <MockSettingsProvider>
                            <Mods />
                        </MockSettingsProvider>
                    </MockToastProvider>);
            });
            const updateAllBtn = await screen.findByText('Update All');
            await act(async () => {
                fireEvent.click(updateAllBtn);
            });
            fireEvent.click(await screen.findByRole('button', { name: /Atualizar selecionados/ }));
            await screen.findByText('Resultado do lote');
            await waitFor(() => {
                expect(screen.getByText(/Falhou · tente novamente/)).toBeInTheDocument();
            });
        });
    });
});
describe('Frontend Final Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
        mockElectronAPI.searchBySection.mockResolvedValue([]);
        mockElectronAPI.checkForUpdates.mockResolvedValue([]);
        mockElectronAPI.getProfiles.mockResolvedValue([]);
        mockElectronAPI.getSettings.mockResolvedValue({});
    });
    describe('Mods Page Error Handling', () => {
        it('should handle performUpdate failure', async () => {
            const mod = { id: '1', name: 'Mod 1', hasUpdate: true, version: '1.0' };
            mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);
            mockElectronAPI.getModChangelog.mockResolvedValue({ text: 'Changelog' });
            mockElectronAPI.updateMod.mockResolvedValue(false);
            await act(async () => {
                render(<MockToastProvider>
                        <MockSettingsProvider>
                            <Mods />
                        </MockSettingsProvider>
                    </MockToastProvider>);
            });
            const updateBtn = await screen.findByRole('button', { name: 'Update' });
            await act(async () => {
                fireEvent.click(updateBtn);
            });
            const confirmUpdateBtn = await screen.findByText('Yes, Update');
            await act(async () => {
                fireEvent.click(confirmUpdateBtn);
            });
            await waitFor(() => {
                expect(screen.getByText('Failed to update mod')).toBeInTheDocument();
            });
        });
    });
});
describe('Frontend Final Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
        mockElectronAPI.searchBySection.mockResolvedValue([]);
        mockElectronAPI.checkForUpdates.mockResolvedValue([]);
        mockElectronAPI.getProfiles.mockResolvedValue([]);
        mockElectronAPI.getSettings.mockResolvedValue({});
    });
    describe('Mods Page Error Handling', () => {
        it('should handle installOnlineMod failure', async () => {
            mockElectronAPI.fetchCategories.mockResolvedValue([{ _idRow: 1, _sName: 'Cat', _nItemCount: 10 }]);
            mockElectronAPI.searchBySection.mockResolvedValue([
                { id: '1', name: 'Online Mod', author: 'Auth', version: '1.0' }
            ]);
            mockElectronAPI.installOnlineMod.mockResolvedValue({ success: false, message: 'Install Failed' });
            await act(async () => {
                render(<MockToastProvider>
                        <MockSettingsProvider>
                            <Mods />
                        </MockSettingsProvider>
                    </MockToastProvider>);
            });
            const browseTab = screen.getByText('Browse Online');
            await act(async () => {
                fireEvent.click(browseTab);
            });
            const installBtn = await screen.findByText('Download');
            await act(async () => {
                fireEvent.click(installBtn);
            });
            await waitFor(() => {
                expect(screen.getByText('Install Failed')).toBeInTheDocument();
            });
        });
    });
});
describe('Frontend Final Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
        mockElectronAPI.fetchCategories.mockResolvedValue([]);
        mockElectronAPI.searchBySection.mockResolvedValue([]);
        mockElectronAPI.checkForUpdates.mockResolvedValue([]);
        mockElectronAPI.getProfiles.mockResolvedValue([]);
        mockElectronAPI.getSettings.mockResolvedValue({});
    });
    describe('Mods Page Error Handling', () => {
        it('should handle installOnlineMod exception', async () => {
            mockElectronAPI.fetchCategories.mockResolvedValue([{ _idRow: 1, _sName: 'Cat', _nItemCount: 10 }]);
            mockElectronAPI.searchBySection.mockResolvedValue([
                { id: '1', name: 'Online Mod', author: 'Auth', version: '1.0' }
            ]);
            mockElectronAPI.installOnlineMod.mockRejectedValue(new Error('Network Error'));
            await act(async () => {
                render(<MockToastProvider>
                         <MockSettingsProvider>
                             <Mods />
                         </MockSettingsProvider>
                     </MockToastProvider>);
            });
            const browseTab = screen.getByText('Browse Online');
            await act(async () => { fireEvent.click(browseTab); });
            const installBtn = await screen.findByText('Download');
            await act(async () => { fireEvent.click(installBtn); });
            await waitFor(() => {
                expect(screen.getByText('Falha ao iniciar instalação.')).toBeInTheDocument();
            });
        });
    });
});
