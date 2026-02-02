// @vitest-environment happy-dom
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderWithProviders, screen, fireEvent } from '../test-utils';
import MainLayout from '../../../src/layouts/MainLayout';

describe('MainLayout', () => {
    const mockNavigate = vi.fn();

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock default settings via test-utils which already wraps with context
    });

    it('should render children', () => {
        renderWithProviders(
            <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                <div data-testid="child-content">Child Content</div>
            </MainLayout>
        );
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
        expect(screen.getByText('Child Content')).toBeInTheDocument();
    });

    it('should render sidebar items', () => {
        renderWithProviders(
            <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                <div />
            </MainLayout>
        );
        expect(screen.getByText('Dashboard')).toBeInTheDocument();
        expect(screen.getByText('My Mods')).toBeInTheDocument();
        expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    it('should highlight active page', () => {
        renderWithProviders(
            <MainLayout activePage="mods" onNavigate={mockNavigate}>
                <div />
            </MainLayout>
        );

        // Find the "My Mods" button. It should have "glass" variant classes or similar logic.
        // The implementation uses: isActive ? "glass" : "ghost"
        // And glass class in ui/Button is: bg-white/5 ...
        // We can check for a class specific to active state or check aria/data attributes if they existed.
        // But checking class names is brittle.
        // However, the text color changes.
        // "bg-primary/20 hover:bg-primary/30 text-white"

        const modsButton = screen.getByText('My Mods').closest('button');
        expect(modsButton).toHaveClass('bg-primary/20');

        const dashboardButton = screen.getByText('Dashboard').closest('button');
        expect(dashboardButton).not.toHaveClass('bg-primary/20');
    });

    it('should call onNavigate when clicking sidebar items', () => {
        renderWithProviders(
            <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                <div />
            </MainLayout>
        );

        fireEvent.click(screen.getByText('Settings'));
        expect(mockNavigate).toHaveBeenCalledWith('settings');
    });

    it('should apply background image from settings', () => {
        const initialSettings = {
            backgroundImage: '/path/to/bg.jpg',
            backgroundOpacity: 0.5
        };

        const { container } = renderWithProviders(
            <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                <div />
            </MainLayout>,
            { initialSettings }
        );

        // The background is applied to the root div
        const rootDiv = container.firstChild as HTMLElement;
        expect(rootDiv).toHaveStyle({
            backgroundImage: 'url(/path/to/bg.jpg)'
        });

        // Check overlay opacity
        // The overlay is absolute inset-0 bg-black
        // We need to find the overlay div. It doesn't have a test id.
        // But it is the first child of root that is absolute.
        // Or we can query by style.
        // Let's add data-testid if necessary, but testing styles directly via querySelector might work.
        // Structure: div (root) -> div (overlay) -> aside -> main

        // The overlay is strictly:
        // {settings.backgroundImage && (<div className="absolute inset-0..." ... />)}
        // So it should be the first child inside root.

        // However, renderWithProviders wraps MainLayout in Providers.
        // container.firstChild is usually the result of MainLayout (if providers are fragments or transparent).
        // Let's inspect container.

        // Wait, MainLayout returns a div.
        // Check for the overlay div.
        // It has `opacity: 0.5` inline style.

        // Using querySelector to find the overlay div
        // It has class 'bg-black' and 'backdrop-blur-sm'
        const overlay = container.querySelector('.bg-black.backdrop-blur-sm');
        expect(overlay).toBeInTheDocument();
        expect(overlay).toHaveStyle({ opacity: '0.5' });
    });

    it('should not render overlay if no background image', () => {
        const initialSettings = {
            backgroundImage: '',
        };

        const { container } = renderWithProviders(
            <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                <div />
            </MainLayout>,
            { initialSettings }
        );

        const overlay = container.querySelector('.bg-black.backdrop-blur-sm');
        expect(overlay).not.toBeInTheDocument();
    });
});
