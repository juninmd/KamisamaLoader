// @vitest-environment happy-dom
import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, waitFor, fireEvent } from './test-utils';
import Mods from '../../src/pages/Mods';
import Settings from '../../src/pages/Settings';

const mockElectronAPI = {
  getInstalledMods: vi.fn(),
  searchBySection: vi.fn(),
  fetchCategories: vi.fn(),
  onDownloadScanFinished: vi.fn().mockReturnValue(vi.fn()),
  checkForUpdates: vi.fn(),
  updateAllMods: vi.fn(),
  updateMod: vi.fn(),
  toggleMod: vi.fn(),
  installOnlineMod: vi.fn(),
  uninstallMod: vi.fn(),
  setModPriority: vi.fn(),
  installMod: vi.fn(),
  getModChangelog: vi.fn(),
  getProfiles: vi.fn(),
  getSettings: vi.fn(),
  exportCloudSync: vi.fn(),
  importCloudSync: vi.fn(),
  installUE4SS: vi.fn()
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

describe('Mods and Settings Extended Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI.getInstalledMods.mockResolvedValue([]);
    mockElectronAPI.fetchCategories.mockResolvedValue([{ id: 1, name: 'Characters', count: 10 }]);
    mockElectronAPI.getProfiles.mockResolvedValue([]);
    mockElectronAPI.searchBySection.mockResolvedValue([]);
    mockElectronAPI.getSettings.mockResolvedValue({
        gamePath: '/game/path',
        modDownloadPath: '/mods/path',
        backgroundImage: '',
        backgroundOpacity: 0.7,
        launchArgs: '-dx11'
    });
  });

  it('should filter installed mods', async () => {
    mockElectronAPI.getInstalledMods.mockResolvedValue([{
        id: '1',
        name: 'Mod 1',
        author: 'Author',
        version: '1.0',
        isEnabled: true,
        hasUpdate: false
    }, {
        id: '2',
        name: 'Mod 2',
        author: 'Author',
        version: '1.0',
        isEnabled: false,
        hasUpdate: true
    }]);

    renderWithProviders(<Mods />);

    await waitFor(() => {
        expect(screen.getByText('Mod 1')).toBeInTheDocument();
        expect(screen.getByText('Mod 2')).toBeInTheDocument();
    });

    const select = screen.getByRole('combobox');

    fireEvent.change(select, { target: { value: 'enabled' } });
    await waitFor(() => {
        expect(screen.getByText('Mod 1')).toBeInTheDocument();
        expect(screen.queryByText('Mod 2')).not.toBeInTheDocument();
    });

    fireEvent.change(select, { target: { value: 'disabled' } });
    await waitFor(() => {
        expect(screen.queryByText('Mod 1')).not.toBeInTheDocument();
        expect(screen.getByText('Mod 2')).toBeInTheDocument();
    });

    fireEvent.change(select, { target: { value: 'updates' } });
    await waitFor(() => {
        expect(screen.queryByText('Mod 1')).not.toBeInTheDocument();
        expect(screen.getByText('Mod 2')).toBeInTheDocument();
    });
  });

  it('should handle update all', async () => {
    mockElectronAPI.getInstalledMods.mockResolvedValue([{
        id: '1',
        gameBananaId: 123,
        name: 'Mod 1',
        author: 'Author',
        version: '1.0',
        isEnabled: true,
        hasUpdate: true
    }]);
    mockElectronAPI.updateAllMods.mockResolvedValue({
        success: true,
        message: 'Updated',
        results: [{ id: '1', success: true }],
        failCount: 0,
        successCount: 1
    });

    renderWithProviders(<Mods />);

    await waitFor(() => {
        expect(screen.getByText('Update All')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Update All'));

    await waitFor(() => {
        expect(mockElectronAPI.updateAllMods).toHaveBeenCalled();
    });
  });

  it('should handle check updates', async () => {
    mockElectronAPI.getInstalledMods.mockResolvedValue([{
        id: '1',
        gameBananaId: 123,
        name: 'Mod 1',
        author: 'Author',
        version: '1.0',
        isEnabled: true,
        hasUpdate: false
    }]);
    mockElectronAPI.checkForUpdates.mockResolvedValue(['1']);

    renderWithProviders(<Mods />);

    await waitFor(() => {
        expect(screen.getByText('Check Updates')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Check Updates'));

    await waitFor(() => {
        expect(mockElectronAPI.checkForUpdates).toHaveBeenCalled();
    });
  });

  it('should handle refresh online mods button', async () => {
    renderWithProviders(<Mods />);

    const browseTab = await screen.findByText('Browse Online');
    fireEvent.click(browseTab);

    await waitFor(() => {
        expect(screen.getByTitle('Refresh Online Mods')).toBeInTheDocument();
    });

    const refreshBtn = screen.getByTitle('Refresh Online Mods');
    fireEvent.click(refreshBtn);

    await waitFor(() => {
        expect(mockElectronAPI.searchBySection).toHaveBeenCalled();
    });
  });

  it('should show success toast on successful export', async () => {
      mockElectronAPI.exportCloudSync.mockResolvedValue({ success: true, message: 'Export successful' });
      renderWithProviders(<Settings />);

      await waitFor(() => {
          expect(screen.getByText('Export to Cloud Zip')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Export to Cloud Zip'));
      await waitFor(() => {
          expect(mockElectronAPI.exportCloudSync).toHaveBeenCalled();
      });
  });

  it('should show success toast on successful import', async () => {
      mockElectronAPI.importCloudSync.mockResolvedValue({ success: true, message: 'Import successful' });
      renderWithProviders(<Settings />);

      await waitFor(() => {
          expect(screen.getByText('Import from Cloud Zip')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Import from Cloud Zip'));
      await waitFor(() => {
          expect(mockElectronAPI.importCloudSync).toHaveBeenCalled();
      });
  });

  it('should show advanced settings and handle args change', async () => {
      renderWithProviders(<Settings />);

      await waitFor(() => {
          expect(screen.getByText('Show Advanced Settings')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Show Advanced Settings'));

      await waitFor(() => {
          expect(screen.getByPlaceholderText('-dx11 -windowed')).toBeInTheDocument();
      });
  });

  it('should handle UE4SS install failure', async () => {
      mockElectronAPI.installUE4SS.mockResolvedValue({ success: false, message: 'Install failed' });
      renderWithProviders(<Settings />);

      await waitFor(() => {
          expect(screen.getByText('Install / Update UE4SS')).toBeInTheDocument();
      });

      fireEvent.click(screen.getByText('Install / Update UE4SS'));
      await waitFor(() => {
          expect(mockElectronAPI.installUE4SS).toHaveBeenCalled();
      });
  });
});
