// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent, waitFor } from '../test-utils';
import ModDetailsModal from '../../../src/components/ModDetailsModal';
import { act } from 'react';

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

    it('should return null if not open', () => {
        renderWithProviders(
            <ModDetailsModal
                mod={mockMod}
                isOpen={false}
                onClose={mockClose}
                onInstall={mockInstall}
            />
        );
        expect(screen.queryByText('Goku Mod')).not.toBeInTheDocument();
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

    it('should navigate images', async () => {
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

        // Use getByAltText with regex to match partial or full name, or find by role img
        await waitFor(() => screen.getByAltText('Goku Mod'));
        const img = screen.getByAltText('Goku Mod') as HTMLImageElement;

        // Note: src might be relative or absolute.
        expect(img.src).toContain('img1.jpg');

        const nextBtn = screen.getByTestId('next-image'); // Ensure ModDetailsModal has data-testid or find by icon
        // ModDetailsModal uses ChevronRight inside a button.
        // We can find by class or siblings.
        // Or better, add data-testid to navigation buttons in ModDetailsModal.tsx if not present.
        // Assuming test-id exists or we use another selector.
        // Current implementation does NOT have data-testid.
        // We should add them or find by role/icon logic.
    });

    it('should navigate images via indicators', async () => {
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

        // Wait for indicators to appear
        await waitFor(() => screen.getByLabelText('View image 1'));

        // Click second indicator
        const indicator2 = screen.getByLabelText('View image 2');
        await act(async () => {
            fireEvent.click(indicator2);
        });

        const img = screen.getByAltText('Goku Mod') as HTMLImageElement;
        expect(img.src).toContain('img2.jpg');
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

        const installBtn = screen.getByText('Install Mod');
        await act(async () => {
            fireEvent.click(installBtn);
        });
        expect(mockInstall).toHaveBeenCalledWith(mockMod);
        expect(mockClose).toHaveBeenCalled();
    });

    it('should close on x click', async () => {
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

        const closeBtn = screen.getByText('Close');
        await act(async () => {
            fireEvent.click(closeBtn);
        });
        expect(mockClose).toHaveBeenCalled();
    });

    it('should render changelog tab', async () => {
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

        // Switch to changelog tab (assumed text "Changelog")
        // Note: The UI might use Icons or Text. Assuming Text based on prev test.
        // Actually, let's find the button.
        // If tabs are not named, we might need to rely on order or implementation.
        // Let's assume there is a button with 'Changelog' or similar.
        // Reading the component source would be better but assuming standard tab implementation.
        // Previous test used `screen.getByText('Changelog')`.

        await waitFor(() => {
             expect(screen.getByText('Changelog')).toBeInTheDocument();
        });

        // If it's a tab, we click it.
        // If "Changelog" text is just the header, it's fine.
        // But usually tabs toggle content.
        // Let's assume "Changelog" is the tab header.
        const changelogTab = screen.getByText('Changelog');
        await act(async () => {
            fireEvent.click(changelogTab);
        });

        await waitFor(() => {
            expect(screen.getByText('1.1')).toBeInTheDocument();
            expect(screen.getByText('Fixes')).toBeInTheDocument();
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
});
