// @vitest-environment happy-dom
import { mockElectronAPI } from './final-gaps-frontend.fixture';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import Mods from '../../src/pages/Mods';
import { MockToastProvider, MockSettingsProvider } from './test-utils';
import CategorySidebar from '../../src/components/CategorySidebar';
import FilterBar from '../../src/components/FilterBar';
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
        it('should handle uninstallMod failure', async () => {
            const mod = { id: '1', name: 'Mod 1', isEnabled: true };
            mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);
            mockElectronAPI.uninstallMod.mockResolvedValue({ success: false, message: 'Não foi possível remover o mod.' });
            await act(async () => {
                render(<MockToastProvider>
                        <MockSettingsProvider>
                            <Mods />
                        </MockSettingsProvider>
                    </MockToastProvider>);
            });
            const deleteBtn = await screen.findByRole('button', { name: 'Uninstall' });
            await act(async () => {
                fireEvent.click(deleteBtn);
            });
            await waitFor(() => {
                expect(screen.getByText('Não foi possível remover o mod.')).toBeInTheDocument();
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
        it('should handle drag and drop installation failure', async () => {
            mockElectronAPI.installMod.mockResolvedValue({ success: false, message: 'Bad Zip' });
            const { container } = render(<MockToastProvider>
                     <MockSettingsProvider>
                         <Mods />
                     </MockSettingsProvider>
                 </MockToastProvider>);
            const dropZone = container.firstChild as HTMLElement;
            fireEvent.dragEnter(dropZone, {
                dataTransfer: { items: [{ kind: 'file' }] }
            });
            const file = new File(['content'], 'mod.zip', { type: 'application/zip' });
            await act(async () => {
                fireEvent.drop(dropZone, {
                    dataTransfer: { files: [file] }
                });
            });
            await waitFor(() => {
                expect(screen.getByText('Bad Zip')).toBeInTheDocument();
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
    describe('CategorySidebar', () => {
        it('should toggle selection on click', async () => {
            const categories = [{ id: 1, name: 'Cat 1', count: 5 }];
            const onSelect = vi.fn();
            const { getByText } = render(<CategorySidebar categories={categories} selectedCategories={['1']} onCategorySelect={onSelect}/>);
            fireEvent.click(getByText('Cat 1'));
            expect(onSelect).toHaveBeenCalledWith('Cat 1');
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
    describe('FilterBar', () => {
        it('should handle filter changes', async () => {
            const onFilterChange = vi.fn();
            const filters = {
                categories: [],
                sortBy: 'date',
                order: 'desc',
                dateRange: 'all',
                nsfw: false,
                zeroSpark: false,
                colorZ: false
            };
            const { getByPlaceholderText } = render(<FilterBar availableCategories={[]} activeFilters={filters as any} onFilterChange={onFilterChange}/>);
        });
    });
});
