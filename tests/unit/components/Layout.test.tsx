// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen, fireEvent, act } from '../test-utils';
import MainLayout from '../../../src/layouts/MainLayout';

describe('MainLayout', () => {
    it('should render content and navigation', async () => {
        const mockNavigate = vi.fn();
        await act(async () => {
             renderWithProviders(
                <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                    <div>Content</div>
                </MainLayout>
            );
        });

        expect(screen.getByText('Content')).toBeInTheDocument();
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('My Mods')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should navigate', async () => {
        const mockNavigate = vi.fn();
        await act(async () => {
             renderWithProviders(
                <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                    <div>Content</div>
                </MainLayout>
            );
        });

        await act(async () => {
             fireEvent.click(screen.getByText('Settings'));
        });
        expect(mockNavigate).toHaveBeenCalledWith('settings');
    });
});
