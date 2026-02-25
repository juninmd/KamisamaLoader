// @vitest-environment happy-dom
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Mods from '../../src/pages/Mods';
import { vi, describe, it, expect, beforeEach, beforeAll } from 'vitest';
import React from 'react';

// Mock Toast
const mockShowToast = vi.fn();
vi.mock('../../src/components/ToastContext', () => ({
    useToast: () => ({ showToast: mockShowToast })
}));

// Mock dependencies to focus on Mods.tsx logic
vi.mock('../../src/components/ProfileManager', () => ({ default: () => <div>ProfileManager</div> }));
vi.mock('../../src/components/FilterBar', () => ({ default: () => <div>FilterBar</div> }));
vi.mock('../../src/components/CategorySidebar', () => ({ default: () => <div>CategorySidebar</div> }));
vi.mock('../../src/components/mods/ModGrid', () => ({ ModGrid: () => <div>ModGrid</div> }));

// Setup API
const mockElectronAPI = {
    getInstalledMods: vi.fn().mockResolvedValue([]),
    fetchCategories: vi.fn().mockResolvedValue([]),
    searchBySection: vi.fn().mockResolvedValue([]),
    onDownloadScanFinished: vi.fn(() => () => {}),
    installMod: vi.fn(),
    checkForUpdates: vi.fn().mockResolvedValue([]),
};

beforeAll(() => {
    Object.defineProperty(window, 'electronAPI', { value: mockElectronAPI, writable: true });
});

describe('Mods Page Gaps', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        mockElectronAPI.getInstalledMods.mockResolvedValue([]);
    });

    it('should handle drag and drop install failure', async () => {
        mockElectronAPI.installMod.mockResolvedValue({ success: false, message: 'Invalid file' });

        const { container } = render(<Mods />);

        // Create drag event
        const dropEvent = {
            preventDefault: vi.fn(),
            stopPropagation: vi.fn(),
            dataTransfer: {
                files: [{ path: '/test/mod.zip' }],
                items: [{ kind: 'file' }]
            }
        };

        // Trigger drag enter to set state
        fireEvent.dragEnter(container.firstChild as HTMLElement, dropEvent);

        // Trigger drop
        fireEvent.drop(container.firstChild as HTMLElement, dropEvent);

        await waitFor(() => {
            expect(mockElectronAPI.installMod).toHaveBeenCalledWith('/test/mod.zip');
            expect(mockShowToast).toHaveBeenCalledWith('Invalid file', 'error');
        });
    });

    it('should handle drag leave', () => {
         const { container } = render(<Mods />);
         const event = { preventDefault: vi.fn(), stopPropagation: vi.fn(), dataTransfer: { items: [{}] } };

         fireEvent.dragEnter(container.firstChild as HTMLElement, event);

         // Assert overlay is present
         expect(screen.getByText('Drop to Install')).toBeInTheDocument();

         fireEvent.dragLeave(container.firstChild as HTMLElement, event);

         // Assert overlay is gone
         expect(screen.queryByText('Drop to Install')).toBeNull();
    });
});
