// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Dashboard from '../../src/pages/Dashboard';
import Mods from '../../src/pages/Mods';
import { SettingsProvider } from '../../src/components/SettingsContext';
import { ToastProvider } from '../../src/components/ToastContext';

// Mock electronAPI
const mockElectronAPI = {
    getInstalledMods: vi.fn().mockResolvedValue([]),
    checkForUpdates: vi.fn().mockResolvedValue([]),
    fetchFeaturedMods: vi.fn().mockResolvedValue([]),
    launchGame: vi.fn().mockResolvedValue(true),
    onDownloadScanFinished: vi.fn(() => () => {}),
    fetchCategories: vi.fn().mockResolvedValue([]),
    searchBySection: vi.fn().mockResolvedValue([]),
    getSettings: vi.fn().mockResolvedValue({}),
    installMod: vi.fn().mockResolvedValue({ success: true }),
};

(window as any).electronAPI = mockElectronAPI;

// Mock child components that might cause issues or noise
vi.mock('../../src/components/ProfileManager', () => ({
    default: () => <div data-testid="profile-manager">ProfileManager</div>
}));

vi.mock('../../src/components/mods/ModGrid', () => ({
    ModGrid: () => <div data-testid="mod-grid">ModGrid</div>
}));

// Wrapper
const renderWithProviders = (ui: React.ReactNode) => {
    return render(
        <SettingsProvider>
            <ToastProvider>
                {ui}
            </ToastProvider>
        </SettingsProvider>
    );
};

describe('Frontend Final Gaps V4', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('Dashboard.tsx', () => {
        it('should handle character image error (Line 116)', async () => {
            const { container } = renderWithProviders(<Dashboard onNavigate={vi.fn()} />);

            // Find the image by selector since alt="" hides it from accessibility tree
            const charImg = container.querySelector('img[src*="fortniteapi.io"]') as HTMLImageElement;

            if (charImg) {
                // Initial state: visible (default)
                expect(charImg.style.display).not.toBe('none');

                // Trigger error
                fireEvent.error(charImg);

                // Check result: display none
                expect(charImg.style.display).toBe('none');
            } else {
                throw new Error('Character image not found');
            }
        });

        it('should handle navigation click on updates banner (Line 169)', async () => {
            // Mock updates to show the banner
            mockElectronAPI.checkForUpdates.mockResolvedValue(['mod1']);
            mockElectronAPI.getInstalledMods.mockResolvedValue([{
                id: 'mod1',
                isEnabled: true,
                name: 'Test Mod',
                author: 'Tester'
            }]);

            const onNavigate = vi.fn();

            await act(async () => {
                renderWithProviders(<Dashboard onNavigate={onNavigate} />);
            });

            // Find the update banner
            const updateBanner = await screen.findByText(/1 Updates Available/i);
            expect(updateBanner).toBeInTheDocument();

            // Click it
            fireEvent.click(updateBanner);

            expect(onNavigate).toHaveBeenCalledWith('mods');
        });
    });

    describe('Mods.tsx', () => {
        it('should handle drag and drop events (Lines 639-676)', async () => {
            mockElectronAPI.getInstalledMods.mockResolvedValue([]);
            const { container } = renderWithProviders(<Mods />);

            // The root div has the drag handlers.
            const rootDiv = container.firstChild as HTMLElement;

            // Initially query for "Drop to Install" -> should not exist.
            expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();

            // Fire Drag Enter
            const dragEvent = {
                dataTransfer: {
                    items: [{ kind: 'file' }],
                    files: [],
                    types: ['Files']
                }
            };

            await act(async () => {
                fireEvent.dragEnter(rootDiv, dragEvent);
            });

            // Overlay should appear
            expect(await screen.findByText('Drop to Install')).toBeInTheDocument();

            // Fire Drag Leave
            // We must fire it on the overlay itself or bubbles up?
            // The handler checks dragCounter.
            await act(async () => {
                fireEvent.dragLeave(rootDiv, dragEvent);
            });

            // Overlay should disappear
            await waitFor(() => {
                expect(screen.queryByText('Drop to Install')).not.toBeInTheDocument();
            });

            // Re-enter
            await act(async () => {
                fireEvent.dragEnter(rootDiv, dragEvent);
            });

            expect(await screen.findByText('Drop to Install')).toBeInTheDocument();

            // Test Drop
            const file = new File(['dummy content'], 'test.pak', { type: 'application/octet-stream' });
            Object.defineProperty(file, 'path', { value: '/path/to/test.pak' });

            const dropEvent = {
                dataTransfer: {
                    files: [file],
                    items: [{ kind: 'file' }]
                }
            };

            await act(async () => {
                fireEvent.drop(rootDiv, dropEvent);
            });

            expect(mockElectronAPI.installMod).toHaveBeenCalledWith('/path/to/test.pak');
        });
    });
});
