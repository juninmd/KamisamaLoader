// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../test-utils';
import MainLayout from '../../../src/layouts/MainLayout';

describe('MainLayout', () => {
    it('should render content and navigation', () => {
        const mockNavigate = vi.fn();
        renderWithProviders(
            <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                <div>Content</div>
            </MainLayout>
        );

        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('My Mods')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should navigate', () => {
        const mockNavigate = vi.fn();
        renderWithProviders(
            <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                <div>Content</div>
            </MainLayout>
        );

        fireEvent.click(screen.getByText('Settings'));
        expect(mockNavigate).toHaveBeenCalledWith('settings');
    });
});
