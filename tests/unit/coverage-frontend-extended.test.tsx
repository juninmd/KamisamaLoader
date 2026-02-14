// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { screen, fireEvent, waitFor, act } from '@testing-library/react';
import Mods from '../../src/pages/Mods';
import { renderWithProviders } from './test-utils';

// Mock electronAPI
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
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

window.confirm = vi.fn();

describe('Mods Page Extended Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI.getInstalledMods.mockResolvedValue([]);
    mockElectronAPI.fetchCategories.mockResolvedValue([]);
    mockElectronAPI.getProfiles.mockResolvedValue([]);
    mockElectronAPI.updateMod.mockResolvedValue(true);
    mockElectronAPI.setModPriority.mockResolvedValue(true);
  });

  it('should handle conflict message when toggling mod', async () => {
      const mod = { id: '1', name: 'Mod 1', isEnabled: false };
      mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);
      mockElectronAPI.toggleMod.mockResolvedValue({ success: true, conflict: 'Conflict Warning' });

      await act(async () => {
        renderWithProviders(<Mods />);
      });

      await waitFor(() => expect(screen.getByText('Mod 1')).toBeInTheDocument());

      const switchEl = screen.getByRole('checkbox');

      await act(async () => {
        fireEvent.click(switchEl);
      });

      await waitFor(() => {
          expect(mockElectronAPI.toggleMod).toHaveBeenCalledWith('1', true);
      });
  });

  it('should revert state if toggle fails', async () => {
      const mod = { id: '1', name: 'Mod 1', isEnabled: false };
      mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);
      mockElectronAPI.toggleMod.mockResolvedValue({ success: false });

      await act(async () => {
        renderWithProviders(<Mods />);
      });
      await waitFor(() => expect(screen.getByText('Mod 1')).toBeInTheDocument());

      const switchEl = screen.getByRole('checkbox');

      await act(async () => {
        fireEvent.click(switchEl);
      });

      await waitFor(() => {
          expect(mockElectronAPI.toggleMod).toHaveBeenCalled();
      });
  });

  it('should handle priority change click', async () => {
      const mod = { id: '1', name: 'Mod 1', isEnabled: true, priority: 1 };
      mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);
      mockElectronAPI.setModPriority.mockResolvedValue(true);

      await act(async () => {
        renderWithProviders(<Mods />);
      });
      await waitFor(() => expect(screen.getByText('Prio: 1')).toBeInTheDocument());

      const upBtn = screen.getByTitle('Increase Priority (Move Up)');

      await act(async () => {
        fireEvent.click(upBtn);
      });

      expect(mockElectronAPI.setModPriority).toHaveBeenCalledWith('1', 'up');
  });

  it('should handle priority change failure', async () => {
      const mod = { id: '1', name: 'Mod 1', isEnabled: true, priority: 1 };
      mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);
      mockElectronAPI.setModPriority.mockResolvedValue(false);

      await act(async () => {
        renderWithProviders(<Mods />);
      });
      await waitFor(() => expect(screen.getByText('Prio: 1')).toBeInTheDocument());

      const downBtn = screen.getByTitle('Decrease Priority (Move Down)');

      await act(async () => {
        fireEvent.click(downBtn);
      });

      expect(mockElectronAPI.setModPriority).toHaveBeenCalledWith('1', 'down');
  });
});
