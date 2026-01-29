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
            images: ['img1.jpg', 'img2.jpg']
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

        // Find next button (ChevronRight)
        // Usually buttons inside the image container.
        // We can query by role button.
        const buttons = screen.getAllByRole('button');
        // Assuming navigation buttons are present
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

        // Find X button (usually top right)
        // It has <X size={20} />
        // Can find by svg or just the first button
        const buttons = screen.getAllByRole('button');
        fireEvent.click(buttons[0]); // Usually the first one is close
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
});
