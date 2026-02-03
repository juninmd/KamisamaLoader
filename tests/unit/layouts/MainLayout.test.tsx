// @vitest-environment happy-dom
import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import MainLayout from '../../../src/layouts/MainLayout';
import { SettingsProvider } from '../../../src/components/SettingsContext';

// Mock the settings hook
const mockSettings = {
    settings: {
        backgroundImage: 'http://example.com/bg.jpg',
        backgroundOpacity: 0.5
    }
};

vi.mock('../../../src/components/SettingsContext', async () => {
    const actual = await vi.importActual('../../../src/components/SettingsContext');
    return {
        ...actual,
        useSettings: () => mockSettings
    };
});

describe('MainLayout', () => {
    it('renders children correctly', () => {
        render(
            <MainLayout activePage="dashboard" onNavigate={vi.fn()}>
                <div data-testid="child-content">Content</div>
            </MainLayout>
        );
        expect(screen.getByTestId('child-content')).toBeInTheDocument();
    });

    it('applies background image and opacity from settings', () => {
        const { container } = render(
            <MainLayout activePage="dashboard" onNavigate={vi.fn()}>
                <div>Content</div>
            </MainLayout>
        );

        // Check root div style
        const rootDiv = container.firstChild as HTMLElement;
        expect(rootDiv).toHaveStyle({
            backgroundImage: 'url(http://example.com/bg.jpg)',
            backgroundSize: 'cover',
            backgroundPosition: 'center'
        });
    });

    it('navigates when sidebar items are clicked', () => {
        const onNavigate = vi.fn();
        render(
            <MainLayout activePage="dashboard" onNavigate={onNavigate} children={<div></div>} />
        );

        fireEvent.click(screen.getByText('Settings'));
        expect(onNavigate).toHaveBeenCalledWith('settings');

        fireEvent.click(screen.getByText('My Mods'));
        expect(onNavigate).toHaveBeenCalledWith('mods');
    });

    it('highlights active page correctly', () => {
        render(
            <MainLayout activePage="settings" onNavigate={vi.fn()} children={<div></div>} />
        );

        const settingsBtn = screen.getByText('Settings').closest('button');
        // Check for the active class 'bg-primary/20' used in the component
        expect(settingsBtn).toHaveClass('bg-primary/20');

        const dashboardBtn = screen.getByText('Dashboard').closest('button');
        expect(dashboardBtn).not.toHaveClass('bg-primary/20');
    });
});
