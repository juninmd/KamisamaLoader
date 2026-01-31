// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, act } from '../test-utils';
import UpdateDialog from '../../../src/components/UpdateDialog';

describe('UpdateDialog', () => {
    const mockMod = {
        id: '1',
        name: 'Test Mod',
        latestVersion: '2.0'
    };
    const mockChangelog = {
        version: '2.0',
        date: 1234567890,
        changes: [{ cat: 'Addition', text: 'New feature' }]
    };
    const mockUpdate = vi.fn();
    const mockClose = vi.fn();

    it('should render updates', async () => {
        await act(async () => {
            renderWithProviders(
                <UpdateDialog
                    mod={mockMod}
                    changelog={mockChangelog}
                    isUpdating={false}
                    onUpdate={mockUpdate}
                    onClose={mockClose}
                />
            );
        });

        expect(screen.getByText('New: v2.0')).toBeInTheDocument();
        expect(screen.getByText('New feature')).toBeInTheDocument();
    });

    it('should trigger update', async () => {
        await act(async () => {
             renderWithProviders(
                <UpdateDialog
                    mod={mockMod}
                    changelog={mockChangelog}
                    isUpdating={false}
                    onUpdate={mockUpdate}
                    onClose={mockClose}
                />
            );
        });

        const updateBtn = screen.getByText('Yes, Update');
        await act(async () => {
            fireEvent.click(updateBtn);
        });
        expect(mockUpdate).toHaveBeenCalled();
    });

    it('should show updating state', async () => {
        await act(async () => {
             renderWithProviders(
                <UpdateDialog
                    mod={mockMod}
                    changelog={mockChangelog}
                    isUpdating={true}
                    onUpdate={mockUpdate}
                    onClose={mockClose}
                />
            );
        });

        expect(screen.getByText('Updating...')).toBeInTheDocument();
        expect(screen.getByText('Updating...').closest('button')).toBeDisabled();
    });
});
