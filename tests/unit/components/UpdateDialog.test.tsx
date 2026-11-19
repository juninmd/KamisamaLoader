// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../test-utils';
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

    it('should render updates', () => {
        renderWithProviders(
            <UpdateDialog
                mod={mockMod}
                changelog={mockChangelog}
                isUpdating={false}
                onUpdate={mockUpdate}
                onClose={mockClose}
            />
        );

        expect(screen.getByText('New: v2.0')).toBeInTheDocument();
        expect(screen.getByText('New feature')).toBeInTheDocument();
    });

    it('should handle missing changelog', () => {
        renderWithProviders(
            <UpdateDialog
                mod={mockMod}
                changelog={null}
                isUpdating={false}
                onUpdate={mockUpdate}
                onClose={mockClose}
            />
        );

        expect(screen.getByText('New: v2.0')).toBeInTheDocument();
        expect(screen.getByText('No detailed changelog available.')).toBeInTheDocument();
    });

    it('should trigger update', () => {
        renderWithProviders(
            <UpdateDialog
                mod={mockMod}
                changelog={mockChangelog}
                isUpdating={false}
                onUpdate={mockUpdate}
                onClose={mockClose}
            />
        );

        fireEvent.click(screen.getByText('Yes, Update'));
        expect(mockUpdate).toHaveBeenCalled();
    });

    it('should show updating state', () => {
        renderWithProviders(
            <UpdateDialog
                mod={mockMod}
                changelog={mockChangelog}
                isUpdating={true}
                onUpdate={mockUpdate}
                onClose={mockClose}
            />
        );

        expect(screen.getByText('Updating...')).toBeInTheDocument();
        expect(screen.getByText('Updating...').closest('button')).toBeDisabled();
    });
});

describe('UpdateDialog accessibility', () => {
    const mod = { id: '1', name: 'Test Mod', latestVersion: '2.0' };

    it('is exposed as a labelled modal dialog with a named close button', () => {
        const onClose = vi.fn();
        renderWithProviders(
            <UpdateDialog mod={mod} changelog={null} isUpdating={false} onUpdate={vi.fn()} onClose={onClose} />
        );
        const dialog = screen.getByRole('dialog', { name: 'Update Available' });
        expect(dialog).toHaveAttribute('aria-modal', 'true');
        fireEvent.click(screen.getByRole('button', { name: 'Close' }));
        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes on Escape', () => {
        const onClose = vi.fn();
        renderWithProviders(
            <UpdateDialog mod={mod} changelog={null} isUpdating={false} onUpdate={vi.fn()} onClose={onClose} />
        );
        fireEvent.keyDown(document, { key: 'Escape' });
        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
