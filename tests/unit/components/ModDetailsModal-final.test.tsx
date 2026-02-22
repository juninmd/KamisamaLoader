// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ModDetailsModal from '../../../src/components/ModDetailsModal.tsx';

describe('ModDetailsModal Final Gaps', () => {
    const mockOnClose = vi.fn();
    const mockOnInstall = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock electronAPI
        window.electronAPI = {
            getModChangelog: vi.fn().mockResolvedValue([]),
            getModDetails: vi.fn().mockResolvedValue({})
        } as any;
    });

    it('should skip API calls for invalid gameBananaId', () => {
        const mod = {
            id: 'local-1',
            name: 'Local Mod',
            author: 'Me',
            version: '1.0',
            isEnabled: true,
            gameBananaId: -1 // Invalid
        };

        render(
            <ModDetailsModal
                mod={mod}
                isOpen={true}
                onClose={mockOnClose}
                onInstall={mockOnInstall}
            />
        );

        expect(window.electronAPI.getModChangelog).not.toHaveBeenCalled();
        expect(window.electronAPI.getModDetails).not.toHaveBeenCalled();
    });

    it('should handle image load error', async () => {
         const mod = {
            id: '1',
            name: 'Test Mod',
            author: 'Me',
            version: '1.0',
            isEnabled: true,
            iconUrl: 'http://fallback.com/icon.png',
            images: ['http://broken.com/image.png']
        };

        await act(async () => {
            render(
                <ModDetailsModal
                    mod={mod}
                    isOpen={true}
                    onClose={mockOnClose}
                    onInstall={mockOnInstall}
                />
            );
        });

        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', 'http://broken.com/image.png');

        // Fire error
        await act(async () => {
             fireEvent.error(img);
        });

        // Should fallback to iconUrl
        expect(img).toHaveAttribute('src', 'http://fallback.com/icon.png');
    });

    it('should hide image if error occurs and no fallback/already fallback', async () => {
         const mod = {
            id: '1',
            name: 'Test Mod',
            author: 'Me',
            version: '1.0',
            isEnabled: true,
            // No iconUrl
            images: ['http://broken.com/image.png']
        };

        await act(async () => {
            render(
                <ModDetailsModal
                    mod={mod}
                    isOpen={true}
                    onClose={mockOnClose}
                    onInstall={mockOnInstall}
                />
            );
        });

        const img = screen.getByRole('img');

        // Fire error
        await act(async () => {
             fireEvent.error(img);
        });

        expect(img).toHaveStyle('display: none');
    });

    it('should load details on mount', async () => {
        const mod = {
            id: '1',
            name: 'Test Mod',
            gameBananaId: 123
        };

        const mockDetails = {
            description: '<h1>Desc</h1>',
            images: ['img1.png'],
            modPageUrl: 'http://url.com'
        };

        (window.electronAPI.getModDetails as any).mockResolvedValue(mockDetails);

        await act(async () => {
            render(
                <ModDetailsModal
                    mod={mod as any}
                    isOpen={true}
                    onClose={mockOnClose}
                    onInstall={mockOnInstall}
                />
            );
        });

        expect(window.electronAPI.getModDetails).toHaveBeenCalledWith(123);
        // Check if description was set (by querying HTML content if possible, or just trust calls)
        // Check if images were set (hero image src)
        const img = screen.getByRole('img');
        expect(img).toHaveAttribute('src', 'img1.png');
    });
});
