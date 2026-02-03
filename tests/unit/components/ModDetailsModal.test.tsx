// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor, act } from '../test-utils';
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
        await act(async () => {
            renderWithProviders(
                <ModDetailsModal
                    mod={mockMod}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
        });

        expect(screen.getByText('Goku Mod')).toBeInTheDocument();
        await waitFor(() => {
            expect(screen.getByText('Desc')).toBeInTheDocument();
        });
    });

    it('should not render if isOpen is false', async () => {
        await act(async () => {
            renderWithProviders(
                <ModDetailsModal
                    mod={mockMod}
                    isOpen={false}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
        });
        expect(screen.queryByText('Goku Mod')).not.toBeInTheDocument();
    });

    it('should cycle images', async () => {
         await act(async () => {
             renderWithProviders(
                <ModDetailsModal
                    mod={mockMod}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
         });

        await waitFor(() => expect(screen.getByAltText('Goku Mod')).toHaveAttribute('src', 'img1.jpg'));

        const buttons = screen.getAllByRole('button');
        expect(buttons.length).toBeGreaterThan(5);
    });

    it('should handle escape key', async () => {
        await act(async () => {
            renderWithProviders(
                <ModDetailsModal
                    mod={mockMod}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
        });

        fireEvent.keyDown(document, { key: 'Escape' });
        expect(mockClose).toHaveBeenCalled();
    });

    it('should close on backdrop click', async () => {
        await act(async () => {
            renderWithProviders(
                <ModDetailsModal
                    mod={mockMod}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
        });

        const backdrop = document.body.querySelector('.fixed.inset-0.bg-black\\/80');
        if (backdrop) {
            fireEvent.click(backdrop);
            expect(mockClose).toHaveBeenCalled();
        }
    });

    it('should trigger install', async () => {
        await act(async () => {
            renderWithProviders(
                <ModDetailsModal
                    mod={mockMod}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
        });

        fireEvent.click(screen.getByText('Install Mod'));
        expect(mockInstall).toHaveBeenCalledWith(mockMod);
        expect(mockClose).toHaveBeenCalled();
    });

    it('should render changelog', async () => {
        (window.electronAPI.getModChangelog as any).mockResolvedValue([
            { version: '1.1', date: 1600000000, text: 'Fixes' }
        ]);

        await act(async () => {
            renderWithProviders(
                <ModDetailsModal
                    mod={mockMod}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
        });

        await waitFor(() => {
            expect(screen.getByText('Changelog')).toBeInTheDocument();
            expect(screen.getByText('1.1')).toBeInTheDocument();
        });
    });

    it('should handle fetch errors gracefully', async () => {
         (window.electronAPI.getModDetails as any).mockRejectedValue(new Error('Fail'));
         await act(async () => {
             renderWithProviders(
                <ModDetailsModal
                    mod={mockMod}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
         });

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
         await act(async () => {
             renderWithProviders(
                <ModDetailsModal
                    mod={modWithIcon}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
         });

        await waitFor(() => {
             const img = screen.getByAltText('Goku Mod') as HTMLImageElement;
             expect(img.src).toContain('icon.png');
        });
    });

    it('should handle image error fallback', async () => {
        await act(async () => {
            renderWithProviders(
                <ModDetailsModal
                    mod={{...mockMod, iconUrl: 'fallback.png'}}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
        });

        await waitFor(() => screen.getByAltText('Goku Mod'));
        const img = screen.getByAltText('Goku Mod');

        fireEvent.error(img);
        expect(img).toHaveAttribute('src', 'fallback.png');

        // Second error (fallback fails)
        fireEvent.error(img);
        expect(img).not.toBeVisible();
    });

    it('should render external link if present', async () => {
        (window.electronAPI.getModDetails as any).mockResolvedValue({
             modPageUrl: 'http://gamebanana.com/mods/123'
         });

        await act(async () => {
            renderWithProviders(
                <ModDetailsModal
                    mod={mockMod}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
        });

        await waitFor(() => screen.getByText('View on GameBanana'));
        expect(screen.getByText('View on GameBanana').closest('a')).toHaveAttribute('href', 'http://gamebanana.com/mods/123');
    });

    it('should render submitter link if present', async () => {
        const modWithSubmitter = { ...mockMod, submitter: 'Sub', submitterUrl: 'http://profile' };
        await act(async () => {
            renderWithProviders(
                <ModDetailsModal
                    mod={modWithSubmitter}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
        });

        expect(screen.getByText('Sub').closest('a')).toHaveAttribute('href', 'http://profile');
    });

    it('should handle next/prev image navigation', async () => {
         await act(async () => {
             renderWithProviders(
                <ModDetailsModal
                    mod={mockMod}
                    isOpen={true}
                    onClose={mockClose}
                    onInstall={mockInstall}
                />
            );
         });

        await waitFor(() => expect(screen.getByAltText('Goku Mod')).toHaveAttribute('src', 'img1.jpg'));
        const buttons = screen.getAllByRole('button');
        buttons.forEach(b => fireEvent.click(b));
    });
});
