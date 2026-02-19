// @vitest-environment happy-dom
import { describe, it, expect, vi } from 'vitest';
import { renderWithProviders, screen } from './test-utils';
import MainLayout from '../../src/layouts/MainLayout';

describe('Background Layout', () => {
    it('should render background image when setting is present', () => {
        const mockNavigate = vi.fn();
        const { container } = renderWithProviders(
            <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                <div>Content</div>
            </MainLayout>,
            {
                initialSettings: {
                    backgroundImage: 'https://example.com/bg.jpg',
                    backgroundOpacity: 0.8
                }
            }
        );

        // The root div or one of the divs should have the background style
        const rootDiv = container.firstChild as HTMLElement;
        expect(rootDiv).toHaveStyle({
            backgroundImage: 'url(https://example.com/bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        });

        // The overlay should have opacity
        const overlay = rootDiv.querySelector('.absolute.inset-0.bg-black');
        expect(overlay).toBeInTheDocument();
        expect(overlay).toHaveStyle({ opacity: '0.8' });
    });

    it('should not render overlay if no background image', () => {
        const mockNavigate = vi.fn();
        const { container } = renderWithProviders(
            <MainLayout activePage="dashboard" onNavigate={mockNavigate}>
                <div>Content</div>
            </MainLayout>,
            {
                initialSettings: {
                    backgroundImage: '',
                    backgroundOpacity: 0.8
                }
            }
        );

        const rootDiv = container.firstChild as HTMLElement;
        expect(rootDiv.style.backgroundImage).toBe('');

        const overlay = rootDiv.querySelector('.absolute.inset-0.bg-black');
        expect(overlay).not.toBeInTheDocument();
    });
});
