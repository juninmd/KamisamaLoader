// @vitest-environment happy-dom
import React from 'react';
import { screen, fireEvent, act, waitFor } from '@testing-library/react';
import Mods from '../../src/pages/Mods';
import { renderWithProviders } from './test-utils';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';

// Mock electronAPI
const electronAPI = {
  getSettings: vi.fn().mockResolvedValue({}),
  getInstalledMods: vi.fn().mockResolvedValue([]),
  fetchCategories: vi.fn().mockResolvedValue([]),
  searchBySection: vi.fn().mockResolvedValue([]),
  onDownloadScanFinished: vi.fn().mockReturnValue(() => {}),
  installMod: vi.fn(),
  updateAllMods: vi.fn(),
  checkForUpdates: vi.fn().mockResolvedValue([]),
  setModPriority: vi.fn(),
  toggleMod: vi.fn(),
  installOnlineMod: vi.fn(),
  uninstallMod: vi.fn(),
  updateMod: vi.fn(),
  getModChangelog: vi.fn(),
  getProfiles: vi.fn().mockResolvedValue([]),
  createProfile: vi.fn(),
  deleteProfile: vi.fn(),
  loadProfile: vi.fn(),
  getDownloads: vi.fn().mockResolvedValue([]),
  onDownloadProgress: vi.fn().mockReturnValue(() => {}),
  onDownloadUpdate: vi.fn().mockReturnValue(() => {}),
};

(window as any).electronAPI = electronAPI;

// Mock window.confirm
const originalConfirm = window.confirm;
window.confirm = vi.fn(() => true);

describe('Mods Page Final Gaps 2', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    electronAPI.getInstalledMods.mockResolvedValue([]);
    electronAPI.fetchCategories.mockResolvedValue([]);
    electronAPI.searchBySection.mockResolvedValue([]);
    electronAPI.onDownloadScanFinished.mockReturnValue(() => {});
    electronAPI.getProfiles.mockResolvedValue([]);
    electronAPI.getDownloads.mockResolvedValue([]);
    electronAPI.onDownloadProgress.mockReturnValue(() => {});
    electronAPI.onDownloadUpdate.mockReturnValue(() => {});
  });

  afterEach(() => {
    window.confirm = originalConfirm;
  });

  it('should handle drag and drop file installation', async () => {
    await act(async () => {
        renderWithProviders(<Mods />);
    });

    const dropZone = document.querySelector('.h-full.flex.flex-col.relative');
    expect(dropZone).toBeTruthy();

    // Drag Enter
    await act(async () => {
      fireEvent.dragEnter(dropZone!, {
        dataTransfer: { items: [{ kind: 'file' }] }
      });
    });

    expect(screen.getByText('Drop to Install')).toBeTruthy();

    // Drag Leave
    await act(async () => {
      fireEvent.dragLeave(dropZone!);
    });

    expect(screen.queryByText('Drop to Install')).toBeNull();

    // Drop
    electronAPI.installMod.mockResolvedValue({ success: true });

    await act(async () => {
       fireEvent.drop(dropZone!, {
        dataTransfer: { files: [{ path: '/test/mod.zip' }] }
       });
    });

    expect(electronAPI.installMod).toHaveBeenCalledWith('/test/mod.zip');
  });

  it('should handle onDownloadScanFinished event', async () => {
    let callback: any;
    electronAPI.onDownloadScanFinished.mockImplementation((cb: any) => {
        callback = cb;
        return () => {};
    });

    await act(async () => {
        renderWithProviders(<Mods />);
    });

    expect(callback).toBeDefined();

    await act(async () => {
        callback();
    });

    expect(electronAPI.getInstalledMods).toHaveBeenCalled();
    // Verify tab switch by checking active class on Downloads button
    const downloadsBtn = screen.getByText('Downloads');
    expect(downloadsBtn.className).toContain('bg-blue-600');
  });

  it('should handle loadCategories error gracefully', async () => {
    electronAPI.fetchCategories.mockRejectedValue(new Error('Failed'));

    await act(async () => {
      renderWithProviders(<Mods />);
    });

    const browseBtn = screen.getByText('Browse Online');
    await act(async () => {
        fireEvent.click(browseBtn);
    });

    expect(screen.getByPlaceholderText('Search online mods...')).toBeTruthy();
  });

  it('should handle handleUpdateAll mixed results', async () => {
      electronAPI.getInstalledMods.mockResolvedValue([
          { id: '1', name: 'Mod 1', hasUpdate: true, isEnabled: true, author: 'A', version: '1.0', latestVersion: '2.0', fileSize: 100 },
          { id: '2', name: 'Mod 2', hasUpdate: true, isEnabled: true, author: 'B', version: '1.0', latestVersion: '2.0', fileSize: 100 }
      ]);

      await act(async () => {
          renderWithProviders(<Mods />);
      });

      await waitFor(() => expect(screen.getByText('Mod 1')).toBeTruthy());

      const updateAllBtn = screen.getByText('Update All');

      electronAPI.updateAllMods.mockResolvedValue({
          successCount: 1,
          failCount: 1,
          results: [
              { id: '1', success: true },
              { id: '2', success: false }
          ]
      });

      await act(async () => {
          fireEvent.click(updateAllBtn);
      });

      expect(electronAPI.updateAllMods).toHaveBeenCalled();
  });
});
