// @vitest-environment happy-dom
import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import UpdateDialog from '../../../src/components/UpdateDialog.tsx';

describe('UpdateDialog Final Gaps', () => {
    const mockOnClose = vi.fn();
    const mockOnUpdate = vi.fn();
    const mockMod = {
        id: '1',
        name: 'Test Mod',
        iconUrl: 'icon.png',
        latestVersion: '2.0'
    };

    it('should render changelog entries correctly', () => {
        const changelog = {
            version: '2.0',
            date: 1234567890,
            changes: [
                { cat: 'Addition', text: 'New feature' },
                { cat: 'Removal', text: 'Removed bug' },
                { cat: 'Fix', text: 'Fixed crash' }
            ],
            title: 'Big Update'
        };

        render(
            <UpdateDialog
                mod={mockMod}
                changelog={changelog}
                isUpdating={false}
                onUpdate={mockOnUpdate}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText('Big Update')).toBeInTheDocument();
        expect(screen.getByText('New feature')).toBeInTheDocument();
        expect(screen.getByText('Addition')).toBeInTheDocument();
        expect(screen.getByText('Removed bug')).toBeInTheDocument();
        expect(screen.getByText('Removal')).toBeInTheDocument();
        expect(screen.getByText('Fixed crash')).toBeInTheDocument();
    });

    it('should show fallback message when no changelog is available', () => {
        render(
            <UpdateDialog
                mod={mockMod}
                changelog={null} // No changelog
                isUpdating={false}
                onUpdate={mockOnUpdate}
                onClose={mockOnClose}
            />
        );

        expect(screen.getByText('No detailed changelog available.')).toBeInTheDocument();
    });
});
