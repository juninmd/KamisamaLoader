// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent, act } from '../test-utils';
import Settings from '../../../src/pages/Settings';

describe('Settings Gaps', () => {
    it('should render with undefined optional settings', async () => {
        const minimalSettings = {
            gamePath: '/game',
            modDownloadPath: undefined,
            backgroundImage: undefined,
            backgroundOpacity: undefined,
            launchArgs: undefined
        };
        (window.electronAPI.getSettings as any).mockResolvedValue(minimalSettings);

        renderWithProviders(<Settings />, { initialSettings: minimalSettings });

        await waitFor(() => {
            expect(screen.getByDisplayValue('/game')).toBeInTheDocument();
        });

        // Check defaults
        // Opacity should default to 70% (0.7) -> 70% text
        expect(screen.getByText('70%')).toBeInTheDocument();

        // Inputs should be empty string, not undefined (controlled inputs)
        const bgInput = screen.getByPlaceholderText('URL or Path to background image') as HTMLInputElement;
        expect(bgInput.value).toBe('');
    });

    it('should render advanced settings with undefined launchArgs', async () => {
        const minimalSettings = {
            gamePath: '/game',
            launchArgs: undefined
        };
        (window.electronAPI.getSettings as any).mockResolvedValue(minimalSettings);

        renderWithProviders(<Settings />, { initialSettings: minimalSettings });

        await waitFor(() => {
            expect(screen.getByDisplayValue('/game')).toBeInTheDocument();
        });

        // Click Show Advanced Settings
        const advancedBtn = screen.getByText('Show Advanced Settings');
        fireEvent.click(advancedBtn);

        // Verify input has empty value instead of undefined
        const launchArgsInput = await screen.findByPlaceholderText('-dx11 -windowed') as HTMLInputElement;
        expect(launchArgsInput.value).toBe('');

        // Type to update launchArgs
        fireEvent.change(launchArgsInput, { target: { value: '-test' } });
        expect(window.electronAPI.saveSettings).toHaveBeenCalledWith(expect.objectContaining({
            launchArgs: '-test'
        }));
    });

    it('should handle export and import cloud sync (Lines 126-139)', async () => {
        const minimalSettings = {
            gamePath: '/game',
        };
        (window.electronAPI.getSettings as any).mockResolvedValue(minimalSettings);

        // Mock the electronAPI functions for export/import
        window.electronAPI.exportCloudSync = vi.fn().mockResolvedValue({ success: true, message: 'Exported' });
        window.electronAPI.importCloudSync = vi.fn().mockResolvedValue({ success: false, message: 'Import Failed' });

        renderWithProviders(<Settings />, { initialSettings: minimalSettings });

        await waitFor(() => {
            expect(screen.getByText('Export to Cloud Zip')).toBeInTheDocument();
        });

        // Test Export
        const exportBtn = screen.getByText('Export to Cloud Zip');
        await act(async () => {
            fireEvent.click(exportBtn);
        });

        await waitFor(() => {
            expect(window.electronAPI.exportCloudSync).toHaveBeenCalled();
        });

        // Test Import
        const importBtn = screen.getByText('Import from Cloud Zip');
        await act(async () => {
            fireEvent.click(importBtn);
        });

        await waitFor(() => {
            expect(window.electronAPI.importCloudSync).toHaveBeenCalled();
        });
    });

    it('should handle export and import cloud sync failures (Lines 126-139)', async () => {
        const minimalSettings = {
            gamePath: '/game',
        };
        (window.electronAPI.getSettings as any).mockResolvedValue(minimalSettings);

        // Mock the electronAPI functions for export/import to fail
        window.electronAPI.exportCloudSync = vi.fn().mockResolvedValue({ success: false, message: 'Export Failed' });
        window.electronAPI.importCloudSync = vi.fn().mockResolvedValue({ success: true, message: 'Imported' });

        renderWithProviders(<Settings />, { initialSettings: minimalSettings });

        await waitFor(() => {
            expect(screen.getByText('Export to Cloud Zip')).toBeInTheDocument();
        });

        // Test Export
        const exportBtn = screen.getByText('Export to Cloud Zip');
        await act(async () => {
            fireEvent.click(exportBtn);
        });

        await waitFor(() => {
            expect(window.electronAPI.exportCloudSync).toHaveBeenCalled();
        });

        // Test Import
        const importBtn = screen.getByText('Import from Cloud Zip');
        await act(async () => {
            fireEvent.click(importBtn);
        });

        await waitFor(() => {
            expect(window.electronAPI.importCloudSync).toHaveBeenCalled();
        });
    });
});
