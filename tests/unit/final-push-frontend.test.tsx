/**
 * @vitest-environment happy-dom
 */
import React from 'react';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders } from './test-utils';
import Mods from '../../src/pages/Mods';

// Mock electronAPI
if (!window.electronAPI) {
    (window as any).electronAPI = {};
}

describe('Final Push Frontend', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        window.electronAPI.onDownloadScanFinished = vi.fn(() => () => {});
        window.electronAPI.getInstalledMods = vi.fn().mockResolvedValue([]);
        window.electronAPI.fetchCategories = vi.fn().mockResolvedValue([]);
    });

    it('should handle successful drag and drop installation', async () => {
        window.electronAPI.installMod = vi.fn().mockResolvedValue({ success: true, message: 'Installed' });
        const { container } = renderWithProviders(<Mods />);

        const dropZone = container.firstChild as HTMLElement;
        const file = new File([''], 'mod.zip', { type: 'application/zip' });
        Object.defineProperty(file, 'path', { value: '/mod.zip' });

        const dragEnterEvent = new Event('dragenter', { bubbles: true });
        Object.defineProperty(dragEnterEvent, 'dataTransfer', { value: { items: [file] } });
        fireEvent(dropZone, dragEnterEvent);

        const dropEvent = new Event('drop', { bubbles: true });
        Object.defineProperty(dropEvent, 'dataTransfer', { value: { files: [file] } });
        fireEvent(dropZone, dropEvent);

        await waitFor(() => {
            expect(screen.getByText('Mod installed successfully')).toBeInTheDocument();
        });
        expect(window.electronAPI.installMod).toHaveBeenCalledWith('/mod.zip');
    });

    it('should handle uninstall success', async () => {
        const mods = [{ id: '1', name: 'Mod1', isEnabled: true }];
        window.electronAPI.getInstalledMods = vi.fn().mockResolvedValue(mods);
        window.electronAPI.uninstallMod = vi.fn().mockResolvedValue({ success: true });
        window.confirm = vi.fn().mockReturnValue(true);

        renderWithProviders(<Mods />);
        await waitFor(() => expect(screen.getByText('Mod1')).toBeInTheDocument());

        const uninstallBtn = screen.getByRole('button', { name: /uninstall/i });
        fireEvent.click(uninstallBtn);

        await waitFor(() => {
            expect(window.electronAPI.uninstallMod).toHaveBeenCalledWith('1');
            expect(screen.getByText('Mod uninstalled successfully')).toBeInTheDocument();
        });
    });
});
