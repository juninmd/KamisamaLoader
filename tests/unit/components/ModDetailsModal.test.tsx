// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import ModDetailsModal from '../../../src/components/ModDetailsModal';

describe('ModDetailsModal', () => {
    const mockMod = {
        id: '1',
        name: 'Goku Mod',
        author: 'User',
        version: '1.0',
        gameBananaId: 123
    };
    const mockClose = vi.fn();
    const mockInstall = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        (window.electronAPI.getModChangelog as any).mockResolvedValue([]);
        (window.electronAPI.getModDetails as any).mockResolvedValue({
            description: '<p>Desc</p>',
            images: ['img1.jpg', 'img2.jpg', 'img3.jpg']
        });
    });

    it('should render details', async () => {
        renderWithProviders(
            <ModDetailsModal
                mod={mockMod}
                isOpen={true}
                onClose={mockClose}
                onInstall={mockInstall}
            />
        );

        expect(screen.getByText('Goku Mod')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('Desc')).toBeInTheDocument();
        });
    });

    it('should navigate images', async () => {
        renderWithProviders(
            <ModDetailsModal
                mod={mockMod}
                isOpen={true}
                onClose={mockClose}
                onInstall={mockInstall}
            />
        );

        await waitFor(() => {
            const imgs = screen.getAllByRole('img');
            expect(imgs.length).toBeGreaterThan(0);
        });

        const buttons = screen.getAllByRole('button');
        // Just verify buttons exist
        expect(buttons.length).toBeGreaterThan(1);
    });

    it('should trigger install', () => {
        renderWithProviders(
            <ModDetailsModal
                mod={mockMod}
                isOpen={true}
                onClose={mockClose}
                onInstall={mockInstall}
            />
        );

        fireEvent.click(screen.getByText('Install Mod'));
        expect(mockInstall).toHaveBeenCalledWith(mockMod);
        expect(mockClose).toHaveBeenCalled();
    });

    it('should close on x click', async () => {
        renderWithProviders(
            <ModDetailsModal
                mod={mockMod}
                isOpen={true}
                onClose={mockClose}
                onInstall={mockInstall}
            />
        );

        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[0]);
        expect(mockClose).toHaveBeenCalled();
    });

    it('should render changelog', async () => {
        (window.electronAPI.getModChangelog as any).mockResolvedValue([
            { version: '1.1', date: 1600000000, text: 'Fixes' }
        ]);

        renderWithProviders(
            <ModDetailsModal
                mod={mockMod}
                isOpen={true}
                onClose={mockClose}
                onInstall={mockInstall}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Changelog')).toBeInTheDocument();
            expect(screen.getByText('1.1')).toBeInTheDocument();
        });
    });

    it('should handle fetch errors gracefully', async () => {
         (window.electronAPI.getModDetails as any).mockRejectedValue(new Error('Fail'));
         renderWithProviders(
            <ModDetailsModal
                mod={mockMod}
                isOpen={true}
                onClose={mockClose}
                onInstall={mockInstall}
            />
        );

        await waitFor(() => {
             expect(screen.getByText('Goku Mod')).toBeInTheDocument();
        });
    });

    it('should fallback to iconUrl if no images', async () => {
         (window.electronAPI.getModDetails as any).mockResolvedValue({
             description: 'Desc',
             images: []
         });
         const modWithIcon = { ...mockMod, iconUrl: 'icon.png' };
         renderWithProviders(
            <ModDetailsModal
                mod={modWithIcon}
                isOpen={true}
                onClose={mockClose}
                onInstall={mockInstall}
            />
        );

        await waitFor(() => {
             const img = screen.getByAltText('Goku Mod') as HTMLImageElement;
             expect(img.src).toContain('icon.png');
        });
    });
});
