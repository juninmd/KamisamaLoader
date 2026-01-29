// @vitest-environment happy-dom
import { render, screen } from '@testing-library/react';
import App from '../../../src/App';
import { describe, it, expect, vi } from 'vitest';

// Mock child components to avoid deep rendering issues
vi.mock('../../../src/pages/Dashboard', () => ({ default: () => <div>Dashboard Page</div> }));
vi.mock('../../../src/pages/Mods', () => ({ default: () => <div>Mods Page</div> }));
vi.mock('../../../src/pages/Settings', () => ({ default: () => <div>Settings Page</div> }));

// Mock Layout
vi.mock('../../../src/layouts/MainLayout', () => ({
    default: ({ children }: any) => <div>{children}</div>
}));

// Mock Contexts
vi.mock('../../../src/components/SettingsContext', () => ({
    SettingsProvider: ({ children }: any) => <div>{children}</div>
}));
vi.mock('../../../src/components/ToastContext', () => ({
    ToastProvider: ({ children }: any) => <div>{children}</div>
}));

import { renderWithProviders, screen, fireEvent } from '../test-utils';

describe('App', () => {
    // We need to use real Layout to test navigation logic which passes setActivePage
    // But we mocked MainLayout in the file...
    // Let's unmock MainLayout for navigation tests or test internal state if possible.
    // Actually, App passes `onNavigate` to Layout.
    // If we mock Layout, we need to mock it implementation to use onNavigate.

    it('renders Dashboard by default', () => {
        renderWithProviders(<App />);
        expect(screen.getByText('Dashboard Page')).toBeInTheDocument();
    });
});
