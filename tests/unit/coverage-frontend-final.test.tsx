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
  getProfiles: vi.fn(), // Added this
};

// Safely extend window
Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true
});

// Mock confirm
const originalConfirm = window.confirm;
window.confirm = vi.fn();

describe('Mods Page Final Coverage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockElectronAPI.getInstalledMods.mockResolvedValue([]);
    mockElectronAPI.fetchCategories.mockResolvedValue([]);
    mockElectronAPI.toggleMod.mockResolvedValue({ success: true });
    mockElectronAPI.updateMod.mockResolvedValue(true);
    mockElectronAPI.getProfiles.mockResolvedValue([]); // Mock return value
  });

  it('should handle drag and drop interactions correctly', async () => {
    const { container } = renderWithProviders(<Mods />);

    const dropZone = container.firstChild as HTMLElement;
    expect(dropZone).toBeInTheDocument();

    fireEvent.dragEnter(dropZone, {
        dataTransfer: { items: [{ kind: 'file' }] }
    });

    expect(await screen.findByText('Drop to Install')).toBeInTheDocument();

    fireEvent.dragLeave(dropZone);
    await waitFor(() => {
        expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
    });

    mockElectronAPI.installMod.mockResolvedValue({ success: true });

    const file = new File(['dummy'], 'mod.pak', { type: 'application/octet-stream' });
    Object.defineProperty(file, 'path', { value: '/path/to/mod.pak' });

    await act(async () => {
        fireEvent.drop(dropZone, {
            dataTransfer: { files: [file] }
        });
    });

    expect(mockElectronAPI.installMod).toHaveBeenCalledWith('/path/to/mod.pak');
  });

  it('should cancel uninstall if user declines confirmation', async () => {
    const mod = { id: '1', name: 'Test Mod', author: 'Author', version: '1.0', isEnabled: true };
    mockElectronAPI.getInstalledMods.mockResolvedValue([mod]);

    // @ts-ignore
    window.confirm.mockReturnValue(false);

    renderWithProviders(<Mods />);

    await screen.findByText('Test Mod');

    // Use specific selector based on ModCard implementation
    const deleteBtn = await screen.findByLabelText('Uninstall');

    fireEvent.click(deleteBtn);
    expect(window.confirm).toHaveBeenCalled();
    expect(mockElectronAPI.uninstallMod).not.toHaveBeenCalled();
  });

  it('should handle update all failure correctly', async () => {
      const mod1 = { id: '1', name: 'Mod 1', hasUpdate: true };
      const mod2 = { id: '2', name: 'Mod 2', hasUpdate: true };
      mockElectronAPI.getInstalledMods.mockResolvedValue([mod1, mod2]);
      mockElectronAPI.updateAllMods.mockResolvedValue({
          successCount: 1,
          failCount: 1,
          results: [{ id: '1', success: true }, { id: '2', success: false }]
      });

      renderWithProviders(<Mods />);

      const updateAllBtn = await screen.findByText('Update All');
      fireEvent.click(updateAllBtn);

      await waitFor(() => {
          expect(mockElectronAPI.updateAllMods).toHaveBeenCalled();
      });
  });

  it('should apply client-side filtering for nsfw/zerospark', async () => {
    mockElectronAPI.searchBySection.mockResolvedValue([
        { gameBananaId: 1, name: 'Normal Mod', isNsfw: false },
        { gameBananaId: 2, name: 'NSFW Mod', isNsfw: true },
        { gameBananaId: 3, name: 'ZeroSpark Mod', description: 'zerospark stuff' }
    ]);

    renderWithProviders(<Mods />);

    const browseBtn = screen.getByText('Browse Online');
    fireEvent.click(browseBtn);

    expect(await screen.findByText('Normal Mod')).toBeInTheDocument();
    expect(screen.queryByText('NSFW Mod')).not.toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText('Search online mods...');
    fireEvent.change(searchInput, { target: { value: 'zerospark' } });

    await act(async () => await new Promise(r => setTimeout(r, 600)));

    expect(mockElectronAPI.searchBySection).toHaveBeenCalledWith(expect.objectContaining({ search: 'zerospark' }));
  });
});
